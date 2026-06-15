import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AvailabilityCalendar from './AvailabilityCalendar';

function formatDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default function RescheduleModal({ open, appointment, onClose, onRescheduled }) {
  const { fetchWithAuth } = useAuth();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) { setDate(''); setTime(''); setError(''); }
  }, [open, appointment?.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleCalendarSelect(newDate, newTime) {
    setDate(newDate);
    setTime(newTime);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!date || !time) { setError('Please select a new date and time.'); return; }

    if (date === appointment.date && time === appointment.time) {
      setError('The new date and time must be different from the current booking.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`/api/appointments/${appointment.id}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time }),
      });
      const data = await res.json();
      if (res.ok) { onRescheduled?.(); onClose?.(); }
      else setError(data.error || 'Failed to reschedule appointment');
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  if (!open || !appointment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl border border-border w-full max-w-lg animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface-warm">
          <div>
            <h2 className="text-lg font-serif font-bold text-text">Reschedule Appointment</h2>
            <p className="text-sm text-text-secondary mt-0.5">{appointment.service_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-text-muted hover:text-text hover:bg-surface-alt transition-all flex items-center justify-center">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Current Booking Info */}
          <div className="bg-surface-alt rounded-xl border border-border p-4 mb-6">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">Current Booking</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <svg className="w-3.5 h-3.5 text-text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1.5" y="2.5" width="13" height="12" rx="2" />
                  <path d="M1.5 6.5h13" />
                  <path d="M5 1v3M11 1v3" strokeLinecap="round" />
                </svg>
                {formatDate(appointment.date)}
              </span>
              <span className="flex items-center gap-1.5 text-text-secondary">
                <svg className="w-3.5 h-3.5 text-text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" />
                </svg>
                {new Date(`2000-01-01T${appointment.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </span>
              <span className="text-text-muted">· {appointment.service_duration} min</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3.5 bg-error-bg border border-red-200 rounded-xl text-sm text-error flex items-start gap-2.5 animate-fade-in">
              <span className="mt-0.5">⚠️</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AvailabilityCalendar
              date={date}
              time={time}
              serviceId={appointment.service_id}
              serviceDuration={appointment.service_duration}
              onSelect={handleCalendarSelect}
            />

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-text-secondary border border-border hover:bg-surface-alt transition-all">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !date || !time}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Rescheduling...
                  </span>
                ) : 'Confirm Reschedule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
