import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CalendarModule = ({ setActivePage }) => {
  const { showToast } = useAttendance();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch all history records to populate the calendar indicators
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/attendance`);
        if (response.data.success) {
          setRecords(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching calendar records:', error);
        showToast('Failed to load attendance records for calendar view.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [month, year]);

  // Map records to date and session structure
  const sessionsByDate = {};
  records.forEach((r) => {
    if (!sessionsByDate[r.date]) {
      sessionsByDate[r.date] = { Morning: false, Afternoon: false };
    }
    if (r.session === 'Morning') {
      sessionsByDate[r.date].Morning = true;
    } else if (r.session === 'Afternoon') {
      sessionsByDate[r.date].Afternoon = true;
    }
  });

  // Calendar calculations
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();

  const days = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({
      dayNum: prevTotalDays - i,
      isCurrentMonth: false,
      dateString: null
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({
      dayNum: i,
      isCurrentMonth: true,
      dateString: dayStr
    });
  }

  // Next month padding days
  const totalGridCells = Math.ceil(days.length / 7) * 7;
  const nextMonthPadding = totalGridCells - days.length;
  for (let i = 1; i <= nextMonthPadding; i++) {
    days.push({
      dayNum: i,
      isCurrentMonth: false,
      dateString: null
    });
  }

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (day) => {
    if (!day.isCurrentMonth || !day.dateString) return;

    // Determine the preferred session to load
    const dateData = sessionsByDate[day.dateString];
    let preferredSession = 'Morning';
    if (dateData && dateData.Afternoon && !dateData.Morning) {
      preferredSession = 'Afternoon';
    }

    sessionStorage.setItem('selectedHistoryDate', day.dateString);
    sessionStorage.setItem('selectedHistorySession', preferredSession);
    setActivePage('history');
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="container-fluid p-0 animate-fade-in">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Calendar Module</h2>
          <p className="text-muted fs-7 mb-0">Visual summary of attendance records across the calendar month</p>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="card-custom bg-white">
        {/* Calendar Header / Toolbar */}
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold text-dark m-0">
              {monthNames[month]} {year}
            </h4>
          </div>
          
          <div className="d-flex gap-2">
            <button onClick={handleToday} className="btn btn-secondary-custom btn-sm py-1.5 px-3">
              Today
            </button>
            <button onClick={handlePrevMonth} className="btn btn-secondary-custom btn-sm py-1.5">
              <i className="bi bi-chevron-left"></i>
            </button>
            <button onClick={handleNextMonth} className="btn btn-secondary-custom btn-sm py-1.5">
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="d-flex flex-wrap gap-2 gap-sm-3 mb-4 p-2 p-sm-3 bg-light rounded-3">
          <div className="d-flex align-items-center gap-1.5 gap-sm-2">
            <span className="badge bg-success" style={{ width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block' }}></span>
            <span className="fs-8 fs-sm-7 fw-semibold text-muted">Attendance Recorded</span>
          </div>
          <div className="d-flex align-items-center gap-1.5 gap-sm-2">
            <span className="badge bg-danger" style={{ width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block' }}></span>
            <span className="fs-8 fs-sm-7 fw-semibold text-muted">No Attendance</span>
          </div>
          <div className="d-flex align-items-center gap-1.5 gap-sm-2 legend-divider">
            <span className="badge-session-indicator active bg-primary text-white" style={{ fontSize: '8px', width: '14px', height: '14px' }}>M</span>
            <span className="fs-8 fs-sm-7 fw-semibold text-muted">Morning Marked</span>
          </div>
          <div className="d-flex align-items-center gap-1.5 gap-sm-2">
            <span className="badge-session-indicator active bg-primary text-white" style={{ fontSize: '8px', width: '14px', height: '14px' }}>A</span>
            <span className="fs-8 fs-sm-7 fw-semibold text-muted">Afternoon Marked</span>
          </div>
        </div>

        {/* Grid Loading */}
        {loading && (
          <div className="py-5 text-center">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted fs-7 mt-2">Loading calendar records...</p>
          </div>
        )}

        {!loading && (
          <div>
            {/* Weekdays Header */}
            <div className="calendar-grid mb-2 text-center">
              {weekdays.map((day) => (
                <div key={day} className="fw-bold text-muted fs-8 fs-sm-7 py-1 py-sm-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Month Grid */}
            <div className="calendar-grid">
              {days.map((day, idx) => {
                const dateData = day.dateString ? sessionsByDate[day.dateString] : null;
                const hasAttendance = dateData && (dateData.Morning || dateData.Afternoon);
                const hasMorning = dateData && dateData.Morning;
                const hasAfternoon = dateData && dateData.Afternoon;

                let cellClass = 'calendar-day-cell';
                if (!day.isCurrentMonth) {
                  cellClass += ' other-month';
                } else if (hasAttendance) {
                  cellClass += ' marked-attendance';
                } else {
                  cellClass += ' unmarked-attendance';
                }

                return (
                  <div
                    key={idx}
                    onClick={() => handleDayClick(day)}
                    className={cellClass}
                    title={day.isCurrentMonth ? (hasAttendance ? `Click to view records for ${day.dateString}` : `Click to record attendance for ${day.dateString}`) : ''}
                  >
                    <div className="fw-bold fs-6">{day.dayNum}</div>
                    
                    {day.isCurrentMonth && (
                      <div className="d-flex gap-1 mt-2 justify-content-center">
                        <span className={`badge-session-indicator ${hasMorning ? 'active' : 'inactive'}`}>
                          M
                        </span>
                        <span className={`badge-session-indicator ${hasAfternoon ? 'active' : 'inactive'}`}>
                          A
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarModule;
