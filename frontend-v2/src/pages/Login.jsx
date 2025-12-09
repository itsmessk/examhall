import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin, register as apiRegister } from '../api';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        // Register
        const response = await apiRegister(name, email, password, setupSecret || undefined);
        login(response.token, response.user);
        navigate('/dashboard');
      } else {
        // Login
        const response = await apiLogin(email, password);
        login(response.token, response.user);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(isRegisterMode ? 'Registration error:' : 'Login error:', err);
      setError(err.response?.data?.message || `${isRegisterMode ? 'Registration' : 'Login'} failed. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
    setSetupSecret('');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🎓 Exam Seating Manager</h1>
          <p>{isRegisterMode ? 'Create your account' : 'Login to access the system'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          {isRegisterMode && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                autoFocus
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoFocus={!isRegisterMode}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {isRegisterMode && (
            <div className="form-group">
              <label htmlFor="setupSecret">
                Setup Secret {' '}
                <span style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                  (Required for first admin user only)
                </span>
              </label>
              <input
                type="password"
                id="setupSecret"
                value={setupSecret}
                onChange={(e) => setSetupSecret(e.target.value)}
                placeholder="Enter setup secret (optional for viewers)"
              />
            </div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (isRegisterMode ? 'Creating Account...' : 'Logging in...') : (isRegisterMode ? 'Register' : 'Login')}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              type="button" 
              onClick={toggleMode}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontWeight: '600'
              }}
            >
              {isRegisterMode ? 'Login here' : 'Register here'}
            </button>
          </p>
          {isRegisterMode && (
            <div className="setup-secret">
              <strong>Note:</strong> The setup secret is found in your backend .env file (ADMIN_SETUP_SECRET).
              Only needed for the first admin registration.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
