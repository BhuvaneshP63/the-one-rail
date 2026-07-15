import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookingContext } from '../context/BookingContext';
import { Calendar, MapPin, ArrowRightLeft, Users, Search, Loader2 } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { searchParams, setSearchParams } = useContext(BookingContext);

  const [fromQuery, setFromQuery] = useState(searchParams.fromName || '');
  const [toQuery, setToQuery] = useState(searchParams.toName || '');
  const [date, setDate] = useState(searchParams.date);
  const [seatClass, setSeatClass] = useState(searchParams.seatClass);
  const [passengerCount, setPassengerCount] = useState(searchParams.passengerCount);

  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [loadingFrom, setLoadingFrom] = useState(false);
  const [loadingTo, setLoadingTo] = useState(false);

  const fromRef = useRef();
  const toRef = useRef();

  // Handle auto-complete for 'From'
  useEffect(() => {
    const fetchStations = async () => {
      if (fromQuery.length > 2 && fromQuery !== searchParams.fromName) {
        setLoadingFrom(true);
        try {
          const res = await axios.get(`/api/trains/stations/autocomplete?query=${fromQuery}`);
          setFromSuggestions(res.data);
        } catch (error) {
          console.error(error);
        }
        setLoadingFrom(false);
      } else {
        setFromSuggestions([]);
      }
    };
    const timeoutId = setTimeout(fetchStations, 300);
    return () => clearTimeout(timeoutId);
  }, [fromQuery, searchParams.fromName]);

  // Handle auto-complete for 'To'
  useEffect(() => {
    const fetchStations = async () => {
      if (toQuery.length > 2 && toQuery !== searchParams.toName) {
        setLoadingTo(true);
        try {
          const res = await axios.get(`/api/trains/stations/autocomplete?query=${toQuery}`);
          setToSuggestions(res.data);
        } catch (error) {
          console.error(error);
        }
        setLoadingTo(false);
      } else {
        setToSuggestions([]);
      }
    };
    const timeoutId = setTimeout(fetchStations, 300);
    return () => clearTimeout(timeoutId);
  }, [toQuery, searchParams.toName]);

  const handleSwap = () => {
    const tempQuery = fromQuery;
    const tempName = searchParams.fromName;
    const tempCode = searchParams.from;

    setFromQuery(toQuery);
    setSearchParams(prev => ({
      ...prev,
      fromName: prev.toName,
      from: prev.to
    }));

    setToQuery(tempQuery);
    setSearchParams(prev => ({
      ...prev,
      toName: tempName,
      to: tempCode
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchParams.from || !searchParams.to) {
      alert("Please select valid From and To stations from the suggestions.");
      return;
    }
    
    // Update context
    setSearchParams(prev => ({
      ...prev,
      date,
      seatClass,
      passengerCount
    }));

    // Navigate to search results
    navigate(`/search`);
  };

  // Quick dates
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div 
        className="relative pt-32 pb-40 lg:pt-48 lg:pb-56 overflow-hidden"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white tracking-tight mb-4">
            India's Next-Gen <span className="text-[#ef4444]">Rail Network</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-200">
            Experience seamless booking, live tracking, and guaranteed seats with our dynamic segment allocation.
          </p>
        </div>
      </div>

      {/* Search Widget */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 mb-20">
        <div className="bg-white rounded-2xl shadow-premium border border-slate-100 p-6 md:p-8">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            
            {/* From Station */}
            <div className="md:col-span-3 relative" ref={fromRef}>
              <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">From Station</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-[#C51E3A]" />
                <input
                  type="text"
                  className="form-input pl-10 h-12 text-lg font-medium"
                  placeholder="E.g. NDLS or Delhi"
                  value={fromQuery}
                  onChange={(e) => {
                    setFromQuery(e.target.value);
                    setSearchParams(prev => ({ ...prev, from: '', fromName: '' }));
                  }}
                  required
                />
                {loadingFrom && <Loader2 className="absolute right-3 top-3 h-5 w-5 text-slate-400 animate-spin" />}
              </div>
              
              {fromSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {fromSuggestions.map(station => (
                    <div
                      key={station.code}
                      className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-slate-50 last:border-0"
                      onClick={() => {
                        setFromQuery(`${station.name} (${station.code})`);
                        setSearchParams(prev => ({ ...prev, from: station.code, fromName: `${station.name} (${station.code})` }));
                        setFromSuggestions([]);
                      }}
                    >
                      <div className="font-semibold text-slate-800">{station.name}</div>
                      <div className="text-xs text-slate-500">{station.code} - {station.state}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Swap Button */}
            <div className="md:col-span-1 flex justify-center pb-2 hidden md:flex">
              <button
                type="button"
                onClick={handleSwap}
                className="p-3 bg-slate-50 hover:bg-red-50 rounded-full border border-slate-200 text-slate-600 hover:text-[#C51E3A] transition shadow-sm"
              >
                <ArrowRightLeft className="h-5 w-5" />
              </button>
            </div>

            {/* To Station */}
            <div className="md:col-span-3 relative" ref={toRef}>
              <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">To Station</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-[#C51E3A]" />
                <input
                  type="text"
                  className="form-input pl-10 h-12 text-lg font-medium"
                  placeholder="E.g. SBC or Bengaluru"
                  value={toQuery}
                  onChange={(e) => {
                    setToQuery(e.target.value);
                    setSearchParams(prev => ({ ...prev, to: '', toName: '' }));
                  }}
                  required
                />
                {loadingTo && <Loader2 className="absolute right-3 top-3 h-5 w-5 text-slate-400 animate-spin" />}
              </div>

              {toSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {toSuggestions.map(station => (
                    <div
                      key={station.code}
                      className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-slate-50 last:border-0"
                      onClick={() => {
                        setToQuery(`${station.name} (${station.code})`);
                        setSearchParams(prev => ({ ...prev, to: station.code, toName: `${station.name} (${station.code})` }));
                        setToSuggestions([]);
                      }}
                    >
                      <div className="font-semibold text-slate-800">{station.name}</div>
                      <div className="text-xs text-slate-500">{station.code} - {station.state}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Journey Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="date"
                  className="form-input pl-10 h-12 text-lg font-medium"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex space-x-2 mt-2">
                <button type="button" onClick={() => setDate(today)} className={`text-xs px-2 py-1 rounded ${date === today ? 'bg-[#C51E3A] text-white' : 'bg-slate-100 text-slate-600'}`}>Today</button>
                <button type="button" onClick={() => setDate(tomorrow)} className={`text-xs px-2 py-1 rounded ${date === tomorrow ? 'bg-[#C51E3A] text-white' : 'bg-slate-100 text-slate-600'}`}>Tomorrow</button>
              </div>
            </div>

            {/* Class & Passengers */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Class & Pax</label>
              <div className="flex space-x-2">
                <select 
                  className="form-input h-12 w-1/2 text-center font-medium"
                  value={seatClass}
                  onChange={(e) => setSeatClass(e.target.value)}
                >
                  <option value="SL">SL</option>
                  <option value="3A">3A</option>
                  <option value="2A">2A</option>
                  <option value="1A">1A</option>
                  <option value="CC">CC</option>
                  <option value="2S">2S</option>
                </select>
                <div className="relative w-1/2">
                  <Users className="absolute left-2 top-3 h-5 w-5 text-slate-400" />
                  <input 
                    type="number" 
                    min="1" 
                    max="6" 
                    className="form-input h-12 pl-8 pr-2 font-medium" 
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
            </div>

            {/* Search Button */}
            <div className="md:col-span-1 flex items-start h-full pb-2 md:pb-0">
               <button type="submit" className="btn-primary w-full h-12 flex items-center justify-center rounded-xl text-lg mt-7">
                 <Search className="h-5 w-5 md:mr-0 lg:mr-2" />
                 <span className="hidden lg:block">Search</span>
               </button>
            </div>

          </form>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-12">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl font-bold text-slate-800">Why book with Rail Yatra?</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card text-center space-y-4">
            <div className="mx-auto bg-red-50 w-16 h-16 rounded-full flex items-center justify-center">
               <MapPin className="h-8 w-8 text-[#C51E3A]" />
            </div>
            <h3 className="text-xl font-bold">Dynamic Seat Allocation</h3>
            <p className="text-slate-500">Book intermediate stations securely with our intelligent segment-based availability algorithm.</p>
          </div>
          <div className="card text-center space-y-4">
             <div className="mx-auto bg-red-50 w-16 h-16 rounded-full flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#C51E3A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
               </svg>
            </div>
            <h3 className="text-xl font-bold">Secure Payments</h3>
            <p className="text-slate-500">Pay securely using Razorpay with UPI, Credit Cards, and Net Banking support.</p>
          </div>
          <div className="card text-center space-y-4">
             <div className="mx-auto bg-red-50 w-16 h-16 rounded-full flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#C51E3A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
               </svg>
            </div>
            <h3 className="text-xl font-bold">Live GPS Tracker</h3>
            <p className="text-slate-500">Track your train's real-time running status and estimated arrival times instantly.</p>
          </div>
        </div>
      </div>

    </div>
  );
}

