import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { getClasses } from '../api';
import './ClassesPage.css';

const ClassesPage = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await getClasses();
      setClasses(response.data);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError(err.response?.data?.message || 'Error fetching classes');
    } finally {
      setLoading(false);
    }
  };

  // UPDATED: Group classes by branch and year for better display
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

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading classes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="classes-page">
      <Navbar />
      
      <div className="container">
        <div className="page-header">
          <h1>Class Management</h1>
          <p>View all available classes and student counts</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {classes.length === 0 ? (
          <div className="card">
            <p className="no-data">No classes found. Please initialize system data from the dashboard.</p>
          </div>
        ) : (
          <div className="classes-grid">
            {Object.entries(groupedClasses).map(([key, group]) => (
              <div key={key} className="branch-card">
                <h2 className="branch-title">{group.branch} - Year {group.year}</h2>
                <div className="class-list">
                  {group.classes.map((cls) => (
                    <div key={cls._id} className="class-item">
                      <div className="class-info">
                        <h3>Section {cls.section}</h3>
                        <p className="class-name">{cls.displayName}</p>
                      </div>
                      <div className="class-stats">
                        <div className="stat">
                          <span className="stat-value">{cls.studentCount}</span>
                          <span className="stat-label">Students</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card summary-card">
          <h2>Summary</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Total Classes</span>
              <span className="summary-value">{classes.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Students</span>
              <span className="summary-value">
                {classes.reduce((sum, cls) => sum + cls.studentCount, 0)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Branches</span>
              <span className="summary-value">{Object.keys(groupedClasses).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassesPage;
