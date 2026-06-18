import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useBusiness } from '../context/BusinessContext';

// ─── SVG Icons ─────────────────────────────

const Icons = {
  dashboard: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6v6H2V3zM12 3h6v6h-6V3zM2 13h6v6H2v-6zM12 13h6v6h-6v-6z"/></svg>,
  calendar: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1.5" y="3.5" width="17" height="15" rx="2"/><path d="M1.5 8.5h17M6 1.5V5.5M14 1.5V5.5"/></svg>,
  appointments: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 4.5h11M6 10h11M6 15.5h11"/><circle cx="2.5" cy="4.5" r="1" fill="currentColor" stroke="none"/><circle cx="2.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="2.5" cy="15.5" r="1" fill="currentColor" stroke="none"/></svg>,
  users: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 16v-1a3 3 0 00-3-3H5a3 3 0 00-3 3v1"/><circle cx="8" cy="5" r="3"/><path d="M18 16v-1a3 3 0 00-2-2.87M13 3.13a3 3 0 010 5.74"/></svg>,
  services: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
  staff: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 16v-1a3 3 0 00-3-3h-2M7 16v-1a3 3 0 013-3h2M9 7a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M13 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  analytics: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 18h16"/><path d="M6 14V8M11 14V4M16 14v-4"/></svg>,
  coupon: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17.5 10.5l-6 6a1.5 1.5 0 01-2.12 0L2.5 9.5V2.5h7l7.5 7.5a1.5 1.5 0 010 2.5z"/><circle cx="6" cy="6" r="1" fill="currentColor" stroke="none"/></svg>,
  globe: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2z"/><path d="M6 8.5h8M6 12h8M6 15.5h4"/></svg>,
  widget: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="2" width="7" height="7" rx="1"/><rect x="11" y="2" width="7" height="7" rx="1"/><rect x="2" y="11" width="7" height="7" rx="1"/><rect x="11" y="11" width="7" height="7" rx="1"/></svg>,
  settings: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="10" cy="10" r="2.5"/><path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.95 4.05l-1.41 1.41M5.46 14.54l-1.41 1.41M15.95 15.95l-1.41-1.41M5.46 5.46L4.05 4.05"/></svg>,
  developer: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="13 5 18 10 13 15"/><polyline points="7 5 2 10 7 15"/></svg>,
  finance: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 1v18M15 5H8a3 3 0 000 6h4a3 3 0 010 6H5"/></svg>,
  bell: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 2.5a6 6 0 00-6 6v3l-1.5 2.5a.5.5 0 00.5.5h14a.5.5 0 00.5-.5L16 11.5v-3a6 6 0 00-6-6z"/><path d="M8 15a2 2 0 004 0"/></svg>,
  clock: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="10" cy="10" r="7.5"/><path d="M10 5.5V10l3 2"/></svg>,
  sun: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="10" cy="10" r="3"/><path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.93 3.93l1.41 1.41M14.66 14.66l1.41 1.41M3.93 16.07l1.41-1.41M14.66 5.34l1.41-1.41"/></svg>,
  moon: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>,
  logout: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 17.5H4A1.5 1.5 0 012.5 16V4A1.5 1.5 0 014 2.5h3"/><path d="M13.5 14.5L18 10l-4.5-4.5M18 10H7"/></svg>,
  ical: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1.5" y="2.5" width="17" height="15" rx="2"/><path d="M1.5 7.5h17M5.5 1v3.5M14.5 1v3.5"/></svg>,
  template: (cls) => <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>,
};

// ─── Navigation Groups ──────────────────────

const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { id: 'appointments', label: 'Appointments', icon: 'appointments', auth: true },
      { id: 'book', label: 'Book', icon: 'services', auth: true },
      { id: 'services', label: 'Services', icon: 'services' },
      { id: 'waiting-list', label: 'Waiting List', icon: 'clock', auth: true },
    ],
  },
  {
    label: 'Notifications',
    items: [
      { id: 'notifications', label: 'Notification Prefs', icon: 'bell', auth: true },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'profile', label: 'Profile', icon: 'users', auth: true },
    ],
  },
];

const ADMIN_NAV_GROUPS = [
  {
    label: 'Management',
    items: [
      { id: 'story', label: 'Dashboard', icon: 'dashboard' },
      { id: 'appointments', label: 'Appointments', icon: 'appointments' },
      { id: 'users', label: 'Customers', icon: 'users' },
      { id: 'services', label: 'Services', icon: 'services' },
      { id: 'staff', label: 'Staff', icon: 'staff' },
    ],
  },
  {
    label: 'Business',
    items: [
      { id: 'settings', label: 'Settings', icon: 'settings' },
      { id: 'finance', label: 'Finance', icon: 'finance' },
      { id: 'coupons', label: 'Coupons', icon: 'coupon' },
      { id: 'analytics', label: 'Analytics', icon: 'analytics' },
      { id: 'templates', label: 'Templates', icon: 'template' },
    ],
  },
  {
    label: 'Channels',
    items: [
      { id: 'public', label: 'Public Pages', icon: 'globe' },
      { id: 'widget', label: 'Widgets', icon: 'widget' },
      { id: 'ical', label: 'Calendar Sync', icon: 'ical' },
    ],
  },

];

// ─── Sidebar Component ──────────────────────

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useBusiness();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isAdmin = user?.role === 'admin';
  const groups = isAdmin ? ADMIN_NAV_GROUPS : NAV_GROUPS;

  function idToPath(id) {
    if (isAdmin && id === 'services') return '/admin/services';
    if (isAdmin && id === 'appointments') return '/admin/appointments';
    if (['story','users','staff','settings','finance','coupons','analytics','public','widget','ical','developer','templates'].includes(id)) {
      return `/admin/${id}`;
    }
    if (id === 'services') return '/';
    return `/${id}`;
  }

  function isActive(id) {
    const path = idToPath(id);
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  }

  function handleNavigate(id) {
    navigate(idToPath(id));
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div className="sidebar-overlay lg:hidden" onClick={onToggle} />
      )}

      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          {/* Expand/Collapse Toggle Button - always visible */}
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-surface-alt transition-colors cursor-pointer"
            style={{ background: collapsed ? 'transparent' : (settings?.primary_color || '#e11d48') }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <svg className="w-4 h-4 text-text" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M8 4l-6 6 6 6M18 4l-6 6 6 6" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="1.5" y="3.5" width="17" height="15" rx="2" />
                <path d="M1.5 8.5h17M6 1.5V5.5M14 1.5V5.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="text-sm font-bold text-text tracking-tight block leading-none">
                CRAMS
              </span>
              <span className="text-[9px] font-medium tracking-widest uppercase text-text-muted block mt-0.5">
                {settings?.business_name || 'ServiceHub'}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {groups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <div className="sidebar-group-label">{group.label}</div>
              )}
              {group.items
                .filter((item) => {
                  if (item.adminOnly && !isAdmin) return false;
                  if (item.auth && !user) return false;
                  return true;
                })
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleNavigate(item.id);
                      if (onToggle && window.innerWidth < 1024) onToggle();
                    }}
                    className={`sidebar-item ${isActive(item.id) ? 'sidebar-item-active' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    {Icons[item.icon]?.('w-[18px] h-[18px]')}
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {!collapsed && user && (
            <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ background: settings?.primary_color || '#e11d48' }}
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-xs font-medium text-text truncate">{user.name}</p>
                <p className="text-[10px] text-text-muted truncate">{user.email}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="btn-icon flex-1 text-text-muted hover:text-text hover:bg-surface-alt"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? Icons.moon('w-4 h-4') : Icons.sun('w-4 h-4')}
            </button>
            {!collapsed && user && (
              <button
                onClick={handleLogout}
                className="btn-icon text-text-muted hover:text-error hover:bg-error-bg"
                title="Sign out"
              >
                {Icons.logout('w-4 h-4')}
              </button>
            )}

          </div>
        </div>
      </aside>
    </>
  );
}
