import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PWAProvider } from './context/PWAContext';
import { useBusiness } from './context/BusinessContext';
import Navbar from './components/Navbar';
import ServiceList from './components/ServiceList';
import AuthForm from './components/AuthForm';
import BookingForm from './components/BookingForm';
import AppointmentList from './components/AppointmentList';
import AdminDashboard from './components/AdminDashboard';

// Footer with dynamic business name and color
function Footer() {
  const { settings } = useBusiness();
  return (
    <footer className="relative z-10 mt-16 border-t border-border bg-white/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: settings?.primary_color || '#e11d48' }}>
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1.5" y="3.5" width="17" height="15" rx="2" />
                <path d="M1.5 8.5h17" />
              </svg>
            </div>
            <span className="text-sm font-medium text-text">{settings?.business_name || 'AppointmentBook'}</span>
          </div>
          <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} &mdash; Online booking platform</p>
        </div>
      </div>
    </footer>
  );
}

function AppContent() {
  const { user } = useAuth();
  const [page, setPage] = useState('services');
  const [authMode, setAuthMode] = useState('login');
  const [refreshAppointments, setRefreshAppointments] = useState(0);

  function handleNavigate(p) {
    if (p === 'login' || p === 'register') {
      setAuthMode(p);
      setPage('auth');
    } else {
      setPage(p);
    }
  }

  function handleAuthSuccess() { setPage('services'); }

  function handleBookingSuccess() {
    setRefreshAppointments(prev => prev + 1);
    setTimeout(() => setPage('appointments'), 1500);
  }

  function renderPage() {
    switch (page) {
      case 'auth': return <AuthForm key={authMode} mode={authMode} onSuccess={handleAuthSuccess} onToggle={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} />;
      case 'book': return <BookingForm key={refreshAppointments} onBooked={handleBookingSuccess} />;
      case 'appointments': return <AppointmentList key={refreshAppointments} />;
      case 'admin': return <AdminDashboard />;
      case 'services':
      default: return <ServiceList />;
    }
  }

  return (
    <div className="min-h-screen bg-surface-warm relative">
      <Navbar currentPage={page === 'auth' ? authMode : page} onNavigate={handleNavigate} />
      <main className="relative z-10">{renderPage()}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PWAProvider>
          <AppContent />
        </PWAProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
