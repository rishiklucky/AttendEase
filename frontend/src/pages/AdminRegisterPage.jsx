import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminRegisterPage = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/register`, {
        username: form.username,
        email: form.email,
        password: form.password
      });
      if (res.data.success) {
        setSuccess('Admin registered! You can now login. ⚠️ Remember to disable this route in authRoutes.js.');
        setForm({ username: '', email: '', password: '', confirmPassword: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'var(--color-background)' }}>
      <div className="w-100" style={{ maxWidth: '460px', padding: '0 16px' }}>

        {/* Brand */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
            style={{ width: 56, height: 56, background: 'var(--color-primary)' }}>
            <i className="bi bi-journal-check text-white fs-3"></i>
          </div>
          <h3 className="fw-bold text-dark mb-0">AttendEase</h3>
          <p className="text-muted fs-7">Admin Registration</p>
        </div>



        {/* Form Card */}
        <div className="card-custom">
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
              <i className="bi bi-exclamation-circle-fill"></i>
              <small>{error}</small>
            </div>
          )}
          {success && (
            <div className="alert alert-success d-flex align-items-start gap-2 py-2 mb-3">
              <i className="bi bi-check-circle-fill mt-1 flex-shrink-0"></i>
              <small>{success}</small>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold fs-7">Full Name</label>
              <input type="text" name="username" className="form-control" placeholder="Your name"
                value={form.username} onChange={handleChange} required />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold fs-7">Email Address</label>
              <input type="email" name="email" className="form-control" placeholder="admin@example.com"
                value={form.email} onChange={handleChange} required />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold fs-7">Password</label>
              <input type="password" name="password" className="form-control" placeholder="Min 6 characters"
                value={form.password} onChange={handleChange} required />
            </div>
            <div className="mb-4">
              <label className="form-label fw-semibold fs-7">Confirm Password</label>
              <input type="password" name="confirmPassword" className="form-control" placeholder="Repeat password"
                value={form.confirmPassword} onChange={handleChange} required />
            </div>
            <button type="submit" className="btn btn-primary-custom w-100 d-flex align-items-center justify-content-center gap-2" disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-person-plus-fill"></i>}
              {loading ? 'Registering...' : 'Register Admin'}
            </button>
          </form>

          <hr className="my-3" />
          <div className="text-center">
            <button className="btn btn-link p-0 fs-7 text-muted text-decoration-none" onClick={() => { window.location.hash = '#login'; }}>
              <i className="bi bi-arrow-left me-1"></i>Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRegisterPage;
