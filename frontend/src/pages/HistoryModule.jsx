import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import axios from 'axios';
import { copyToClipboard } from '../utils/clipboard.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const HistoryModule = () => {
  const { showToast, date: todayDate, session: todaySession, downloadExcel, students } = useAttendance();

  // Selection states
  const [selectedDate, setSelectedDate] = useState(() => {
    return sessionStorage.getItem('selectedHistoryDate') || todayDate;
  });
  const [selectedSession, setSelectedSession] = useState(() => {
    return sessionStorage.getItem('selectedHistorySession') || todaySession;
  });

  // Data states
  const [records, setRecords] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Table search & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedGrid, setEditedGrid] = useState({}); // studentId -> status
  const [isNewSession, setIsNewSession] = useState(false);

  // Detail modal states (present/absent popup like TakeAttendance)
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyModalType, setHistoryModalType] = useState('Present'); // 'Present' | 'Absent'

  // Fetch history records
  const fetchHistory = async () => {
    if (!selectedDate || !selectedSession) {
      showToast('Date and Session are required.', 'error');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setIsEditMode(false);
    setIsNewSession(false);

    try {
      const response = await axios.get(
        `${API_URL}/attendance/date/${selectedDate}/session/${selectedSession}`
      );

      if (response.data.success) {
        const data = response.data.data;
        setRecords(data);

        // Initialize the edited grid
        const grid = {};
        data.forEach((r) => {
          if (r.studentId) {
            grid[r.studentId._id] = r.status;
          }
        });
        setEditedGrid(grid);

        if (data.length === 0) {
          showToast('No attendance records found for this session.', 'info');
        } else {
          showToast(`Found ${data.length} records.`, 'success');
        }
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      showToast('Failed to retrieve history records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch if redirected from Calendar page
  useEffect(() => {
    const savedDate = sessionStorage.getItem('selectedHistoryDate');
    if (savedDate) {
      // Clear values from storage
      sessionStorage.removeItem('selectedHistoryDate');
      sessionStorage.removeItem('selectedHistorySession');
      fetchHistory();
    }
  }, []);

  // Toggle status inside Edit Mode
  const handleToggle = (studentId) => {
    setEditedGrid((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  // Save all modified records bulk
  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      const recordsToSave = Object.entries(editedGrid).map(([studentId, status]) => ({
        studentId,
        status
      }));

      const response = await axios.post(`${API_URL}/attendance`, {
        date: selectedDate,
        session: selectedSession,
        records: recordsToSave,
        overwrite: true // Bulk overwrite history
      });

      if (response.data.success) {
        showToast('Attendance history updated successfully.', 'success');
        setIsEditMode(false);
        setIsNewSession(false);
        // Refresh
        await fetchHistory();
      }
    } catch (error) {
      console.error('Error saving history changes:', error);
      showToast(error.response?.data?.message || 'Failed to save modifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    if (isNewSession) {
      setRecords([]);
      setEditedGrid({});
      setIsEditMode(false);
      setIsNewSession(false);
    } else {
      // Reset edited grid to original record statuses
      const grid = {};
      records.forEach((r) => {
        if (r.studentId) {
          grid[r.studentId._id] = r.status;
        }
      });
      setEditedGrid(grid);
      setIsEditMode(false);
    }
  };

  // Filter records
  const filteredRecords = records.filter((r) => {
    const student = r.studentId || {};
    const name = student.studentName || '';
    const roll = student.rollNo || '';
    const sem = student.semesterId || '';
    const section = student.section || '';

    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roll.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sem.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSection = sectionFilter === '' || section === sectionFilter;

    return matchesSearch && matchesSection;
  });

  // Toggle all statuses in Edit Mode
  const allPresent = filteredRecords.length > 0 && filteredRecords.every(r => r.studentId && editedGrid[r.studentId._id] === 'Present');

  const handleToggleAll = () => {
    const nextStatus = allPresent ? 'Absent' : 'Present';
    setEditedGrid(prev => {
      const nextGrid = { ...prev };
      filteredRecords.forEach(r => {
        if (r.studentId) {
          nextGrid[r.studentId._id] = nextStatus;
        }
      });
      return nextGrid;
    });
  };

  // Calculate statistics based on current active statuses
  const displayGrid = isEditMode ? editedGrid : Object.fromEntries(records.map(r => [r.studentId?._id, r.status]));
  const displayRecordsList = records.filter(r => r.studentId);
  const totalCount = displayRecordsList.length;

  const presentCount = displayRecordsList.filter((r) => displayGrid[r.studentId._id] === 'Present').length;
  const absentCount = displayRecordsList.filter((r) => displayGrid[r.studentId._id] === 'Absent').length;

  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Extract sections from records for filter
  const uniqueSections = [...new Set(records.filter(r => r.studentId).map((r) => r.studentId.section))];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Attendance History</h2>
          <p className="text-muted m-0">Retrieve, review, and edit past session records</p>
        </div>
      </div>

      {/* Date & Session Selector Bar */}
      <div className="card-custom bg-white mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-sm-4">
            <label className="form-label fs-7 fw-semibold">Select Date</label>
            <input
              type="date"
              className="form-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="col-12 col-sm-4">
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

          <div className="col-12 col-sm-4">
            <button
              onClick={fetchHistory}
              className="btn btn-primary-custom w-100"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              ) : (
                <i className="bi bi-search me-1"></i>
              )}
              Fetch Session Records
            </button>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      {hasSearched && !loading && records.length === 0 && (
        <div className="card-custom py-5 text-center bg-white">
          <i className="bi bi-calendar-x text-muted fs-1 mb-3 d-block"></i>
          <h5 className="fw-semibold">No records found</h5>
          <p className="text-muted fs-7 mb-4">
            There is no recorded attendance for <strong>{selectedDate}</strong> (<strong>{selectedSession}</strong>).
          </p>
          <button
            onClick={() => {
              if (!students || students.length === 0) {
                showToast('No students found. Please upload a student list first.', 'error');
                return;
              }
              setIsNewSession(true);
              setIsEditMode(true);

              // Initialize records and edited grid
              const initialRecords = students.map(student => ({
                _id: `temp_${student._id}`,
                studentId: student,
                status: 'Present'
              }));
              setRecords(initialRecords);

              const grid = {};
              students.forEach(student => {
                grid[student._id] = 'Present';
              });
              setEditedGrid(grid);
            }}
            className="btn btn-primary-custom px-4 py-2"
          >
            <i className="bi bi-calendar-plus me-2"></i>
            Mark Attendance for this Session
          </button>
        </div>
      )}

      {records.length > 0 && (
        <div className="row g-4">
          {/* Main Table Column */}
          <div className="col-12 col-lg-8">
            <div className="card-custom">
              {/* Toolbar */}
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
                <div className="d-flex flex-grow-1 gap-2" style={{ maxWidth: '400px' }}>
                  <div className="position-relative flex-grow-1">
                    <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                    <input
                      type="text"
                      className="form-control ps-5"
                      placeholder="Search Name or Roll..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <select
                    className="form-select w-auto"
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                  >
                    <option value="">All Sections</option>
                    {uniqueSections.map((sec) => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                <div className={isEditMode ? "edit-actions-wrapper" : "d-flex gap-2"}>
                  {isEditMode && (
                    <div className="mark-all-container">
                      <span className="fs-7 fw-semibold text-muted">Mark All:</span>
                      <label className="attendance-switch">
                        <input
                          type="checkbox"
                          checked={allPresent}
                          onChange={handleToggleAll}
                        />
                        <span className="attendance-slider">
                          <span className="text-present">Present</span>
                          <span className="text-absent">Absent</span>
                        </span>
                      </label>
                    </div>
                  )}

                  {isEditMode ? (
                    <div className="d-flex gap-2 ms-auto ms-sm-0">
                      <button
                        onClick={handleCancelEdit}
                        className="btn btn-secondary-custom text-danger"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveChanges}
                        className="btn btn-primary-custom bg-success border-success"
                      >
                        <i className="bi bi-check-lg me-1"></i>
                        Save Changes
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="btn btn-secondary-custom"
                    >
                      <i className="bi bi-pencil-square me-1"></i>
                      Edit Records
                    </button>
                  )}
                </div>
              </div>

              {/* Records Grid */}
              <div className="table-custom-container">
                <table className="table-custom">
                  <thead>
                    <tr>
                      <th>Student Details</th>
                      <th>Roll Number</th>
                      <th>Semester ID</th>
                      <th className="text-end">Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => {
                      const student = record.studentId || {};
                      const isPresent = (editedGrid[student._id] ?? record.status) !== 'Absent';
                      const initials = student.studentName
                        ? student.studentName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
                        : '?';

                      return (
                        <tr key={record._id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="avatar-initial flex-shrink-0">{initials}</div>
                              <div>
                                <div className="fw-semibold text-dark">{student.studentName || 'Unknown Student'}</div>
                                <div className="text-muted fs-7">{student.section || 'Alpha'} Section</div>
                              </div>
                            </div>
                          </td>
                          <td className="fw-medium text-dark">
                            {student.rollNo || '—'}
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border">{student.semesterId || '—'}</span>
                          </td>
                          <td className="text-end">
                            {isEditMode ? (
                              <label className="attendance-switch">
                                <input
                                  type="checkbox"
                                  checked={isPresent}
                                  onChange={() => handleToggle(student._id)}
                                />
                                <span className="attendance-slider">
                                  <span className="text-present">Present</span>
                                  <span className="text-absent">Absent</span>
                                </span>
                              </label>
                            ) : (
                              <span className={`badge-status badge-status-${isPresent ? 'present' : 'absent'}`}>
                                {isPresent ? (
                                  <>Present <i className="bi bi-check-lg"></i></>
                                ) : (
                                  <>Absent <i className="bi bi-x-lg"></i></>
                                )}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Statistics Column */}
          <div className="col-12 col-lg-4">
            <div className="card-custom">
              <h5 className="fw-bold mb-3 text-dark">Session Summary Stats</h5>

              <div className="row g-3 text-center mb-4">
                <div className="col-6">
                  <div className="border rounded p-3 bg-light">
                    <div className="text-success fs-3 fw-bold">{presentCount}</div>
                    <div className="text-muted fs-7">Present</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="border rounded p-3 bg-light">
                    <div className="text-danger fs-3 fw-bold">{absentCount}</div>
                    <div className="text-muted fs-7">Absent</div>
                  </div>
                </div>
              </div>

              <div className="border-top pt-3">
                <div className="d-flex justify-content-between mb-2">
                  <span className="fs-7 text-muted">Attendance Rate</span>
                  <span className="fs-7 fw-bold">{percentage}%</span>
                </div>

                <div className="progress mb-3" style={{ height: '8px' }}>
                  <div
                    className="progress-bar bg-success"
                    role="progressbar"
                    style={{ width: `${percentage}%` }}
                    aria-valuenow={presentCount}
                    aria-valuemin="0"
                    aria-valuemax={totalCount}
                  ></div>
                </div>

                <div className="fs-8 text-muted mt-4">
                  * Records extracted for session <strong>{selectedSession}</strong> on <strong>{selectedDate}</strong>.
                </div>

                <div className="border-top pt-3 mt-3 d-grid gap-2">
                  <button
                    onClick={() => { setHistoryModalType('Present'); setShowHistoryModal(true); }}
                    className="btn btn-outline-success btn-sm text-start d-flex justify-content-between align-items-center"
                  >
                    <span><i className="bi bi-file-earmark-excel me-2"></i>Download Present Excel</span>
                    <span className="badge bg-success">{presentCount}</span>
                  </button>
                  <button
                    onClick={() => { setHistoryModalType('Absent'); setShowHistoryModal(true); }}
                    className="btn btn-outline-danger btn-sm text-start d-flex justify-content-between align-items-center"
                  >
                    <span><i className="bi bi-file-earmark-excel me-2"></i>Download Absent Excel</span>
                    <span className="badge bg-danger">{absentCount}</span>
                  </button>
                </div>

                {/* Quick Copy Roll Numbers */}
                <div className="border-top pt-3 mt-3">
                  <label className="fs-8 fw-semibold text-muted mb-2 uppercase d-block">
                    Quick Copy Roll Numbers (Last 3 Digits)
                  </label>
                  <div className="d-grid gap-2">
                    <button
                      onClick={() => {
                        const list = records
                          .filter(r => r.studentId && r.status === 'Present')
                          .map(r => r.studentId.rollNo ? r.studentId.rollNo.slice(-3) : '')
                          .filter(Boolean)
                          .join(', ');
                        if (list) {
                          navigator.clipboard.writeText(list);
                          showToast('Present roll numbers copied!', 'success');
                        } else {
                          showToast('No present students to copy.', 'warning');
                        }
                      }}
                      className="btn btn-light btn-sm text-start border d-flex justify-content-between align-items-center"
                    >
                      <span><i className="bi bi-clipboard me-2"></i>Copy Present Roll Nos</span>
                      <i className="bi bi-chevron-right text-muted fs-8"></i>
                    </button>

                    <button
                      onClick={() => {
                        const list = records
                          .filter(r => r.studentId && r.status === 'Absent')
                          .map(r => r.studentId.rollNo ? r.studentId.rollNo.slice(-3) : '')
                          .filter(Boolean)
                          .join(', ');
                        if (list) {
                          navigator.clipboard.writeText(list);
                          showToast('Absent roll numbers copied!', 'success');
                        } else {
                          showToast('No absent students to copy.', 'warning');
                        }
                      }}
                      className="btn btn-light btn-sm text-start border d-flex justify-content-between align-items-center"
                    >
                      <span><i className="bi bi-clipboard me-2"></i>Copy Absent Roll Nos</span>
                      <i className="bi bi-chevron-right text-muted fs-8"></i>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Present / Absent Detail Modal */}
      {showHistoryModal && (() => {
        const isPresent = historyModalType === 'Present';
        const modalStudents = records
          .filter(r => r.studentId && r.status === historyModalType)
          .map(r => r.studentId);
        const listString = modalStudents
          .map(s => (s.rollNo ? s.rollNo.slice(-3) : ''))
          .filter(Boolean)
          .join(', ');
        const closeModal = () => setShowHistoryModal(false);

        return (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <div
              className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg w-100"
              role="document"
              style={{ margin: '12px auto', maxWidth: 'min(720px, calc(100vw - 24px))' }}
            >
              <div className="modal-content border-0 shadow" style={{ maxHeight: 'calc(100dvh - 24px)' }}>

                {/* Header */}
                <div className="modal-header border-bottom bg-light py-3">
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">
                      {isPresent ? 'Present Students List' : 'Absent Students List'}
                    </h5>
                    <small className="text-muted">
                      {modalStudents.length} students &nbsp;·&nbsp; {selectedDate} &nbsp;·&nbsp; {selectedSession}
                    </small>
                  </div>
                  <button type="button" className="btn-close" onClick={closeModal} aria-label="Close"></button>
                </div>

                {/* Scrollable body */}
                <div className="modal-body py-3 px-3 px-sm-4" style={{ overflowY: 'auto' }}>

                  {/* Quick Copy — stacks on mobile */}
                  <div className="bg-light rounded border p-3 mb-3">
                    <label className="fw-semibold text-muted d-block mb-2" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Last 3 Digits of {historyModalType} Roll Numbers
                    </label>
                    <div className="d-flex flex-column flex-sm-row gap-2 align-items-sm-center">
                      <input
                        type="text"
                        readOnly
                        className="form-control form-control-sm bg-white font-monospace text-dark"
                        value={listString || 'No students'}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.target.select()}
                      />
                      <button
                        className="btn btn-sm btn-primary-custom flex-shrink-0"
                        style={{ minWidth: 80 }}
                        disabled={!listString}
                        onClick={async () => {
                          if (!listString) return;
                          const ok = await copyToClipboard(listString);
                          showToast(
                            ok ? 'Roll numbers copied!' : 'Copy failed — select the text manually.',
                            ok ? 'success' : 'error'
                          );
                        }}
                      >
                        <i className="bi bi-clipboard me-1"></i> Copy
                      </button>
                    </div>
                  </div>

                  {/* Student table */}
                  <div className="table-custom-container" style={{ overflowX: 'auto' }}>
                    <table className="table-custom" style={{ minWidth: 420 }}>
                      <thead>
                        <tr>
                          <th>Roll No</th>
                          <th>Student Name</th>
                          <th>Sem ID</th>
                          <th>Section</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalStudents.map((s) => (
                          <tr key={s._id}>
                            <td className="fw-semibold">{s.rollNo}</td>
                            <td>{s.studentName}</td>
                            <td>{s.semesterId}</td>
                            <td>{s.section}</td>
                            <td>
                              <span className={`badge-status badge-status-${isPresent ? 'present' : 'absent'}`}>
                                {historyModalType}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>

                {/* Footer */}
                <div className="modal-footer border-top py-2">
                  <button
                    className={`btn btn-sm ${isPresent ? 'btn-success' : 'btn-danger'} me-auto`}
                    onClick={() => downloadExcel(historyModalType, selectedDate, selectedSession)}
                  >
                    <i className="bi bi-file-earmark-excel me-1"></i>
                    Download Excel
                  </button>
                  <button type="button" className="btn btn-secondary-custom btn-sm" onClick={closeModal}>Close</button>
                </div>

              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default HistoryModule;
