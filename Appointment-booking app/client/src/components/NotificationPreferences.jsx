import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';

function BellIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2.5a6 6 0 00-6 6v3l-1.5 2.5a.5.5 0 00.5.5h14a.5.5 0 00.5-.5L16 11.5v-3a6 6 0 00-6-6z" strokeLinecap="round" />
      <path d="M8 15a2 2 0 004 0" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="3.5" width="17" height="13" rx="2" />
      <path d="M1.5 5.5l8.5 5.5 8.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function NotificationPreferences() {
  const { user, fetchWithAuth } = useAuth();
  const { settings } = useBusiness();
  const [emailReminders, setEmailReminders] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function fetchPreferences() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/user/preferences');
      const data = await res.json();
      if (res.ok) {
        setEmailReminders(data.preferences.email_reminders);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (user) fetchPreferences();
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Auto-dismiss message after 5 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  async function handleToggle() {
    const newValue = !emailReminders;
    setSaving(true);
    setMessage(null);

    // Optimistic update
    setEmailReminders(newValue);

    try {
      const res = await fetchWithAuth('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_reminders: newValue }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: newValue
            ? 'Email reminders enabled — you\'ll receive appointment reminders.'
            : 'Email reminders disabled — you won\'t receive appointment reminders.',
        });
      } else {
        setEmailReminders(!newValue); // revert on error
        setMessage({ type: 'error', text: data.error || 'Failed to update preferences' });
      }
    } catch (err) {
      setEmailReminders(!newValue); // revert on error
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-white rounded-3xl border border-border p-10 max-w-md text-center shadow-sm animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-bg rounded-2xl flex items-center justify-center">
            <BellIcon className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-serif font-semibold text-text mb-2">Sign In Required</h2>
          <p className="text-text-secondary text-sm">Please sign in to manage your notification preferences.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: settings?.primary_color || '#e11d48' }}>
          Preferences
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-text tracking-tight">
          Notification Settings
        </h1>
        <p className="text-text-secondary mt-2">Control how and when we notify you</p>
      </div>

      <div className="space-y-4">
        {/* Email Reminders Card */}
        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-primary-bg flex items-center justify-center flex-shrink-0">
                <MailIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-text">Email Reminders</h2>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                  Receive email reminders {emailReminders ? '24 hours before' : ''} your upcoming appointments
                  {emailReminders ? '.' : ' to help you stay on track.'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-text-muted">
                    Sent to: <span className="font-medium text-text">{user.email}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex-shrink-0 pt-1">
              {loading ? (
                <div className="w-12 h-7 rounded-full bg-border flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <button
                  type="button"
                  role="switch"
                  aria-checked={emailReminders}
                  disabled={saving}
                  onClick={handleToggle}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-wait ${
                    emailReminders
                      ? 'bg-primary shadow-sm'
                      : 'bg-border hover:bg-border-strong'
                  }`}
                  style={emailReminders ? { backgroundColor: settings?.primary_color || '#e11d48' } : {}}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-all duration-300 ${
                      emailReminders ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              )}
            </div>
          </div>

          {/* Status message */}
          {message && (
            <div className={`mt-4 p-3.5 rounded-xl text-sm flex items-start gap-2.5 animate-fade-in ${
              message.type === 'success'
                ? 'bg-success-bg border border-green-200 text-success'
                : 'bg-error-bg border border-red-200 text-error'
            }`}>
              <span className="mt-0.5">{message.type === 'success' ? '✅' : '⚠️'}</span>
              <span>{message.text}</span>
            </div>
          )}
        </div>

        {/* Info card */}
        <div className="bg-surface-warm rounded-2xl border border-border p-6">
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-xl bg-primary-bg flex items-center justify-center flex-shrink-0 text-primary text-sm">💡</span>
            <div className="text-sm text-text-secondary leading-relaxed">
              <p className="font-medium text-text mb-1">About email reminders</p>
              <p>Appointment reminder emails are sent approximately 24 hours before your scheduled appointment. You can toggle this setting at any time.</p>
            </div>
          </div>
        </div>

        {/* Other notification types placeholder (future) */}
        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm opacity-60">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-alt flex items-center justify-center flex-shrink-0">
              <BellIcon className="w-6 h-6 text-text-muted" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text">SMS Notifications</h3>
              <p className="text-sm text-text-secondary mt-1">Coming soon — get text message reminders for your appointments.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
