import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getAllSeatings } from '../api';
import './SeatingListPage.css';

const SeatingListPage = () => {
  const [seatings, setSeatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSeatings();
  }, []);

  const fetchSeatings = async () => {
    try {
      setLoading(true);
      const response = await getAllSeatings();
      setSeatings(response.data);
    } catch (err) {
      console.error('Error fetching seatings:', err);
      setError(err.response?.data?.message || 'Error fetching seatings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading seatings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="seating-list-page">
      <Navbar />
      
      <div className="container">
        <div className="page-header">
          <h1>Seating Arrangements</h1>
          <Link to="/seating/new" className="btn btn-primary">
            + New Seating
          </Link>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {seatings.length === 0 ? (
          <div className="card">
            <div className="no-data">
              <h3>No seating arrangements found</h3>
              <p>Create your first seating arrangement to get started.</p>
              <Link to="/seating/new" className="btn btn-primary">
                Create New Seating
              </Link>
            </div>
          </div>
        ) : (
          <div className="seatings-table-wrapper">
            <table className="seatings-table">
              <thead>
                <tr>
                  <th>Exam Name</th>
                  <th>Date</th>
                  <th>Classes</th>
                  <th>Created By</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {seatings.map((seating) => (
                  <tr key={seating._id}>
                    <td className="exam-name">{seating.examName}</td>
                    <td>{new Date(seating.examDate).toLocaleDateString()}</td>
                    <td>
                      <div className="classes-list">
                        {seating.includedClasses && seating.includedClasses.length > 0 ? (
                          seating.includedClasses.slice(0, 3).map((cls, idx) => (
                            <span key={idx} className="class-badge">
                              {cls.branch} {cls.section}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted">All classes</span>
                        )}
                        {seating.includedClasses && seating.includedClasses.length > 3 && (
                          <span className="class-badge">+{seating.includedClasses.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td>{seating.createdBy?.name || 'Unknown'}</td>
                    <td>{new Date(seating.createdAt).toLocaleString()}</td>
                    <td>
                      <Link to={`/seating/${seating._id}`} className="btn btn-sm btn-view">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeatingListPage;
