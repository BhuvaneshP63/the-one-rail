import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Train, LayoutDashboard, MapPin, Search, User, LogOut, Shield, Menu, X, Bell } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = async () => {
    if (!user) return;
    try { const response = await axios.get('/api/auth/notifications'); setNotifications(response.data.notifications || []); }
    catch { setNotifications([]); }
  };
  useEffect(() => { loadNotifications(); }, [user?.id, user?._id]);

  const markRead = async (notification) => {
    if (notification.read) return;
    try { await axios.put(`/api/auth/notifications/${notification._id}/read`); setNotifications(current => current.map(item => item._id === notification._id ? { ...item, read: true } : item)); }
    catch { /* keep the notice unread so the user can retry */ }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(item => !item.read);
    try {
      await Promise.all(unread.map(item => axios.put(`/api/auth/notifications/${item._id}/read`)));
      setNotifications(current => current.map(item => ({ ...item, read: true })));
    } catch { /* retain unread indicators if one update fails */ }
  };

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, authRequired: true },
    { name: 'Live Tracker', path: '/tracker', icon: MapPin, authRequired: false },
    { name: 'PNR Checker', path: '/pnr', icon: Search, authRequired: false }
  ];

  return (
    <nav className="site-nav sticky top-0 z-40 border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="brand-link flex items-center space-x-2 text-primary">
              <div className="brand-mark rounded-md border p-2">
                <Train className="h-5 w-5" />
              </div>
              <span className="brand-name font-heading font-semibold text-xl tracking-tight">
                The One Rail
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => {
              if (link.authRequired && !user) return null;
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive(link.path)
                      ? 'bg-[#a33c32] text-white'
                      : 'text-[#4b544e] hover:bg-[#f5e8e3] hover:text-[#a33c32]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}

            {/* Admin Portal Shortcut */}
            {user && user.role === 'admin' && (
              <Link
                to="/admin"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  isActive('/admin')
                    ? 'text-[#a33c32] bg-[#f5e8e3]'
                    : 'text-[#4b544e] hover:text-[#a33c32] hover:bg-[#f5e8e3]'
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>Admin Panel</span>
              </Link>
            )}
          </div>

          {/* Action Buttons & Profile */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                {/* Notification Bell */}
                <div className="relative">
                  <button 
                    onClick={() => { const open = !notifOpen; setNotifOpen(open); if (open) loadNotifications(); }}
                    aria-label={`Notifications${notifications.some(item => !item.read) ? ', unread items' : ''}`}
                    aria-expanded={notifOpen}
                    aria-haspopup="true"
                    className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8ef73]"
                  >
                    <Bell className="h-5 w-5" />
                    {notifications.some(item => !item.read) && <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
                  </button>
                  
                  {notifOpen && (
                    <div role="region" aria-label="Recent notifications" className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-slate-100 text-sm">
                        <span className="font-semibold text-slate-800">Recent Notifications</span>
                        {notifications.some(item => !item.read) && <button type="button" onClick={markAllRead} className="min-h-9 text-xs font-semibold text-teal-800 hover:underline">Mark all read</button>}
                      </div>
                      <div className="max-h-60 overflow-y-auto px-4 py-2 text-xs text-slate-600 space-y-2">
                        {notifications.length ? notifications.map(notification => <button key={notification._id} onClick={() => markRead(notification)} className={`block w-full text-left p-2 rounded border ${notification.read ? 'bg-slate-50 border-slate-100' : 'bg-red-50 border-red-100'}`}><p className="font-semibold text-slate-800">{notification.title}</p><p className="text-slate-500">{notification.message}</p></button>) : <p className="py-4 text-center text-slate-500">No notifications yet.</p>}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Dropdown / Profile Link */}
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 rounded-full border border-white/15 bg-white/10 p-1 pr-3 transition hover:border-white/30 hover:bg-white/15"
                >
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt="Avatar"
                      className="h-8 w-8 rounded-full object-cover border border-slate-100"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-[#0f766e] text-white flex items-center justify-center font-bold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-white">{user.name.split(' ')[0]}</span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-white/75 hover:text-white text-sm font-medium px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                className="rounded-md bg-[#a33c32] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#812d27]"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-50"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="nav-mobile md:hidden border-t py-3 px-4 space-y-2">
          {navLinks.map((link) => {
            if (link.authRequired && !user) return null;
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 w-full p-2.5 rounded-md text-base font-medium ${
                  isActive(link.path)
                    ? 'bg-[#a33c32] text-white'
                    : 'text-[#4b544e] hover:text-[#a33c32] hover:bg-[#f5e8e3]'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{link.name}</span>
              </Link>
            );
          })}

          {user && user.role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 w-full p-2.5 rounded-md text-base font-medium text-[#a33c32] bg-[#f5e8e3]"
            >
              <Shield className="h-5 w-5" />
              <span>Admin Panel</span>
            </Link>
          )}

          {user && (
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 w-full p-2.5 rounded-md text-base font-medium text-[#4b544e] hover:bg-[#f5e8e3]"
            >
              <User className="h-5 w-5" />
              <span>My Profile</span>
            </Link>
          )}

          <div className="pt-4 border-t border-white/10 flex flex-col space-y-2">
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center justify-center space-x-2 w-full p-2.5 rounded-md text-base font-medium bg-[#a33c32] text-white"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full p-2.5 rounded-md border border-[#ded9cf] text-[#28352f] font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full p-2.5 rounded-md bg-[#a33c32] text-white font-semibold"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

