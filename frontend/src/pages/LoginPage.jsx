import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const LoginPage = ({ onGoForgot }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inactivityMsg, setInactivityMsg] = useState('');

  useEffect(() => {
    const reason = sessionStorage.getItem('ae_logout_reason');
    if (reason === 'inactivity') {
      setInactivityMsg('You were automatically logged out due to 1 hour of inactivity.');
      sessionStorage.removeItem('ae_logout_reason');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      window.location.hash = '';
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'var(--color-background)' }}>
      <div className="w-100" style={{ maxWidth: '420px', padding: '0 16px' }}>
        {/* Brand */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
            style={{ width: 56, height: 56, background: 'var(--color-primary)' }}>
            <i className="bi bi-journal-check text-white fs-3"></i>
          </div>
          <h3 className="fw-bold text-dark mb-0">AttendEase</h3>
          <p className="text-muted fs-7">Sign in to your account</p>
        </div>

        {/* Inactivity warning */}
        {inactivityMsg && (
          <div className="alert alert-warning d-flex align-items-center gap-2 py-2 mb-3" role="alert">
            <i className="bi bi-clock-history"></i>
            <small>{inactivityMsg}</small>
          </div>
        )}

        {/* Login Card */}
        <div className="card-custom">
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3" role="alert">
              <i className="bi bi-exclamation-circle-fill"></i>
              <small>{error}</small>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold fs-7">Email Address</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-envelope text-muted"></i>
                </span>
                <input
                  type="email"
                  className="form-control border-start-0"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label fw-semibold fs-7 mb-0">Password</label>
                <button type="button" className="btn btn-link p-0 fs-7 text-primary text-decoration-none" onClick={onGoForgot}>
                  Forgot password?
                </button>
              </div>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-lock text-muted"></i>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control border-start-0 border-end-0"
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-group-text bg-light border-start-0"
                  onClick={() => setShowPassword(s => !s)}
                  tabIndex={-1}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-muted`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary-custom w-100 d-flex align-items-center justify-content-center gap-2"
              disabled={loading}
            >
              {loading ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-box-arrow-in-right"></i>}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-muted fs-7 mt-3">
          AttendEase &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
