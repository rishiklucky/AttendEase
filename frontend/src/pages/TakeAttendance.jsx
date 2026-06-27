import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { copyToClipboard } from '../utils/clipboard.js';

const TakeAttendance = () => {
  const {
    students,
    date,
    setDate,
    session,
    setSession,
    attendanceGrid,
    setAttendanceGrid,
    saveAttendance,
    downloadExcel,
    loading,
    showToast
  } = useAttendance();

  // Local clock state
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Overwrite modal state
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');

  // Post-save list viewer states
  const [isSaved, setIsSaved] = useState(false);
  const [showPresentList, setShowPresentList] = useState(false);
  const [showAbsentList, setShowAbsentList] = useState(false);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter students based on search input
  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.studentName.toLowerCase().includes(term) ||
      s.rollNo.toLowerCase().includes(term) ||
      s.semesterId.toLowerCase().includes(term)
    );
  });

  // Toggle status for a student
  const handleToggle = (studentId) => {
    setAttendanceGrid((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  // Reset grid back to all Present
  const handleReset = () => {
    if (window.confirm('Reset all students to Present?')) {
      const resetGrid = {};
      students.forEach((s) => {
        resetGrid[s._id] = 'Present';
      });
      setAttendanceGrid(resetGrid);
      setIsSaved(false);
    }
  };

  // Save Attendance Handler
  const handleSave = async (overwrite = false) => {
    setShowOverwriteModal(false);
    const result = await saveAttendance(overwrite);
    
    if (result.success) {
      setIsSaved(true);
    } else if (result.conflict) {
      setConflictMessage(result.message);
      setShowOverwriteModal(true);
    }
  };

  // Lists count
  const presentCount = Object.values(attendanceGrid).filter((s) => s === 'Present').length;
  const absentCount = Object.values(attendanceGrid).filter((s) => s === 'Absent').length;

  const presentStudentsList = students.filter((s) => attendanceGrid[s._id] === 'Present');
  const absentStudentsList = students.filter((s) => attendanceGrid[s._id] === 'Absent');

  // Initial avatar helper
  const getAvatarInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div>
      {/* Header Widget */}
      <div className="card-custom mb-4 p-3 bg-white">
        <div className="row align-items-center g-3">
          <div className="col-12 col-md-4">
            <h5 className="fw-bold m-0 text-dark">Take Attendance Session</h5>
            <small className="text-muted">Attendance quick entry</small>
          </div>
          
          <div className="col-12 col-md-5 d-flex justify-content-md-center align-items-center gap-3">
            <div className="text-center bg-light px-3 py-1 rounded">
              <span className="text-muted fs-7 me-1">Date:</span>
              <span className="fw-semibold text-primary">{date}</span>
            </div>
            <div className="text-center bg-light px-3 py-1 rounded">
              <span className="text-muted fs-7 me-1">Time:</span>
              <span className="fw-semibold text-primary">{time}</span>
            </div>
          </div>

          <div className="col-12 col-md-3 d-flex justify-content-md-end">
            <div className="btn-group w-100" role="group" aria-label="Session Selector">
              <button
                type="button"
                className={`btn btn-sm ${session === 'Morning' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => { setSession('Morning'); setIsSaved(false); }}
              >
                Morning
              </button>
              <button
                type="button"
                className={`btn btn-sm ${session === 'Afternoon' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => { setSession('Afternoon'); setIsSaved(false); }}
              >
                Afternoon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Operations Block */}
      <div className="row g-4">
        {/* Student Selection Grid */}
        <div className="col-12 col-lg-8">
          <div className="card-custom">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
              <div className="position-relative flex-grow-1" style={{ maxWidth: '400px' }}>
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                <input
                  type="text"
                  className="form-control ps-5"
                  placeholder="Search student by Name, Roll, Sem ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary-custom"
                  onClick={handleReset}
                  disabled={students.length === 0}
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i>
                  Reset
                </button>
                <button
                  type="button"
                  className="btn btn-primary-custom"
                  onClick={() => handleSave(false)}
                  disabled={students.length === 0 || loading}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  ) : (
                    <i className="bi bi-cloud-arrow-up me-1"></i>
                  )}
                  Save Attendance
                </button>
              </div>
            </div>

            {/* Students Table */}
            {students.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-people-fill text-muted fs-1 mb-3 d-block"></i>
                <h5 className="fw-semibold">No students in database</h5>
                <p className="text-muted fs-7">Please go to Student Management and upload a student PDF first.</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-search text-muted fs-1 mb-3 d-block"></i>
                <h5 className="fw-semibold">No search matches</h5>
                <p className="text-muted fs-7">Try refining your search keyword.</p>
              </div>
            ) : (
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
                    {filteredStudents.map((student) => {
                      const isPresent = attendanceGrid[student._id] !== 'Absent';
                      return (
                        <tr key={student._id}>
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <div className="avatar-initial">
                                {getAvatarInitials(student.studentName)}
                              </div>
                              <div>
                                <div className="fw-semibold text-dark">{student.studentName}</div>
                                <div className="text-muted fs-7">{student.section} Section</div>
                              </div>
                            </div>
                          </td>
                          <td className="fw-medium text-dark">{student.rollNo}</td>
                          <td>
                            <span className="badge bg-light text-dark border">{student.semesterId}</span>
                          </td>
                          <td className="text-end">
                            <label className="attendance-switch">
                              <input
                                type="checkbox"
                                checked={isPresent}
                                onChange={() => handleToggle(student._id)}
                              />
                              <span className="attendance-slider">
                                <span className="text-present">Present ✅</span>
                                <span className="text-absent">Absent ❌</span>
                              </span>
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Info panel & Saved lists */}
        <div className="col-12 col-lg-4">
          <div className="card-custom">
            <h5 className="fw-bold mb-3 text-dark">Session Summary</h5>
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
                <span className="fs-7 fw-bold">
                  {students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0}%
                </span>
              </div>
              <div className="progress" style={{ height: '8px' }}>
                <div
                  className="progress-bar bg-success"
                  role="progressbar"
                  style={{ width: `${students.length > 0 ? (presentCount / students.length) * 100 : 0}%` }}
                  aria-valuenow={presentCount}
                  aria-valuemin="0"
                  aria-valuemax={students.length}
                ></div>
              </div>
            </div>
          </div>

          {/* Export Action Block - Displayed after saving */}
          {isSaved && (
            <div className="card-custom border-success mt-4 animate-fade-in">
              <h5 className="fw-bold text-success mb-3">
                <i className="bi bi-check-circle-fill me-2"></i>
                Saved Successfully
              </h5>
              <p className="text-muted fs-7 mb-4">
                The attendance records for <strong>{date}</strong> (<strong>{session}</strong>) have been updated.
              </p>

              <div className="d-grid gap-2">
                <button
                  onClick={() => { setShowPresentList(true); setShowAbsentList(false); }}
                  className="btn btn-outline-success btn-sm text-start d-flex justify-content-between align-items-center"
                >
                  <span><i className="bi bi-people-fill me-2"></i>Generate Present List</span>
                  <span className="badge bg-success">{presentCount}</span>
                </button>
                
                <button
                  onClick={() => { setShowAbsentList(true); setShowPresentList(false); }}
                  className="btn btn-outline-danger btn-sm text-start d-flex justify-content-between align-items-center"
                >
                  <span><i className="bi bi-person-x-fill me-2"></i>Generate Absent List</span>
                  <span className="badge bg-danger">{absentCount}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Present / Absent Detail Modal */}
      {(showPresentList || showAbsentList) && (() => {
        const isPresentModal = showPresentList;
        const modalList = isPresentModal ? presentStudentsList : absentStudentsList;
        const listString = modalList
          .map((s) => (s.rollNo ? s.rollNo.slice(-3) : ''))
          .filter(Boolean)
          .join(', ');
        const closeModal = () => { setShowPresentList(false); setShowAbsentList(false); };

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
                      {isPresentModal ? 'Present Students List' : 'Absent Students List'}
                    </h5>
                    <small className="text-muted">
                      Total: {isPresentModal ? presentCount : absentCount} students
                    </small>
                  </div>
                  <button type="button" className="btn-close" onClick={closeModal} aria-label="Close"></button>
                </div>

                {/* Scrollable body */}
                <div className="modal-body py-3 px-3 px-sm-4" style={{ overflowY: 'auto' }}>

                  {/* Quick Copy — stacks on mobile */}
                  <div className="bg-light rounded border p-3 mb-3">
                    <label className="fw-semibold text-muted d-block mb-2" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Last 3 Digits of {isPresentModal ? 'Present' : 'Absent'} Roll Numbers
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
                        {modalList.map((s) => (
                          <tr key={s._id}>
                            <td className="fw-semibold">{s.rollNo}</td>
                            <td>{s.studentName}</td>
                            <td>{s.semesterId}</td>
                            <td>{s.section}</td>
                            <td>
                              <span className={`badge-status badge-status-${isPresentModal ? 'present' : 'absent'}`}>
                                {isPresentModal ? 'Present' : 'Absent'}
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
                    className={`btn btn-sm ${isPresentModal ? 'btn-success' : 'btn-danger'} me-auto`}
                    onClick={() => downloadExcel(isPresentModal ? 'Present' : 'Absent')}
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


      {/* Overwrite Confirmation Dialog Modal */}
      {showOverwriteModal && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom border-light bg-warning-subtle text-warning-emphasis">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  Duplicate Entry Warning
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowOverwriteModal(false)} aria-label="Close"></button>
              </div>
              <div className="modal-body py-4">
                <p className="m-0">{conflictMessage}</p>
                <p className="text-muted fs-7 mt-2 mb-0">Note: This action will replace the attendance records for all students in this session.</p>
              </div>
              <div className="modal-footer border-top border-light">
                <button type="button" className="btn btn-secondary-custom" onClick={() => setShowOverwriteModal(false)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={() => handleSave(true)}>Overwrite & Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeAttendance;
