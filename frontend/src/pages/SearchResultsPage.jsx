import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { BookingContext } from '../context/BookingContext';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, Clock, MapPin, Users, Star, AlertCircle, Heart, ChevronDown, ChevronUp } from 'lucide-react';

export default function SearchResultsPage() {
  const navigate = useNavigate();
  const { searchParams, setSelectedTrain, setSelectedClass } = useContext(BookingContext);
  const { user } = useContext(AuthContext);

  const [trains, setTrains] = useState([]);
  const [dataSource, setDataSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [departureFilter, setDepartureFilter] = useState('Any');
  const [arrivalFilter, setArrivalFilter] = useState('Any');
  const [minFare, setMinFare] = useState('');
  const [maxFare, setMaxFare] = useState('');
  const [minDuration, setMinDuration] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [trainTypeFilter, setTrainTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('departure');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [favouriteIds, setFavouriteIds] = useState([]);
  const [favoriteError, setFavoriteError] = useState('');
  const favouriteKey = `oneRailFavourites:${user?.id || user?._id || 'guest'}`;

  useEffect(() => {
    let active = true;
    if (user) {
      axios.get('/api/auth/favorites').then(({ data }) => { if (active) setFavouriteIds(data.favoriteTrains || []); })
        .catch(() => { try { if (active) setFavouriteIds(JSON.parse(localStorage.getItem(favouriteKey) || '[]')); } catch { if (active) setFavouriteIds([]); } });
    } else {
      try { setFavouriteIds(JSON.parse(localStorage.getItem(favouriteKey) || '[]')); } catch { setFavouriteIds([]); }
    }
    return () => { active = false; };
  }, [favouriteKey, user]);

  const toggleFavourite = (trainId) => {
    const updated = favouriteIds.includes(trainId) ? favouriteIds.filter(id => id !== trainId) : [...favouriteIds, trainId];
    setFavouriteIds(updated);
    localStorage.setItem(favouriteKey, JSON.stringify(updated));
    setFavoriteError('');
    if (user) axios.put('/api/auth/favorites', { kind: 'train', id: trainId, favorite: updated.includes(trainId) })
      .catch(() => setFavoriteError('Could not sync this favorite. It is saved on this device for now.'));
  };

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
            fromName: searchParams.fromName,
            toName: searchParams.toName,
            date: searchParams.date
          }
        });
        setTrains(res.data.trains || []);
        setDataSource(res.data.dataSource || 'Sample timetable data');
        setUpdatedAt(new Date());
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

  const confirmExternalBooking = async (payload) => {
    if (!user) {
      navigate('/login');
      throw new Error('Please sign in to reserve seats.');
    }
    return axios.post('/api/bookings/external/confirm', payload);
  };

  const getDayName = (dateStr) => {
    const d = new Date(dateStr);
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return d.toLocaleDateString('en-IN', options);
  };

  const inTimeBand = (value, band) => {
    if (band === 'Any') return true;
    const hour = Number((value || '00:00').split(':')[0]);
    return band === 'Morning' ? hour >= 6 && hour < 12 : band === 'Afternoon' ? hour >= 12 && hour < 18 : band === 'Evening' ? hour >= 18 : hour < 6;
  };
  const visibleTrains = trains.filter(train => {
    const trainClasses = train.classes || [];
    const classes = classFilter === 'All' ? trainClasses : trainClasses.filter(cls => cls === classFilter);
    if (trainTypeFilter !== 'All' && train.trainType !== trainTypeFilter) return false;
    const journeyHours = durationMinutes(train.duration) / 60;
    if (minDuration && journeyHours < Number(minDuration) || maxDuration && journeyHours > Number(maxDuration)) return false;
    if (!trainClasses.length) return train.bookable === false && classFilter === 'All' && !minFare && !maxFare && inTimeBand(train.boardingStation.departureTime, departureFilter) && inTimeBand(train.deboardingStation.arrivalTime, arrivalFilter);
    const classFare = classes.length ? Math.min(...classes.map(cls => train.classDetails[cls]?.fare || Infinity)) : Infinity;
    return classes.length && classFare >= (minFare ? Number(minFare) : 0) && classFare <= (maxFare ? Number(maxFare) : Infinity) && inTimeBand(train.boardingStation.departureTime, departureFilter) && inTimeBand(train.deboardingStation.arrivalTime, arrivalFilter);
  }).sort((a, b) => {
    if (sortBy === 'fare') return Math.min(...(a.classes || []).map(cls => a.classDetails?.[cls]?.fare || Infinity)) - Math.min(...(b.classes || []).map(cls => b.classDetails?.[cls]?.fare || Infinity));
    if (sortBy === 'arrival') return (a.deboardingStation?.arrivalTime || '').localeCompare(b.deboardingStation?.arrivalTime || '');
    if (sortBy === 'duration') return durationMinutes(a.duration) - durationMinutes(b.duration);
    return (a.boardingStation?.departureTime || '').localeCompare(b.boardingStation?.departureTime || '');
  });

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
        <div className="bg-[#103f3b] rounded-2xl shadow-lg p-6 mb-8 text-white flex flex-col md:flex-row md:items-center justify-between">
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
          <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : trains.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No trains found</h3>
            <p className="text-slate-500 max-w-md mx-auto">We couldn’t find a train on this route for the selected date. Try another date or adjust your stations.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button type="button" className="btn-primary" onClick={() => { const next = new Date(`${searchParams.date}T12:00:00`); next.setDate(next.getDate() + 1); const nextDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`; setSearchParams(current => ({ ...current, date: nextDate })); }}>Try the next day</button>
              <button type="button" onClick={() => navigate('/')} className="btn-secondary">Change stations or date</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
              <div className="mb-5 flex items-start justify-between">
                <div><h2 className="font-heading text-lg font-bold text-slate-800">Refine journey</h2><p className="mt-1 text-xs text-slate-500">Narrow down your options</p></div>
                <button type="button" onClick={() => { setClassFilter('All'); setDepartureFilter('Any'); setArrivalFilter('Any'); setMinFare(''); setMaxFare(''); setMinDuration(''); setMaxDuration(''); setTrainTypeFilter('All'); setSortBy('departure'); }} className="text-xs font-semibold text-teal-700 hover:underline">Reset</button>
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Travel class<select className="form-input mt-1.5" value={classFilter} onChange={e => setClassFilter(e.target.value)}><option>All</option>{[...new Set(trains.flatMap(t => t.classes))].map(cls => <option key={cls}>{cls}</option>)}</select></label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Departure<select className="form-input mt-1.5" value={departureFilter} onChange={e => setDepartureFilter(e.target.value)}>{['Any','Morning','Afternoon','Evening','Night'].map(x => <option key={x}>{x}</option>)}</select></label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Arrival<select className="form-input mt-1.5" value={arrivalFilter} onChange={e => setArrivalFilter(e.target.value)}>{['Any','Morning','Afternoon','Evening','Night'].map(x => <option key={x}>{x}</option>)}</select></label>
                {trains.some(train => train.trainType) && <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Train type<select className="form-input mt-1.5" value={trainTypeFilter} onChange={e => setTrainTypeFilter(e.target.value)}><option>All</option>{[...new Set(trains.map(train => train.trainType).filter(Boolean))].sort().map(type => <option key={type}>{type}</option>)}</select></label>}
                <div className="grid grid-cols-2 gap-2"><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Min duration (h)<input className="form-input mt-1.5" type="number" min="0" step="0.5" value={minDuration} onChange={e => setMinDuration(e.target.value)} placeholder="Any" /></label><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Max duration (h)<input className="form-input mt-1.5" type="number" min={minDuration || 0} step="0.5" value={maxDuration} onChange={e => setMaxDuration(e.target.value)} placeholder="Any" /></label></div>
                <div className="grid grid-cols-2 gap-2"><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Min fare<input className="form-input mt-1.5" type="number" min="0" value={minFare} onChange={e => setMinFare(e.target.value)} placeholder="₹0" /></label><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Max fare<input className="form-input mt-1.5" type="number" min={minFare || 0} value={maxFare} onChange={e => setMaxFare(e.target.value)} placeholder="No limit" /></label></div>
              </div>
                <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">{dataSource.includes('RailRadar') ? 'External timetable · confirm details with Indian Railways.' : 'Sample timetable and simulated availability · not live railway data.'}{updatedAt && <span className="mt-1 block">Fetched {updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · refresh search for current results</span>}</p>
            </aside>
            <section className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2 px-1">
                <div><p className="text-sm text-slate-500">Your journey options</p><h2 className="font-heading text-xl font-bold text-slate-800">{visibleTrains.length} train{visibleTrains.length !== 1 ? 's' : ''} found</h2></div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-500">Sort by<select aria-label="Sort trains" className="form-input min-h-0 w-auto py-2 text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}><option value="departure">Departure</option><option value="arrival">Arrival</option><option value="duration">Journey duration</option><option value="fare">Lowest fare</option></select></label>
              </div>
              {favoriteError && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{favoriteError}</p>}
              {visibleTrains.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600"><p>No trains match these filters.</p><button type="button" onClick={() => { setClassFilter('All'); setDepartureFilter('Any'); setArrivalFilter('Any'); setMinFare(''); setMaxFare(''); setTrainTypeFilter('All'); }} className="mt-3 font-semibold text-teal-800 underline">Clear filters</button></div>}
              {visibleTrains.map(train => (
                <TrainCard key={train.trainId} train={train} onBook={handleBookNow} journey={searchParams} onExternalConfirm={confirmExternalBooking} searchClass={searchParams.seatClass} favourite={favouriteIds.includes(train.trainId)} onFavourite={toggleFavourite} />
              ))}
            </section>
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

function durationMinutes(value = '') {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value);
  const hours = text.match(/(\d+)\s*h/i);
  const minutes = text.match(/(\d+)\s*m/i);
  return Number(hours?.[1] || 0) * 60 + Number(minutes?.[1] || 0);
}

function TrainCard({ train, onBook, journey, onExternalConfirm, searchClass, favourite, onFavourite }) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleStops, setScheduleStops] = useState(null);
  const [coachComposition, setCoachComposition] = useState(null);
  const [coachError, setCoachError] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [externalClass, setExternalClass] = useState(searchClass || 'SL');
  const [externalAvailability, setExternalAvailability] = useState(null);
  const [externalFare, setExternalFare] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [externalPassengers, setExternalPassengers] = useState([{ name: '', age: '', gender: 'Female' }]);
  const [activeExternalPassenger, setActiveExternalPassenger] = useState(0);
  const [activeExternalCoach, setActiveExternalCoach] = useState('');
  const [selectedExternalSeats, setSelectedExternalSeats] = useState([]);
  const [confirmedExternalSeat, setConfirmedExternalSeat] = useState(null);
  const [showDemoPayment, setShowDemoPayment] = useState(false);
  const [demoPaymentStep, setDemoPaymentStep] = useState('summary');
  const [demoPaymentMethod, setDemoPaymentMethod] = useState('GPay');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [reservedExternalSeats, setReservedExternalSeats] = useState({});

  const completeExternalPayment = async () => {
    if (!confirmedExternalSeat || !displayedExternalCoach) return;
    setBookingSubmitting(true);
    setBookingError('');
    try {
      const { data } = await onExternalConfirm({
        trainNumber: train.trainNumber, trainName: train.name, date: journey.date,
        from: { code: train.boardingStation.code, name: train.boardingStation.name || journey.fromName },
        to: { code: train.deboardingStation.code, name: train.deboardingStation.name || journey.toName },
        coach: confirmedExternalSeat.coach, seatClass: displayedExternalCoach.classType,
        capacity: displayedExternalCoach.totalBerths, seats: confirmedExternalSeat.seats,
        passengers: externalPassengers, departureTime: train.boardingStation.departureTime,
        arrivalTime: train.deboardingStation.arrivalTime, distanceKm: train.distanceKm,
        paymentMethod: demoPaymentMethod
      });
      setConfirmedBooking(data.booking);
      setReservedExternalSeats(current => ({ ...current, [confirmedExternalSeat.coach]: [...new Set([...(current[confirmedExternalSeat.coach] || []), ...confirmedExternalSeat.seats])] }));
      setDemoPaymentStep('confirmed');
    } catch (error) {
      setBookingError(error.response?.data?.message || error.message || 'Could not reserve these seats. Please try again.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const checkExternalAvailability = async () => {
    setAvailabilityLoading(true);
    setAvailabilityError('');
    try {
      const params = {
        from: train.boardingStation.code,
        to: train.deboardingStation.code,
        date: journey.date,
        seatClass: externalClass,
        quota: 'GN'
      };
      const [availabilityResult, fareResult] = await Promise.allSettled([
        axios.get(`/api/trains/external/${encodeURIComponent(train.trainNumber)}/seats`, { params }),
        axios.get(`/api/trains/external/${encodeURIComponent(train.trainNumber)}/fare`, { params })
      ]);
      if (availabilityResult.status !== 'fulfilled') throw availabilityResult.reason;
      const calendar = availabilityResult.value.data.availability?.calendar || [];
      setExternalAvailability(calendar.find(item => item.rawDate === journey.date || item.date === journey.date) || calendar[0] || null);
      setExternalFare(fareResult.status === 'fulfilled' ? fareResult.value.data.fare?.breakdown || null : null);
    } catch (error) {
      setExternalAvailability(null);
      setExternalFare(null);
      setAvailabilityError(error.response?.data?.message || 'Live seat availability is unavailable for this train and class.');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const toggleSchedule = async () => {
    if (showSchedule) {
      setShowSchedule(false);
      return;
    }
    setShowSchedule(true);
    const isExternal = train.dataSource === 'railradar';
    if (scheduleStops && (!isExternal || coachComposition)) return;
    setScheduleLoading(true);
    setScheduleError('');
    setCoachError('');
    const scheduleEndpoint = isExternal
      ? `/api/trains/external/${encodeURIComponent(train.trainNumber)}/schedule`
      : `/api/trains/${encodeURIComponent(train.trainId)}/route`;
    const requests = [axios.get(scheduleEndpoint)];
    if (isExternal) {
      requests.push(axios.get(`/api/trains/external/${encodeURIComponent(train.trainNumber)}/coaches`));
      requests.push(axios.get('/api/bookings/external/reserved', { params: { trainNumber: train.trainNumber, date: journey.date } }));
    }
    const [scheduleResult, coachResult, reservedResult] = await Promise.allSettled(requests);
    if (scheduleResult.status === 'fulfilled') {
      const data = scheduleResult.value.data;
      const stops = isExternal ? data.schedule?.route : data.route?.stops;
      if (Array.isArray(stops)) setScheduleStops(stops);
      else setScheduleError('This train schedule is not available from the selected data source.');
    } else {
      const err = scheduleResult.reason;
      setScheduleError(err.response?.data?.message || err.message || 'Could not load this train schedule.');
    }
    if (isExternal && coachResult) {
      if (coachResult.status === 'fulfilled') {
        const composition = coachResult.value.data.coaches;
        setCoachComposition(composition);
        setActiveExternalCoach(composition?.rake?.find(coach => coach.hasSeats)?.code || '');
      }
      else {
        const err = coachResult.reason;
        setCoachError(err.response?.data?.message || err.message || 'Coach composition is not available.');
      }
    }
    if (isExternal && reservedResult?.status === 'fulfilled') setReservedExternalSeats(reservedResult.value.data.reserved || {});
    setScheduleLoading(false);
  };

  // Sort classes to show preferred class first
  const classes = [...(train.classes || [])].sort((a, b) => {
    if (a === searchClass) return -1;
    if (b === searchClass) return 1;
    return 0;
  });
  const rakeCoaches = coachComposition?.rake || coachComposition?.legs?.[0]?.coaches || [];
  const coachBlueprints = coachComposition?.blueprints || {};
  const selectableExternalCoaches = rakeCoaches.filter(coach => coach.hasSeats && coach.totalBerths > 0);
  const displayedExternalCoach = selectableExternalCoaches.find(coach => coach.code === activeExternalCoach) || selectableExternalCoaches[0];
  const externalSeatTypes = displayedExternalCoach?.classType === '2A' ? ['LB', 'UB', 'SLB', 'SUB'] : displayedExternalCoach?.classType === '1A' ? ['LB', 'UB'] : ['LB', 'MB', 'UB', 'SLB', 'SUB'];
  const externalSeats = displayedExternalCoach ? Array.from({ length: displayedExternalCoach.totalBerths }, (_, index) => ({ number: index + 1, type: ['CC', '2S'].includes(displayedExternalCoach.classType) ? 'Seat' : externalSeatTypes[index % externalSeatTypes.length] })) : [];
  const externalPassengerReady = externalPassengers.every(passenger => passenger.name.trim().length >= 2 && Number.isInteger(Number(passenger.age)) && Number(passenger.age) >= 1 && Number(passenger.age) <= 120);
  const demoFare = (externalFare?.totalFare || 420) * externalPassengers.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      
      {/* Top Details */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between">
        <div className="mb-4 md:mb-0">
          <div className="flex items-center space-x-3 mb-1">
            <h3 className="text-lg font-bold text-slate-800">{train.name}</h3>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold">#{train.trainNumber}</span>
            <button type="button" title={favourite ? 'Remove from favourites' : 'Add to favourites'} onClick={() => onFavourite(train.trainId)} className="p-1 text-rose-600"><Heart className={`h-4 w-4 ${favourite ? 'fill-current' : ''}`} /></button>
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
                 <span key={day} className={`text-[10px] font-bold ${(train.runningDays || []).includes(day) ? 'text-slate-700' : 'text-slate-300'}`}>
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
      {classes.length > 0 ? <div className="p-4 bg-slate-50 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {classes.map(cls => {
          const details = train.classDetails[cls];
          if (!details) return null;
          
          const isAvail = details.availableSeats > 0;
          const statusText = isAvail ? `${details.availableSeats} sample seats` : 'SAMPLE INVENTORY FULL';
          const statusColor = isAvail ? 'text-emerald-600' : 'text-orange-500';
          const bgColor = cls === searchClass ? 'bg-teal-50 border-teal-200 ring-1 ring-teal-200' : 'bg-white border-slate-200 hover:border-[#0f766e]';

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
      </div> : <div className="space-y-3 bg-blue-50 p-4 text-sm text-blue-900"><p>External timetable result · {train.trainType || 'Train'}{train.distanceKm ? ` · ${train.distanceKm} km` : ''}{train.totalHalts ? ` · ${train.totalHalts} stops` : ''}.</p>{train.usedDateFallback && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">The provider returned no direct result for this date, so this scheduled train is shown as a fallback. {train.runsOnRequestedDate ? 'Check live seats before travelling.' : 'It may not run on the selected day.'}</p>}<p className="text-xs text-blue-950">Open <strong>View full schedule</strong> below to load the coach layout and choose a demo seat.</p></div>}

      <div className="border-t border-slate-100">
        <button type="button" onClick={toggleSchedule} aria-expanded={showSchedule} className="w-full px-5 py-3 flex items-center justify-between text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f766e]">
          <span>View full schedule <span className="ml-2 text-xs font-normal text-slate-500">{train.dataSource === 'railradar' ? 'external timetable' : 'sample timetable'}</span></span>
          {showSchedule ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showSchedule && <div className="px-4 pb-4">
          {scheduleLoading ? <p role="status" className="py-4 text-center text-sm text-slate-500">Loading schedule…</p>
            : scheduleError ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{scheduleError}</p>
              : scheduleStops && <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Stop</th><th className="px-3 py-2">Arrival</th><th className="px-3 py-2">Departure</th><th className="px-3 py-2">Day</th><th className="px-3 py-2">Distance</th></tr></thead>
                  <tbody>{scheduleStops.map((stop, index) => {
                    const station = stop.station || {};
                    const arrival = stop.arrivalTime ?? stop.arrival;
                    const departure = stop.departureTime ?? stop.departure;
                    const day = stop.arrivalDay ?? stop.dayNumber ?? stop.departureDay;
                    const distance = stop.distanceKm ?? stop.distance;
                    return <tr key={`${station.code || station._id || index}-${index}`} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-800">{station.name || 'Station unavailable'} <span className="text-xs text-slate-500">{station.code ? `(${station.code})` : ''}</span></td>
                      <td className="px-3 py-2 text-slate-600">{index === 0 ? '—' : arrival || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{index === scheduleStops.length - 1 ? '—' : departure || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{day ? `Day ${day}` : '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{Number.isFinite(Number(distance)) ? `${distance} km` : '—'}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>}
          {train.dataSource === 'railradar' && <section className="mt-5 border-t border-slate-200 pt-4" aria-label="External coach composition">
            <div className="flex flex-wrap items-end justify-between gap-2"><div><h4 className="font-semibold text-slate-800">Coach composition</h4><p className="mt-1 text-xs text-slate-500">Provider timetable data · not seat availability</p></div>{coachComposition?.totalCoaches && <span className="text-xs font-medium text-slate-500">{coachComposition.totalCoaches} coaches</span>}</div>
            {coachError ? <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{coachError}</p> : rakeCoaches.length > 0 ? <>
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Train coach sequence">{rakeCoaches.map((coach, index) => <span key={`${coach.position || index}-${coach.code}`} title={`${coach.className || coach.classType}${coach.hasSeats ? ` · ${coach.totalBerths} representative berths` : ''}`} className={`rounded-md border px-2.5 py-1.5 text-xs ${coach.hasSeats ? 'border-blue-200 bg-blue-50 text-blue-950' : 'border-slate-200 bg-slate-50 text-slate-600'}`}><strong>{coach.code}</strong>{coach.classType && <span className="ml-1.5">{coach.classType}</span>}{coach.totalBerths > 0 && <span className="ml-1.5 text-[10px]">· {coach.totalBerths}</span>}</span>)}</div>
              {selectableExternalCoaches.length > 0 && <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4"><div className="flex flex-wrap items-center gap-2">{externalPassengers.map((passenger, index) => <button type="button" key={index} onClick={() => setActiveExternalPassenger(index)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${activeExternalPassenger === index ? 'border-teal-700 bg-teal-700 text-white' : 'border-teal-200 bg-white text-teal-950'}`}>Passenger {index + 1}</button>)}{externalPassengers.length < 6 && <button type="button" onClick={() => { setExternalPassengers(current => [...current, { name: '', age: '', gender: 'Female' }]); setActiveExternalPassenger(externalPassengers.length); }} className="rounded-lg border border-dashed border-teal-500 px-3 py-2 text-xs font-semibold text-teal-800">+ Add passenger</button>}</div><div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold text-teal-950">Name<input value={externalPassengers[activeExternalPassenger].name} onChange={event => setExternalPassengers(current => current.map((passenger, index) => index === activeExternalPassenger ? { ...passenger, name: event.target.value } : passenger))} className="form-input mt-1 block bg-white text-sm" /></label><label className="text-xs font-semibold text-teal-950">Age<input type="number" min="1" max="120" value={externalPassengers[activeExternalPassenger].age} onChange={event => setExternalPassengers(current => current.map((passenger, index) => index === activeExternalPassenger ? { ...passenger, age: event.target.value } : passenger))} className="form-input mt-1 block bg-white text-sm" /></label><label className="text-xs font-semibold text-teal-950">Gender<select value={externalPassengers[activeExternalPassenger].gender} onChange={event => setExternalPassengers(current => current.map((passenger, index) => index === activeExternalPassenger ? { ...passenger, gender: event.target.value } : passenger))} className="form-input mt-1 block bg-white text-sm"><option>Female</option><option>Male</option><option>Other</option></select></label></div><label className="mt-3 block text-xs font-semibold text-teal-950">Coach<select value={displayedExternalCoach?.code || ''} onChange={event => { setActiveExternalCoach(event.target.value); setSelectedExternalSeats([]); setConfirmedExternalSeat(null); }} className="form-input mt-1 block bg-white text-sm">{selectableExternalCoaches.map(coach => <option key={coach.code} value={coach.code}>{coach.code} · {coach.classType} · {coach.totalBerths} seats</option>)}</select></label>{!externalPassengerReady ? <p className="mt-3 rounded-lg bg-white p-3 text-xs text-teal-950">Enter valid details for every passenger before selecting seats.</p> : <><div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8">{externalSeats.map(seat => { const lowerBerthRestricted = seat.type === 'LB' && externalPassengers[activeExternalPassenger].gender !== 'Female'; const selected = selectedExternalSeats[activeExternalPassenger] === seat.number; const usedByAnotherPassenger = selectedExternalSeats.some((chosen, index) => index !== activeExternalPassenger && chosen === seat.number); const alreadyBooked = (reservedExternalSeats[displayedExternalCoach.code] || []).includes(seat.number); return <button type="button" key={seat.number} disabled={lowerBerthRestricted || usedByAnotherPassenger || alreadyBooked} onClick={() => setSelectedExternalSeats(current => { const next = [...current]; next[activeExternalPassenger] = selected ? null : seat.number; return next; })} className={`min-h-11 rounded-lg border text-xs font-semibold ${lowerBerthRestricted || usedByAnotherPassenger || alreadyBooked ? 'cursor-not-allowed border-rose-200 bg-rose-100 text-rose-800' : selected ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-800'}`}>{seat.number}<span className="block text-[9px] font-normal">{alreadyBooked ? 'Booked' : usedByAnotherPassenger ? 'Selected' : seat.type}</span></button>; })}</div>{selectedExternalSeats.filter(Number.isInteger).length === externalPassengers.length && <button type="button" onClick={() => setConfirmedExternalSeat({ coach: displayedExternalCoach.code, seats: selectedExternalSeats })} className="btn-primary mt-4 px-4">Confirm selected seats</button>}{confirmedExternalSeat && <p role="status" className="mt-3 rounded-lg bg-emerald-100 p-3 text-xs font-semibold text-emerald-950">Seats selected: {confirmedExternalSeat.coach}/{confirmedExternalSeat.seats.join(', ')}. They will be reserved after payment.</p>}</>}</div>}
              {Object.keys(coachBlueprints).length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{Object.entries(coachBlueprints).map(([classCode, blueprint]) => <div key={classCode} className="rounded-lg border border-slate-200 p-3"><div className="flex justify-between gap-2 text-xs"><strong className="text-slate-800">{classCode} · {blueprint.className || 'Coach layout'}</strong><span className="text-slate-500">{blueprint.totalBerths || '—'} berths</span></div>{blueprint.cabins?.slice(0, 2).map((cabin, cabinIndex) => <p key={cabin.cabinNumber || cabinIndex} className="mt-2 text-[11px] text-slate-600">Bay {cabin.cabinNumber || cabinIndex + 1}: {[...(cabin.main || []), ...(cabin.side || [])].map(berth => `${berth.number} ${berth.type}`).join(' · ')}</p>)}</div>)}</div>}
            </> : <p className="mt-3 text-xs text-slate-500">Coach composition is not available for this train.</p>}
            <p className="mt-3 text-[11px] text-slate-500">Coach sequence and berth layout are informational provider data. Available/booked seats remain simulated separately in this project.</p>
          </section>}
          {confirmedExternalSeat && <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4"><p className="text-sm font-semibold text-teal-950">Total demo fare: ₹{demoFare}</p><button type="button" onClick={() => { setShowDemoPayment(true); setDemoPaymentStep('summary'); }} className="btn-primary mt-3 px-4">Proceed to payment</button></div>}
          {showDemoPayment && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><button type="button" disabled={bookingSubmitting} onClick={() => setShowDemoPayment(false)} className="float-right text-slate-500">Close</button>{demoPaymentStep === 'summary' ? <><h3 className="text-xl font-bold">Booking summary</h3><p className="mt-3 text-sm">{externalPassengers.length} passenger(s) · {confirmedExternalSeat?.coach}/{confirmedExternalSeat?.seats.join(', ')}</p><p className="mt-2 text-2xl font-bold">₹{demoFare}</p><p className="mt-2 text-xs text-slate-500">This is a simulated payment. The seats lock only after payment succeeds.</p><button type="button" onClick={() => setDemoPaymentStep('method')} className="btn-primary mt-5 w-full">Next</button></> : demoPaymentStep === 'method' ? <><h3 className="text-xl font-bold">Choose payment method</h3><div className="mt-4 grid grid-cols-2 gap-2">{['GPay', 'PhonePe', 'Net Banking', 'Credit / Debit Card'].map(method => <button type="button" key={method} onClick={() => setDemoPaymentMethod(method)} className={`rounded-lg border p-3 text-sm font-semibold ${demoPaymentMethod === method ? 'border-teal-700 bg-teal-50' : 'border-slate-200'}`}>{method}</button>)}</div>{bookingError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{bookingError}</p>}<button type="button" disabled={bookingSubmitting} onClick={completeExternalPayment} className="btn-primary mt-5 w-full">{bookingSubmitting ? 'Reserving seats…' : `Pay ₹${demoFare}`}</button></> : <><h3 className="text-xl font-bold text-emerald-700">Ticket confirmed</h3><p className="mt-3 text-sm">Demo payment via {demoPaymentMethod} successful. Your selected seats are now reserved.</p><p className="mt-2 text-sm font-semibold">PNR: {confirmedBooking?.pnr}</p><p className="mt-2 text-xs text-slate-500">No real payment was charged and no IRCTC ticket was issued. You can cancel this simulated reservation from My Bookings; cancellation releases the seats.</p><Link to="/dashboard#bookings" onClick={() => setShowDemoPayment(false)} className="btn-primary mt-5 block w-full text-center">View My Bookings</Link></>}</div></div>}
          <p className="mt-2 text-xs text-slate-500">{train.dataSource === 'railradar' ? 'External timetable information. Verify with official railway sources before travel.' : 'Sample timetable for demonstration; timings are not verified railway information.'}</p>
        </div>}
      </div>
      
    </div>
  );
}
