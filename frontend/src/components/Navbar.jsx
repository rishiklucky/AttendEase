import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ activePage, setActivePage }) => {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
    { id: 'take-attendance', label: 'Take Attendance', icon: 'bi-check2-circle' },
    { id: 'students', label: 'Student Management', icon: 'bi-people-fill' },
    { id: 'history', label: 'Attendance History', icon: 'bi-calendar3' },
    { id: 'calendar', label: 'Calendar View', icon: 'bi-calendar-event' },
    { id: 'send-report', label: 'Send Report', icon: 'bi-send-check' },
    { id: 'textpad', label: 'Textpad', icon: 'bi-file-text' }
  ];

  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    setShowMobileSidebar(false);
  };

  return (
    <>
      {/* Mobile Top Navbar */}
      <header className="mobile-header d-md-none">
        <button
          className="btn btn-link text-dark p-0"
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          aria-label="Toggle Navigation"
        >
          <i className={`bi ${showMobileSidebar ? 'bi-x-lg' : 'bi-list'} fs-3`}></i>
        </button>
        <span className="fw-bold fs-5 text-primary">AttendEase</span>
        <div style={{ width: '24px' }}></div>
      </header>

      {/* Sidebar Overlay for Mobile */}
      {showMobileSidebar && (
        <div
          className="modal-backdrop fade show d-md-none"
          onClick={() => setShowMobileSidebar(false)}
          style={{ zIndex: 990 }}
        ></div>
      )}

      {/* Navigation Sidebar */}
      <nav className={`app-sidebar ${showMobileSidebar ? 'show' : ''}`}>
        <div className="app-sidebar-logo">
          <h4 className="fw-bold m-0 text-primary d-flex align-items-center">
            <i className="bi bi-journal-check me-2"></i>
            AttendEase
          </h4>
          <span className="text-muted fs-7">Portal v1.0</span>
        </div>

        <ul className="app-sidebar-menu">
          {menuItems.map((item) => (
            <li className="app-sidebar-item" key={item.id}>
              <button
                onClick={() => handleNavClick(item.id)}
                className={`app-sidebar-link btn btn-link w-100 border-0 text-start ${activePage === item.id ? 'active' : ''}`}
                style={{ background: activePage === item.id ? 'var(--color-primary)' : 'transparent' }}
              >
                <i className={`bi ${item.icon}`}></i>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-auto p-3 border-top border-light">
          {user && (
            <div className="d-flex align-items-center gap-2 mb-2">
              <div className="avatar-initial flex-shrink-0">
                {user.username ? user.username[0].toUpperCase() : 'A'}
              </div>
              <div className="overflow-hidden">
                <div className="fw-semibold text-dark text-truncate" style={{ fontSize: 13 }}>{user.username}</div>
                <div className="text-muted text-truncate" style={{ fontSize: 11 }}>{user.email}</div>
              </div>
            </div>
          )}
          <button
            className="btn btn-sm btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={() => logout()}
          >
            <i className="bi bi-box-arrow-right"></i>
            Logout
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navbar;

