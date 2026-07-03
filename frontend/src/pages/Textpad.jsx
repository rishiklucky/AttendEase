import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Textpad = () => {
  const { showToast } = useAttendance();
  
  // State
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isModified, setIsModified] = useState(false);

  // Fetch the logged-in admin's secure textpad contents
  const fetchTextpad = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/textpad/me`);
      if (res.data.success) {
        setText(res.data.text || '');
        setIsModified(false);
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to load personal Textpad.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTextpad();
  }, []);

  // Save the textpad text
  const handleSave = async () => {
    setActionLoading(true);
    try {
      const res = await axios.post(`${API_URL}/textpad`, {
        text: text
      });

      if (res.data.success) {
        showToast(res.data.message || 'Notepad saved securely!', 'success');
        setIsModified(false);
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to save notepad.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Clear/delete the textpad text
  const handleClear = async () => {
    if (!text.trim()) {
      setText('');
      setIsModified(false);
      return;
    }

    if (!window.confirm('Are you sure you want to clear your secure notepad? This will permanently delete the encrypted record from the database.')) {
      return;
    }

    setActionLoading(true);
    try {
      await axios.delete(`${API_URL}/textpad/me`);
      setText('');
      setIsModified(false);
      showToast('Secure notepad cleared successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to clear notepad.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Copy plain text to clipboard
  const handleCopy = () => {
    if (!text) {
      showToast('Nothing to copy.', 'error');
      return;
    }
    navigator.clipboard.writeText(text);
    showToast('Text copied to clipboard!', 'success');
  };

  return (
    <div className="container-fluid p-0" style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Personal Secure Textpad</h2>
          <p className="text-muted m-0">
            Write notes, keys, or logs. Text is encrypted on the server and stored securely in the database.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <p className="text-muted fs-7">Decrypting secure notepad...</p>
        </div>
      ) : (
        <div className="card-custom bg-white p-4 shadow-sm border">
          {/* Top Indicators */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="text-muted fs-8 fw-semibold uppercase tracking-wider">
              {isModified ? (
                <span className="text-warning d-flex align-items-center gap-1">
                  <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
                  Unsaved changes...
                </span>
              ) : (
                <span className="text-success d-flex align-items-center gap-1">
                  <i className="bi bi-check-all fs-6"></i> Saved & Synced
                </span>
              )}
            </span>
            <span className="badge bg-success-subtle text-success border border-success border-opacity-25 fs-8 py-1.5 px-2 d-flex align-items-center gap-1">
              <i className="bi bi-shield-lock-fill text-success"></i> Encrypted-At-Rest
            </span>
          </div>

          {/* Text Area */}
          <div className="mb-4">
            <textarea
              className="form-control font-monospace p-3 text-dark bg-light bg-opacity-50"
              style={{
                fontSize: '14px',
                lineHeight: '1.6',
                minHeight: '380px',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
                resize: 'vertical',
                outline: 'none',
                boxShadow: 'none'
              }}
              placeholder="Start typing your secure private notes here... (e.g. API keys, config settings, server logs)"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setIsModified(true);
              }}
            ></textarea>
          </div>

          {/* Action Footer */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex gap-2">
              <button
                onClick={handleCopy}
                className="btn btn-outline-secondary btn-sm py-2 px-3 d-flex align-items-center gap-1"
                disabled={!text}
                type="button"
                title="Copy note text"
              >
                <i className="bi bi-clipboard"></i>
                Copy Note
              </button>
              <button
                onClick={handleClear}
                className="btn btn-outline-danger btn-sm py-2 px-3 d-flex align-items-center gap-1"
                disabled={actionLoading || !text}
                type="button"
                title="Permanently delete this secure record"
              >
                <i className="bi bi-trash"></i>
                Clear Textpad
              </button>
            </div>

            <button
              onClick={handleSave}
              className="btn btn-primary-custom py-2 px-4 d-flex align-items-center gap-2"
              disabled={actionLoading || !isModified}
              type="button"
            >
              {actionLoading ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              ) : (
                <i className="bi bi-shield-check fs-6"></i>
              )}
              Save Secure Notepad
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Textpad;
