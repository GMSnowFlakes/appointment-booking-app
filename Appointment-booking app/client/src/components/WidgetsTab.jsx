import { useState, useEffect } from 'react';
import { safeFetchJson } from '../hooks/useSafeFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBusiness } from '../context/BusinessContext';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  }
  return (
    <button onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary-bg text-primary border border-primary/20 rounded-xl hover:bg-primary/10 transition-all">
      {copied ? '✅ Copied!' : (label || 'Copy')}
    </button>
  );
}

export default function WidgetsTab() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const { settings } = useBusiness();
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const primaryColor = settings?.primary_color || '#e11d48';

  useEffect(() => { fetchWidgets(); }, []);

  async function fetchWidgets() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/widget/admin');
      const sf = await safeFetchJson(res, 'Widgets');
      if (sf.ok) setWidgets(sf.data?.widgets || []);
      else console.warn(sf.error);
    } catch (err) { console.warn('Widgets | Error:', err.message); }
    setLoading(false);
  }

  async function handleSave(data) {
    try {
      const url = editing ? `/api/widget/admin/${editing.id}` : '/api/widget/admin';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(editing ? 'Widget updated' : 'Widget created');
        setFormOpen(false); setEditing(null); fetchWidgets();
      } else { toast.error(d.error); }
    } catch (err) { toast.error(err.message); }
  }

  async function handleToggle(w) {
    try {
      const res = await fetchWithAuth(`/api/widget/admin/${w.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !w.is_active }),
      });
      if (res.ok) fetchWidgets();
    } catch (err) { toast.error(err.message); }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      const res = await fetchWithAuth(`/api/widget/admin/${deleteConfirm.id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Widget deleted'); setDeleteConfirm(null); fetchWidgets(); }
    } catch (err) { toast.error(err.message); }
  }

  const baseUrl = window.location.origin;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-text">Embeddable Booking Widgets</h2>
          <p className="text-sm text-text-secondary">Create embeddable booking widgets for your website — just copy and paste the snippet</p>
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1.5">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
          Create Widget
        </button>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mb-2">
            <span className="text-base font-bold">1</span>
          </div>
          <h4 className="font-semibold text-text text-sm mb-1">Choose Style</h4>
          <p className="text-xs text-text-muted">Set button text, colors, and which services/staff to show.</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center mb-2">
            <span className="text-base font-bold">2</span>
          </div>
          <h4 className="font-semibold text-text text-sm mb-1">Copy Code</h4>
          <p className="text-xs text-text-muted">Copy the embed snippet and paste it into your website's HTML.</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 border border-green-200 flex items-center justify-center mb-2">
            <span className="text-base font-bold">3</span>
          </div>
          <h4 className="font-semibold text-text text-sm mb-1">Start Booking</h4>
          <p className="text-xs text-text-muted">Visitors on your site can book appointments without leaving your page.</p>
        </div>
      </div>

      {loading ? <Spinner /> : widgets.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-primary-bg rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><path d="M6 6h.01M6 18h.01" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text mb-1">No Widgets Yet</h3>
          <p className="text-sm text-text-secondary mb-4">Create an embeddable booking widget to add to your website.</p>
          <button onClick={() => { setEditing(null); setFormOpen(true); }}
            className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm">
            Create Your First Widget
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {widgets.map(w => {
            const isActive = w.is_active !== false;
            const embedSnippet = `<script src="${baseUrl}/api/widget/${w.widget_token}/embed.js"></script>`;

            return (
              <div key={w.id} className={`bg-surface rounded-xl border ${isActive ? 'border-border' : 'border-dashed border-border/50'} overflow-hidden shadow-sm hover:shadow-md transition-all`}>
                <div className="px-6 py-4 border-b border-border bg-surface-warm/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isActive ? 'bg-primary-bg' : 'bg-surface-alt'}`}
                      style={isActive ? { backgroundColor: (w.primary_color || primaryColor) + '15' } : {}}>
                      <svg className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-text-muted'}`}
        style={isActive ? { color: w.primary_color || primaryColor } : {}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-text">{w.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isActive ? 'bg-success-bg text-success border-green-200' : 'badge-inactive'}`}>
                          {isActive ? 'Published' : 'Inactive'}
                        </span>
                        <span>· Token: <code className="font-mono">{w.widget_token?.slice(0, 12)}...</code></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditing(w); setFormOpen(true); }}
                      className="px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-bg rounded-lg transition-colors">Edit</button>
                    <button onClick={() => handleToggle(w)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${isActive ? 'text-warning hover:bg-warning-bg' : 'text-success hover:bg-success-bg'}`}>
                      {isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => setDeleteConfirm(w)}
                      className="px-2.5 py-1.5 text-xs font-medium text-error hover:bg-error-bg rounded-lg transition-colors">Delete</button>
                  </div>
                </div>

                {isActive && (
                  <div className="p-6 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1.5 uppercase tracking-wider">📦 Embed Snippet</label>
                      <div className="bg-surface-warm border border-border rounded-xl p-3">
                        <code className="block text-xs font-mono text-text break-all select-all whitespace-pre-wrap">{embedSnippet}</code>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <CopyButton text={embedSnippet} label="Copy Snippet" />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted pt-2 border-t border-border/50">
                      <span>Button: <strong>{w.button_text || 'Book Now'}</strong></span>
                      <span>Header: <strong>{w.header_text || 'Book an Appointment'}</strong></span>
                      <span>Color: <span className="inline-block w-3 h-3 rounded border border-border align-middle" style={{ backgroundColor: w.primary_color || primaryColor }} /></span>
                      <span>Show staff: {w.show_staff ? '✅' : '❌'}</span>
                      <span>Show services: {w.show_services ? '✅' : '❌'}</span>
                      <span>Created: {new Date(w.created_at + 'Z').toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <WidgetFormModal
          widget={editing}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-sm animate-scale-in p-6">
            <h3 className="text-lg font-serif font-bold text-text mb-2">Delete Widget?</h3>
            <p className="text-sm text-text-secondary mb-4">Permanently delete "{deleteConfirm.name}"? Embed snippets on your website will stop working.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-alt transition-all">Cancel</button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-error text-white text-sm font-medium hover:bg-red-700 transition-all shadow-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WidgetFormModal({ widget, onClose, onSave }) {
  const [form, setForm] = useState({
    name: widget?.name || 'Default Widget',
    primary_color: widget?.primary_color || '#e11d48',
    button_text: widget?.button_text || 'Book Now',
    header_text: widget?.header_text || 'Book an Appointment',
    show_staff: widget?.show_staff !== false,
    show_services: widget?.show_services !== false,
    allowed_services: widget?.allowed_services || [],
    allowed_staff: widget?.allowed_staff || [],
    custom_css: widget?.custom_css || '',
  });
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const { fetchWithAuth } = useAuth();

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/api/admin/services').then(r => r.json()),
      fetchWithAuth('/api/staff/admin').then(r => r.json()),
    ]).then(([svc, stf]) => {
      if (svc.services) setServices(svc.services.filter(s => s.is_active));
      if (stf.staff) setStaff(stf.staff);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    await onSave({
      ...form,
      show_staff: form.show_staff,
      show_services: form.show_services,
      allowed_services: form.allowed_services.length > 0 ? form.allowed_services : null,
      allowed_staff: form.allowed_staff.length > 0 ? form.allowed_staff : null,
      custom_css: form.custom_css || null,
    });
    setSubmitting(false);
  }

  function toggleService(id) {
    setForm(f => ({
      ...f,
      allowed_services: f.allowed_services.includes(id) ? f.allowed_services.filter(s => s !== id) : [...f.allowed_services, id],
    }));
  }

  function toggleStaff(id) {
    setForm(f => ({
      ...f,
      allowed_staff: f.allowed_staff.includes(id) ? f.allowed_staff.filter(s => s !== id) : [...f.allowed_staff, id],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-lg animate-scale-in overflow-y-auto max-h-screen" style={{ maxHeight: '90vh' }}>
        <div className="px-6 py-4 border-b border-border bg-surface-warm sticky top-0 bg-surface z-10">
          <h3 className="text-lg font-serif font-bold text-text">{widget ? 'Edit Widget' : 'Create Widget'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Widget Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" placeholder="Main Website Widget" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Button Text</label>
              <input type="text" value={form.button_text} onChange={e => setForm({ ...form, button_text: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" placeholder="Book Now" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Header Text</label>
              <input type="text" value={form.header_text} onChange={e => setForm({ ...form, header_text: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" placeholder="Book an Appointment" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Primary Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })}
                className="w-10 h-10 rounded-xl border border-border cursor-pointer bg-transparent" />
              <input type="text" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })}
                pattern="^#[0-9a-fA-F]{6}$" className="w-28 px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm font-mono" />
              <div className="flex-1 h-10 rounded-xl border border-border" style={{ backgroundColor: form.primary_color }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border cursor-pointer hover:bg-surface-alt transition-all">
              <input type="checkbox" checked={form.show_staff} onChange={e => setForm({ ...form, show_staff: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <span className="text-sm font-medium text-text">Show Staff Picker</span>
            </label>
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border cursor-pointer hover:bg-surface-alt transition-all">
              <input type="checkbox" checked={form.show_services} onChange={e => setForm({ ...form, show_services: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <span className="text-sm font-medium text-text">Show Services</span>
            </label>
          </div>
          {services.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Allowed Services (leave empty = all)</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto border border-border rounded-xl p-2">
                {services.map(s => (
                  <button key={s.id} type="button" onClick={() => toggleService(s.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                      form.allowed_services.includes(s.id)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface-warm text-text-secondary border-border hover:border-primary/40'
                    }`}>{s.name}</button>
                ))}
              </div>
            </div>
          )}
          {staff.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Allowed Staff (leave empty = all)</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto border border-border rounded-xl p-2">
                {staff.map(m => (
                  <button key={m.id} type="button" onClick={() => toggleStaff(m.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                      form.allowed_staff.includes(m.id)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface-warm text-text-secondary border-border hover:border-primary/40'
                    }`}>{m.name}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Custom CSS (optional)</label>
            <textarea value={form.custom_css} onChange={e => setForm({ ...form, custom_css: e.target.value })}
              rows={2} className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm font-mono resize-none"
              placeholder=".widget-btn { background: #000; }" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-alt transition-all">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm">
              {submitting ? 'Saving...' : (widget ? 'Update Widget' : 'Create Widget')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
