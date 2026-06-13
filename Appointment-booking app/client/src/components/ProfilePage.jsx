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

export default function ProfilePage() {
  const { fetchWithAuth, user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: '', birthday: '' });

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    try {
      const res = await fetchWithAuth('/api/profile');
      const d = await res.json();
      if (res.ok) { setData(d); setForm({ phone: d.profile?.phone || '', birthday: d.profile?.birthday || '' }); }
      else setError(d.error || 'Failed to load profile');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { toast.success('Profile updated'); setEditing(false); fetchProfile(); }
      else { const d = await res.json(); toast.error(d.error); }
    } catch (err) { toast.error(err.message); }
  }

  if (loading) return <Spinner />;
  if (error) return <div className="p-8 text-center text-error">{error}</div>;

  const { profile, stats, appointments } = data || {};

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-3 text-primary">My Profile</span>
        <h1 className="text-3xl font-serif font-bold text-text">Welcome back, {user?.name}</h1>
        <p className="text-text-secondary mt-1">{user?.email}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Bookings', value: stats?.total_bookings || 0, icon: '📅' },
          { label: 'Completed', value: (stats?.total_bookings || 0) - (stats?.cancelled_count || 0), icon: '✅' },
          { label: 'Cancelled', value: stats?.cancelled_count || 0, icon: '❌' },
          { label: 'Total Spent', value: `$${((stats?.total_spent_cents || 0) / 100).toFixed(0)}`, icon: '💰' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <p className="text-2xl font-bold text-text">{stat.value}</p>
            <p className="text-xs text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Profile Edit */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif font-semibold text-text">Profile Details</h2>
          <button onClick={() => setEditing(!editing)} className="text-sm text-primary hover:underline font-medium">
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editing ? (
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2 bg-surface-warm border border-border rounded-xl text-sm" placeholder="+1 (555) 123-4567" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Birthday</label>
              <input type="date" value={form.birthday} onChange={e => setForm({ ...form, birthday: e.target.value })}
                className="w-full px-4 py-2 bg-surface-warm border border-border rounded-xl text-sm" />
            </div>
            <button type="submit" className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all">
              Save
            </button>
          </form>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex gap-8">
              <span className="text-text-muted w-24">Phone:</span>
              <span className="text-text">{profile?.phone || 'Not set'}</span>
            </div>
            <div className="flex gap-8">
              <span className="text-text-muted w-24">Birthday:</span>
              <span className="text-text">{profile?.birthday ? new Date(profile.birthday).toLocaleDateString() : 'Not set'}</span>
            </div>
            {stats?.favorite_service && (
              <div className="flex gap-8">
                <span className="text-text-muted w-24">Favorite:</span>
                <span className="text-text font-medium">{stats.favorite_service}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking History */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="text-lg font-serif font-semibold text-text mb-4">
          Booking History ({appointments?.length || 0})
        </h2>
        {!appointments || appointments.length === 0 ? (
          <div className="text-center py-8 text-text-secondary text-sm">No bookings yet</div>
        ) : (
          <div className="space-y-3">
            {appointments.map(apt => {
              const aptDate = new Date(`${apt.date}T${apt.time}`);
              return (
                <div key={apt.id} className="flex items-start gap-4 p-4 rounded-xl border border-border hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary-bg flex items-center justify-center text-lg flex-shrink-0">
                    {apt.status === 'completed' ? '✅' : apt.status === 'cancelled' ? '❌' : '📅'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-text">{apt.service_name}</h3>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                        apt.status === 'confirmed' ? 'bg-success-bg text-success border-green-200' :
                        apt.status === 'cancelled' ? 'bg-error-bg text-error border-red-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>{apt.status}</span>
                    </div>
                    <div className="text-sm text-text-secondary mt-0.5">
                      {aptDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      {' at '}
                      {aptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {' — '}{apt.duration}min
                    </div>
                    <div className="text-sm font-medium text-primary mt-0.5">${parseFloat(apt.price).toFixed(2)}</div>
                    {apt.staff_name && <div className="text-xs text-text-muted">With: {apt.staff_name}</div>}
                    {apt.video_url && (
                      <a href={apt.video_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                        🎥 Join Video Call
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
