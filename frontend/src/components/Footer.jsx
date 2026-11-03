import React from 'react';
import { Link } from 'react-router-dom';
import { Train, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-main">
          <div className="site-footer-brand">
            <Link to="/" className="site-footer-logo"><span className="site-footer-mark"><Train size={19} /></span><span>The One Rail</span></Link>
            <p>A calmer way to plan a rail journey. Explore sample schedules and manage simulated reservations in one place.</p>
          </div>
          <div className="site-footer-column"><h2>Explore</h2><Link to="/">Find trains <ArrowUpRight size={14} /></Link><Link to="/tracker">Running status <ArrowUpRight size={14} /></Link><Link to="/pnr">PNR enquiry <ArrowUpRight size={14} /></Link></div>
          <div className="site-footer-column"><h2>Your account</h2><Link to="/dashboard">My bookings <ArrowUpRight size={14} /></Link><Link to="/profile">Profile & passengers <ArrowUpRight size={14} /></Link><Link to="/login">Sign in <ArrowUpRight size={14} /></Link></div>
        </div>
        <div className="site-footer-bottom"><span>© 2026 The One Rail</span><span className="site-footer-demo">Demonstration service · Timetables, availability, PNR and payments are simulated.</span></div>
      </div>
    </footer>
  );
}
