import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Ticket, Search, MapPin, UserRound, Train } from 'lucide-react';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthContext } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import SearchResultsPage from './pages/SearchResultsPage';
import BookingPage from './pages/BookingPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import LiveTrackerPage from './pages/LiveTrackerPage';
import PNRPage from './pages/PNRPage';
import AdminPage from './pages/AdminPage';

function WorkspaceNavigation() {
  const location = useLocation();
  const links = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Find trains', to: '/', icon: Search },
    { label: 'My bookings', to: '/dashboard#bookings', icon: Ticket },
    { label: 'PNR enquiry', to: '/pnr', icon: Train },
    { label: 'Running status', to: '/tracker', icon: MapPin },
    { label: 'Profile & passengers', to: '/profile', icon: UserRound }
  ];
  const active = to => to === '/dashboard#bookings'
    ? (location.pathname === '/dashboard' && location.hash === '#bookings') || location.pathname.startsWith('/booking')
    : to === '/'
      ? location.pathname === '/'
      : location.pathname === to || (to === '/dashboard' && (location.pathname === '/dashboard' && location.hash !== '#bookings' || location.pathname.startsWith('/booking')));

  return (
    <aside className="workspace-nav" aria-label="Your workspace">
      <div className="workspace-nav-heading">
        <span className="workspace-nav-kicker">PASSENGER SPACE</span>
        <h2>Your journeys</h2>
      </div>
      <nav className="workspace-nav-links">
        {links.map(({ label, to, icon: Icon }) => (
          <Link key={label} to={to} className={`workspace-nav-link${active(to) ? ' is-active' : ''}`}>
            <Icon aria-hidden="true" size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="workspace-nav-note">
        <span className="workspace-note-mark"><Train size={16} /></span>
        <p>Sample timetable and simulated reservations</p>
      </div>
    </aside>
  );
}

function AppRoutes() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const workspace = Boolean(user) && (
    location.pathname === '/dashboard' ||
    location.pathname.startsWith('/booking') ||
    location.pathname === '/profile'
  );

  return (
    <main className={`app-main${workspace ? ' has-workspace' : ''}`}>
      {workspace && <WorkspaceNavigation />}
      <div className={workspace ? 'app-route-content' : 'app-route-content app-route-content-wide'}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/tracker" element={<LiveTrackerPage />} />
          <Route path="/pnr" element={<PNRPage />} />
          <Route path="/booking" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
          <Route path="/booking/confirmation/:id" element={<ProtectedRoute><BookingConfirmationPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminPage /></ProtectedRoute>} />
        </Routes>
      </div>
    </main>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <BookingProvider>
          <div className="app-frame flex flex-col min-h-screen bg-[#f2efe8] font-sans text-slate-900">
            <Navbar />
            <AppRoutes />
            <Footer />
          </div>
        </BookingProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
