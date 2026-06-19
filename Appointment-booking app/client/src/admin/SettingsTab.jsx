import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBusiness } from '../context/BusinessContext';
import { BUSINESS_TYPES } from './shared';

export default function SettingsTab() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const { settings, refresh, getBusinessTypeLabel } = useBusiness();
  const [form, setForm] = useState({ business_name: '', business_type: '', business_description: '', primary_color: '#e11d48', category_colors: {} });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [showTemplatePrompt, setShowTemplatePrompt] = useState(false);
  const [importingTemplate, setImportingTemplate] = useState(false);
  const [templateImportMsg, setTemplateImportMsg] = useState(null);
  const [serviceCategories, setServiceCategories] = useState([]);

  useEffect(() => {
    fetch('/api/services/categories')
      .then(r => r.json())
      .then(d => { if (d.categories) setServiceCategories(d.categories.sort()); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (settings && !loaded) {
      setForm({
        business_name: settings.business_name || '',
        business_type: settings.business_type || 'salon',
        business_description: settings.business_description || '',
        primary_color: settings.primary_color || '#e11d48',
        category_colors: settings.category_colors || {},
      });
      setLoaded(true);
    }
  }, [settings, loaded]);

  function updateCategoryColor(category, color) {
    setForm({ ...form, category_colors: { ...form.category_colors, [category]: color } });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetchWithAuth('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Business settings saved!');
        setMessage({ type: 'success', text: 'Business settings saved successfully!' });
        refresh();
        if (form.business_type && form.business_type !== 'custom') setShowTemplatePrompt(true);
      } else {
        toast.error(data.error || 'Failed to save settings');
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-serif font-bold text-text">Business Settings</h2>
        <p className="text-sm text-text-secondary">Configure your business profile and appearance</p>
      </div>

      <div className="bg-surface-warm rounded-xl border border-border p-5 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-sm"
          style={{ backgroundColor: form.primary_color + '15' }}>
          {BUSINESS_TYPES.find(t => t.id === form.business_type)?.icon || '🏪'}
        </div>
        <div>
          <h3 className="font-serif font-bold text-lg text-text">{form.business_name || 'My Business'}</h3>
          <p className="text-sm text-text-secondary">{getBusinessTypeLabel(form.business_type)}</p>
          {form.business_description && <p className="text-xs text-text-muted mt-0.5">{form.business_description}</p>}
        </div>
        <div className="ml-auto">
          <div className="w-8 h-8 rounded-full border-2 border-border" style={{ backgroundColor: form.primary_color }} />
        </div>
      </div>

      {showTemplatePrompt && !templateImportMsg && (
        <div className="mb-4 p-5 rounded-xl border border-primary/30 bg-primary-bg/30 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-text mb-1">Would you like to import recommended services and staff roles for this business type?</h4>
              <p className="text-xs text-text-secondary mb-3">This will add suggested services (with pricing and durations) and staff role templates. Existing services with the same name will not be duplicated.</p>
              <div className="flex items-center gap-2">
                <button onClick={async () => {
                  setImportingTemplate(true);
                  try {
                    const res = await fetchWithAuth('/api/admin/templates/import', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ business_type: form.business_type }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setTemplateImportMsg({ type: 'success', text: `Imported ${data.created?.services?.length || 0} services and ${data.created?.roles?.length || 0} staff role templates.` });
                      refresh();
                    } else {
                      const data = await res.json().catch(() => ({}));
                      setTemplateImportMsg({ type: 'error', text: data.error || 'Failed to import template' });
                    }
                  } catch (err) { setTemplateImportMsg({ type: 'error', text: err.message }); }
                  setImportingTemplate(false);
                  setShowTemplatePrompt(false);
                }} disabled={importingTemplate}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm flex items-center gap-2">
                  {importingTemplate ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</> : 'Use Recommended Setup'}
                </button>
                <button onClick={() => setShowTemplatePrompt(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-surface-alt transition-all">Skip Setup</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {templateImportMsg && (
        <div className={`mb-4 p-3.5 rounded-xl text-sm flex items-start gap-2.5 animate-fade-in ${templateImportMsg.type === 'success' ? 'bg-success-bg border border-green-200 text-success' : 'bg-error-bg border border-red-200 text-error'}`}>
          <span className="mt-0.5">{templateImportMsg.type === 'success' ? '✅' : '⚠️'}</span><span>{templateImportMsg.text}</span>
          <button onClick={() => setTemplateImportMsg(null)} className="ml-auto text-xs text-text-muted hover:text-text">Dismiss</button>
        </div>
      )}

      {message && (
        <div className={`mb-4 p-3.5 rounded-xl text-sm flex items-start gap-2.5 animate-fade-in ${message.type === 'success' ? 'bg-success-bg border border-green-200 text-success' : 'bg-error-bg border border-red-200 text-error'}`}>
          <span className="mt-0.5">{message.type === 'success' ? '✅' : '⚠️'}</span><span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Business Name</label>
          <input type="text" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} placeholder="My Business" maxLength={200}
            className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Business Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-border rounded-xl p-2">
            {BUSINESS_TYPES.map(bt => (
              <button key={bt.id} type="button" onClick={() => setForm({ ...form, business_type: bt.id })}
                className={`flex items-center gap-3 p-3 rounded-xl text-left text-sm transition-all duration-200 ${form.business_type === bt.id ? 'bg-primary-bg border-2 border-primary' : 'border-2 border-transparent hover:bg-surface-alt'}`}>
                <span className="text-xl">{bt.icon}</span>
                <div><span className="font-medium text-text">{bt.label}</span><p className="text-xs text-text-muted">{bt.desc}</p></div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Business Description</label>
          <textarea value={form.business_description} onChange={e => setForm({ ...form, business_description: e.target.value })}
            placeholder="Describe your business..." rows={2} maxLength={1000}
            className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Primary Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })}
              className="w-10 h-10 rounded-xl border border-border cursor-pointer bg-transparent" />
            <input type="text" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} pattern="^#[0-9a-fA-F]{6}$" placeholder="#e11d48"
              className="w-32 px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm font-mono transition-all" />
            <div className="flex-1 h-10 rounded-xl border border-border" style={{ backgroundColor: form.primary_color }} />
          </div>
        </div>

        {serviceCategories.length > 0 ? (
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Category Colors</label>
            <p className="text-xs text-text-muted mb-3">Customize the color for each service category</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-border rounded-xl p-3 bg-surface-warm/50">
              {serviceCategories.map(cat => (
                <div key={cat} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-border/70 hover:border-border transition-all">
                  <input type="color" value={form.category_colors[cat] || '#e11d48'}
                    onChange={e => updateCategoryColor(cat, e.target.value)}
                    className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent flex-shrink-0" />
                  <span className="flex-1 text-sm font-medium text-text truncate">{cat}</span>
                  <button type="button" onClick={() => {
                    const next = { ...form.category_colors }; delete next[cat]; setForm({ ...form, category_colors: next });
                  }} className="text-text-muted hover:text-text text-xs px-1.5 py-0.5 rounded-lg hover:bg-surface-alt transition-all">Reset</button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-surface-warm rounded-xl border border-border/50">
            <p className="text-sm text-text-muted">No service categories yet. Add services first to customize their category colors.</p>
          </div>
        )}

        <button type="submit" disabled={saving}
          className="w-full py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
          style={{ backgroundColor: form.primary_color }}
          onMouseEnter={e => e.target.style.backgroundColor = form.primary_color + 'dd'}
          onMouseLeave={e => e.target.style.backgroundColor = form.primary_color}>
          {saving ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</span> : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
