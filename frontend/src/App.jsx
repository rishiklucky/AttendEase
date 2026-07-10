import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AttendanceProvider, useAttendance } from './context/AttendanceContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import TakeAttendance from './pages/TakeAttendance';
import StudentManagement from './pages/StudentManagement';
import HistoryModule from './pages/HistoryModule';
import SendReportPage from './pages/SendReportPage';
import LoginPage from './pages/LoginPage';
import AdminRegisterPage from './pages/AdminRegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import Textpad from './pages/Textpad';
import CalendarModule from './pages/CalendarModule';

// ── Auth-gated inner app ────────────────────────────────────────────────────
function AppContent() {
  const { isAuthenticated, authLoading } = useAuth();
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Show spinner while verifying stored token
  if (authLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'var(--color-background)' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <p className="text-muted fs-7">Loading AttendEase...</p>
        </div>
      </div>
    );
  }

  // Secret admin register route — accessible without auth
  if (hash === '#adminregister') {
    return <AdminRegisterPage />;
  }

  // Forgot password route
  if (hash === '#forgot-password') {
    return <ForgotPasswordPage onBackToLogin={() => { window.location.hash = '#login'; }} />;
  }

  // Not authenticated → show login
  if (!isAuthenticated) {
    if (hash === '#login') {
      return <LoginPage onGoForgot={() => { window.location.hash = '#forgot-password'; }} />;
    }
    // Redirect any other hash to login
    window.location.hash = '#login';
    return <LoginPage onGoForgot={() => { window.location.hash = '#forgot-password'; }} />;
  }

  // ── Authenticated app ─────────────────────────────────────────────────────
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [activePage, setActivePage] = useState('dashboard');
  const { toasts } = useAttendance();

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard setActivePage={setActivePage} />;
      case 'take-attendance': return <TakeAttendance />;
      case 'students': return <StudentManagement />;
      case 'history': return <HistoryModule />;
      case 'calendar': return <CalendarModule setActivePage={setActivePage} />;
      case 'send-report': return <SendReportPage />;
      case 'textpad': return <Textpad />;
      default: return <Dashboard setActivePage={setActivePage} />;
    }
  };

  return (
    <div className="app-container">
      <Navbar activePage={activePage} setActivePage={setActivePage} />
      <main className="app-content">
        {renderPage()}
      </main>
      <div className="toast-container-custom">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-custom ${toast.type}`}>
            <div className="d-flex align-items-center gap-2">
              <i className={`bi ${toast.type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-circle-fill text-danger'} fs-5`}></i>
              <span className="fs-7 fw-semibold">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <AttendanceProvider>
        <AppContent />
      </AttendanceProvider>
    </AuthProvider>
  );
}

export default App;
