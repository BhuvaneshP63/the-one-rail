import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Map, MapPin, Navigation, Clock, AlertTriangle, Loader2, Search } from 'lucide-react';

export default function LiveTrackerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTrain = searchParams.get('train') || '';
  const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [trainInput, setTrainInput] = useState(initialTrain);
  const [dateInput, setDateInput] = useState(initialDate);
  
  const [trackerData, setTrackerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTrackingData = async (trainId, date) => {
    if (!trainId) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/tracker/${trainId}/${date}`);
      setTrackerData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Tracking data unavailable or train not found.');
      setTrackerData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTrain) {
      fetchTrackingData(initialTrain, initialDate);
      
      // Auto-refresh every 30 seconds if tracking
      const interval = setInterval(() => {
        fetchTrackingData(initialTrain, initialDate);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [initialTrain, initialDate]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!trainInput || !dateInput) return;
    setSearchParams({ train: trainInput, date: dateInput });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Search Header */}
        <div className="bg-[#1e293b] rounded-xl shadow-lg p-6 mb-8 text-white flex flex-col md:flex-row md:items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl font-bold font-heading flex items-center">
              <Navigation className="h-6 w-6 mr-2 text-[#C51E3A]" /> Live Train Tracker
            </h1>
            <p className="text-slate-400 text-sm mt-1">Real-time GPS running status</p>
          </div>
          
          <form onSubmit={handleSearch} className="flex space-x-2 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Train No / ID" 
              className="form-input text-sm w-32 text-slate-900"
              value={trainInput}
              onChange={(e) => setTrainInput(e.target.value)}
              required
            />
            <input 
              type="date" 
              className="form-input text-sm w-40 text-slate-900"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary px-4">
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>

        {loading && !trackerData && (
          <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-[#C51E3A]" /></div>
        )}

        {error && (
          <div className="bg-red-50 text-[#C51E3A] p-4 rounded-lg border border-red-100 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {trackerData && (
          <div className="space-y-6">
            
            {/* Status Summary Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                 <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center ${trackerData.status === 'Running' ? 'bg-emerald-100 text-emerald-700' : trackerData.status === 'Completed' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                   {trackerData.status === 'Running' && <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>}
                   {trackerData.status}
                 </span>
              </div>

              <h2 className="text-xl font-bold text-slate-800 mb-1">{trackerData.train.name} ({trackerData.train.trainNumber})</h2>
              <p className="text-sm text-slate-500 mb-6 font-medium">Journey Date: {trackerData.date}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Current Speed</div>
                    <div className="text-lg font-bold text-slate-800">{trackerData.currentSpeed} km/h</div>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Delay Status</div>
                    <div className={`text-lg font-bold ${trackerData.delayMinutes > 0 ? 'text-orange-500' : 'text-emerald-600'}`}>
                      {trackerData.delayMinutes > 0 ? `${trackerData.delayMinutes} mins late` : 'On Time'}
                    </div>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Next Station</div>
                    <div className="text-lg font-bold text-slate-800">{trackerData.nextStation?.station?.code || 'N/A'}</div>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Last Updated</div>
                    <div className="text-lg font-bold text-slate-800">{new Date(trackerData.lastUpdatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                 </div>
              </div>

              {/* Progress Bar Visualization */}
              <div className="relative pt-6 pb-2">
                <div className="flex justify-between mb-2 text-xs font-bold text-slate-500">
                  <span>{trackerData.schedule[0].station.code}</span>
                  <span>{trackerData.schedule[trackerData.schedule.length - 1].station.code}</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-[#C51E3A] rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${trackerData.progressPercentage}%` }}
                  ></div>
                </div>
                <div 
                  className="absolute top-4 -ml-3 transition-all duration-1000 ease-out"
                  style={{ left: `${trackerData.progressPercentage}%` }}
                >
                  <div className="bg-[#1e293b] text-white text-[10px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap mb-1">
                    {trackerData.progressPercentage.toFixed(1)}%
                  </div>
                  <Navigation className="h-6 w-6 text-[#1e293b] fill-current -ml-1 transform rotate-90" />
                </div>
              </div>
            </div>

            {/* Schedule Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center">
                <Map className="w-5 h-5 mr-2 text-slate-400" /> Route Schedule
              </h3>
              
              <div className="space-y-0 relative">
                {/* Timeline Line */}
                <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-200 z-0"></div>

                {trackerData.schedule.map((stop, idx) => {
                  const isPassed = trackerData.progressPercentage >= ((idx) / (trackerData.schedule.length - 1)) * 100;
                  const isNext = trackerData.nextStation?.station?._id === stop.station._id;

                  return (
                    <div key={stop._id} className={`relative z-10 flex items-start py-4 ${isPassed ? 'opacity-50' : ''} ${isNext ? 'bg-red-50 -mx-6 px-6 rounded-lg border-y border-red-100' : ''}`}>
                      <div className={`w-12 h-12 rounded-full border-4 border-white flex items-center justify-center flex-shrink-0 shadow-sm ${isNext ? 'bg-[#C51E3A]' : isPassed ? 'bg-slate-400' : 'bg-slate-200'}`}>
                        <MapPin className={`h-5 w-5 ${isNext ? 'text-white' : 'text-white'}`} />
                      </div>
                      
                      <div className="ml-4 flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className={`font-bold ${isNext ? 'text-[#C51E3A]' : 'text-slate-800'}`}>{stop.station.name}</h4>
                            <p className="text-xs font-semibold text-slate-500">{stop.station.code}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-700">Arr: {stop.arrivalTime}</div>
                            <div className="text-sm font-bold text-slate-700">Dep: {stop.departureTime}</div>
                          </div>
                        </div>
                        {isNext && trackerData.eta && (
                          <div className="mt-2 text-xs font-bold text-orange-600 flex items-center">
                            <Clock className="w-3 h-3 mr-1" /> ETA: {trackerData.eta}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
