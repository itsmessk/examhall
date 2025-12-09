import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getSeatingById } from '../api';
import './SeatingDetailPage.css';

const SeatingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seating, setSeating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(0);

  useEffect(() => {
    fetchSeating();
  }, [id]);

  const fetchSeating = async () => {
    try {
      setLoading(true);
      const response = await getSeatingById(id);
      setSeating(response.data);
    } catch (err) {
      console.error('Error fetching seating:', err);
      setError(err.response?.data?.message || 'Error fetching seating');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading seating arrangement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !seating) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <div className="alert alert-error">{error || 'Seating not found'}</div>
          <button className="btn btn-secondary" onClick={() => navigate('/seating')}>
            Back to List
          </button>
        </div>
      </div>
    );
  }

  const currentRoom = seating.rooms[selectedRoom];

  return (
    <div className="seating-detail-page">
      <Navbar />
      
      <div className="container">
        <div className="page-header no-print">
          <div>
            <h1>{seating.examName}</h1>
            <p className="exam-date">
              Date: {new Date(seating.examDate).toLocaleDateString()}
            </p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => navigate('/seating')}>
              Back to List
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              🖨️ Print
            </button>
          </div>
        </div>

        <div className="card no-print">
          <h2>Exam Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Exam Name:</span>
              <span className="info-value">{seating.examName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Exam Date:</span>
              <span className="info-value">{new Date(seating.examDate).toLocaleDateString()}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Rooms:</span>
              <span className="info-value">{seating.rooms.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Created By:</span>
              <span className="info-value">{seating.createdBy?.name || 'Unknown'}</span>
            </div>
          </div>

          {seating.includedClasses && seating.includedClasses.length > 0 && (
            <div className="included-classes">
              <h3>Included Classes:</h3>
              <div className="class-badges">
                {seating.includedClasses.map((cls, idx) => (
                  <span key={idx} className="class-badge">
                    {cls.displayName || `${cls.branch} ${cls.section}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="room-tabs no-print">
          {seating.rooms.map((room, idx) => (
            <button
              key={idx}
              className={`room-tab ${selectedRoom === idx ? 'active' : ''}`}
              onClick={() => setSelectedRoom(idx)}
            >
              {room.roomName}
            </button>
          ))}
        </div>

        {currentRoom && (
          <div className="room-display">
            <div className="room-header">
              <h2>Room: {currentRoom.roomName}</h2>
              <p className="room-capacity">
                Occupied: {countOccupiedSeats(currentRoom.layout)} seats
              </p>
            </div>

            <div className="seating-grid-wrapper">
              <table className="seating-grid">
                <thead>
                  <tr>
                    <th className="row-header">Row/Col</th>
                    {currentRoom.layout[0] && currentRoom.layout[0].map((_, colIdx) => (
                      <th key={colIdx}>C{colIdx + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentRoom.layout.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td className="row-header"><strong>R{rowIdx + 1}</strong></td>
                      {row.map((seat, colIdx) => (
                        <td
                          key={colIdx}
                          className={seat ? `seat-filled branch-${seat.branch}` : 'seat-empty'}
                        >
                          {seat ? (
                            <div className="seat-info">
                              <div className="seat-reg">{seat.registerNumber}</div>
                              <div className="seat-branch">{seat.branch}-{seat.section}</div>
                            </div>
                          ) : (
                            <div className="empty-label">Empty</div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="room-stats">
              <h3>Branch Distribution</h3>
              <BranchDistribution layout={currentRoom.layout} />
            </div>
          </div>
        )}

        {/* Print view - show all rooms */}
        <div className="print-only">
          {seating.rooms.map((room, idx) => (
            <div key={idx} className="print-room">
              <div className="print-header">
                <h1>{seating.examName}</h1>
                <p>Date: {new Date(seating.examDate).toLocaleDateString()}</p>
                <h2>Room: {room.roomName}</h2>
              </div>

              <table className="seating-grid">
                <thead>
                  <tr>
                    <th>Row/Col</th>
                    {room.layout[0] && room.layout[0].map((_, colIdx) => (
                      <th key={colIdx}>C{colIdx + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {room.layout.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td className="row-header"><strong>R{rowIdx + 1}</strong></td>
                      {row.map((seat, colIdx) => (
                        <td
                          key={colIdx}
                          className={seat ? `seat-filled branch-${seat.branch}` : 'seat-empty'}
                        >
                          {seat ? (
                            <div className="seat-info">
                              <div className="seat-reg">{seat.registerNumber}</div>
                              <div className="seat-branch">{seat.branch}-{seat.section}</div>
                            </div>
                          ) : (
                            <div className="empty-label">-</div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="page-break"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper component for branch distribution
const BranchDistribution = ({ layout }) => {
  const branchCounts = {};
  
  layout.forEach(row => {
    row.forEach(seat => {
      if (seat && seat.branch) {
        branchCounts[seat.branch] = (branchCounts[seat.branch] || 0) + 1;
      }
    });
  });
  
  return (
    <div className="branch-stats">
      {Object.entries(branchCounts).map(([branch, count]) => (
        <div key={branch} className={`branch-stat branch-${branch}`}>
          <span className="branch-name">{branch}</span>
          <span className="branch-count">{count}</span>
        </div>
      ))}
    </div>
  );
};

// Helper function
const countOccupiedSeats = (layout) => {
  let count = 0;
  layout.forEach(row => {
    row.forEach(seat => {
      if (seat) count++;
    });
  });
  return count;
};

export default SeatingDetailPage;
