import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          🎓 Exam Seating Manager
        </Link>
        
        <div className="navbar-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/classes">Classes</Link>
          <Link to="/seating">Seatings</Link>
          <Link to="/seating/new">New Seating</Link>
        </div>
        
        <div className="navbar-user">
          <span className="user-name">👤 {user?.name}</span>
          <span className="user-role">{user?.role}</span>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
