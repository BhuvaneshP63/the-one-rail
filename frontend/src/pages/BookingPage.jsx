import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookingContext } from '../context/BookingContext';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, Trash2, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

export default function BookingPage() {
  const navigate = useNavigate();
  const { searchParams, selectedTrain, selectedClass, resetBookingFlow } = useContext(BookingContext);
  const { user, token } = useContext(AuthContext);

  const [passengers, setPassengers] = useState(
    Array.from({ length: searchParams.passengerCount || 1 }).map(() => ({ name: '', age: '', gender: 'Male' }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Mock Payment UI State
  const [mockPaymentData, setMockPaymentData] = useState(null);
  const [mockMethod, setMockMethod] = useState('UPI');
  const [mockProcessing, setMockProcessing] = useState(false);

  useEffect(() => {
    if (!selectedTrain || !user) {
      navigate('/');
    }
  }, [selectedTrain, user, navigate]);

  if (!selectedTrain) return null;

  const farePerPassenger = selectedTrain.classDetails[selectedClass].fare;
  const totalFare = farePerPassenger * passengers.length;

  const handlePassengerChange = (index, field, value) => {
    const newPass = [...passengers];
    newPass[index][field] = value;
    setPassengers(newPass);
  };

  const addPassenger = () => {
    if (passengers.length >= 6) {
      return setError('Maximum 6 passengers allowed per booking');
    }
    setPassengers([...passengers, { name: '', age: '', gender: 'Male' }]);
  };

  const removePassenger = (index) => {
    if (passengers.length === 1) return;
    const newPass = [...passengers];
    newPass.splice(index, 1);
    setPassengers(newPass);
    setError('');
  };

  const initializeRazorpay = (orderData) => {
    return new Promise((resolve) => {
      // Check if Razorpay SDK loaded
      if (!window.Razorpay) {
        resolve({ success: false, message: 'Razorpay SDK not loaded' });
        return;
      }

      const options = {
        key: 'rzp_test_mock', // Fallback, normally from backend or env
        amount: orderData.totalFare * 100,
        currency: 'INR',
        name: 'Rail Yatra',
        description: `Booking for ${selectedTrain.name}`,
        order_id: orderData.razorpayOrderId.startsWith('order_mock_') ? undefined : orderData.razorpayOrderId,
        handler: async function (response) {
          resolve({
            success: true,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature
          });
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone
        },
        theme: {
          color: '#C51E3A'
        }
      };

      if (orderData.razorpayOrderId.startsWith('order_mock_')) {
        // MOCK MODE: Show UI modal
        setMockPaymentData({
          orderData,
          resolve
        });
      } else {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          resolve({ success: false, message: response.error.description });
        });
        rzp.open();
      }
    });
  };

  const handleCheckout = async () => {
    // Validate
    for (const p of passengers) {
      if (!p.name || !p.age) {
        return setError('Please fill all passenger details');
      }
    }
    setError('');
    setSubmitting(true);

    try {
      // 1. Create Pending Order
      const orderRes = await axios.post('/api/bookings/create', {
        trainId: selectedTrain.trainId,
        date: searchParams.date,
        seatClass: selectedClass,
        fromStation: selectedTrain.boardingStation.id,
        toStation: selectedTrain.deboardingStation.id,
        boardingStation: selectedTrain.boardingStation.id,
        passengers
      });

      const orderData = orderRes.data.booking;

      // 2. Open Razorpay or Mock Overlay
      const paymentResult = await initializeRazorpay(orderData);

      if (!paymentResult.success) {
        setSubmitting(false);
        return setError(paymentResult.message || 'Payment failed or was cancelled');
      }

      // 3. Verify Payment & Allocate Seats
      const verifyRes = await axios.post('/api/bookings/verify', {
        bookingId: orderData.id,
        paymentId: paymentResult.paymentId,
        orderId: paymentResult.orderId,
        signature: paymentResult.signature,
        method: paymentResult.orderId.startsWith('order_mock_') ? 'Mock' : 'Razorpay'
      });

      if (verifyRes.data.success) {
        // Booking successful!
        resetBookingFlow();
        navigate('/dashboard', { state: { bookingSuccess: true, pnr: verifyRes.data.booking.pnr } });
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex items-center space-x-2 mb-6">
           <button onClick={() => navigate('/search')} className="text-slate-500 hover:text-[#C51E3A] font-medium text-sm">
             Back to Search Results
           </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content: Passenger Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Train Summary Strip */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row justify-between md:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedTrain.name} ({selectedTrain.trainNumber})</h2>
                <div className="text-sm text-slate-500 mt-1 flex space-x-2">
                  <span>{selectedTrain.boardingStation.departureTime}</span>
                  <span>→</span>
                  <span>{selectedTrain.deboardingStation.arrivalTime}</span>
                  <span>|</span>
                  <span>{searchParams.date}</span>
                </div>
              </div>
              <div className="mt-4 md:mt-0 text-right">
                <div className="text-lg font-bold text-[#C51E3A]">{selectedClass} Class</div>
                <div className="text-xs font-semibold text-emerald-600">Available: {selectedTrain.classDetails[selectedClass].availableSeats}</div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-[#C51E3A] rounded-lg border border-red-100 font-medium">
                {error}
              </div>
            )}

            {/* Passenger Forms */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">Passenger Details</h3>
                <span className="text-xs font-medium text-slate-500">{passengers.length}/6 Passengers</span>
              </div>
              
              <div className="p-5 space-y-6">
                {passengers.map((p, index) => (
                  <div key={index} className="pb-6 border-b border-slate-100 last:border-0 last:pb-0 relative">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Passenger {index + 1}</h4>
                      {passengers.length > 1 && (
                        <button onClick={() => removePassenger(index)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-6">
                        <input 
                          type="text" 
                          placeholder="Full Name" 
                          className="form-input" 
                          value={p.name}
                          onChange={(e) => handlePassengerChange(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <input 
                          type="number" 
                          placeholder="Age" 
                          className="form-input" 
                          min="1" max="120"
                          value={p.age}
                          onChange={(e) => handlePassengerChange(index, 'age', e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <select 
                          className="form-input"
                          value={p.gender}
                          onChange={(e) => handlePassengerChange(index, 'gender', e.target.value)}
                        >
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                {passengers.length < 6 && (
                  <button 
                    onClick={addPassenger}
                    className="flex items-center space-x-2 text-[#C51E3A] font-semibold text-sm hover:underline"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Add Passenger</span>
                  </button>
                )}
              </div>
            </div>

            {/* Contact Details (Readonly from User Profile) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">Contact Details</h3>
                <p className="text-xs text-slate-500 mt-1">Ticket PDF will be sent to this email address</p>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email</label>
                  <div className="font-medium text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-100">{user.email}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Mobile</label>
                  <div className="font-medium text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-100">{user.phone || 'Not provided'}</div>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar: Fare Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 sticky top-24">
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-800">Fare Summary</h3>
              </div>
              
              <div className="p-5 space-y-4 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Base Fare ({passengers.length} x ₹{farePerPassenger})</span>
                  <span className="font-medium">₹{totalFare}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Convenience Fee</span>
                  <span className="font-medium">₹0</span>
                </div>
                
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                  <span className="font-bold text-slate-800">Total Amount</span>
                  <span className="text-2xl font-bold text-[#C51E3A]">₹{totalFare}</span>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-b-xl border-t border-slate-100">
                <button 
                  onClick={handleCheckout}
                  disabled={submitting}
                  className="btn-primary w-full h-12 flex items-center justify-center space-x-2 text-lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay & Book Now</span>
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
                <div className="mt-4 flex items-center justify-center space-x-1.5 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Secure Payments by Razorpay</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      {/* Mock Payment Modal */}
      {mockPaymentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-premium w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Secure Checkout</h3>
              <div className="text-sm font-semibold text-slate-500">Test Mode</div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 p-4 bg-red-50 rounded-lg border border-red-100">
                <span className="font-semibold text-slate-700">Total Amount</span>
                <span className="text-2xl font-bold text-[#C51E3A]">₹{totalFare}</span>
              </div>
              
              <h4 className="font-bold text-slate-700 mb-3">Select Payment Method</h4>
              <div className="mb-6 space-y-3">
                <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${mockMethod === 'UPI' ? 'border-[#C51E3A] bg-red-50/50' : 'hover:bg-slate-50 border-slate-200'}`}>
                  <input type="radio" name="method" checked={mockMethod === 'UPI'} onChange={() => setMockMethod('UPI')} className="mr-3 text-[#C51E3A] accent-[#C51E3A] w-4 h-4" />
                  <span className="font-semibold text-slate-800">UPI (GPay, PhonePe, Paytm)</span>
                </label>
                <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${mockMethod === 'Card' ? 'border-[#C51E3A] bg-red-50/50' : 'hover:bg-slate-50 border-slate-200'}`}>
                  <input type="radio" name="method" checked={mockMethod === 'Card'} onChange={() => setMockMethod('Card')} className="mr-3 text-[#C51E3A] accent-[#C51E3A] w-4 h-4" />
                  <span className="font-semibold text-slate-800">Credit / Debit Card</span>
                </label>
                <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${mockMethod === 'NetBanking' ? 'border-[#C51E3A] bg-red-50/50' : 'hover:bg-slate-50 border-slate-200'}`}>
                  <input type="radio" name="method" checked={mockMethod === 'NetBanking'} onChange={() => setMockMethod('NetBanking')} className="mr-3 text-[#C51E3A] accent-[#C51E3A] w-4 h-4" />
                  <span className="font-semibold text-slate-800">Net Banking</span>
                </label>
              </div>
              
              <button 
                disabled={mockProcessing}
                onClick={() => {
                  setMockProcessing(true);
                  setTimeout(() => {
                    mockPaymentData.resolve({
                      success: true,
                      paymentId: 'pay_mock_' + Math.floor(Math.random()*1000000),
                      orderId: mockPaymentData.orderData.razorpayOrderId,
                      signature: 'mock_sig'
                    });
                    setMockPaymentData(null);
                    setMockProcessing(false);
                  }, 2500);
                }}
                className="btn-primary w-full py-3 flex justify-center items-center text-lg shadow-md"
              >
                {mockProcessing ? <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Processing Payment...</> : `Pay ₹${totalFare} Securely`}
              </button>
              
              <button 
                disabled={mockProcessing}
                onClick={() => {
                  mockPaymentData.resolve({ success: false, message: 'Payment cancelled by user' });
                  setMockPaymentData(null);
                }}
                className="w-full mt-3 py-2 text-slate-500 font-semibold hover:text-slate-800 transition disabled:opacity-50"
              >
                Cancel Transaction
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

