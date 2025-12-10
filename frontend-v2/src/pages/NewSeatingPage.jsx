import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getClasses, getRooms, generateSeating } from '../api';
import { useAuth } from '../context/AuthContext';
import './NewSeatingPage.css';

const NewSeatingPage = () => {
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [classes, setClasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [classesRes, roomsRes] = await Promise.all([
        getClasses(),
        getRooms()
      ]);
      
      setClasses(classesRes.data);
      setRooms(roomsRes.data);
      
      // Select all rooms by default
      setSelectedRooms(roomsRes.data.map(r => r._id));
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Error loading data');
    }
  };

  const handleClassToggle = (classId) => {
    setSelectedClasses(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleRoomToggle = (roomId) => {
    setSelectedRooms(prev =>
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleSelectAllClasses = () => {
    if (selectedClasses.length === classes.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(classes.map(c => c._id));
    }
  };

  const handleSelectAllRooms = () => {
    if (selectedRooms.length === rooms.length) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms(rooms.map(r => r._id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAdmin) {
      setMessage({ type: 'error', text: 'Admin privileges required' });
      return;
    }

    if (selectedClasses.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one class' });
      return;
    }

    if (selectedRooms.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one room' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await generateSeating(
        examName,
        examDate,
        selectedClasses,
        selectedRooms
      );
      
      // UPDATED: Check for overflow students and show warning
      const { unassignedCount } = response.data;
      if (unassignedCount && unassignedCount > 0) {
        alert(`Warning: ${selectedStudentCount} students selected but only ${totalSeats} seats available. ${unassignedCount} students could not be seated.`);
      }
      
      // Redirect to view the generated seating
      navigate(`/seating/${response.data._id}`);
    } catch (err) {
      console.error('Error generating seating:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Error generating seating'
      });
    } finally {
      setLoading(false);
    }
  };

  // UPDATED: Group classes by branch and year for better organization
  const groupedClasses = classes.reduce((acc, cls) => {
    const key = `${cls.branch}-Year${cls.year}`;
    if (!acc[key]) {
      acc[key] = {
        branch: cls.branch,
        year: cls.year,
        classes: []
      };
    }
    acc[key].classes.push(cls);
    return acc;
  }, {});

  // Calculate totals
  const selectedStudentCount = classes
    .filter(c => selectedClasses.includes(c._id))
    .reduce((sum, c) => sum + c.studentCount, 0);

  const totalSeats = rooms
    .filter(r => selectedRooms.includes(r._id))
    .reduce((sum, r) => sum + r.capacity, 0);

  return (
    <div className="new-seating-page">
      <Navbar />
      
      <div className="container">
        <div className="page-header">
          <h1>Generate New Seating Arrangement</h1>
          <p>Select exam details, classes, and rooms</p>
        </div>

        {!isAdmin && (
          <div className="alert alert-error">
            You need admin privileges to generate seating arrangements.
          </div>
        )}

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="card">
            <h2>Exam Details</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="examName">Exam Name *</label>
                <input
                  type="text"
                  id="examName"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g., Mid Semester Exam 1"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="examDate">Exam Date *</label>
                <input
                  type="date"
                  id="examDate"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Select Classes</h2>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleSelectAllClasses}
              >
                {selectedClasses.length === classes.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {classes.length === 0 ? (
              <p className="no-data">No classes available. Please initialize system data.</p>
            ) : (
              <div className="classes-selection">
                {Object.entries(groupedClasses).map(([key, group]) => (
                  <div key={key} className="branch-group">
                    <h3 className="branch-label">{group.branch} - Year {group.year}</h3>
                    <div className="checkbox-grid">
                      {group.classes.map(cls => (
                        <label key={cls._id} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedClasses.includes(cls._id)}
                            onChange={() => handleClassToggle(cls._id)}
                          />
                          <span className="checkbox-text">
                            Section {cls.section} ({cls.studentCount} students)
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Select Rooms</h2>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleSelectAllRooms}
              >
                {selectedRooms.length === rooms.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {rooms.length === 0 ? (
              <p className="no-data">No rooms available. Please initialize system data.</p>
            ) : (
              <div className="checkbox-grid">
                {rooms.map(room => (
                  <label key={room._id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedRooms.includes(room._id)}
                      onChange={() => handleRoomToggle(room._id)}
                    />
                    <span className="checkbox-text">
                      {room.name} ({room.capacity} seats)
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="card summary-card">
            <h2>Summary</h2>
            <div className="summary-stats">
              <div className="stat-box">
                <div className="stat-value">{selectedClasses.length}</div>
                <div className="stat-label">Classes Selected</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{selectedStudentCount}</div>
                <div className="stat-label">Total Students</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{selectedRooms.length}</div>
                <div className="stat-label">Rooms Selected</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{totalSeats}</div>
                <div className="stat-label">Total Seats</div>
              </div>
            </div>
            
            {selectedStudentCount > totalSeats && (
              <div className="alert alert-warning">
                ⚠️ Warning: Students ({selectedStudentCount}) exceed available seats ({totalSeats}). 
                Some students may not be assigned.
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !isAdmin}
            >
              {loading ? 'Generating...' : 'Generate Seating Arrangement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewSeatingPage;
