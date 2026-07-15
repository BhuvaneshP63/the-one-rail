import React, { useContext, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Train, LayoutDashboard, MapPin, Search, User, LogOut, Shield, Menu, X, Bell } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

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
    <nav className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-primary">
              <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                <Train className="h-6 w-6 text-[#C51E3A]" />
              </div>
              <span className="font-heading font-extrabold text-xl tracking-tight text-slate-800">
                Rail Yatra
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
                      ? 'text-[#C51E3A] bg-red-50'
                      : 'text-slate-600 hover:text-[#C51E3A] hover:bg-slate-50'
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
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
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
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full focus:outline-none"
                  >
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                  </button>
                  
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-100 py-2 z-50">
                      <div className="px-4 py-2 border-b border-slate-100 font-semibold text-slate-700 text-sm">
                        Recent Notifications
                      </div>
                      <div className="max-h-60 overflow-y-auto px-4 py-2 text-xs text-slate-600 space-y-2">
                        <div className="p-2 bg-red-50 rounded border border-red-100">
                          <p className="font-semibold text-slate-800">Booking Confirmed</p>
                          <p className="text-slate-500">Your trip on Karnataka Express is locked. PNR: 4892014920.</p>
                        </div>
                        <div className="p-2 bg-slate-50 rounded">
                          <p className="font-semibold text-slate-800">Welcome onboard!</p>
                          <p className="text-slate-500">You are all set to search and book high speed luxury trains.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Dropdown / Profile Link */}
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 p-1 pr-3 rounded-full border border-slate-200 hover:bg-slate-50 transition"
                >
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt="Avatar"
                      className="h-8 w-8 rounded-full object-cover border border-slate-100"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-[#C51E3A] text-white flex items-center justify-center font-bold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-700">{user.name.split(' ')[0]}</span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 p-2 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-slate-600 hover:text-[#C51E3A] text-sm font-medium px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-sm px-4 py-2"
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
        <div className="md:hidden bg-white border-t border-slate-100 py-3 px-4 space-y-2">
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
                    ? 'text-[#C51E3A] bg-red-50'
                    : 'text-slate-600 hover:text-[#C51E3A] hover:bg-slate-50'
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
              className="flex items-center space-x-2 w-full p-2.5 rounded-md text-base font-medium text-indigo-600 bg-indigo-50"
            >
              <Shield className="h-5 w-5" />
              <span>Admin Panel</span>
            </Link>
          )}

          {user && (
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 w-full p-2.5 rounded-md text-base font-medium text-slate-600 hover:bg-slate-50"
            >
              <User className="h-5 w-5" />
              <span>My Profile</span>
            </Link>
          )}

          <div className="pt-4 border-t border-slate-100 flex flex-col space-y-2">
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center justify-center space-x-2 w-full p-2.5 rounded-md text-base font-medium bg-red-50 text-[#C51E3A]"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full p-2.5 rounded-md border border-slate-200 text-slate-700 font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full p-2.5 rounded-md bg-[#C51E3A] text-white font-medium shadow"
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

