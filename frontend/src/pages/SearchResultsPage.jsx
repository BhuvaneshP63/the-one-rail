import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { BookingContext } from '../context/BookingContext';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, Clock, MapPin, Users, Star, AlertCircle } from 'lucide-react';

export default function SearchResultsPage() {
  const navigate = useNavigate();
  const { searchParams, setSelectedTrain, setSelectedClass } = useContext(BookingContext);
  const { user } = useContext(AuthContext);

  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // If accessed directly without search params, redirect home
    if (!searchParams.from || !searchParams.to) {
      navigate('/');
      return;
    }

    const fetchTrains = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get('/api/trains/search', {
          params: {
            from: searchParams.from,
            to: searchParams.to,
            date: searchParams.date
          }
        });
        setTrains(res.data.trains);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch trains');
      } finally {
        setLoading(false);
      }
    };

    fetchTrains();
  }, [searchParams, navigate]);

  const handleBookNow = (train, cls) => {
    if (!user) {
      // Redirect to login but keep state in context
      navigate('/login');
      return;
    }
    
    setSelectedTrain(train);
    setSelectedClass(cls);
    navigate('/booking');
  };

  const getDayName = (dateStr) => {
    const d = new Date(dateStr);
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return d.toLocaleDateString('en-IN', options);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="h-24 bg-white rounded-xl shadow-sm skeleton"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-white rounded-xl shadow-sm skeleton"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Widget */}
        <div className="bg-[#1e293b] rounded-xl shadow-lg p-6 mb-8 text-white flex flex-col md:flex-row md:items-center justify-between">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <button onClick={() => navigate('/')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2 text-xl font-bold font-heading">
                <span>{searchParams.fromName.split(' ')[0]}</span>
                <ArrowRightLeftIcon className="h-4 w-4 text-slate-400" />
                <span>{searchParams.toName.split(' ')[0]}</span>
              </div>
              <div className="text-slate-300 text-sm mt-1 flex items-center space-x-4">
                <span>{getDayName(searchParams.date)}</span>
                <span className="flex items-center space-x-1"><Users className="h-3 w-3"/> <span>{searchParams.passengerCount} Adult{searchParams.passengerCount > 1 ? 's' : ''}</span></span>
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition">
            Modify Search
          </button>
        </div>

        {error ? (
          <div className="bg-red-50 text-[#C51E3A] p-4 rounded-lg border border-red-100 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : trains.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No trains found</h3>
            <p className="text-slate-500 max-w-md mx-auto">We couldn't find any trains running on this route for the selected date. Try modifying your search.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="font-semibold text-slate-700">{trains.length} Train{trains.length !== 1 ? 's' : ''} Found</p>
            {trains.map(train => (
              <TrainCard key={train.trainId} train={train} onBook={handleBookNow} searchClass={searchParams.seatClass} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

function ArrowRightLeftIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 3 4 4-4 4"/>
      <path d="M20 7H4"/>
      <path d="m8 21-4-4 4-4"/>
      <path d="M4 17h16"/>
    </svg>
  );
}

function TrainCard({ train, onBook, searchClass }) {
  // Sort classes to show preferred class first
  const classes = [...train.classes].sort((a, b) => {
    if (a === searchClass) return -1;
    if (b === searchClass) return 1;
    return 0;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      
      {/* Top Details */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between">
        <div className="mb-4 md:mb-0">
          <div className="flex items-center space-x-3 mb-1">
            <h3 className="text-lg font-bold text-slate-800">{train.name}</h3>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold">#{train.trainNumber}</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-slate-500">
            <div className="flex items-center space-x-1 text-emerald-600">
              <Star className="h-4 w-4 fill-current" />
              <span className="font-medium">{train.rating}</span>
              <span className="text-slate-400">({train.reviewsCount})</span>
            </div>
            <span>•</span>
            <div className="flex space-x-1">
               {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                 <span key={day} className={`text-[10px] font-bold ${train.runningDays.includes(day) ? 'text-slate-700' : 'text-slate-300'}`}>
                   {day.charAt(0)}
                 </span>
               ))}
            </div>
          </div>
        </div>

        {/* Timings */}
        <div className="flex items-center justify-between md:justify-end md:space-x-8 lg:space-x-12">
           <div className="text-center">
              <div className="text-xl font-bold text-slate-800">{train.boardingStation.departureTime}</div>
              <div className="text-sm font-medium text-slate-500">{train.boardingStation.code}</div>
           </div>
           
           <div className="flex flex-col items-center">
              <div className="text-xs font-semibold text-slate-400 mb-1">{train.duration}</div>
              <div className="w-24 h-[2px] bg-slate-200 relative">
                 <div className="absolute w-2 h-2 bg-slate-300 rounded-full -top-[3px] left-0"></div>
                 <div className="absolute w-2 h-2 bg-slate-300 rounded-full -top-[3px] right-0"></div>
              </div>
           </div>

           <div className="text-center">
              <div className="text-xl font-bold text-slate-800">{train.deboardingStation.arrivalTime}</div>
              <div className="text-sm font-medium text-slate-500">{train.deboardingStation.code}</div>
           </div>
        </div>
      </div>

      {/* Class Availabilities Grid */}
      <div className="p-4 bg-slate-50 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {classes.map(cls => {
          const details = train.classDetails[cls];
          if (!details) return null;
          
          const isAvail = details.availableSeats > 0;
          const statusText = isAvail ? `AVAILABLE - ${details.availableSeats}` : 'WL / NOT AVAIL';
          const statusColor = isAvail ? 'text-emerald-600' : 'text-orange-500';
          const bgColor = cls === searchClass ? 'bg-red-50 border-red-200 ring-1 ring-red-200' : 'bg-white border-slate-200 hover:border-[#C51E3A]';

          return (
            <div 
              key={cls} 
              className={`p-3 rounded-lg border cursor-pointer transition ${bgColor}`}
              onClick={() => isAvail && onBook(train, cls)}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-slate-800">{cls}</span>
                <span className="font-semibold text-slate-800">₹{details.fare}</span>
              </div>
              <div className={`text-xs font-bold ${statusColor}`}>
                {statusText}
              </div>
            </div>
          );
        })}
      </div>
      
    </div>
  );
}
