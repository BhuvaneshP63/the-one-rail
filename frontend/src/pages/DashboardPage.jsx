import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { AuthContext } from '../context/AuthContext';
import { Download, XCircle, Search, Clock, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';

export default function DashboardPage() {
  const { user, token } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [pnrSearch, setPnrSearch] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    if (location.state?.bookingSuccess) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#C51E3A', '#10B981', '#3B82F6']
      });
      // Clear state so refresh doesn't trigger confetti again
      window.history.replaceState({}, document.title);
    }

    fetchBookings();
  }, [token, navigate, location.state]);

  const fetchBookings = async () => {
    try {
      const res = await axios.get('/api/bookings/history');
      setBookings(res.data.bookings);
    } catch (err) {
      setError('Failed to load booking history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id, pnr) => {
    try {
      const res = await axios.get(`/api/bookings/${id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ticket_PNR_${pnr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Failed to download ticket');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this ticket? Cancellation charges will apply.')) return;
    
    setCancellingId(id);
    try {
      const res = await axios.post(`/api/bookings/${id}/cancel`);
      if (res.data.success) {
        alert(`Booking cancelled successfully. Refund of ₹${res.data.refundDetails.refundAmount} initiated.`);
        fetchBookings();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const handlePnrSearch = (e) => {
    e.preventDefault();
    if (pnrSearch.length === 10) {
      navigate(`/pnr?query=${pnrSearch}`);
    } else {
      alert('PNR must be 10 digits');
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Confirmed') return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> CNF</span>;
    if (status === 'Cancelled') return <span className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded flex items-center"><XCircle className="w-3 h-3 mr-1"/> CANCELLED</span>;
    return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded">{status}</span>;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#C51E3A]" /></div>;
  }

  const upcomingBookings = bookings.filter(b => b.status === 'Confirmed' && new Date(b.date) >= new Date(new Date().setHours(0,0,0,0)));
  const pastOrCancelledBookings = bookings.filter(b => b.status === 'Cancelled' || new Date(b.date) < new Date(new Date().setHours(0,0,0,0)));

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Welcome & PNR Check */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl shadow-md p-6 text-white flex flex-col justify-center">
            <h1 className="text-2xl font-bold font-heading mb-1">Welcome back, {user?.name.split(' ')[0]}!</h1>
            <p className="text-slate-300 text-sm">Manage your upcoming journeys and booking history.</p>
          </div>
          
          <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wide">Quick PNR Check</h3>
            <form onSubmit={handlePnrSearch} className="flex space-x-2">
              <input 
                type="text" 
                placeholder="10-digit PNR" 
                className="form-input text-sm"
                value={pnrSearch}
                onChange={(e) => setPnrSearch(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
              <button type="submit" className="btn-primary px-3 flex-shrink-0">
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Upcoming Journeys */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-[#C51E3A]" /> Upcoming Journeys
          </h2>
          
          {upcomingBookings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <TrainIcon className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">No upcoming journeys planned.</p>
              <button onClick={() => navigate('/')} className="mt-4 text-[#C51E3A] font-semibold hover:underline">Book a Ticket</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingBookings.map(b => (
                <BookingCard 
                  key={b._id} 
                  booking={b} 
                  onDownload={handleDownload} 
                  onCancel={handleCancel}
                  cancelling={cancellingId === b._id}
                  badge={getStatusBadge(b.status)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Past & Cancelled */}
        {pastOrCancelledBookings.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-slate-500" /> Past & Cancelled Tickets
            </h2>
            <div className="space-y-4">
              {pastOrCancelledBookings.map(b => (
                <BookingCardMini 
                  key={b._id} 
                  booking={b} 
                  onDownload={handleDownload}
                  badge={getStatusBadge(b.status)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Popular Routes */}
        <div className="mt-12 mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <span className="text-2xl mr-2">🔥</span> Popular Train Routes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { from: 'NDLS', to: 'CSMT', name: 'Delhi ⇄ Mumbai', icon: '🌆' },
              { from: 'SBC', to: 'MAS', name: 'Bengaluru ⇄ Chennai', icon: '🏖️' },
              { from: 'HWH', to: 'NDLS', name: 'Kolkata ⇄ Delhi', icon: '🏛️' },
              { from: 'CSMT', to: 'ADI', name: 'Mumbai ⇄ Ahmedabad', icon: '🕌' }
            ].map((route, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const dateStr = tomorrow.toISOString().split('T')[0];
                  navigate(`/search?from=${route.from}&to=${route.to}&date=${dateStr}&class=3A&passengers=1`);
                }}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:shadow-md transition hover:border-[#C51E3A] group flex items-center space-x-4"
              >
                <div className="text-3xl bg-slate-50 p-2 rounded-lg group-hover:bg-red-50 transition">{route.icon}</div>
                <div>
                  <h4 className="font-bold text-slate-800 group-hover:text-[#C51E3A] transition">{route.name}</h4>
                  <div className="text-xs text-slate-500 mt-1 font-medium">Search Trains →</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function BookingCard({ booking, onDownload, onCancel, cancelling, badge }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">PNR: {booking.pnr}</div>
            <h3 className="text-lg font-bold text-slate-800">{booking.train.name}</h3>
          </div>
          {badge}
        </div>

        <div className="flex items-center justify-between text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
           <div className="text-center">
             <div className="font-bold">{booking.source.code}</div>
           </div>
           <div className="flex-1 px-4 text-center text-xs text-slate-400 font-medium relative">
             <div className="border-t border-dashed border-slate-300 w-full absolute top-1/2 left-0 z-0"></div>
             <span className="bg-slate-50 px-2 relative z-10">{booking.date}</span>
           </div>
           <div className="text-center">
             <div className="font-bold">{booking.destination.code}</div>
           </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <div className="text-slate-600">
            <span className="font-medium">{booking.passengers.length} Pax</span> • Class <span className="font-medium">{booking.seatClass}</span>
          </div>
          <div className="font-bold text-slate-800">
            ₹{booking.totalFare}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border-t border-slate-100 p-3 flex space-x-2">
        <button 
          onClick={() => navigate(`/tracker`)} // In a real app we'd pass train ID or date
          className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg text-center transition shadow-sm"
        >
          Track
        </button>
        <button 
          onClick={() => onDownload(booking._id, booking.pnr)}
          className="flex-1 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white border border-slate-200 rounded-lg flex items-center justify-center transition shadow-sm"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> PDF
        </button>
        <button 
          onClick={() => onCancel(booking._id)}
          disabled={cancelling}
          className="flex-1 py-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-white border border-slate-200 rounded-lg flex items-center justify-center transition shadow-sm disabled:opacity-50"
        >
          {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cancel'}
        </button>
      </div>
    </div>
  );
}

function BookingCardMini({ booking, onDownload, badge }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between transition hover:shadow-md">
      <div className="flex items-center space-x-4 mb-3 md:mb-0">
        <div className="hidden sm:flex w-12 h-12 bg-slate-50 rounded flex-col items-center justify-center border border-slate-100">
           <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(booking.date).toLocaleString('default', { month: 'short' })}</span>
           <span className="text-lg font-bold text-slate-700 leading-none">{new Date(booking.date).getDate()}</span>
        </div>
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-bold text-slate-800">{booking.train.name}</span>
            {badge}
          </div>
          <div className="text-xs text-slate-500">
            PNR: <span className="font-semibold text-slate-600 mr-2">{booking.pnr}</span>
            {booking.source.code} → {booking.destination.code}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-right hidden md:block">
          <div className="text-sm font-bold text-slate-800">₹{booking.totalFare}</div>
          {booking.status === 'Cancelled' && (
            <div className="text-[10px] font-semibold text-emerald-600">Refund: ₹{booking.refundAmount}</div>
          )}
        </div>
        <button 
          onClick={() => onDownload(booking._id, booking.pnr)}
          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition"
          title="Download Ticket"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function TrainIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="16" x="4" y="3" rx="2"/>
      <path d="M4 11h16"/>
      <path d="M12 3v8"/>
      <path d="m8 19-2 3"/>
      <path d="m18 22-2-3"/>
      <path d="M8 15h0"/>
      <path d="M16 15h0"/>
    </svg>
  );
}
