import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClassesPage from './pages/ClassesPage';
import NewSeatingPage from './pages/NewSeatingPage';
import SeatingListPage from './pages/SeatingListPage';
import SeatingDetailPage from './pages/SeatingDetailPage';

// Styles
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />
          
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/classes"
            element={
              <ProtectedRoute>
                <ClassesPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/seating"
            element={
              <ProtectedRoute>
                <SeatingListPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/seating/new"
            element={
              <ProtectedRoute requireAdmin={true}>
                <NewSeatingPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/seating/:id"
            element={
              <ProtectedRoute>
                <SeatingDetailPage />
              </ProtectedRoute>
            }
          />
          
          {/* 404 Route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
