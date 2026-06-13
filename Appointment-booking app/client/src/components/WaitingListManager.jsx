import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ icon, title, message }) {
  return (
    <div className="bg-white rounded-xl border border-border p-12 text-center">
      <div className="w-14 h-14 mx-auto mb-4 bg-primary-bg rounded-2xl flex items-center justify-center text-2xl">{icon}</div>
      <h3 className="text-lg font-semibold text-text mb-1">{title}</h3>
      <p className="text-text-secondary text-sm">{message}</p>
    </div>
  );
}

// ─── Join Waiting List Form ─────────────────

function JoinWaitingListForm({ services, staff, onJoined, onCancel }) {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    service_id: '',
    staff_id: '',
    preferred_date: '',
    preferred_time_from: '',
    preferred_time_to: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.service_id) { toast.error('Please select a service'); return; }
    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/waiting-list/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: parseInt(form.service_id),
          staff_id: form.staff_id ? parseInt(form.staff_id) : null,
          preferred_date: form.preferred_date || null,
          preferred_time_from: form.preferred_time_from || null,
          preferred_time_to: form.preferred_time_to || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Added to waiting list!');
        onJoined?.();
      } else {
        toast.error(data.error || 'Failed to join waiting list');
      }
    } catch (err) {
      toast.error(err.message);
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-border w-full max-w-md animate-scale-in p-6">
        <h3 className="text-lg font-serif font-bold text-text mb-4">Join Waiting List</h3>
        <p className="text-sm text-text-secondary mb-4">We'll notify you when a slot becomes available.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Service *</label>
            <select value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })}
              className="w-full px-3 py-2.5 bg-surface-warm border border-border rounded-xl text-sm">
              <option value="">Select a service...</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} — ${parseFloat(s.price).toFixed(2)} ({s.duration}min)</option>
              ))}
            </select>
          </div>

          {staff.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text mb-1">Preferred Staff (optional)</label>
              <select value={form.staff_id} onChange={e => setForm({ ...form, staff_id: e.target.value })}
                className="w-full px-3 py-2.5 bg-surface-warm border border-border rounded-xl text-sm">
                <option value="">Any available staff</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name}{s.title ? ` — ${s.title}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1">Preferred Date (optional)</label>
            <input type="date" value={form.preferred_date} onChange={e => setForm({ ...form, preferred_date: e.target.value })}
              className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">From Time</label>
              <input type="time" value={form.preferred_time_from} onChange={e => setForm({ ...form, preferred_time_from: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">To Time</label>
              <input type="time" value={form.preferred_time_to} onChange={e => setForm({ ...form, preferred_time_to: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-alt transition-all">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm">
              {submitting ? 'Joining...' : 'Join Waiting List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Waiting List Page ────────────────

export default function WaitingListManager() {
  const { fetchWithAuth, user } = useAuth();
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [wlRes, svcRes, staffRes] = await Promise.all([
        fetchWithAuth('/api/waiting-list/mine'),
        fetch('/api/services'),
        fetch('/api/staff'),
      ]);

      const wl = await wlRes.json();
      const svc = await svcRes.json();
      const stf = await staffRes.json();

      if (wlRes.ok) setEntries(wl.entries || []);
      else setError(wl.error || 'Failed to load waiting list');

      setServices(svc.services || []);
      setStaff(stf.staff || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleLeave(id) {
    try {
      const res = await fetchWithAuth('/api/waiting-list/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waiting_list_id: id }),
      });
      if (res.ok) {
        toast.success('Left waiting list');
        fetchData();
      }
    } catch (err) { toast.error(err.message); }
  }

  async function handleBookNow(entry) {
    // Navigate to booking page with pre-selected service
    window.location.href = '/?book=' + entry.service_id;
  }

  const filtered = filter === 'all' ? entries : entries.filter(e => e.status === filter);

  const statusConfig = {
    waiting: { label: 'Waiting', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    notified: { label: 'Notified', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    booked: { label: 'Booked', color: 'bg-green-50 text-green-700 border-green-200' },
    expired: { label: 'Expired', color: 'bg-gray-50 text-gray-500 border-gray-200' },
    cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-500 border-red-200' },
  };

  if (loading) return <Spinner />;
  if (error) return <div className="p-8 text-center text-error">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in">
      <div className="mb-8">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-3 text-primary">Waiting List</span>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-text">My Waiting List</h1>
            <p className="text-text-secondary mt-1">
              {entries.filter(e => e.status === 'waiting').length} active wait(s)
            </p>
          </div>
          <button onClick={() => setShowJoinForm(true)}
            className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
            Join Waiting List
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 mb-6 bg-white rounded-xl border border-border p-1">
        {[
          { key: 'all', label: `All (${entries.length})` },
          { key: 'waiting', label: `Waiting (${entries.filter(e => e.status === 'waiting').length})` },
          { key: 'notified', label: `Notified (${entries.filter(e => e.status === 'notified').length})` },
          { key: 'booked', label: 'Booked' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              filter === tab.key ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="⏳" title="No Waiting List Entries"
          message={filter === 'all' ? "You haven't joined any waiting lists yet. Join one to be notified when a slot opens up."
            : "No entries match this filter."} />
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => {
            const cfg = statusConfig[entry.status] || statusConfig.waiting;
            const service = services.find(s => s.id === entry.service_id);
            const staffMember = staff.find(s => s.id === entry.staff_id);
            return (
              <div key={entry.id} className="bg-white rounded-xl border border-border p-4 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-semibold text-text">{service?.name || 'Unknown Service'}</h3>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                      {staffMember && <span>👤 Preferred: {staffMember.name}</span>}
                      {entry.preferred_date && <span>📅 {new Date(entry.preferred_date + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric'
                      })}</span>}
                      {entry.preferred_time_from && <span>🕐 {entry.preferred_time_from}{entry.preferred_time_to ? ` - ${entry.preferred_time_to}` : ''}</span>}
                      <span>⏱ Joined {new Date(entry.created_at).toLocaleDateString()}</span>
                    </div>
                    {entry.expires_at && (
                      <p className="text-xs text-text-muted mt-1">
                        Expires {new Date(entry.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex gap-1">
                    {entry.status === 'waiting' && (
                      <>
                        <button onClick={() => handleBookNow(entry)}
                          className="px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-bg border border-primary/30 rounded-lg transition-colors">
                          Book Now
                        </button>
                        <button onClick={() => handleLeave(entry.id)}
                          className="px-3 py-1.5 text-xs font-medium text-error hover:bg-error-bg border border-red-200 rounded-lg transition-colors">
                          Leave
                        </button>
                      </>
                    )}
                    {entry.status === 'notified' && (
                      <button onClick={() => handleBookNow(entry)}
                        className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-all shadow-sm">
                        Book Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join form modal */}
      {showJoinForm && (
        <JoinWaitingListForm
          services={services}
          staff={staff}
          onJoined={() => { setShowJoinForm(false); fetchData(); }}
          onCancel={() => setShowJoinForm(false)}
        />
      )}
    </div>
  );
}
