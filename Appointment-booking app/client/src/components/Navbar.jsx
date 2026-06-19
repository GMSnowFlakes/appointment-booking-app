import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';

// ─── Icons ──────────────────────────────────

const Icons = {
  hamburger: (cls) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  ),
};

// ─── Path → Title mapping ──────────────────

const TITLES = {
  '/': 'Services',
  '/login': 'Sign In',
  '/register': 'Create Account',
  '/book': 'Book an Appointment',
  '/appointments': 'My Appointments',
  '/checkout': 'Checkout',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
  '/waiting-list': 'Waiting List',
};

const ADMIN_TAB_TITLES = {
  '': 'Dashboard',
  story: 'Dashboard',
  users: 'Customers',
  staff: 'Staff',
  services: 'Services',
  appointments: 'Appointments',
  settings: 'Business Settings',
  finance: 'Finance',
  coupons: 'Promotions & Coupons',
  analytics: 'Analytics & Reports',
  public: 'Booking Pages',
  widget: 'Widgets & Embeds',
  ical: 'Calendar',
  templates: 'Templates',
  developer: 'Integrations & API',
};

// ─── Top Header ─────────────────────────────

export default function Navbar({ onToggleSidebar }) {
  const { user } = useAuth();
  const { settings } = useBusiness();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const title = pathname.startsWith('/admin')
    ? ADMIN_TAB_TITLES[pathname.split('/')[2] || ''] || 'Dashboard'
    : TITLES[pathname] || 'CRAMS ServiceHub';
  const color = settings?.primary_color || '#e11d48';

  return (
    <header className="top-header">
      {/* Mobile hamburger */}
      {user && (
        <button
          onClick={onToggleSidebar}
          className="btn-icon text-text-secondary hover:text-text hover:bg-surface-alt"
          aria-label="Toggle sidebar"
        >
          {Icons.hamburger('w-5 h-5')}
        </button>
      )}

      {/* Page title */}
      <h1 className="text-[15px] font-semibold text-text flex-1 truncate min-w-0">
        {title}
      </h1>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {!user ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate('/login')}
              className="btn-ghost btn-sm text-text-secondary"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/register')}
              className="btn-sm font-semibold text-white"
              style={{ background: color }}
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="text-[13px] font-medium text-text hidden sm:block max-w-24 truncate">
              {user.name}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
