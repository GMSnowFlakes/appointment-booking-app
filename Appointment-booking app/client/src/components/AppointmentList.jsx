import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';
import RescheduleModal from './RescheduleModal';

const STATUS_STYLES = {
  confirmed: { badge: 'bg-success-bg text-success border-green-200', dot: 'bg-success' },
  cancelled: { badge: 'bg-error-bg text-error border-red-200', dot: 'bg-error' },
  completed: { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
};

function AppointmentCard({ appointment, onCancelClick, onRescheduleClick }) {
  const aptDate = new Date(`${appointment.date}T${appointment.time}`);
  const isPast = aptDate < new Date();
  const canCancel = appointment.status === 'confirmed' && !isPast;
  const style = STATUS_STYLES[appointment.status] || STATUS_STYLES.completed;

  return (
    <div className="group bg-white rounded-2xl border border-border p-5 sm:p-6 hover:shadow-md hover:border-primary/10 transition-all duration-300 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className={`w-2 h-2 rounded-full ${style.dot}`} />
            <h3 className="font-semibold text-text">{appointment.service_name}</h3>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.badge}`}>
              {appointment.status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1.5" y="2.5" width="13" height="12" rx="2" />
                <path d="M1.5 6.5h13" />
                <path d="M5 1v3M11 1v3" strokeLinecap="round" />
              </svg>
              {aptDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" />
              </svg>
              {aptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" />
              </svg>
              {appointment.service_duration} min
            </span>
            <span className="font-medium text-primary">${parseFloat(appointment.service_price).toFixed(2)}</span>
          </div>

          {appointment.notes && (
            <p className="mt-3 text-sm text-text-secondary bg-surface-alt rounded-xl p-3 border border-border/50">
              <span className="font-medium text-text">Notes:</span> {appointment.notes}
            </p>
          )}

          {appointment.user_name && (
            <p className="mt-2 text-xs text-text-muted">
              Booked by: {appointment.user_name} ({appointment.user_email})
            </p>
          )}
        </div>

        {canCancel && (
          <div className="flex-shrink-0 flex flex-col sm:flex-row gap-1.5">
            <button
              onClick={() => onRescheduleClick(appointment)}
              className="px-3.5 py-2 text-xs font-medium text-primary bg-primary-bg hover:bg-primary/10 rounded-xl transition-all"
            >
              Reschedule
            </button>
            <button
              onClick={() => onCancelClick(appointment)}
              className="px-3.5 py-2 text-xs font-medium text-error bg-error-bg hover:bg-red-100 rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppointmentList() {
  const { user, fetchWithAuth } = useAuth();
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

  useEffect(() => {
    if (user) { setPage(1); doFetch(1); }
  }, [user, filter, dateFrom, dateTo]);

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

  async function handleCancelConfirm() {
    const apt = cancelDialog.appointment;
    if (!apt) return;
    setCancelling(true);
    try {
      const res = await fetchWithAuth(`/api/appointments/${apt.id}/cancel`, { method: 'PUT' });
      if (res.ok) { setCancelDialog({ open: false, appointment: null }); fetchAppointments(); }
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
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-white rounded-3xl border border-border p-10 max-w-md text-center shadow-sm animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-bg rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
      <div className="text-center mb-10">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3">Your Bookings</span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-text tracking-tight">My Appointments</h1>
        <p className="text-text-secondary mt-2">View and manage your booked appointments</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white rounded-2xl border border-border p-1.5 shadow-sm mb-4">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text hover:bg-surface-alt'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={fetchAppointments}
          className="p-2 text-text-secondary hover:text-primary hover:bg-primary-bg rounded-xl transition-colors"
          title="Refresh"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 8a7 7 0 0113-3M15 1v4h-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 8a7 7 0 01-13 3M1 15v-4h4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-2 bg-white rounded-2xl border border-border p-3 sm:p-4 shadow-sm flex-wrap mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Date Range</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="px-3 py-2 bg-surface-warm border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition-all" />
        <span className="text-text-muted text-xs">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="px-3 py-2 bg-surface-warm border border-border rounded-xl text-xs focus:outline-none focus:border-primary transition-all" />
        <button onClick={handleDateFilter}
          className="px-4 py-2 text-xs font-medium bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors">
          Apply
        </button>
        {(dateFrom || dateTo) && (
          <button onClick={clearDateFilter}
            className="px-4 py-2 text-xs font-medium text-text-secondary border border-border rounded-xl hover:bg-surface-alt transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-text-secondary text-sm">Loading appointments...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-white rounded-2xl border border-border p-10 text-center shadow-sm">
          <div className="w-14 h-14 mx-auto mb-4 bg-error-bg rounded-xl flex items-center justify-center text-2xl">😕</div>
          <p className="text-text-secondary text-sm mb-4">{error}</p>
          <button onClick={fetchAppointments}
            className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm">
            Try Again
          </button>
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
                  onCancelClick={a => setCancelDialog({ open: true, appointment: a })}
                  onRescheduleClick={a => setRescheduleModal({ open: true, appointment: a })}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-border p-14 text-center animate-fade-in shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary-bg rounded-2xl flex items-center justify-center text-2xl">📭</div>
              <h3 className="text-lg font-serif font-semibold text-text mb-1">No Appointments Yet</h3>
              <p className="text-text-secondary text-sm">
                {filter === 'all' ? "You haven't booked any appointments yet." :
                 filter === 'upcoming' ? 'No upcoming appointments.' : 'No past appointments.'}
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
                  className="px-3.5 py-2 text-xs font-medium rounded-xl border border-border text-text-secondary hover:bg-surface-alt transition-all disabled:opacity-30"
                >◀ Prev</button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-9 h-9 text-xs font-medium rounded-xl transition-all ${
                      p === pagination.page
                        ? 'bg-primary text-white shadow-sm'
                        : 'border border-border text-text-secondary hover:bg-surface-alt'
                    }`}>{p}</button>
                ))}
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  className="px-3.5 py-2 text-xs font-medium rounded-xl border border-border text-text-secondary hover:bg-surface-alt transition-all disabled:opacity-30"
                >Next ▶</button>
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
