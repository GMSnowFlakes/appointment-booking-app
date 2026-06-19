import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ServiceFormModal, Spinner, ErrorBlock, EmptyBlock, Icon, downloadCsv } from './shared';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ServicesTab() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, service: null });
  const [restoreConfirm, setRestoreConfirm] = useState({ open: false, service: null });

  const exportServices = downloadCsv(fetchWithAuth, '/api/export/services', `services_${new Date().toISOString().slice(0, 10)}.csv`);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/services');
      const data = await res.json();
      if (res.ok) setServices(data.services);
      else setError(data.error || 'Failed to load services');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [fetchWithAuth]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  function openEdit(svc) { setEditingService(svc); setFormOpen(true); }
  function openCreate() { setEditingService(null); setFormOpen(true); }

  async function handleDelete() {
    const svc = deleteConfirm.service;
    if (!svc) return;
    try {
      const res = await fetchWithAuth(`/api/admin/services/${svc.id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Service deactivated'); setDeleteConfirm({ open: false, service: null }); fetchServices(); }
    } catch { /* silent */ }
  }

  async function handleRestore() {
    const svc = restoreConfirm.service;
    if (!svc) return;
    try {
      const res = await fetchWithAuth(`/api/admin/services/${svc.id}/restore`, { method: 'POST' });
      if (res.ok) { toast.success('Service restored'); setRestoreConfirm({ open: false, service: null }); fetchServices(); }
    } catch { /* silent */ }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBlock message={error} onRetry={fetchServices} />;

  const active = services.filter(s => s.is_active);
  const inactive = services.filter(s => !s.is_active);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-text">Manage Services</h2>
          <p className="text-sm text-text-secondary">{active.length} active, {inactive.length} inactive</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportServices}
            className="px-3 py-2.5 border border-border text-text-secondary rounded-xl text-sm font-medium hover:bg-surface-alt hover:text-text transition-all flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export CSV
          </button>
          <button onClick={openCreate}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
            Add Service
          </button>
        </div>
      </div>

      {services.length === 0 ? (
        <EmptyBlock icon={<Icon name="services" className="w-6 h-6" />} title="No Services" message="Add your first service to get started." />
      ) : (
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt/50">
                <th className="text-left py-3 px-6 font-semibold text-text">Name</th>
                <th className="text-center py-3 px-2 font-semibold text-text">Image</th>
                <th className="text-left py-3 px-3 font-semibold text-text">Category</th>
                <th className="text-center py-3 px-3 font-semibold text-text">Duration</th>
                <th className="text-right py-3 px-3 font-semibold text-text">Price</th>
                <th className="text-center py-3 px-3 font-semibold text-text">Status</th>
                <th className="text-right py-3 px-6 font-semibold text-text">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id} className={`border-b border-border/50 hover:bg-surface-alt/30 transition-colors ${!s.is_active ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-6">
                    <div className="font-medium text-text">{s.name}</div>
                    {s.description && <div className="text-xs text-text-muted mt-0.5 max-w-xs truncate">{s.description}</div>}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {s.image_url ? (
                      <div className="w-9 h-9 rounded-lg overflow-hidden border border-border/50 mx-auto">
                        <img src={s.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-surface-alt border border-border/50 mx-auto flex items-center justify-center">
                        <svg className="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-text-secondary">{s.category || '—'}</td>
                  <td className="py-3 px-3 text-center text-text-secondary">{s.duration} min</td>
                  <td className="py-3 px-3 text-right font-medium text-text">${parseFloat(s.price).toFixed(2)}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${s.is_active ? 'bg-success-bg text-success border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-bg rounded-lg transition-colors">Edit</button>
                      {s.is_active ? (
                        <button onClick={() => setDeleteConfirm({ open: true, service: s })} className="px-2.5 py-1.5 text-xs font-medium text-error hover:bg-error-bg rounded-lg transition-colors">Deactivate</button>
                      ) : (
                        <button onClick={() => setRestoreConfirm({ open: true, service: s })} className="px-2.5 py-1.5 text-xs font-medium text-success hover:bg-success-bg rounded-lg transition-colors">Restore</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ServiceFormModal open={formOpen} service={editingService}
        onClose={() => { setFormOpen(false); setEditingService(null); }} onSaved={fetchServices} />

      <ConfirmDialog open={deleteConfirm.open} title="Deactivate Service?"
        message={deleteConfirm.service ? `Deactivate "${deleteConfirm.service.name}"? It will no longer be available for booking.` : ''}
        confirmLabel="Yes, Deactivate" cancelLabel="Cancel" variant="danger"
        onConfirm={handleDelete} onCancel={() => setDeleteConfirm({ open: false, service: null })} />

      <ConfirmDialog open={restoreConfirm.open} title="Restore Service?"
        message={restoreConfirm.service ? `Reactivate "${restoreConfirm.service.name}" and make it available for booking again?` : ''}
        confirmLabel="Yes, Restore" cancelLabel="Cancel" variant="primary"
        onConfirm={handleRestore} onCancel={() => setRestoreConfirm({ open: false, service: null })} />
    </div>
  );
}
