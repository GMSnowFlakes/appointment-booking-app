import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PWAProvider } from './context/PWAContext';
import { ToastProvider } from './context/ToastContext';
import { useBusiness } from './context/BusinessContext';
import Sidebar from './components/Sidebar';
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

// ─── Footer ─────────────────────────────────

function Footer() {
  const { settings } = useBusiness();
  const { user } = useAuth();
  return (
    <footer className="text-center py-4 px-8 text-[11px] text-text-muted border-t border-border">
      <p>&copy; {new Date().getFullYear()} {user ? 'CRAMS ServiceHub &mdash; ' : ''}{settings?.business_name || (user ? 'Your Business' : 'Appointment Booking Platform')}</p>
    </footer>
  );
}

// ─── Public Layout (no sidebar) ──────────────

function PublicLayout() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="animate-fade-in">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

// ─── Sidebar Layout (authenticated) ─────────

function SidebarLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const handler = (e) => setSidebarOpen(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Keyboard shortcut: Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`main-layout ${isAdmin ? 'admin-layout' : ''}`}>
      <Sidebar
        collapsed={!sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className={`main-content ${!sidebarOpen ? 'main-content-full' : ''}`}>
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="main-area animate-fade-in">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}

// ─── App Routes ──────────────────────────────

function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const Layout = user ? SidebarLayout : PublicLayout;

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public / Home — admin sees admin dashboard, others see services */}
        <Route index element={
          user?.role === 'admin' ? <AdminDashboard /> : <ServiceList onNavigateToBook={() => navigate('/book')} />
        } />
        <Route path="login" element={<AuthForm />} />
        <Route path="register" element={<AuthForm />} />

        {/* Authenticated pages */}
        <Route path="book" element={<BookingForm />} />
        <Route path="appointments" element={
          user?.role === 'admin' ? <AdminDashboard /> : <AppointmentList />
        } />
        <Route path="notifications" element={<NotificationPreferences />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="waiting-list" element={<WaitingListManager />} />
        <Route path="checkout" element={<CheckoutForm />} />

        {/* Admin routes — redirect non-admins */}
        <Route path="admin" element={
          user?.role === 'admin' ? <Navigate to="/admin/story" replace /> : <Navigate to="/" replace />
        } />
        <Route path="admin/:tab" element={
          user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" replace />
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ─── Root App ───────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <PWAProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </PWAProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
