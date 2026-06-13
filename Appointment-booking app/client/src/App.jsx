import { useState, useRef, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PWAProvider } from './context/PWAContext';
import { ToastProvider } from './context/ToastContext';
import { useBusiness } from './context/BusinessContext';
import Navbar from './components/Navbar';
import ServiceList from './components/ServiceList';
import AuthForm from './components/AuthForm';
import BookingForm from './components/BookingForm';
import AppointmentList from './components/AppointmentList';
import AdminDashboard from './components/AdminDashboard';
import NotificationPreferences from './components/NotificationPreferences';
import ProfilePage from './components/ProfilePage';
import CheckoutForm from './components/CheckoutForm';
import WaitingListManager from './components/WaitingListManager';

// ─── Footer ─────────────────────────────────────

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

// ─── Page Transition Wrapper ───────────────────

function PageTransition({ page, children }) {
  const prevPage = useRef(page);
  const [animClass, setAnimClass] = useState('');

  useEffect(() => {
    if (prevPage.current !== page) {
      setAnimClass('animate-page-out');
      const timer = setTimeout(() => {
        setAnimClass('animate-page-in');
        prevPage.current = page;
      }, 150);
      return () => clearTimeout(timer);
    }
    prevPage.current = page;
  }, [page]);

  return (
    <div className={`transition-opacity duration-150 ${animClass}`}>
      {children}
    </div>
  );
}

// ─── App Content ───────────────────────────────

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
      case 'notifications': return <NotificationPreferences />;
      case 'admin': return <AdminDashboard />;
      case 'profile': return <ProfilePage />;
      case 'waiting-list': return <WaitingListManager key={refreshAppointments} />;
      case 'checkout': return <CheckoutForm appointment={null} onSuccess={() => setPage('appointments')} onCancel={() => setPage('book')} />;  // appointment will be set by BookingForm
      case 'services':
      default: return <ServiceList />;
    }
  }

  return (
    <div className="min-h-screen bg-surface-warm relative">
      <Navbar currentPage={page === 'auth' ? authMode : page} onNavigate={handleNavigate} />
      <main className="relative z-10">
        <PageTransition page={page}>
          {renderPage()}
        </PageTransition>
      </main>
      <Footer />
    </div>
  );
}

// ─── Root App ───────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PWAProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </PWAProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
