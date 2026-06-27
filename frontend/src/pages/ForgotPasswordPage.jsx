import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// 3-step flow: 'email' → 'otp' → 'reset'
const ForgotPasswordPage = ({ onBackToLogin }) => {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const clearMessages = () => { setError(''); setInfo(''); };

  // ── Step 1: Send OTP ─────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    clearMessages(); setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setInfo(res.data.message);
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ───────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessages(); setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/verify-otp`, { email, otp });
      setInfo(res.data.message);
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reset Password ───────────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    clearMessages();
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/reset-password`, { email, otp, newPassword });
      setInfo('Password reset successfully! Redirecting to login...');
      setTimeout(() => onBackToLogin(), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Enter Email', 'Verify OTP', 'New Password'];
  const stepIndex = { email: 0, otp: 1, reset: 2 }[step];

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
          <p className="text-muted fs-7">Reset your password</p>
        </div>

        {/* Step Indicator */}
        <div className="d-flex justify-content-center gap-2 mb-4">
          {stepLabels.map((label, i) => (
            <div key={i} className="d-flex flex-column align-items-center" style={{ flex: 1 }}>
              <div className="d-flex align-items-center w-100">
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: i <= stepIndex ? 'var(--color-primary)' : 'var(--color-surface-container)',
                  color: i <= stepIndex ? '#fff' : 'var(--color-text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700
                }}>
                  {i < stepIndex ? <i className="bi bi-check"></i> : i + 1}
                </div>
                {i < 2 && <div style={{ flex: 1, height: 2, background: i < stepIndex ? 'var(--color-primary)' : 'var(--color-outline)' }}></div>}
              </div>
              <small className="text-muted mt-1" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{label}</small>
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="card-custom">
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
              <i className="bi bi-exclamation-circle-fill flex-shrink-0"></i>
              <small>{error}</small>
            </div>
          )}
          {info && (
            <div className="alert alert-success d-flex align-items-center gap-2 py-2 mb-3">
              <i className="bi bi-check-circle-fill flex-shrink-0"></i>
              <small>{info}</small>
            </div>
          )}

          {/* Step 1 */}
          {step === 'email' && (
            <form onSubmit={handleSendOtp}>
              <p className="text-muted fs-7 mb-3">Enter the email associated with your admin account and we'll send a 6-digit OTP.</p>
              <div className="mb-4">
                <label className="form-label fw-semibold fs-7">Email Address</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0"><i className="bi bi-envelope text-muted"></i></span>
                  <input type="email" className="form-control border-start-0" placeholder="admin@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary-custom w-100 d-flex align-items-center justify-content-center gap-2" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-send-fill"></i>}
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          )}

          {/* Step 2 */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp}>
              <p className="text-muted fs-7 mb-3">A 6-digit OTP was sent to <strong>{email}</strong>. It expires in 10 minutes.</p>
              <div className="mb-4">
                <label className="form-label fw-semibold fs-7">OTP Code</label>
                <input
                  type="text" className="form-control text-center fw-bold fs-5 letter-spacing-lg"
                  placeholder="● ● ● ● ● ●" maxLength={6} inputMode="numeric"
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} required
                  style={{ letterSpacing: '0.3em' }}
                />
              </div>
              <button type="submit" className="btn btn-primary-custom w-100 d-flex align-items-center justify-content-center gap-2 mb-3" disabled={loading || otp.length < 6}>
                {loading ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-shield-check-fill"></i>}
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button type="button" className="btn btn-link w-100 fs-7 text-muted p-0" onClick={() => { setStep('email'); clearMessages(); }}>
                <i className="bi bi-arrow-left me-1"></i>Change email / Resend OTP
              </button>
            </form>
          )}

          {/* Step 3 */}
          {step === 'reset' && (
            <form onSubmit={handleReset}>
              <p className="text-muted fs-7 mb-3">OTP verified! Set your new password below.</p>
              <div className="mb-3">
                <label className="form-label fw-semibold fs-7">New Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0"><i className="bi bi-lock text-muted"></i></span>
                  <input type={showPass ? 'text' : 'password'} className="form-control border-start-0 border-end-0"
                    placeholder="Min 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                  <button type="button" className="input-group-text bg-light border-start-0" onClick={() => setShowPass(s => !s)} tabIndex={-1}>
                    <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'} text-muted`}></i>
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label fw-semibold fs-7">Confirm New Password</label>
                <input type="password" className="form-control" placeholder="Repeat new password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary-custom w-100 d-flex align-items-center justify-content-center gap-2" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-check-circle-fill"></i>}
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <hr className="my-3"/>
          <div className="text-center">
            <button className="btn btn-link p-0 fs-7 text-muted text-decoration-none" onClick={onBackToLogin}>
              <i className="bi bi-arrow-left me-1"></i>Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
