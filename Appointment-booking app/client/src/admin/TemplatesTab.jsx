import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BUSINESS_TYPES, Spinner, ErrorBlock, Icon } from './shared';

export default function TemplatesTab() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [disabled, setDisabled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editModal, setEditModal] = useState({ open: false, id: '', label: '', roles: '', services: '', isNew: false });
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => { fetchTemplates(); }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  function fetchTemplates() {
    setLoading(true);
    Promise.all([
      fetchWithAuth('/api/admin/templates'),
      fetchWithAuth('/api/admin/templates/disabled'),
    ]).then(async ([tplRes, disRes]) => {
      const tplData = tplRes.ok ? await tplRes.json() : { templates: [] };
      const disData = disRes.ok ? await disRes.json() : { disabled: [] };
      setTemplates(tplData.templates || []);
      setDisabled(disData.disabled || []);
    }).catch(err => setError(err.message))
    .finally(() => setLoading(false));
  }

  async function importTemplate(businessType) {
    try {
      const res = await fetchWithAuth('/api/admin/templates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_type: businessType }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Template imported');
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Failed to import template');
      }
    } catch (err) { toast.error(err.message); }
  }

  async function toggleTemplate(id, currentlyDisabled) {
    try {
      const res = await fetchWithAuth('/api/admin/templates/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: id, disabled: !currentlyDisabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setDisabled(data.disabled || []);
        toast.success(currentlyDisabled ? 'Template enabled' : 'Template disabled');
      }
    } catch { /* silent */ }
  }

  async function handleSaveTemplate(e) {
    e.preventDefault();
    const { isNew, id, label, roles, services } = editModal;
    if (!id.trim() || !label.trim()) { toast.error('Template ID and label are required'); return; }

    const parsedRoles = roles.split('\n').map(r => r.trim()).filter(Boolean).map(title => ({ title }));
    const parsedServices = services.split('\n').map(r => r.trim()).filter(Boolean).map(line => {
      const parts = line.split(',').map(p => p.trim());
      return { name: parts[0] || line, duration: parseInt(parts[1]) || 30, price: parseFloat(parts[2]) || 0, category: parts[3] || '' };
    });

    try {
      const url = isNew ? '/api/admin/templates/create' : `/api/admin/templates/${encodeURIComponent(id)}`;
      const method = isNew ? 'POST' : 'PUT';
      const body = isNew
        ? { type_id: id, type_label: label, roles: parsedRoles, services: parsedServices }
        : { label, roles: parsedRoles, services: parsedServices };

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(isNew ? 'Template created' : 'Template updated');
        setEditModal({ open: false, id: '', label: '', roles: '', services: '', isNew: false });
        fetchTemplates();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Failed to save template');
      }
    } catch (err) { toast.error(err.message); }
  }

  function openEditor(t) {
    if (!t) {
      setEditModal({ open: true, id: '', label: '', roles: '', services: '', isNew: true });
      return;
    }
    // Fetch full template data to pre-fill the form
    setEditModal({ open: true, id: t.id, label: t.name || '', roles: '', services: '', isNew: false });
    setLoadingTemplate(true);
    fetchWithAuth(`/api/admin/templates/${t.id}`)
      .then(async (res) => {
        if (!res.ok) { setLoadingTemplate(false); return; }
        const data = await res.json();
        const tmpl = data.template;
        const rolesStr = (tmpl.roles || []).map(r => r.title).join('\n');
        const servicesStr = (tmpl.services || []).map(s =>
          `${s.name}, ${s.duration}, ${s.price}, ${s.category || ''}`
        ).join('\n');
        setEditModal({
          open: true,
          id: t.id,
          label: t.name || '',
          roles: rolesStr,
          services: servicesStr,
          isNew: false,
        });
        setLoadingTemplate(false);
      })
      .catch(() => {
        setLoadingTemplate(false);
        /* keep empty fields on fetch error */
      });
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBlock message={error} onRetry={fetchTemplates} />;

  const btMap = Object.fromEntries(BUSINESS_TYPES.map(bt => [bt.id, bt]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-text">Business Type Templates</h2>
          <p className="text-sm text-text-secondary">Recommended services and staff roles for each business type</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openEditor(null)}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
            New Template
          </button>
          <button onClick={fetchTemplates}
            className="p-2 text-text-secondary hover:text-primary hover:bg-primary-bg rounded-xl transition-colors" title="Refresh">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 8a7 7 0 0113-3M15 1v4h-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 8a7 7 0 01-13 3M1 15v-4h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map(t => {
          const bt = btMap[t.id];
          const isDisabled = disabled.includes(t.id);
          const isCustom = t.custom;
          return (
            <div key={t.id} className={`rounded-xl border p-4 transition-all group ${
              isDisabled
                ? 'border-border/30 bg-surface/50 opacity-60'
                : 'bg-surface border-border hover:shadow-sm'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">{bt?.icon || (isCustom ? '📝' : '📋')}</span>
                <div>
                  <h3 className="text-sm font-semibold text-text">{bt?.label || t.name}</h3>
                  <p className="text-xs text-text-muted">{t.serviceCount} services · {t.roleCount} roles</p>
                  {isCustom && <span className="text-[10px] text-primary font-medium">Custom</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {!isDisabled && (
                  <button onClick={() => importTemplate(t.id)}
                    className="px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-bg rounded-lg transition-colors">
                    Import
                  </button>
                )}
                <button onClick={() => openEditor(t)}
                  className="px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-alt rounded-lg transition-colors">
                    Edit
                  </button>
                <button onClick={() => toggleTemplate(t.id, isDisabled)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isDisabled
                      ? 'text-success hover:bg-success-bg border border-green-200'
                      : 'text-warning hover:bg-warning-bg'
                  }`}>
                  {isDisabled ? 'Enable' : 'Disable'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Template Editor Modal ────────────── */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditModal({ ...editModal, open: false })} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-border w-full max-w-lg animate-scale-in overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface-warm">
              <h3 className="text-lg font-serif font-bold text-text">{editModal.isNew ? 'Create New Template' : 'Edit Template'}</h3>
              <button onClick={() => setEditModal({ ...editModal, open: false })}
                className="w-8 h-8 rounded-xl text-text-muted hover:text-text hover:bg-surface-alt transition-all flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <form onSubmit={handleSaveTemplate} className="p-6 space-y-4">
              {editModal.isNew && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Template ID *</label>
                    <input type="text" value={editModal.id}
                      onChange={e => setEditModal({ ...editModal, id: e.target.value })}
                      placeholder="my-business-type"
                      className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
                    <p className="text-xs text-text-muted mt-1">Unique identifier (e.g., &quot;custom-consulting&quot;)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Template Label *</label>
                    <input type="text" value={editModal.label}
                      onChange={e => setEditModal({ ...editModal, label: e.target.value })}
                      placeholder="My Business Type"
                      className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
                  </div>
                </>
              )}
              {!editModal.isNew && (
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Template Label *</label>
                  <input type="text" value={editModal.label}
                    onChange={e => setEditModal({ ...editModal, label: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-text mb-1">Staff Roles</label>
                <textarea value={editModal.roles}
                  onChange={e => setEditModal({ ...editModal, roles: e.target.value })}
                  placeholder={loadingTemplate ? 'Loading template...' : "One role per line, e.g.:\nStylist\nBarber\nMassage Therapist"}
                  rows={4} className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all resize-none" />
                <p className="text-xs text-text-muted mt-1">Each line becomes a staff role title</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Services</label>
                <textarea value={editModal.services}
                  onChange={e => setEditModal({ ...editModal, services: e.target.value })}
                  placeholder={loadingTemplate ? 'Loading template...' : "One per line: Name, Duration, Price, Category\ne.g.:\nHaircut, 30, 35, Hair\nFacial, 60, 65, Skincare"}
                  rows={6} className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all resize-none font-mono text-xs" />
                <p className="text-xs text-text-muted mt-1">Format: name, duration in min, price, category</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditModal({ ...editModal, open: false })}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-text-secondary border border-border hover:bg-surface-alt transition-all">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-all shadow-sm">
                  {editModal.isNew ? 'Create Template' : 'Update Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
