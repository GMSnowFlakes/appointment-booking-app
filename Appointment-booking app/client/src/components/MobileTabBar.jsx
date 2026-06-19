import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';

// ─── Tab Icons (minimal inline SVGs) ────────

const TabIcon = {
  dashboard: () => (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6v6H2V3zM12 3h6v6h-6V3zM2 13h6v6H2v-6zM12 13h6v6h-6v-6z" />
    </svg>
  ),
  appointments: () => (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M6 4.5h11M6 10h11M6 15.5h11" />
      <circle cx="2.5" cy="4.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  users: () => (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M14 16v-1a3 3 0 00-3-3H5a3 3 0 00-3 3v1" />
      <circle cx="8" cy="5" r="3" />
      <path d="M18 16v-1a3 3 0 00-2-2.87M13 3.13a3 3 0 010 5.74" />
    </svg>
  ),
  growth: () => (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 18h16" />
      <path d="M6 14V8M11 14V4M16 14v-4" />
      <path d="M2 6l4-4 4 4" strokeDasharray="2 2" opacity="0.4" />
    </svg>
  ),
  more: () => (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="10" cy="4" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="10" cy="16" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  services: () => (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  book: () => (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="1.5" y="3.5" width="17" height="15" rx="2" />
      <path d="M1.5 8.5h17M6 1.5V5.5M14 1.5V5.5M14 12.5l-3 3-1.5-1.5" />
    </svg>
  ),
  profile: () => (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M14 16v-1a3 3 0 00-3-3H5a3 3 0 00-3 3v1" />
      <circle cx="8" cy="5" r="3" />
    </svg>
  ),
};

// ─── Tab Definitions ─────────────────────────

const ADMIN_TABS = [
  { id: 'story', label: 'Dashboard', icon: 'dashboard', group: 'Overview' },
  { id: 'appointments', label: 'Appointments', icon: 'appointments', group: 'Operations' },
  { id: 'users', label: 'Customers', icon: 'users', group: 'Operations' },
  { id: 'analytics', label: 'Growth', icon: 'growth', group: 'Growth' },
  { id: null, label: 'More', icon: 'more', group: null, isMore: true },
];

const USER_TABS = [
  { id: 'services', label: 'Services', icon: 'services' },
  { id: 'book', label: 'Book Now', icon: 'book', auth: true },
  { id: 'appointments', label: 'Appointments', icon: 'appointments', auth: true },
  { id: 'profile', label: 'Profile', icon: 'profile', auth: true },
];

// ─── Path resolver (mirrors Sidebar logic) ──

function idToPath(id, isAdmin) {
  if (!id) return '/';
  if (isAdmin && id === 'services') return '/admin/services';
  if (isAdmin && id === 'appointments') return '/admin/appointments';
  if (['story','users','staff','settings','finance','coupons','analytics','public','widget','ical','developer','templates'].includes(id)) {
    return `/admin/${id}`;
  }
  if (id === 'services') return '/';
  return `/${id}`;
}

// ─── Component ───────────────────────────────

export default function MobileTabBar({ onOpenSidebar }) {
  const { user } = useAuth();
  const { settings } = useBusiness();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!user) return null;

  const isAdmin = user?.role === 'admin';
  const tabs = isAdmin ? ADMIN_TABS : USER_TABS;
  const color = settings?.primary_color || '#e11d48';

  function isActive(tab) {
    if (tab.isMore) return false;
    const path = idToPath(tab.id, isAdmin);
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  }

  function handleTabClick(tab) {
    if (tab.isMore) {
      onOpenSidebar?.();
      return;
    }
    navigate(idToPath(tab.id, isAdmin));
  }

  return (
    <nav className="mobile-tab-bar">
      {tabs.map((tab) => {
        const active = isActive(tab);
        return (
          <button
            key={tab.id || tab.label}
            onClick={() => handleTabClick(tab)}
            className={`mobile-tab ${active ? 'mobile-tab-active' : ''}`}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
          >
            <span className="mobile-tab-icon">
              {TabIcon[tab.icon]?.(active)}
            </span>
            <span className="mobile-tab-label">{tab.label}</span>
            {active && (
              <span
                className="mobile-tab-indicator"
                style={{ background: color }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
