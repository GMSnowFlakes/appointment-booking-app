import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useBusiness } from '../context/BusinessContext';
import { usePWA } from '../context/PWAContext';

const icons = {
  Calendar: (cls) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="3.5" width="17" height="15" rx="2" />
      <path d="M1.5 8.5h17M6 1.5V5.5M14 1.5V5.5" strokeLinecap="round" />
    </svg>
  ),
  Book: (cls) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 2.5h12a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H4A1.5 1.5 0 012.5 16V4A1.5 1.5 0 014 2.5z" />
      <path d="M6.5 6.5h7M6.5 10h7M6.5 13.5h4" strokeLinecap="round" />
    </svg>
  ),
  List: (cls) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 4.5h11M6 10h11M6 15.5h11" strokeLinecap="round" />
      <circle cx="2.5" cy="4.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  Clock: (cls) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="7.5" /><path d="M10 5.5V10l3.5 2" strokeLinecap="round" />
    </svg>
  ),
  Bell: (cls) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2.5a6 6 0 00-6 6v3l-1.5 2.5a.5.5 0 00.5.5h14a.5.5 0 00.5-.5L16 11.5v-3a6 6 0 00-6-6z" strokeLinecap="round" />
      <path d="M8 15a2 2 0 004 0" strokeLinecap="round" />
    </svg>
  ),
  Settings: (cls) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.95 4.05l-1.41 1.41M5.46 14.54l-1.41 1.41M15.95 15.95l-1.41-1.41M5.46 5.46L4.05 4.05" strokeLinecap="round" />
    </svg>
  ),
  Sun: (cls) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="3" />
      <path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.93 3.93l1.41 1.41M14.66 14.66l1.41 1.41M3.93 16.07l1.41-1.41M14.66 5.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  ),
  Moon: (cls) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  ),
  Download: (cls) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2.5v10M6 8.5l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 12.5v3a2 2 0 002 2h11a2 2 0 002-2v-3" strokeLinecap="round" />
    </svg>
  ),
  Logout: (cls) => (
    <svg className={cls} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 17.5H4A1.5 1.5 0 012.5 16V4A1.5 1.5 0 014 2.5h3" strokeLinecap="round" />
      <path d="M13.5 14.5L18 10l-4.5-4.5M18 10H7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function Navbar({ currentPage, onNavigate }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings, getBusinessTypeLabel } = useBusiness();
  const { canInstall, installApp } = usePWA();
  const [mobileOpen, setMobileOpen] = useState(false);

  const color = settings?.primary_color || '#e11d48';

  const tabs = [
    { id: 'services',      label: 'Services',         icon: 'List'     },
    ...(user ? [
      { id: 'book',          label: 'Book',             icon: 'Book'     },
      { id: 'appointments',  label: 'Appointments',     icon: 'Calendar' },
      { id: 'notifications', label: 'Notifications',    icon: 'Bell'     },
      { id: 'waiting-list',  label: 'Waiting List',     icon: 'Clock'    },
    ] : []),
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: 'Settings' }] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 bg-surface/95 backdrop-blur-md border-b border-border"
      style={{ boxShadow: '0 1px 0 0 var(--color-border)' }}>

      {/* Brand top-line accent */}
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88 60%, transparent)` }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 gap-6">

          {/* Logo */}
          <button
            onClick={() => onNavigate('services')}
            className="flex items-center gap-2.5 flex-shrink-0 group"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-150 group-hover:scale-105"
              style={{ backgroundColor: color }}>
              {icons.Calendar('w-4 h-4 text-white')}
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-semibold text-text tracking-tight block leading-none">
                {settings?.business_name || 'AppointmentBook'}
              </span>
              <span className="text-[10px] font-medium tracking-widest uppercase text-text-muted block mt-0.5">
                {getBusinessTypeLabel(settings?.business_type) || 'Booking Platform'}
              </span>
            </div>
          </button>

          {/* Divider */}
          {user && <div className="hidden lg:block w-px h-5 bg-border flex-shrink-0" />}

          {/* Desktop Tab Nav — underline style */}
          {user && (
            <div className="hidden lg:flex items-center gap-0.5 flex-1">
              {tabs.map(tab => {
                const isActive = currentPage === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { onNavigate(tab.id); setMobileOpen(false); }}
                    className="relative flex items-center gap-1.5 px-3 py-[calc(1.75rem-1.5px)] text-[13px] font-medium transition-colors duration-150"
                    style={{
                      color: isActive ? color : 'var(--color-text-secondary)',
                      borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                    }}
                  >
                    {icons[tab.icon]?.(`w-3.5 h-3.5`)}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-1 ml-auto">

            {canInstall && (
              <button onClick={installApp} className="relative p-2 rounded-md text-text-muted hover:text-text hover:bg-surface-alt transition-colors" title="Install app">
                {icons.Download('w-4 h-4')}
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? icons.Moon('w-4 h-4') : icons.Sun('w-4 h-4')}
            </button>

            {user ? (
              <>
                {/* User chip */}
                <div className="hidden sm:flex items-center gap-2 ml-1 pl-3 border-l border-border">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: color }}>
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[13px] font-medium text-text max-w-24 truncate">{user.name}</span>
                </div>
                <button
                  onClick={() => { logout(); onNavigate('services'); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 ml-1 text-[13px] text-text-muted hover:text-error transition-colors rounded-md hover:bg-error-bg"
                >
                  {icons.Logout('w-3.5 h-3.5')}
                  <span className="hidden sm:inline">Sign out</span>
                </button>
                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="lg:hidden p-2 rounded-md text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
                >
                  <div className="w-4 h-3.5 flex flex-col justify-between">
                    <span className={`block h-px bg-current rounded transition-all duration-200 ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                    <span className={`block h-px bg-current rounded transition-all duration-200 ${mobileOpen ? 'opacity-0' : ''}`} />
                    <span className={`block h-px bg-current rounded transition-all duration-200 ${mobileOpen ? '-rotate-45 -translate-y-[5px]' : ''}`} />
                  </div>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5 ml-1 pl-3 border-l border-border">
                <button
                  onClick={() => onNavigate('login')}
                  className="px-3 py-1.5 text-[13px] font-medium text-text-secondary hover:text-text rounded-md hover:bg-surface-alt transition-colors">
                  Sign in
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="px-3.5 py-1.5 text-[13px] font-semibold text-white rounded-lg transition-all duration-150 hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: color, boxShadow: `0 1px 3px ${color}40` }}>
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {user && mobileOpen && (
        <div className="lg:hidden border-t border-border bg-surface animate-slide-down">
          <div className="max-w-7xl mx-auto px-4 py-2 space-y-0.5">
            {tabs.map(tab => {
              const isActive = currentPage === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { onNavigate(tab.id); setMobileOpen(false); }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left"
                  style={{
                    background: isActive ? `${color}10` : 'transparent',
                    color: isActive ? color : 'var(--color-text-secondary)',
                  }}
                >
                  {icons[tab.icon]?.('w-4 h-4')}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
