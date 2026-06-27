import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SendReportPage = () => {
  const { date: todayDate, session: todaySession, showToast, students } = useAttendance();

  // Form states
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [selectedSession, setSelectedSession] = useState(todaySession);
  const [reportStatus, setReportStatus] = useState('Absent'); // Default to Absent

  // Dynamically compute sections
  const sections = ['All', ...new Set(students.map(s => s.section).filter(Boolean))];
  const [selectedSection, setSelectedSection] = useState('Alpha');

  // State for saved contacts fetched from database & selected recipients
  const [savedRecipients, setSavedRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [emailInput, setEmailInput] = useState('');

  // Preview & sending states
  const [previewRecords, setPreviewRecords] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  // Load saved recipients from database on mount
  useEffect(() => {
    const fetchSavedRecipients = async () => {
      try {
        const response = await axios.get(`${API_URL}/auth/recipients`);
        if (response.data.success) {
          setSavedRecipients(response.data.recipients || []);
        }
      } catch (error) {
        console.error('Error fetching saved recipients:', error);
      }
    };
    fetchSavedRecipients();
  }, []);

  // Fetch preview students list
  const fetchPreview = async () => {
    if (!selectedDate || !selectedSession) return;
    setLoadingPreview(true);
    try {
      const response = await axios.get(
        `${API_URL}/attendance/date/${selectedDate}/session/${selectedSession}`
      );
      if (response.data.success) {
        let filtered = response.data.data.filter(r => r.studentId && r.status === reportStatus);
        if (selectedSection !== 'All') {
          filtered = filtered.filter(r => r.studentId.section === selectedSection);
        }
        setPreviewRecords(filtered);
      }
    } catch (error) {
      console.error('Error fetching report preview:', error);
      setPreviewRecords([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Re-fetch preview when parameters change
  useEffect(() => {
    fetchPreview();
  }, [selectedDate, selectedSession, reportStatus, selectedSection]);

  // Handle email entry (comma-separated or single add)
  const handleAddEmail = async (e) => {
    e?.preventDefault();
    if (!emailInput.trim()) return;

    const entered = emailInput
      .split(/[,;\s]+/)
      .map(email => email.trim())
      .filter(email => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
      });

    if (entered.length === 0) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    try {
      // Save new emails to database
      const response = await axios.post(`${API_URL}/auth/recipients`, {
        emails: entered
      });

      if (response.data.success) {
        setSavedRecipients(response.data.recipients || []);
        
        // Also auto-select these new ones
        const newSelected = [...selectedRecipients];
        entered.forEach(email => {
          if (!newSelected.includes(email)) {
            newSelected.push(email);
          }
        });
        setSelectedRecipients(newSelected);
        
        setEmailInput('');
        showToast(`Saved ${entered.length} contact(s) to database.`, 'success');
      }
    } catch (error) {
      console.error('Error saving recipients:', error);
      showToast(error.response?.data?.message || 'Failed to save contacts to database.', 'error');
    }
  };

  const toggleRecipientSelection = (email) => {
    if (selectedRecipients.includes(email)) {
      setSelectedRecipients(selectedRecipients.filter(e => e !== email));
    } else {
      setSelectedRecipients([...selectedRecipients, email]);
    }
  };

  const deleteSavedRecipient = async (email) => {
    try {
      const response = await axios.delete(`${API_URL}/auth/recipients/${encodeURIComponent(email)}`);
      if (response.data.success) {
        setSavedRecipients(response.data.recipients || []);
        // Also remove from selection if it was selected
        setSelectedRecipients(selectedRecipients.filter(e => e !== email));
        showToast('Contact removed from database.', 'success');
      }
    } catch (error) {
      console.error('Error deleting recipient:', error);
      showToast(error.response?.data?.message || 'Failed to remove contact.', 'error');
    }
  };

  const handleSelectAll = () => {
    setSelectedRecipients([...savedRecipients]);
  };

  const handleDeselectAll = () => {
    setSelectedRecipients([]);
  };

  // Send report to all selected recipient emails
  const handleSendReport = async () => {
    if (selectedRecipients.length === 0) {
      showToast('Please select at least one recipient email address.', 'error');
      return;
    }
    if (previewRecords.length === 0) {
      showToast(`No student records found with status '${reportStatus}' to send.`, 'warning');
      return;
    }

    setSendingReport(true);
    try {
      const response = await axios.post(`${API_URL}/attendance/send-report`, {
        date: selectedDate,
        session: selectedSession,
        status: reportStatus,
        emails: selectedRecipients,
        section: selectedSection
      });

      if (response.data.success) {
        showToast(response.data.message || 'Report sent successfully!', 'success');
      }
    } catch (error) {
      console.error('Send Report error:', error);
      showToast(error.response?.data?.message || 'Failed to send report.', 'error');
    } finally {
      setSendingReport(false);
    }
  };

  // Format 3-digit roll list
  const threeDigitRolls = previewRecords
    .map(r => r.studentId && r.studentId.rollNo ? r.studentId.rollNo.slice(-3) : '')
    .filter(Boolean)
    .join(', ');

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Send Attendance Report</h2>
          <p className="text-muted m-0">Email session Excel sheets and summary details to custom recipients</p>
        </div>
      </div>

      <div className="row g-4">
        {/* Configuration Panel */}
        <div className="col-12 col-lg-5">
          <div className="card-custom bg-white mb-4">
            <h5 className="fw-bold text-dark mb-3">1. Select Report Scope</h5>

            <div className="mb-3">
              <label className="form-label fs-7 fw-semibold">Select Date</label>
              <input
                type="date"
                className="form-control"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="form-label fs-7 fw-semibold">Select Session</label>
              <select
                className="form-select"
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
              >
                <option value="Morning">Morning Session</option>
                <option value="Afternoon">Afternoon Session</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label fs-7 fw-semibold">Select Section</label>
              <select
                className="form-select"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                {sections.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec === 'All' ? 'All Sections' : `${sec}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-0">
              <label className="form-label fs-7 fw-semibold">Student Category</label>
              <div className="d-flex gap-3 mt-1">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="reportStatus"
                    id="statusAbsent"
                    value="Absent"
                    checked={reportStatus === 'Absent'}
                    onChange={() => setReportStatus('Absent')}
                  />
                  <label className="form-check-label fw-semibold text-danger" htmlFor="statusAbsent">
                    Absentees List
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="reportStatus"
                    id="statusPresent"
                    value="Present"
                    checked={reportStatus === 'Present'}
                    onChange={() => setReportStatus('Present')}
                  />
                  <label className="form-check-label fw-semibold text-success" htmlFor="statusPresent">
                    Presentees List
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="card-custom bg-white">
            <h5 className="fw-bold text-dark mb-3">2. Recipients Email List</h5>

            <form onSubmit={handleAddEmail} className="mb-3">
              <label className="form-label fs-7 fw-semibold">Add Recipient Emails</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. principal@mru.edu, hod@mru.edu"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
                <button type="submit" className="btn btn-primary-custom px-3">
                  Add
                </button>
              </div>
              <small className="text-muted fs-8 mt-1 d-block">
                Type emails separated by commas or spaces and click Add.
              </small>
            </form>

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label fs-7 fw-semibold m-0">Select Recipients</label>
                {savedRecipients.length > 0 && (
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-link p-0 fs-8 text-primary fw-semibold text-decoration-none"
                      onClick={handleSelectAll}
                    >
                      Select All
                    </button>
                    <span className="text-muted fs-8">|</span>
                    <button
                      type="button"
                      className="btn btn-link p-0 fs-8 text-secondary fw-semibold text-decoration-none"
                      onClick={handleDeselectAll}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="border rounded p-2 bg-light" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {savedRecipients.length === 0 ? (
                  <div className="text-center py-4 text-muted fs-7">
                    <i className="bi bi-people fs-4 mb-1 d-block text-secondary"></i>
                    No saved contacts yet.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-1">
                    {savedRecipients.map((email) => {
                      const isChecked = selectedRecipients.includes(email);
                      return (
                        <div
                          key={email}
                          className="d-flex align-items-center justify-content-between p-2 rounded bg-white border-bottom border-light hover-bg-light"
                          style={{ transition: 'background-color 0.2s' }}
                        >
                          <div className="form-check m-0 d-flex align-items-center gap-2">
                            <input
                              className="form-check-input cursor-pointer"
                              type="checkbox"
                              id={`check-${email}`}
                              checked={isChecked}
                              onChange={() => toggleRecipientSelection(email)}
                            />
                            <label
                              className="form-check-label fs-7 text-dark cursor-pointer text-truncate"
                              htmlFor={`check-${email}`}
                              style={{ maxWidth: '240px', fontWeight: isChecked ? '600' : '400' }}
                              title={email}
                            >
                              {email}
                            </label>
                          </div>
                          <button
                            type="button"
                            className="btn btn-link text-danger p-1 hover-scale border-0"
                            onClick={() => deleteSavedRecipient(email)}
                            title="Delete Contact"
                          >
                            <i className="bi bi-trash fs-8"></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {selectedRecipients.length > 0 && (
                <div className="mt-2 text-end">
                  <small className="badge bg-primary-custom text-white fs-8">
                    {selectedRecipients.length} selected for dispatch
                  </small>
                </div>
              )}
            </div>

            <button
              className="btn btn-primary-custom w-100 py-2.5 fs-6 d-flex align-items-center justify-content-center gap-2"
              disabled={sendingReport || selectedRecipients.length === 0 || previewRecords.length === 0}
              onClick={handleSendReport}
            >
              {sendingReport ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Sending Report Email...
                </>
              ) : (
                <>
                  <i className="bi bi-send-fill"></i>
                  Send Attendance Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="col-12 col-lg-7">
          <div className="card-custom bg-white h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center border-bottom border-light pb-3 mb-3">
              <div>
                <h5 className="fw-bold text-dark m-0">3. Report Content Preview</h5>
                <small className="text-muted">
                  {selectedDate} &nbsp;·&nbsp; {selectedSession} Session
                </small>
              </div>
              <span className={`badge-status badge-status-${reportStatus === 'Present' ? 'present' : 'absent'}`}>
                {reportStatus}: {previewRecords.length}
              </span>
            </div>

            {loadingPreview ? (
              <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center py-5">
                <div className="spinner-border text-primary mb-2" role="status"></div>
                <div className="text-muted fs-7">Loading preview records...</div>
              </div>
            ) : previewRecords.length === 0 ? (
              <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center py-5">
                <i className="bi bi-card-checklist text-muted fs-1 mb-3"></i>
                <h6 className="fw-bold">No Records to Preview</h6>
                <p className="text-muted fs-7 max-w-360 mx-auto">
                  No student records marked as <strong>{reportStatus}</strong> found for this session. Make sure attendance has been saved.
                </p>
              </div>
            ) : (
              <div className="d-flex flex-column flex-grow-1">
                {/* 3 digit numbers copy box */}
                <div className="bg-light border rounded p-3 mb-4">
                  <label className="fs-8 fw-semibold text-muted mb-1 uppercase tracking-wider d-block">
                    Comma-Separated Roll Numbers (Last 3 Digits)
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="form-control form-control-sm bg-white font-monospace text-dark border-secondary-subtle"
                    value={threeDigitRolls || 'None'}
                    onClick={(e) => e.target.select()}
                  />
                </div>

                {/* Attached file mock banner */}
                <div className="alert alert-success d-flex align-items-center gap-3 mb-4 py-2 border-0 bg-opacity-10 bg-success text-success">
                  <i className="bi bi-file-earmark-spreadsheet-fill fs-3"></i>
                  <div>
                    <strong className="d-block" style={{ fontSize: 13 }}>Attachment Included</strong>
                    <small className="text-muted fs-8">{reportStatus}Students_{selectedDate}_{selectedSession}.xlsx</small>
                  </div>
                </div>

                {/* Table Preview list */}
                <div className="flex-grow-1 overflow-auto" style={{ maxHeight: '350px' }}>
                  <div className="table-custom-container">
                    <table className="table-custom">
                      <thead>
                        <tr>
                          <th>Roll Number</th>
                          <th>Student Name</th>
                          <th>Semester ID</th>
                          <th>Section</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRecords.map((record) => {
                          const student = record.studentId || {};
                          return (
                            <tr key={record._id}>
                              <td className="fw-semibold">{student.rollNo || '—'}</td>
                              <td>{student.studentName || '—'}</td>
                              <td>{student.semesterId || '—'}</td>
                              <td>{student.section || 'Alpha'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendReportPage;
