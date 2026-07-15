import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, Navigation, Clock, AlertTriangle } from 'lucide-react';

export default function PNRPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPnr = searchParams.get('query') || '';
  
  const [pnrInput, setPnrInput] = useState(initialPnr);
  const [searching, setSearching] = useState(false);
  const [pnrResult, setPnrResult] = useState(initialPnr ? 'not_found' : null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!pnrInput || pnrInput.length !== 10) {
      alert("Please enter a valid 10-digit PNR.");
      return;
    }
    setSearchParams({ query: pnrInput });
    setSearching(true);
    
    // Simulate API call
    setTimeout(() => {
      setSearching(false);
      setPnrResult('not_found'); // Mocks a 404 for security reasons without auth
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-[#1e293b] rounded-xl shadow-lg p-8 text-center text-white mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
             <Search className="h-8 w-8 text-[#C51E3A]" />
          </div>
          <h1 className="text-3xl font-bold font-heading mb-2">Check PNR Status</h1>
          <p className="text-slate-300">Enter your 10-digit PNR number to check your current booking status and seat details.</p>
          
          <form onSubmit={handleSearch} className="mt-8 max-w-md mx-auto relative">
            <input 
              type="text" 
              className="w-full pl-6 pr-32 py-4 rounded-full text-slate-900 text-lg font-bold tracking-widest shadow-inner focus:outline-none focus:ring-2 focus:ring-[#C51E3A]"
              placeholder="Enter 10-digit PNR"
              value={pnrInput}
              onChange={(e) => setPnrInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
            <button 
              type="submit" 
              disabled={searching}
              className="absolute right-2 top-2 bottom-2 bg-[#C51E3A] hover:bg-red-700 text-white font-semibold rounded-full px-6 transition disabled:opacity-70"
            >
              {searching ? 'Checking...' : 'Check'}
            </button>
          </form>
        </div>

        {pnrResult === 'not_found' && !searching && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">PNR Not Found</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              We couldn't find any booking details for PNR <strong>{pnrInput}</strong>. 
              Please verify the number or log in to your dashboard to view your tickets securely.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
