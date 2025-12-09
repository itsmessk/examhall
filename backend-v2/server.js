/**
 * EXAM SEATING MANAGER - BACKEND SERVER v2.0
 * 
 * HOW TO RUN:
 * -----------
 * 1. Install dependencies: npm install
 * 2. Copy .env.example to .env and configure values
 * 3. Make sure MongoDB is running
 * 4. Start server: npm run dev (development) or npm start (production)
 * 5. Server runs on http://localhost:5000
 * 
 * FIRST-TIME SETUP:
 * ----------------
 * 1. Register first admin user using POST /api/auth/register with setupSecret
 * 2. Login to get JWT token
 * 3. Seed classes: POST /api/classes/seed
 * 4. Seed rooms: POST /api/rooms/seed
 * 5. Seed students: POST /api/students/seed
 * 6. Ready to generate seatings!
 * 
 * AUTHENTICATION:
 * --------------
 * - All API endpoints (except /api/auth/login and /api/auth/register) require JWT
 * - Include token in headers: Authorization: Bearer <token>
 * - Admin-only endpoints: seed operations, generating seatings
 */

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/classes', require('./routes/classRoutes'));
app.use('/api/seating', require('./routes/seatingRoutes'));

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Exam Seating Manager API v2.0',
    version: '2.0.0',
    features: ['Authentication', 'Class Filtering', 'Room Selection'],
    endpoints: {
      auth: '/api/auth',
      students: '/api/students',
      rooms: '/api/rooms',
      classes: '/api/classes',
      seating: '/api/seating'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}`);
});
