import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Dashboard = ({ setActivePage }) => {
  const { students, date, fetchAttendanceForSession } = useAttendance();
  const [morningStats, setMorningStats] = useState({ completed: false, present: 0, absent: 0, percentage: 0 });
  const [afternoonStats, setAfternoonStats] = useState({ completed: false, present: 0, absent: 0, percentage: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoadingStats(true);
      try {
        // Fetch morning session attendance for today
        const morningRecords = await fetchAttendanceForSession(date, 'Morning');
        if (morningRecords.length > 0) {
          const present = morningRecords.filter((r) => r.status === 'Present').length;
          const absent = morningRecords.filter((r) => r.status === 'Absent').length;
          const percentage = students.length > 0 ? Math.round((present / students.length) * 100) : 0;
          setMorningStats({ completed: true, present, absent, percentage });
        } else {
          setMorningStats({ completed: false, present: 0, absent: 0, percentage: 0 });
        }

        // Fetch afternoon session attendance for today
        const afternoonRecords = await fetchAttendanceForSession(date, 'Afternoon');
        if (afternoonRecords.length > 0) {
          const present = afternoonRecords.filter((r) => r.status === 'Present').length;
          const absent = afternoonRecords.filter((r) => r.status === 'Absent').length;
          const percentage = students.length > 0 ? Math.round((present / students.length) * 100) : 0;
          setAfternoonStats({ completed: true, present, absent, percentage });
        } else {
          setAfternoonStats({ completed: false, present: 0, absent: 0, percentage: 0 });
        }
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (students.length > 0) {
      loadStats();
    } else {
      setLoadingStats(false);
    }
  }, [students, date]);

  // Overall Today Stats (averaging the active sessions)
  const activeSessionsCount = (morningStats.completed ? 1 : 0) + (afternoonStats.completed ? 1 : 0);
  const totalPresentToday = (morningStats.completed ? morningStats.present : 0) + (afternoonStats.completed ? afternoonStats.present : 0);
  const totalAbsentToday = (morningStats.completed ? morningStats.absent : 0) + (afternoonStats.completed ? afternoonStats.absent : 0);
  
  const averageAttendance = activeSessionsCount > 0 
    ? Math.round(((morningStats.completed ? morningStats.percentage : 0) + (afternoonStats.completed ? afternoonStats.percentage : 0)) / activeSessionsCount)
    : 0;

  const displayDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div>
      {/* Welcome Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Dashboard</h2>
          <p className="text-muted m-0">{displayDate}</p>
        </div>
        <button 
          onClick={() => setActivePage('take-attendance')} 
          className="btn btn-primary-custom d-flex align-items-center gap-2"
        >
          <i className="bi bi-plus-lg"></i>
          Take Attendance
        </button>
      </div>

      {loadingStats ? (
        <div className="d-flex justify-content-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="row g-4 mb-4">
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card-custom stat-card h-100">
                <div className="stat-card-title">Total Students</div>
                <div className="stat-card-value">{students.length}</div>
                <small className="text-muted mt-2 d-block">Uploaded in student list</small>
              </div>
            </div>
            
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card-custom stat-card h-100">
                <div className="stat-card-title">Present Today</div>
                <div className="stat-card-value text-success">
                  {activeSessionsCount > 0 ? totalPresentToday : '-'}
                </div>
                <small className="text-muted mt-2 d-block">
                  {activeSessionsCount > 0 ? `${activeSessionsCount} session(s) active` : 'No sessions recorded yet'}
                </small>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card-custom stat-card h-100">
                <div className="stat-card-title">Absent Today</div>
                <div className="stat-card-value text-danger">
                  {activeSessionsCount > 0 ? totalAbsentToday : '-'}
                </div>
                <small className="text-muted mt-2 d-block">
                  {activeSessionsCount > 0 ? 'Requires attention' : 'No sessions recorded yet'}
                </small>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card-custom stat-card h-100">
                <div className="stat-card-title">Attendance Rate</div>
                <div className="stat-card-value text-primary">
                  {activeSessionsCount > 0 ? `${averageAttendance}%` : '-'}
                </div>
                <div className="progress mt-2" style={{ height: '6px' }}>
                  <div 
                    className="progress-bar bg-primary" 
                    role="progressbar" 
                    style={{ width: `${activeSessionsCount > 0 ? averageAttendance : 0}%` }}
                    aria-valuenow={averageAttendance}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sessions Summary Title */}
          <h4 className="fw-bold mb-3 text-dark mt-5">Daily Session Overview</h4>
          
          <div className="row g-4">
            {/* Morning Session */}
            <div className="col-12 col-md-6">
              <div className="card-custom h-100">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h5 className="fw-bold mb-1">Morning Session</h5>
                    <span className="text-muted fs-7">Scheduled: 09:00 AM - 12:00 PM</span>
                  </div>
                  {morningStats.completed ? (
                    <span className="badge-status badge-status-present">
                      <i className="bi bi-check-circle-fill"></i> Completed
                    </span>
                  ) : (
                    <span className="badge-status badge-status-absent bg-warning-subtle text-warning">
                      <i className="bi bi-clock-fill"></i> Pending
                    </span>
                  )}
                </div>

                {morningStats.completed ? (
                  <div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="fs-7 text-muted">Attendance Rate</span>
                      <span className="fs-7 fw-bold">{morningStats.percentage}%</span>
                    </div>
                    <div className="progress mb-4" style={{ height: '8px' }}>
                      <div 
                        className="progress-bar bg-success" 
                        role="progressbar" 
                        style={{ width: `${morningStats.percentage}%` }}
                        aria-valuenow={morningStats.percentage} 
                        aria-valuemin="0" 
                        aria-valuemax="100"
                      ></div>
                    </div>
                    <div className="row text-center mt-2 border-top pt-3 border-light">
                      <div className="col-6 border-end border-light">
                        <div className="fs-5 fw-bold text-success">{morningStats.present}</div>
                        <div className="fs-7 text-muted">Present</div>
                      </div>
                      <div className="col-6">
                        <div className="fs-5 fw-bold text-danger">{morningStats.absent}</div>
                        <div className="fs-7 text-muted">Absent</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted fs-7 mb-3">Morning attendance is not recorded yet for today.</p>
                    <button 
                      onClick={() => {
                        // Set session in context and route
                        setActivePage('take-attendance');
                      }} 
                      className="btn btn-sm btn-secondary-custom"
                    >
                      Record Attendance
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Afternoon Session */}
            <div className="col-12 col-md-6">
              <div className="card-custom h-100">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h5 className="fw-bold mb-1">Afternoon Session</h5>
                    <span className="text-muted fs-7">Scheduled: 01:00 PM - 04:00 PM</span>
                  </div>
                  {afternoonStats.completed ? (
                    <span className="badge-status badge-status-present">
                      <i className="bi bi-check-circle-fill"></i> Completed
                    </span>
                  ) : (
                    <span className="badge-status badge-status-absent bg-warning-subtle text-warning">
                      <i className="bi bi-clock-fill"></i> Pending
                    </span>
                  )}
                </div>

                {afternoonStats.completed ? (
                  <div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="fs-7 text-muted">Attendance Rate</span>
                      <span className="fs-7 fw-bold">{afternoonStats.percentage}%</span>
                    </div>
                    <div className="progress mb-4" style={{ height: '8px' }}>
                      <div 
                        className="progress-bar bg-success" 
                        role="progressbar" 
                        style={{ width: `${afternoonStats.percentage}%` }}
                        aria-valuenow={afternoonStats.percentage} 
                        aria-valuemin="0" 
                        aria-valuemax="100"
                      ></div>
                    </div>
                    <div className="row text-center mt-2 border-top pt-3 border-light">
                      <div className="col-6 border-end border-light">
                        <div className="fs-5 fw-bold text-success">{afternoonStats.present}</div>
                        <div className="fs-7 text-muted">Present</div>
                      </div>
                      <div className="col-6">
                        <div className="fs-5 fw-bold text-danger">{afternoonStats.absent}</div>
                        <div className="fs-7 text-muted">Absent</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted fs-7 mb-3">Afternoon attendance is not recorded yet for today.</p>
                    <button 
                      onClick={() => {
                        setActivePage('take-attendance');
                      }} 
                      className="btn btn-sm btn-secondary-custom"
                    >
                      Record Attendance
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
