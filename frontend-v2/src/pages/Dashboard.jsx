import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { seedClasses, seedRooms, seedStudents } from '../api';
import './Dashboard.css';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleSeedAll = async () => {
    if (!isAdmin) {
      showMessage('error', 'Admin privileges required');
      return;
    }

    setLoading(true);
    try {
      // Seed classes
      const classResult = await seedClasses();
      console.log('Classes seeded:', classResult);

      // Seed rooms
      const roomResult = await seedRooms();
      console.log('Rooms seeded:', roomResult);

      // Seed students
      const studentResult = await seedStudents();
      console.log('Students seeded:', studentResult);

      // UPDATED: Show correct counts (14 classes, 10 rooms, 920 students)
      showMessage('success', `Successfully initialized system: ${classResult.count} classes, ${roomResult.count} rooms, ${studentResult.count} students!`);
    } catch (error) {
      console.error('Error seeding data:', error);
      showMessage('error', error.response?.data?.message || 'Error seeding data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-page">
      <Navbar />
      
      <div className="container">
        <div className="dashboard-header">
          <h1>Welcome, {user?.name}!</h1>
          <p className="subtitle">Exam Seating Management Dashboard</p>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {isAdmin && (
          <div className="card admin-card">
            <h2>🔧 System Setup (Admin)</h2>
            <p>Initialize the system with sample data for classes, rooms, and students.</p>
            <button 
              className="btn btn-secondary"
              onClick={handleSeedAll}
              disabled={loading}
            >
              {loading ? 'Initializing...' : 'Initialize System Data'}
            </button>
          </div>
        )}

        <div className="dashboard-grid">
          <div className="dashboard-card" onClick={() => navigate('/classes')}>
            <div className="card-icon">📚</div>
            <h3>Manage Classes</h3>
            <p>View and manage class groups</p>
          </div>

          <div className="dashboard-card" onClick={() => navigate('/seating/new')}>
            <div className="card-icon">✨</div>
            <h3>Generate Seating</h3>
            <p>Create new exam seating arrangement</p>
          </div>

          <div className="dashboard-card" onClick={() => navigate('/seating')}>
            <div className="card-icon">📋</div>
            <h3>View Seatings</h3>
            <p>Browse all seating arrangements</p>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📊</div>
            <h3>Statistics</h3>
            <p>View system statistics</p>
          </div>
        </div>

        <div className="card info-card">
          <h2>ℹ️ Quick Start Guide</h2>
          <ol>
            <li><strong>Initialize System:</strong> {isAdmin ? 'Click the button above to seed sample data' : 'Ask admin to initialize system data'}</li>
            <li><strong>View Classes:</strong> Check available classes and student counts</li>
            <li><strong>Generate Seating:</strong> Select classes and rooms, then generate arrangement</li>
            <li><strong>View Results:</strong> Browse and print seating charts</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
