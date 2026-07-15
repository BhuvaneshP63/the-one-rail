import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Users, Ticket, IndianRupee, Loader2, AlertCircle } from 'lucide-react';

export default function AdminPage() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Basic protection
    if (!token || user?.role !== 'Admin') {
      navigate('/');
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await axios.get('/api/admin/stats');
        setStats(res.data.stats);
      } catch (err) {
        setError('Failed to load admin statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, user, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#C51E3A]" /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 text-center">
        <div className="bg-red-50 text-[#C51E3A] p-4 rounded-lg inline-flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" /> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      {/* Sidebar */}
      <div className="w-64 bg-[#1e293b] text-white flex-shrink-0 min-h-screen hidden md:block shadow-xl">
        <div className="p-6">
          <h2 className="text-xl font-bold font-heading mb-8 flex items-center">
            <LayoutDashboard className="w-5 h-5 mr-2 text-[#C51E3A]" /> Admin Portal
          </h2>
          <nav className="space-y-2">
            <a href="#" className="flex items-center px-4 py-3 bg-[#C51E3A] rounded-lg text-sm font-semibold transition">
              <LayoutDashboard className="w-4 h-4 mr-3" /> Dashboard
            </a>
            <a href="#" className="flex items-center px-4 py-3 hover:bg-slate-800 rounded-lg text-sm font-semibold text-slate-300 hover:text-white transition cursor-not-allowed opacity-50">
              <Ticket className="w-4 h-4 mr-3" /> Manage Bookings
            </a>
            <a href="#" className="flex items-center px-4 py-3 hover:bg-slate-800 rounded-lg text-sm font-semibold text-slate-300 hover:text-white transition cursor-not-allowed opacity-50">
              <Users className="w-4 h-4 mr-3" /> User Accounts
            </a>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Overview</h1>
            <p className="text-slate-500 text-sm mt-1">Platform analytics and metrics</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-4">
              <IndianRupee className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total Revenue</div>
            <div className="text-3xl font-bold text-slate-800 mt-1">₹{stats?.totalRevenue?.toLocaleString('en-IN') || 0}</div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center mb-4">
              <Ticket className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total Bookings</div>
            <div className="text-3xl font-bold text-slate-800 mt-1">{stats?.totalBookings || 0}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total Users</div>
            <div className="text-3xl font-bold text-slate-800 mt-1">{stats?.totalUsers || 0}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Refunds Issued</div>
            <div className="text-3xl font-bold text-slate-800 mt-1">₹{stats?.totalRefunds?.toLocaleString('en-IN') || 0}</div>
          </div>
        </div>

        {/* Notice */}
        <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl">
           <h3 className="font-bold text-blue-800 mb-2">Admin Modules Under Construction</h3>
           <p className="text-blue-600 text-sm">Full CRUD capabilities for Trains, Stations, and Users are handled via the backend API endpoints. The frontend views for these lists will be fully implemented in Phase 2 of the dashboard rollout.</p>
        </div>

      </div>
    </div>
  );
}
