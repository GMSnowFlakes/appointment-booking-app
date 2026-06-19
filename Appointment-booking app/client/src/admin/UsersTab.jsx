import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner, ErrorBlock, EmptyBlock, Icon } from './shared';
import ConfirmDialog from '../components/ConfirmDialog';
import ImportCsvModal from '../components/ImportCsvModal';

export default function UsersTab() {
  const { user: currentUser, fetchWithAuth } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, user: null });
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchWithAuth('/api/admin/users?role=customer').then(async res => {
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) { setUsers(data.users); setLoading(false); }
        else { setError(data.error || 'Failed to load users'); setLoading(false); }
      }
    }).catch(err => {
      if (!cancelled) { setError(err.message); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [fetchWithAuth, refreshKey]);

  async function handleDelete() {
    const target = deleteConfirm.user;
    if (!target) return;
    try {
      const res = await fetchWithAuth(`/api/admin/users/${target.id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('User deleted'); setDeleteConfirm({ open: false, user: null }); setRefreshKey(k => k + 1); }
    } catch { /* silent */ }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBlock message={error} onRetry={() => setRefreshKey(k => k + 1)} />;

  const filtered = searchQuery
    ? users.filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone?.toLowerCase().includes(searchQuery.toLowerCase()))
    : users;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-text">User Management</h2>
          <p className="text-sm text-text-secondary">{users.length} total users</p>
        </div>
        <button onClick={() => setImportOpen(true)}
          className="px-3 py-2 border border-dashed border-primary/40 text-primary rounded-xl text-sm font-medium hover:bg-primary-bg transition-all flex items-center gap-1.5">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
          Import Customers
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="9" cy="9" r="6" /><path d="M13.5 13.5l4 4" />
          </svg>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search customers..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyBlock icon={<Icon name="users" className="w-6 h-6" />} title="No Users" message={searchQuery ? 'No customers match your search.' : 'No users registered yet.'} />
      ) : (
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt/50">
                <th className="text-left py-3 px-6 font-semibold text-text">Name</th>
                <th className="text-left py-3 px-3 font-semibold text-text">Email</th>
                <th className="text-center py-3 px-3 font-semibold text-text">Role</th>
                <th className="text-center py-3 px-3 font-semibold text-text">Appointments</th>
                <th className="text-center py-3 px-3 font-semibold text-text">Joined</th>
                <th className="text-right py-3 px-6 font-semibold text-text">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-surface-alt/30 transition-colors">
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm" style={{ backgroundColor: '#e11d48' }}>
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <span className="font-medium text-text">{u.name}</span>
                        {u.id === currentUser?.id && <span className="ml-1.5 text-[10px] text-primary font-medium">(you)</span>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-text-secondary">{u.email}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{u.role}</span>
                  </td>
                  <td className="py-3 px-3 text-center text-text-secondary">{u.appointment_count}</td>
                  <td className="py-3 px-3 text-center text-text-secondary text-xs">
                    {new Date(u.created_at + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3 px-6 text-right">
                    {u.id !== currentUser?.id && (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDeleteConfirm({ open: true, user: u })}
                          className="px-2.5 py-1.5 text-xs font-medium text-error hover:bg-error-bg rounded-lg transition-colors">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={deleteConfirm.open} title="Delete User?"
        message={deleteConfirm.user ? `Permanently delete "${deleteConfirm.user.name}" and all their appointments?` : ''}
        confirmLabel="Yes, Delete" cancelLabel="Cancel" variant="danger"
        onConfirm={handleDelete} onCancel={() => setDeleteConfirm({ open: false, user: null })} />

      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/api/import/customers"
        templateEndpoint="/api/import/customers/template"
        title="Import Customers"
        description="Upload a CSV with name, email, and optional password/role columns. Duplicate emails are skipped."
        onImported={() => setRefreshKey(k => k + 1)}
      />
    </div>
  );
}
