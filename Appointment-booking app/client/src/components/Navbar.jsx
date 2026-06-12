import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useBusiness } from '../context/BusinessContext';
import { usePWA } from '../context/PWAContext';

function CalendarIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="3.5" width="17" height="15" rx="2" />
      <path d="M1.5 8.5h17" />
      <path d="M6 1.5V5.5" strokeLinecap="round" />
      <path d="M14 1.5V5.5" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 2.5h12a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H4A1.5 1.5 0 012.5 16V4A1.5 1.5 0 014 2.5z" />
      <path d="M6.5 6.5h7" strokeLinecap="round" />
      <path d="M6.5 10h7" strokeLinecap="round" />
      <path d="M6.5 13.5h4" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 4.5h11" strokeLinecap="round" />
      <path d="M6 10h11" strokeLinecap="round" />
      <path d="M6 15.5h11" strokeLinecap="round" />
      <circle cx="2.5" cy="4.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SettingsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.95 4.05l-1.41 1.41M5.46 14.54l-1.41 1.41M15.95 15.95l-1.41-1.41M5.46 5.46L4.05 4.05" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="3" />
      <path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.93 3.93l1.41 1.41M14.66 14.66l1.41 1.41M3.93 16.07l1.41-1.41M14.66 5.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  );
}

export default function Navbar({ currentPage, onNavigate }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings, getBusinessTypeLabel } = useBusiness();
  const { canInstall, installApp } = usePWA();
  const [mobileOpen, setMobileOpen] = useState(false);

  const tabs = [
    { id: 'services', label: 'Services', icon: ListIcon },
    { id: 'book', label: 'Book Appointment', icon: BookIcon },
    { id: 'appointments', label: 'My Appointments', icon: CalendarIcon },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: SettingsIcon }] : []),
  ];

  return (
    <nav className="bg-white/90 backdrop-blur-lg border-b border-border sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo / Brand */}
          <button
            onClick={() => onNavigate('services')}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:scale-105"
              style={{ backgroundColor: settings?.primary_color || '#e11d48' }}>
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-serif font-bold text-text tracking-tight block leading-tight">
                {settings?.business_name || 'AppointmentBook'}
              </span>
              <span className="text-[10px] font-medium tracking-wider uppercase hidden sm:block"
                style={{ color: settings?.primary_color || '#e11d48' }}>
                {getBusinessTypeLabel(settings?.business_type)}
              </span>
            </div>
          </button>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden lg:flex items-center gap-1 bg-surface-warm rounded-2xl p-1 border border-border">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = currentPage === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { onNavigate(tab.id); setMobileOpen(false); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-white shadow-sm'
                        : 'text-text-secondary hover:text-text hover:bg-white/80'
                    }`}
                    style={isActive ? { backgroundColor: settings?.primary_color || '#e11d48' } : {}}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* PWA Install Button */}
            {canInstall && (
              <button
                onClick={installApp}
                className="p-2.5 rounded-xl text-text-secondary hover:text-text hover:bg-surface-alt transition-all duration-200 relative group"
                title="Install app for offline access"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 2.5v10M6 8.5l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2.5 12.5v3a2 2 0 002 2h11a2 2 0 002-2v-3" strokeLinecap="round" />
                </svg>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ backgroundColor: settings?.primary_color || '#e11d48' }} />
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-text-secondary hover:text-text hover:bg-surface-alt transition-all duration-200"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full border"
                  style={{ backgroundColor: `${settings?.primary_color || '#e11d48'}10`, borderColor: `${settings?.primary_color || '#e11d48'}20` }}>
                  <span className="w-7 h-7 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm"
                    style={{ backgroundColor: settings?.primary_color || '#e11d48' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium"
                    style={{ color: settings?.primary_color || '#e11d48' }}>{user.name}</span>
                </div>
                <button
                  onClick={() => { logout(); onNavigate('services'); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-text-secondary hover:text-error transition-colors font-medium rounded-xl hover:bg-error-bg"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M7 17.5H4A1.5 1.5 0 012.5 16V4A1.5 1.5 0 014 2.5h3" strokeLinecap="round" />
                    <path d="M13.5 14.5L18 10l-4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M18 10H7" strokeLinecap="round" />
                  </svg>
                  <span className="hidden sm:inline">Sign Out</span>
                </button>

                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="lg:hidden p-2 rounded-xl text-text-secondary hover:text-text hover:bg-surface-alt transition-colors"
                >
                  <div className="w-5 h-4 flex flex-col justify-between">
                    <span className={`block h-0.5 bg-current rounded transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                    <span className={`block h-0.5 bg-current rounded transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
                    <span className={`block h-0.5 bg-current rounded transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => onNavigate('login')}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text rounded-xl hover:bg-surface-alt transition-all duration-200">
                  Sign In
                </button>
                <button onClick={() => onNavigate('register')}
                  className="px-5 py-2 text-sm font-medium rounded-xl text-white transition-all duration-200 shadow-sm hover:shadow-md"
                  style={{ backgroundColor: settings?.primary_color || '#e11d48' }}
                  onMouseEnter={e => e.target.style.backgroundColor = settings?.primary_color ? `${settings.primary_color}dd` : '#be123c'}
                  onMouseLeave={e => e.target.style.backgroundColor = settings?.primary_color || '#e11d48'}>
                  Register
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {user && mobileOpen && (
          <div className="lg:hidden pb-4 animate-slide-down">
            <div className="bg-surface-warm rounded-2xl border border-border p-2 space-y-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = currentPage === tab.id;
                return (
                  <button key={tab.id} onClick={() => { onNavigate(tab.id); setMobileOpen(false); }}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive ? 'text-white shadow-sm' : 'text-text-secondary hover:text-text hover:bg-white/80'
                    }`}
                    style={isActive ? { backgroundColor: settings?.primary_color || '#e11d48' } : {}}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
