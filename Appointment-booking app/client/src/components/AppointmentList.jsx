import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBusiness } from '../context/BusinessContext';
import ConfirmDialog from './ConfirmDialog';
import RescheduleModal from './RescheduleModal';
import { AppointmentCardSkeleton } from './Skeleton';

const STATUS_STYLES = {
  confirmed: { badge: 'bg-success-bg text-success border-green-200', dot: 'bg-success' },
  cancelled: { badge: 'bg-error-bg text-error border-red-200', dot: 'bg-error' },
  completed: { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
};

function AppointmentCard({ appointment, onCancelClick, onRescheduleClick, color }) {
  const aptDate = new Date(`${appointment.date}T${appointment.time}`);
  const isPast = aptDate < new Date();
  const canCancel = appointment.status === 'confirmed' && !isPast;
  const style = STATUS_STYLES[appointment.status] || STATUS_STYLES.completed;
  const c = color || '#e11d48';

  return (
    <div className="group card card-hover animate-fade-in">
      <div className="flex items-stretch gap-0">
        {/* Left accent bar */}
        <div className="w-1 rounded-l-2xl flex-shrink-0"
          style={{ background: appointment.status === 'confirmed' ? c : appointment.status === 'cancelled' ? '#ef4444' : '#3b82f6' }} />

        <div className="flex-1 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Service + status */}
              <div className="flex items-center flex-wrap gap-2 mb-3">
                <h3 className="font-semibold text-text text-base">{appointment.service_name}</h3>
                <span className={`badge text-[10px] font-semibold uppercase tracking-wider ${style.badge}`}>
                  {appointment.status}
                </span>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="1.5" y="2.5" width="13" height="12" rx="2" />
                    <path d="M1.5 6.5h13" /><path d="M5 1v3M11 1v3" strokeLinecap="round" />
                  </svg>
                  {aptDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" />
                  </svg>
                  {aptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
                <span className="text-text-muted">{appointment.service_duration} min</span>
                <span className="font-semibold font-serif" style={{ color: c }}>
                  ${parseFloat(appointment.service_price).toFixed(2)}
                </span>
              </div>

              {appointment.notes && (
                <p className="mt-3 text-sm text-text-secondary bg-surface-alt rounded-xl p-3 border border-border/60">
                  <span className="font-medium text-text text-xs uppercase tracking-wide mr-1.5">Note:</span>
                  {appointment.notes}
                </p>
              )}

              {appointment.user_name && (
                <p className="mt-2 text-xs text-text-muted">
                  Client: <span className="text-text">{appointment.user_name}</span>
                  <span className="text-text-muted ml-1">({appointment.user_email})</span>
                </p>
              )}
            </div>

            {canCancel && (
              <div className="flex-shrink-0 flex flex-col sm:flex-row gap-1.5">
                <button onClick={() => onRescheduleClick(appointment)} className="btn btn-sm btn-secondary">
                  Reschedule
                </button>
                <button onClick={() => onCancelClick(appointment)} className="btn btn-sm btn-danger">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppointmentList() {
  const { user, fetchWithAuth } = useAuth();
  const toast = useToast();
  const { settings } = useBusiness();
  const color = settings?.primary_color || '#e11d48';
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [rescheduleModal, setRescheduleModal] = useState({ open: false, appointment: null });
  const [cancelDialog, setCancelDialog] = useState({ open: false, appointment: null });
  const [cancelling, setCancelling] = useState(false);
  const [icalFeedUrl, setIcalFeedUrl] = useState(null);
  const [icalLoading, setIcalLoading] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (user) { setPage(1); doFetch(1); }
  }, [user, filter, dateFrom, dateTo]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => { if (user) doFetch(page); }, [page]);

  async function doFetch(pageOverride) {
    const cp = pageOverride ?? page;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(cp));
      params.set('limit', '10');
      if (filter === 'upcoming') params.set('status', 'confirmed');
      if (filter === 'past') params.set('status', 'cancelled,completed');
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetchWithAuth(`/api/appointments?${params}`);
      const data = await res.json();
      if (res.ok) {
        setAppointments(data.appointments);
        if (data.pagination) setPagination(data.pagination);
      } else setError(data.error || 'Failed to load appointments');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function fetchAppointments() { doFetch(page); }
  function handleDateFilter() { setPage(1); doFetch(1); }
  function clearDateFilter() { setDateFrom(''); setDateTo(''); setPage(1); }

  async function handleIcalSubscribe() {
    setIcalLoading(true);
    try {
      const res = await fetchWithAuth('/api/ical/tokens', { method: 'POST' });
      const d = await res.json();
      if (res.ok) {
        setIcalFeedUrl(d.ical_url);
        toast.success('Calendar feed created!');
      } else { toast.error(d.error || 'Failed to create feed'); }
    } catch (err) { toast.error(err.message); }
    setIcalLoading(false);
  }

  async function handleExportCsv() {
    try {
      const res = await fetchWithAuth('/api/export/appointments');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appointments_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('CSV exported!');
    } catch (err) { toast.error(err.message); }
  }

  async function handleCancelConfirm() {
    const apt = cancelDialog.appointment;
    if (!apt) return;
    setCancelling(true);
    try {
      const res = await fetchWithAuth(`/api/appointments/${apt.id}/cancel`, { method: 'PUT' });
      if (res.ok) {
        toast.info('Appointment cancelled');
        setCancelDialog({ open: false, appointment: null }); fetchAppointments();
      }
    } catch { /* silent */ }
    finally { setCancelling(false); }
  }

  const FILTER_TABS = [
    { id: 'all', label: 'All' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past', label: 'Past' },
  ];

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="card card-elevated p-10 max-w-md w-full text-center animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{ background: `${color}15` }}>
            <svg className="w-8 h-8" style={{ color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-xl font-serif font-semibold text-text mb-2">Sign In Required</h2>
          <p className="text-text-secondary text-sm">Please sign in to view your appointments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="text-center mb-8">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3">Your Bookings</span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-text tracking-tight">My Appointments</h1>
        <p className="text-text-secondary mt-2">View and manage your booked appointments</p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
        <button onClick={handleIcalSubscribe} disabled={icalLoading}
          className="btn btn-secondary btn-sm" title="Subscribe in your calendar app">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1.5" y="2.5" width="13" height="12" rx="2" />
            <path d="M1.5 6.5h13M5 1v3M11 1v3" strokeLinecap="round" />
          </svg>
          {icalLoading ? 'Creating…' : 'Calendar Feed'}
        </button>
        <button onClick={handleExportCsv} className="btn btn-secondary btn-sm">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M13 10v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3" strokeLinecap="round" />
            <path d="M8 10V2M5 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* iCal feed banner */}
      {icalFeedUrl && (
        <div className="mb-6 rounded-2xl border p-4 text-sm animate-fade-in"
          style={{ background: `${color}08`, borderColor: `${color}25` }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15` }}>
              <svg className="w-4 h-4" style={{ color }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1.5" y="2.5" width="13" height="12" rx="2" />
                <path d="M1.5 6.5h13M5 1v3M11 1v3" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text mb-0.5">Calendar Feed Ready</p>
              <p className="text-text-secondary text-xs mb-2.5">Add this URL to Google Calendar, Apple Calendar, or Outlook:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 block bg-white border border-border rounded-lg px-3 py-2 text-xs font-mono text-text break-all select-all">
                  {icalFeedUrl}
                </code>
                <button onClick={() => { navigator.clipboard.writeText(icalFeedUrl); toast.success('Copied!'); }}
                  className="btn btn-sm btn-secondary shrink-0">
                  Copy
                </button>
              </div>
              <div className="flex items-center gap-2.5 mt-2.5">
                <a href={`webcal://${icalFeedUrl.replace(/^https?:\/\//, '')}`}
                  className="text-xs underline" style={{ color }}>Apple Calendar</a>
                <span className="text-border-strong">·</span>
                <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icalFeedUrl)}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs underline" style={{ color }}>Google Calendar</a>
                <span className="text-border-strong">·</span>
                <button onClick={() => setIcalFeedUrl(null)} className="text-xs text-text-muted hover:text-text underline">Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 card p-1.5 mb-4">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === tab.id
                ? 'text-white shadow-sm'
                : 'text-text-secondary hover:text-text hover:bg-surface-alt'
            }`}
            style={filter === tab.id ? { background: color } : {}}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={fetchAppointments}
          className="p-2 text-text-muted hover:text-text rounded-xl transition-colors hover:bg-surface-alt"
          title="Refresh"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 8a7 7 0 0113-3M15 1v4h-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 8a7 7 0 01-13 3M1 15v-4h4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="card flex items-center gap-2 p-3 sm:p-4 flex-wrap mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Date Range</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input py-1.5 text-xs" />
        <span className="text-text-muted text-xs">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input py-1.5 text-xs" />
        <button onClick={handleDateFilter} className="btn btn-sm text-white" style={{ background: color }}>Apply</button>
        {(dateFrom || dateTo) && (
          <button onClick={clearDateFilter} className="btn btn-sm btn-secondary">Clear</button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <AppointmentCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="card card-elevated p-10 text-center animate-scale-in">
          <div className="w-14 h-14 mx-auto mb-4 bg-error-bg rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-text-secondary text-sm mb-5">{error}</p>
          <button onClick={fetchAppointments} className="btn btn-primary">Try Again</button>
        </div>
      )}

      {/* List */}
      {!loading && !error && (
        <>
          {appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.map(apt => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  color={color}
                  onCancelClick={a => setCancelDialog({ open: true, appointment: a })}
                  onRescheduleClick={a => setRescheduleModal({ open: true, appointment: a })}
                />
              ))}
            </div>
          ) : (
            <div className="card card-elevated p-14 sm:p-16 text-center animate-scale-in">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center"
                style={{ background: `${color}10` }}>
                <svg className="w-10 h-10" style={{ color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  {filter === 'past'
                    ? <><path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" /></>
                    : <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" strokeLinecap="round" /></>
                  }
                </svg>
              </div>
              <h3 className="text-xl font-serif font-semibold text-text mb-2">
                {filter === 'all' ? 'No Appointments Yet' :
                 filter === 'upcoming' ? 'Nothing Upcoming' : 'No Past Appointments'}
              </h3>
              <p className="text-text-secondary text-sm max-w-xs mx-auto leading-relaxed">
                {filter === 'all'
                  ? "You haven't booked any appointments yet."
                 : filter === 'upcoming'
                  ? 'You have no upcoming appointments scheduled.' : 'Your appointment history will appear here.'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-8 pt-6 border-t border-border gap-4">
              <p className="text-sm text-text-muted">
                Showing {(pagination.page - 1) * pagination.limit + 1}&ndash;{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="btn btn-secondary btn-sm disabled:opacity-30"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7.5 2L3.5 6l4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Prev
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className="w-9 h-9 text-xs font-medium rounded-xl transition-all border"
                    style={p === pagination.page ? { background: color, color: '#fff', borderColor: color } : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >{p}</button>
                ))}
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  className="btn btn-secondary btn-sm disabled:opacity-30"
                >
                  Next
                  <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4.5 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <RescheduleModal
        open={rescheduleModal.open}
        appointment={rescheduleModal.appointment}
        onClose={() => setRescheduleModal({ open: false, appointment: null })}
        onRescheduled={fetchAppointments}
      />

      <ConfirmDialog
        open={cancelDialog.open}
        title="Cancel Appointment?"
        message={cancelDialog.appointment
          ? `Are you sure you want to cancel your ${cancelDialog.appointment.service_name} appointment on ${new Date(`${cancelDialog.appointment.date}T${cancelDialog.appointment.time}`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${new Date(`2000-01-01T${cancelDialog.appointment.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}?`
          : 'Cancel this appointment?'}
        confirmLabel="Yes, Cancel"
        cancelLabel="Keep Appointment"
        variant="danger"
        loading={cancelling}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelDialog({ open: false, appointment: null })}
      />
    </div>
  );
}
