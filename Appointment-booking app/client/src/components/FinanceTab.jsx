import { useState, useEffect } from 'react';
import { safeFetchJson } from '../hooks/useSafeFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBusiness } from '../context/BusinessContext';

// ─── Helpers ────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-text-secondary text-sm">Loading...</p>
      </div>
    </div>
  );
}

// ─── Sub-section component ─────────────────

function SectionCard({ title, description, children, action }) {
  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-surface-warm/50 flex items-center justify-between">
        <div>
          <h3 className="text-base font-serif font-bold text-text">{title}</h3>
          {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

// ─── Tax Rates Section ──────────────────────

function TaxRatesSection() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { fetchRates(); }, []);

  async function fetchRates() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/tax-rates');
      const sf = await safeFetchJson(res, 'TaxRates');
      if (sf.ok) setRates(sf.data?.tax_rates || []);
      else console.warn(sf.error);
    } catch (err) { console.warn('TaxRates | Error:', err.message); }
    setLoading(false);
  }

  async function handleSave(data) {
    try {
      const url = editing ? `/api/admin/tax-rates/${editing.id}` : '/api/admin/tax-rates';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) { toast.success(editing ? 'Tax rate updated' : 'Tax rate created'); setFormOpen(false); setEditing(null); fetchRates(); }
      else { const d = await res.json(); toast.error(d.error); }
    } catch (err) { toast.error(err.message); }
  }

  async function handleToggle(rate) {
    try {
      await fetchWithAuth(`/api/admin/tax-rates/${rate.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rate.is_active }),
      });
      fetchRates();
    } catch (err) { console.warn('TaxRates toggle | Error:', err.message); }
  }

  if (loading) return <Spinner />;

  const active = rates.filter(r => r.is_active);
  const inactive = rates.filter(r => !r.is_active);

  return (
    <SectionCard title="Tax Rates" description={`${active.length} active · ${inactive.length} inactive`}
      action={
        <button onClick={() => { setEditing(null); setFormOpen(true); }}
          className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
          Add Rate
        </button>
      }>
      {rates.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-6">No tax rates configured. Add your first tax rate.</p>
      ) : (
        <div className="space-y-2">
          {rates.map(r => (
            <div key={r.id} className={`flex items-center gap-4 p-3 rounded-xl border ${!r.is_active ? 'opacity-50 border-dashed border-border' : 'border-border/70'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text">{r.name}</span>
                  <span className="text-sm font-bold text-primary">{r.rate_percent}%</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-surface-alt text-text-muted">{r.tax_type}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${r.is_active ? 'bg-success-bg text-success border-green-200' : 'badge-inactive'}`}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <button onClick={() => { setEditing(r); setFormOpen(true); }}
                className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary-bg rounded-lg transition-colors">Edit</button>
              <button onClick={() => handleToggle(r)}
                className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${r.is_active ? 'text-warning hover:bg-warning-bg' : 'text-success hover:bg-success-bg'}`}>
                {r.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <TaxRateFormModal
          rate={editing}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </SectionCard>
  );
}

function TaxRateFormModal({ rate, onClose, onSave }) {
  const [form, setForm] = useState({
    name: rate?.name || '',
    rate_percent: rate?.rate_percent || 0,
    tax_type: rate?.tax_type || 'inclusive',
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || form.rate_percent <= 0) return;
    setSubmitting(true);
    await onSave(form);
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-sm animate-scale-in p-6">
        <h3 className="text-lg font-serif font-bold text-text mb-4">{rate ? 'Edit Tax Rate' : 'Add Tax Rate'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" placeholder="e.g. VAT, Sales Tax" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Rate (%) *</label>
              <input type="number" step="0.01" min="0" max="100" value={form.rate_percent}
                onChange={e => setForm({ ...form, rate_percent: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Type</label>
              <select value={form.tax_type} onChange={e => setForm({ ...form, tax_type: e.target.value })}
                className="w-full px-3 py-2.5 bg-surface-warm border border-border rounded-xl text-sm">
                <option value="inclusive">Inclusive</option>
                <option value="exclusive">Exclusive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-alt transition-all">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm">
              {submitting ? 'Saving...' : (rate ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tip Settings Section ───────────────────

function TipSettingsSection() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [, setTipSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ is_enabled: true, default_percentages: [15, 18, 20, 25], custom_enabled: true });

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/tip-settings');
      const sf = await safeFetchJson(res, 'TipSettings');
      if (sf.ok && sf.data?.tip_settings) {
        const d = sf.data;
        setTipSettings(d.tip_settings);
        setForm({
          is_enabled: !!d.tip_settings.is_enabled,
          default_percentages: d.tip_settings.default_percentages || [15, 18, 20, 25],
          custom_enabled: !!d.tip_settings.custom_enabled,
        });
      } else if (!sf.ok) { console.warn(sf.error); }
    } catch (err) { console.warn('TipSettings | Error:', err.message); }
    setLoading(false);
  }

  async function handleSave() {
    try {
      const res = await fetchWithAuth('/api/admin/tip-settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_enabled: form.is_enabled,
          default_percentages: form.default_percentages,
          custom_enabled: form.custom_enabled,
        }),
      });
      if (res.ok) { toast.success('Tip settings saved'); fetchSettings(); }
    } catch (err) { toast.error(err.message); }
  }

  function addPercentage() {
    setForm({ ...form, default_percentages: [...form.default_percentages, 15] });
  }

  function updatePercentage(idx, val) {
    const next = [...form.default_percentages];
    next[idx] = val;
    setForm({ ...form, default_percentages: next });
  }

  function removePercentage(idx) {
    if (form.default_percentages.length <= 1) return;
    setForm({ ...form, default_percentages: form.default_percentages.filter((_, i) => i !== idx) });
  }

  if (loading) return <Spinner />;

  return (
    <SectionCard title="Tip Settings" description="Configure how tipping works at checkout">
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.is_enabled} onChange={e => setForm({ ...form, is_enabled: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
          <div>
            <span className="text-sm font-medium text-text">Enable Tipping</span>
            <p className="text-xs text-text-muted">Allow customers to add a tip when checking out</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.custom_enabled} onChange={e => setForm({ ...form, custom_enabled: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
          <div>
            <span className="text-sm font-medium text-text">Allow Custom Tips</span>
            <p className="text-xs text-text-muted">Let customers enter a custom tip amount</p>
          </div>
        </label>

        {form.is_enabled && (
          <div>
            <label className="block text-sm font-medium text-text mb-2">Default Tip Percentages</label>
            <div className="flex flex-wrap gap-2">
              {form.default_percentages.map((pct, i) => (
                <div key={i} className="flex items-center gap-1 bg-surface-warm border border-border rounded-lg px-2 py-1">
                  <input type="number" min={1} max={100} value={pct}
                    onChange={e => updatePercentage(i, parseInt(e.target.value) || 15)}
                    className="w-14 text-sm font-medium text-text bg-transparent border-none text-center focus:outline-none" />
                  <span className="text-text-muted text-xs">%</span>
                  <button onClick={() => removePercentage(i)}
                    className="text-text-muted hover:text-error transition-colors p-0.5">
                    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" /></svg>
                  </button>
                </div>
              ))}
              <button onClick={addPercentage}
                className="px-3 py-1.5 border border-dashed border-border text-text-muted hover:text-text hover:border-border-strong rounded-lg text-xs font-medium transition-all">
                + Add
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button onClick={handleSave}
            className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm">
            Save Settings
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Early Bird Discounts Section ───────────

function EarlyBirdSection() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [services, setServices] = useState([]);

  useEffect(() => {
    fetchDiscounts();
    fetchWithAuth('/api/admin/services').then(r => r.json()).then(d => {
      if (d.services) setServices(d.services.filter(s => s.is_active));
    }).catch(() => {});
  }, []);

  async function fetchDiscounts() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/early-bird');
      const sf = await safeFetchJson(res, 'EarlyBird');
      if (sf.ok) setDiscounts(sf.data?.early_bird_discounts || []);
      else console.warn(sf.error);
    } catch (err) { console.warn('EarlyBird | Error:', err.message); }
    setLoading(false);
  }

  async function handleSave(data) {
    try {
      const url = editing ? `/api/admin/early-bird/${editing.id}` : '/api/admin/early-bird';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (res.ok) { toast.success(editing ? 'Discount updated' : 'Discount created'); setFormOpen(false); setEditing(null); fetchDiscounts(); }
      else { const d = await res.json(); toast.error(d.error); }
    } catch (err) { toast.error(err.message); }
  }

  async function handleToggle(d) {
    try {
      await fetchWithAuth(`/api/admin/early-bird/${d.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !d.is_active }),
      });
      fetchDiscounts();
    } catch (err) { console.warn('EarlyBird toggle | Error:', err.message); }
  }

  if (loading) return <Spinner />;

  return (
    <SectionCard title="Early Bird Discounts" description={`${discounts.filter(d => d.is_active).length} active discounts`}
      action={
        <button onClick={() => { setEditing(null); setFormOpen(true); }}
          className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
          Add
        </button>
      }>
      {discounts.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-6">No early bird discounts configured.</p>
      ) : (
        <div className="space-y-2">
          {discounts.map(d => (
            <div key={d.id} className={`flex items-center gap-4 p-3 rounded-xl border ${!d.is_active ? 'opacity-50 border-dashed' : 'border-border/70'}`}>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-text text-sm">{d.discount_percent}% off</span>
                  <span className="text-xs text-text-muted">{d.days_before} days before</span>
                  {d.service_id && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Service #{d.service_id}</span>}
                  {d.max_discount_cents > 0 && <span className="text-xs text-text-muted">· Max ${(d.max_discount_cents / 100).toFixed(2)}</span>}
                </div>
              </div>
              <button onClick={() => { setEditing(d); setFormOpen(true); }} className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary-bg rounded-lg">Edit</button>
              <button onClick={() => handleToggle(d)}
                className={`px-2 py-1 text-xs font-medium rounded-lg ${d.is_active ? 'text-warning hover:bg-warning-bg' : 'text-success hover:bg-success-bg'}`}>
                {d.is_active ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setFormOpen(false); setEditing(null); }} />
          <div className="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-sm animate-scale-in p-6">
            <h3 className="text-lg font-serif font-bold text-text mb-4">{editing ? 'Edit Early Bird' : 'Add Early Bird'}</h3>
            <EarlyBirdForm editing={editing} services={services} onSave={handleSave} onClose={() => { setFormOpen(false); setEditing(null); }} />
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function EarlyBirdForm({ editing, services, onSave, onClose }) {
  const [form, setForm] = useState({
    service_id: editing?.service_id || '',
    days_before: editing?.days_before || 3,
    discount_percent: editing?.discount_percent || 10,
    max_discount_cents: editing?.max_discount_cents || 0,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    await onSave({ ...form, service_id: form.service_id || null });
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-text mb-1">Service (optional)</label>
        <select value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })}
          className="w-full px-3 py-2.5 bg-surface-warm border border-border rounded-xl text-sm">
          <option value="">All Services</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-text mb-1">Days Before *</label>
          <input type="number" min={1} value={form.days_before}
            onChange={e => setForm({ ...form, days_before: parseInt(e.target.value) || 1 })}
            className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1">Discount % *</label>
          <input type="number" step="0.1" min={0} max={100} value={form.discount_percent}
            onChange={e => setForm({ ...form, discount_percent: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text mb-1">Max Discount ($)</label>
        <input type="number" step="0.01" min={0} value={(form.max_discount_cents / 100).toFixed(2)}
          onChange={e => setForm({ ...form, max_discount_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
          className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" placeholder="0 = no limit" />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-alt transition-all">Cancel</button>
        <button type="submit" disabled={submitting}
          className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm">
          {submitting ? 'Saving...' : (editing ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
}

// ─── Last-Minute Deals Section ──────────────

function LastMinuteSection() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [services, setServices] = useState([]);

  useEffect(() => {
    fetchDeals();
    fetchWithAuth('/api/admin/services').then(r => r.json()).then(d => {
      if (d.services) setServices(d.services.filter(s => s.is_active));
    }).catch(() => {});
  }, []);

  async function fetchDeals() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/last-minute');
      const sf = await safeFetchJson(res, 'LastMinute');
      if (sf.ok) setDeals(sf.data?.last_minute_deals || []);
      else console.warn(sf.error);
    } catch (err) { console.warn('LastMinute | Error:', err.message); }
    setLoading(false);
  }

  async function handleSave(data) {
    try {
      const url = editing ? `/api/admin/last-minute/${editing.id}` : '/api/admin/last-minute';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (res.ok) { toast.success(editing ? 'Deal updated' : 'Deal created'); setFormOpen(false); setEditing(null); fetchDeals(); }
      else { const d = await res.json(); toast.error(d.error); }
    } catch (err) { toast.error(err.message); }
  }

  async function handleToggle(d) {
    try {
      await fetchWithAuth(`/api/admin/last-minute/${d.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !d.is_active }),
      });
      fetchDeals();
    } catch (err) { console.warn('LastMinute toggle | Error:', err.message); }
  }

  if (loading) return <Spinner />;

  return (
    <SectionCard title="Last-Minute Deals" description={`${deals.filter(d => d.is_active).length} active deals`}
      action={
        <button onClick={() => { setEditing(null); setFormOpen(true); }}
          className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
          Add
        </button>
      }>
      {deals.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-6">No last-minute deals configured.</p>
      ) : (
        <div className="space-y-2">
          {deals.map(d => (
            <div key={d.id} className={`flex items-center gap-4 p-3 rounded-xl border ${!d.is_active ? 'opacity-50 border-dashed' : 'border-border/70'}`}>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-text text-sm">{d.discount_percent}% off</span>
                  <span className="text-xs text-text-muted">{d.hours_before}h before appointment</span>
                  {d.max_quantity > 0 && <span className="text-xs text-text-muted">· Max {d.max_quantity} uses</span>}
                </div>
              </div>
              <button onClick={() => { setEditing(d); setFormOpen(true); }} className="px-2 py-1 text-xs font-medium text-primary hover:bg-primary-bg rounded-lg">Edit</button>
              <button onClick={() => handleToggle(d)}
                className={`px-2 py-1 text-xs font-medium rounded-lg ${d.is_active ? 'text-warning hover:bg-warning-bg' : 'text-success hover:bg-success-bg'}`}>
                {d.is_active ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setFormOpen(false); setEditing(null); }} />
          <div className="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-sm animate-scale-in p-6">
            <h3 className="text-lg font-serif font-bold text-text mb-4">{editing ? 'Edit Deal' : 'Add Last-Minute Deal'}</h3>
            <LastMinuteForm editing={editing} services={services} onSave={handleSave} onClose={() => { setFormOpen(false); setEditing(null); }} />
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function LastMinuteForm({ editing, services, onSave, onClose }) {
  const [form, setForm] = useState({
    service_id: editing?.service_id || '',
    hours_before: editing?.hours_before || 4,
    discount_percent: editing?.discount_percent || 25,
    max_quantity: editing?.max_quantity || 0,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    await onSave(form);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-text mb-1">Service *</label>
        <select value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })}
          className="w-full px-3 py-2.5 bg-surface-warm border border-border rounded-xl text-sm">
          <option value="">Select a service...</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-text mb-1">Hours Before *</label>
          <input type="number" min={1} value={form.hours_before}
            onChange={e => setForm({ ...form, hours_before: parseInt(e.target.value) || 1 })}
            className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1">Discount % *</label>
          <input type="number" step="0.1" min={0} max={100} value={form.discount_percent}
            onChange={e => setForm({ ...form, discount_percent: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text mb-1">Max Uses (0 = unlimited)</label>
        <input type="number" min={0} value={form.max_quantity}
          onChange={e => setForm({ ...form, max_quantity: parseInt(e.target.value) || 0 })}
          className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-alt transition-all">Cancel</button>
        <button type="submit" disabled={submitting}
          className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm">
          {submitting ? 'Saving...' : (editing ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
}

// ─── Credits Management Section ─────────────

function CreditsSection() {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState({ all_time: 0, monthly: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [creditsRes] = await Promise.all([
          fetchWithAuth('/api/credits').then(r => safeFetchJson(r, 'Credits')),
          fetchWithAuth('/api/credits/transactions').then(r => safeFetchJson(r, 'CreditsTransactions')),
        ]);
        if (creditsRes.ok) {
          setData({
            all_time: creditsRes.data?.credits?.lifetime_credits || 0,
            monthly: creditsRes.data?.credits?.balance_cents || 0,
            balance: creditsRes.data?.credits?.balance_cents || 0,
          });
        } else { console.warn(creditsRes.error); }
      } catch { /* silent */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  return (
    <SectionCard title="Customer Credits" description="Store credit and loyalty balance system">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-warm rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-text">{(data.balance / 100).toFixed(2)}</p>
          <p className="text-xs text-text-muted mt-0.5">Current Balance</p>
        </div>
        <div className="bg-surface-warm rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-text">{(data.all_time / 100).toFixed(2)}</p>
          <p className="text-xs text-text-muted mt-0.5">Lifetime Credits</p>
        </div>
        <div className="bg-surface-warm rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-text">{((data.all_time - data.balance) / 100).toFixed(2)}</p>
          <p className="text-xs text-text-muted mt-0.5">Redeemed</p>
        </div>
      </div>
      <p className="text-xs text-text-muted text-center mt-3">Credit management per user coming soon</p>
    </SectionCard>
  );
}

// ─── Dynamic Pricing Section ────────────────
function DynamicPricingSection() {
  const { fetchWithAuth } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setServices] = useState([]);

  useEffect(() => {
    fetchRules();
    fetchWithAuth('/api/admin/services').then(r => r.json()).then(d => {
      if (d.services) setServices(d.services.filter(s => s.is_active));
    }).catch(() => {});
  }, []);

  async function fetchRules() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/dynamic-pricing');
      const sf = await safeFetchJson(res, 'DynamicPricing');
      if (sf.ok) setRules(sf.data?.rules || []);
      else console.warn(sf.error);
    } catch (err) { console.warn('DynamicPricing | Error:', err.message); }
    setLoading(false);
  }

  async function handleToggle(r) {
    try {
      await fetchWithAuth(`/api/admin/dynamic-pricing/${r.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !r.is_active }),
      });
      fetchRules();
    } catch (err) { console.warn('DynamicPricing toggle | Error:', err.message); }
  }

  const ruleTypeLabels = { 'time_of_day': 'Time of Day', 'day_of_week': 'Day of Week', 'date_range': 'Date Range', 'booking_window': 'Booking Window', 'seasonal': 'Seasonal', 'occupancy': 'Occupancy' };

  if (loading) return <Spinner />;

  return (
    <SectionCard title="Dynamic Pricing" description={`${rules.filter(r => r.is_active).length} active pricing rules`}>
      {rules.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-6">No dynamic pricing rules configured.</p>
      ) : (
        <div className="space-y-2">
          {rules.map(r => (
            <div key={r.id} className={`flex items-center gap-4 p-3 rounded-xl border ${!r.is_active ? 'opacity-50 border-dashed' : 'border-border/70'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">{ruleTypeLabels[r.rule_type] || r.rule_type}</span>
                  <span className="font-medium text-text text-sm">{r.adjustment_type === 'percentage' ? `${r.adjustment_value}%` : `$${r.adjustment_value}`}</span>
                  {r.service_id && <span className="text-xs text-text-muted">· Service #{r.service_id}</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${r.is_active ? 'bg-success-bg text-success border-green-200' : 'badge-inactive'}`}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <button onClick={() => handleToggle(r)}
                className={`px-2 py-1 text-xs font-medium rounded-lg ${r.is_active ? 'text-warning hover:bg-warning-bg' : 'text-success hover:bg-success-bg'}`}>
                {r.is_active ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Main Finance Tab ───────────────────────

export default function FinanceTab() {
  const { settings } = useBusiness();
  const primaryColor = settings?.primary_color || '#e11d48';

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-serif font-bold text-text">Finance & Pricing</h2>
        <p className="text-sm text-text-secondary">Configure tax rates, tipping, discounts, and dynamic pricing rules</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm" style={{ borderLeftColor: primaryColor, borderLeftWidth: '3px' }}>
          <p className="text-2xl font-bold text-text">Tax</p>
          <p className="text-xs text-text-muted">Configure rates & types</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm" style={{ borderLeftColor: '#d97706', borderLeftWidth: '3px' }}>
          <p className="text-2xl font-bold text-text">Tips</p>
          <p className="text-xs text-text-muted">Default percentages</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm" style={{ borderLeftColor: '#16a34a', borderLeftWidth: '3px' }}>
          <p className="text-2xl font-bold text-text">Discounts</p>
          <p className="text-xs text-text-muted">Early bird & last-minute</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm" style={{ borderLeftColor: '#6366f1', borderLeftWidth: '3px' }}>
          <p className="text-2xl font-bold text-text">Pricing</p>
          <p className="text-xs text-text-muted">Dynamic rules engine</p>
        </div>
      </div>

      <TaxRatesSection />
      <TipSettingsSection />
      <DynamicPricingSection />
      <EarlyBirdSection />
      <LastMinuteSection />
      <CreditsSection />
    </div>
  );
}
