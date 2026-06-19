import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner, ErrorBlock, EmptyBlock, Icon, ScheduleModal } from './shared';
import ConfirmDialog from '../components/ConfirmDialog';

const STAFF_ROLES = [
  { id: 'stylist', label: 'Stylist' },
  { id: 'barber', label: 'Barber' },
  { id: 'massage-therapist', label: 'Massage Therapist' },
  { id: 'esthetician', label: 'Esthetician' },
  { id: 'nail-tech', label: 'Nail Technician' },
  { id: 'trainer', label: 'Trainer' },
  { id: 'therapist', label: 'Therapist' },
  { id: 'technician', label: 'Technician' },
  { id: 'consultant', label: 'Consultant' },
  { id: 'specialist', label: 'Specialist' },
];

export default function StaffTab() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [availModal, setAvailModal] = useState({ open: false, staff: null });
  const [promoteConfirm, setPromoteConfirm] = useState({ open: false, member: null });

  const [staffForm, setStaffForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: '', serviceIds: [] });
  const [staffFormError, setStaffFormError] = useState('');
  const [staffFormSubmitting, setStaffFormSubmitting] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/staff/admin');
      const d = await res.json();
      if (res.ok) setStaff(d.staff || []);
      else setError(d.error || 'Failed to load staff');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [fetchWithAuth]);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/admin/services');
      const d = await res.json();
      if (res.ok) setServices(d.services || []);
    } catch { /* silent */ }
  }, [fetchWithAuth]);

  useEffect(() => { fetchStaff(); fetchServices(); }, [fetchStaff, fetchServices]);

  async function handleCreateStaff(e) {
    e.preventDefault();
    setStaffFormError('');
    const { firstName, lastName, email, phone, role, serviceIds } = staffForm;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setStaffFormError('First name, last name, and email are required');
      return;
    }
    setStaffFormSubmitting(true);
    try {
      const userRes = await fetchWithAuth('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${firstName.trim()} ${lastName.trim()}`, email: email.trim(), role: 'staff' }),
      });
      const userData = await userRes.json();
      if (!userRes.ok) { setStaffFormError(userData.error || 'Failed to create user'); setStaffFormSubmitting(false); return; }
      const userId = userData.user.id;

      const staffRes = await fetchWithAuth('/api/staff/admin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, title: role || null, phone: phone.trim() || null }),
      });
      const staffData = await staffRes.json();
      if (!staffRes.ok) { setStaffFormError(staffData.error || 'Failed to add staff'); setStaffFormSubmitting(false); return; }
      const newStaffId = staffData.staff?.id;

      if (newStaffId && serviceIds.length > 0) {
        await fetchWithAuth(`/api/staff/admin/${newStaffId}/services`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service_ids: serviceIds }),
        });
      }

      toast.success('Staff member added successfully');
      setFormOpen(false);
      setStaffForm({ firstName: '', lastName: '', email: '', phone: '', role: '', serviceIds: [] });
      fetchStaff();
    } catch (err) { setStaffFormError(err.message); }
    setStaffFormSubmitting(false);
  }

  async function handleToggleActive(member) {
    try {
      await fetchWithAuth(`/api/staff/admin/${member.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: member.is_active ? false : true }),
      });
      fetchStaff();
    } catch { /* silent */ }
  }

  async function handlePromoteToAdmin() {
    const member = promoteConfirm.member;
    if (!member) return;
    try {
      const res = await fetchWithAuth(`/api/admin/users/${member.user_id}/role`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' }),
      });
      if (res.ok) {
        toast.success(`${member.name} promoted to admin`);
        setPromoteConfirm({ open: false, member: null });
        fetchStaff();
      }
    } catch { /* silent */ }
  }

  function toggleService(id) {
    setStaffForm(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id) ? prev.serviceIds.filter(sid => sid !== id) : [...prev.serviceIds, id],
    }));
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBlock message={error} onRetry={fetchStaff} />;

  const filteredStaff = staffSearch
    ? staff.filter(m => m.name?.toLowerCase().includes(staffSearch.toLowerCase()) || m.email?.toLowerCase().includes(staffSearch.toLowerCase()) || (m.title || '').toLowerCase().includes(staffSearch.toLowerCase()))
    : staff;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-text">Staff Management</h2>
          <p className="text-sm text-text-secondary">{staff.length} staff members</p>
        </div>
        <button onClick={() => { setStaffForm({ firstName: '', lastName: '', email: '', phone: '', role: '', serviceIds: [] }); setStaffFormError(''); setFormOpen(true); }}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1.5">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
          Add Staff
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="9" cy="9" r="6" /><path d="M13.5 13.5l4 4" />
          </svg>
          <input type="text" value={staffSearch} onChange={e => setStaffSearch(e.target.value)}
            placeholder="Search staff..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
        </div>
      </div>

      {filteredStaff.length === 0 ? (
        <EmptyBlock icon={<Icon name="people" className="w-6 h-6" />} title="No Staff" message={staffSearch ? 'No staff match your search.' : 'Add team members so customers can book with specific providers.'} />
      ) : (
        <div className="space-y-3">
          {filteredStaff.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-border p-4 flex items-center gap-4 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: m.color || '#6366f1' }}>
                {m.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text">{m.name}</span>
                  {m.title && <span className="text-xs text-text-muted">— {m.title}</span>}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.is_active ? 'bg-success-bg text-success border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {m.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-0.5">{m.email}{m.phone ? ` · ${m.phone}` : ''}</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setAvailModal({ open: true, staff: m })}
                  className="px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-bg rounded-lg transition-colors">Schedule</button>
                {m.role !== 'admin' && (
                  <button onClick={() => setPromoteConfirm({ open: true, member: m })}
                    className="px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-bg rounded-lg transition-colors">Promote</button>
                )}
                <button onClick={() => handleToggleActive(m)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${m.is_active ? 'text-warning hover:bg-warning-bg' : 'text-success hover:bg-success-bg'}`}>
                  {m.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFormOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-border w-full max-w-lg animate-scale-in overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface-warm">
              <h3 className="text-lg font-serif font-bold text-text">Add Staff Member</h3>
              <button onClick={() => setFormOpen(false)} className="w-8 h-8 rounded-xl text-text-muted hover:text-text hover:bg-surface-alt transition-all flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              {staffFormError && (
                <div className="p-3.5 bg-error-bg border border-red-200 rounded-xl text-sm text-error flex items-start gap-2.5"><span className="mt-0.5">⚠️</span><span>{staffFormError}</span></div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">First Name *</label>
                  <input type="text" value={staffForm.firstName} onChange={e => setStaffForm({ ...staffForm, firstName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Last Name *</label>
                  <input type="text" value={staffForm.lastName} onChange={e => setStaffForm({ ...staffForm, lastName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Email *</label>
                <input type="email" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} placeholder="staff@example.com"
                  className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Phone Number</label>
                <input type="tel" value={staffForm.phone} onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })} placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Role</label>
                <select value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all">
                  <option value="">Select a role...</option>
                  {STAFF_ROLES.map(r => (<option key={r.id} value={r.label}>{r.label}</option>))}
                </select>
              </div>
              {services.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Services Assigned</label>
                  <div className="border border-border rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5">
                    {services.filter(s => s.is_active).map(s => (
                      <label key={s.id} className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-lg hover:bg-surface-alt/50 transition-colors">
                        <input type="checkbox" checked={staffForm.serviceIds.includes(s.id)} onChange={() => toggleService(s.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <span className="text-sm text-text">{s.name}</span>
                        <span className="text-xs text-text-muted ml-auto">${parseFloat(s.price).toFixed(2)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-muted italic">No active services available. Create services first.</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setFormOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-text-secondary border border-border hover:bg-surface-alt transition-all">Cancel</button>
                <button type="submit" disabled={staffFormSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm">
                  {staffFormSubmitting ? 'Saving...' : 'Save Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog open={promoteConfirm.open} title="Promote to Admin?"
        message={promoteConfirm.member ? `Promote "${promoteConfirm.member.name}" (${promoteConfirm.member.email}) to admin? They will gain full access to all settings.` : ''}
        confirmLabel="Yes, Promote" cancelLabel="Cancel" variant="primary"
        onConfirm={handlePromoteToAdmin} onCancel={() => setPromoteConfirm({ open: false, member: null })} />

      {availModal.open && <ScheduleModal staff={availModal.staff} onClose={() => setAvailModal({ open: false, staff: null })} />}
    </div>
  );
}
