import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBusiness } from '../context/BusinessContext';
import ConfirmDialog from './ConfirmDialog';

// ─── Business Types ───────────────────────────

const BUSINESS_TYPES = [
  { id: 'salon', label: 'Salon & Spa', icon: '💇', desc: 'Hair, nails, skincare, and beauty services' },
  { id: 'barbershop', label: 'Barbershop', icon: '💈', desc: 'Haircuts, beard trims, and grooming' },
  { id: 'pet-grooming', label: 'Pet Grooming', icon: '🐾', desc: 'Pet grooming, bathing, and care' },
  { id: 'dental-clinic', label: 'Dental Clinic', icon: '🦷', desc: 'Dental checkups, cleanings, and procedures' },
  { id: 'medical-clinic', label: 'Medical Clinic', icon: '🏥', desc: 'Doctor appointments and medical consultations' },
  { id: 'veterinary', label: 'Veterinary Clinic', icon: '🐕', desc: 'Pet medical care and checkups' },
  { id: 'tattoo', label: 'Tattoo & Piercing', icon: '🎨', desc: 'Tattoo artistry and body piercing' },
  { id: 'fitness', label: 'Fitness Training', icon: '💪', desc: 'Personal training and fitness coaching' },
  { id: 'yoga', label: 'Yoga & Pilates', icon: '🧘', desc: 'Yoga, pilates, and movement classes' },
  { id: 'photography', label: 'Photography Studio', icon: '📸', desc: 'Portrait, event, and professional photography' },
  { id: 'massage', label: 'Massage Therapy', icon: '💆', desc: 'Therapeutic and relaxation massage' },
  { id: 'wellness', label: 'Wellness & Holistic', icon: '🌿', desc: 'Holistic health and wellness services' },
  { id: 'beauty', label: 'Beauty & Cosmetics', icon: '💄', desc: 'Makeup, lashes, brows, and beauty treatments' },
  { id: 'nail-salon', label: 'Nail Salon', icon: '💅', desc: 'Manicure, pedicure, and nail art' },
  { id: 'spa', label: 'Day Spa', icon: '🧖', desc: 'Spa treatments, facials, and relaxation' },
  { id: 'med-spa', label: 'Med Spa', icon: '✨', desc: 'Medical aesthetics and advanced skincare' },
  { id: 'tutoring', label: 'Tutoring & Lessons', icon: '📚', desc: 'Academic tutoring and music lessons' },
  { id: 'music-lessons', label: 'Music Lessons', icon: '🎵', desc: 'Instrument and vocal instruction' },
  { id: 'art-classes', label: 'Art Classes', icon: '🎭', desc: 'Painting, drawing, and creative workshops' },
  { id: 'cooking-class', label: 'Cooking Classes', icon: '🍳', desc: 'Cooking and culinary workshops' },
  { id: 'therapy', label: 'Therapy & Counseling', icon: '🛋️', desc: 'Mental health counseling and therapy' },
  { id: 'acupuncture', label: 'Acupuncture', icon: '📍', desc: 'Acupuncture and alternative medicine' },
  { id: 'chiropractor', label: 'Chiropractor', icon: '🦴', desc: 'Chiropractic adjustments and care' },
  { id: 'physical-therapy', label: 'Physical Therapy', icon: '🏃', desc: 'Rehabilitation and physical therapy' },
  { id: 'personal-training', label: 'Personal Training', icon: '🏋️', desc: 'One-on-one fitness training' },
  { id: 'auto-repair', label: 'Auto Repair', icon: '🔧', desc: 'Vehicle maintenance and repair services' },
  { id: 'car-wash', label: 'Car Wash & Detailing', icon: '🚗', desc: 'Car washing, waxing, and detailing' },
  { id: 'tanning', label: 'Tanning Salon', icon: '☀️', desc: 'Spray tanning and UV tanning' },
  { id: 'dentist', label: 'Dentist', icon: '🦷', desc: 'General dentistry and oral care' },
  { id: 'optometrist', label: 'Optometrist', icon: '👓', desc: 'Eye exams and vision care' },
  { id: 'event-planning', label: 'Event Planning', icon: '🎉', desc: 'Event coordination and planning' },
  { id: 'real-estate', label: 'Real Estate', icon: '🏠', desc: 'Property viewings and consultations' },
  { id: 'financial-advisory', label: 'Financial Advisory', icon: '📊', desc: 'Financial planning and investment advice' },
  { id: 'legal-consulting', label: 'Legal Consulting', icon: '⚖️', desc: 'Legal consultations and advice' },
  { id: 'consulting', label: 'Consulting', icon: '💼', desc: 'Professional consulting services' },
  { id: 'wine-tasting', label: 'Wine Tasting', icon: '🍷', desc: 'Wine tasting and vineyard tours' },
  { id: 'custom', label: 'Custom Business', icon: '🏪', desc: 'Other appointment-based business' },
];

// ─── Service Form Modal ─────────────────────

function ServiceFormModal({ open, service, onClose, onSaved }) {
  const { fetchWithAuth } = useAuth();
  const isEdit = !!service;
  const [form, setForm] = useState({ name: '', description: '', duration: 30, price: '', category: '', image_url: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (service) setForm({
        name: service.name || '', description: service.description || '',
        duration: service.duration || 30, price: String(service.price || ''),
        category: service.category || '', image_url: service.image_url || '',
      });
      else setForm({ name: '', description: '', duration: 30, price: '', category: '', image_url: '' });
      setImageFile(null);
      setImagePreview('');
      setError('');
    }
  }, [open, service]);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview('');
    setForm({ ...form, image_url: '' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Service name is required'); return; }
    if (!form.duration || form.duration < 1) { setError('Duration must be at least 1 minute'); return; }
    if (!form.price || parseFloat(form.price) < 0) { setError('Price must be a valid amount'); return; }
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/admin/services/${service.id}` : '/api/admin/services';
      const method = isEdit ? 'PUT' : 'POST';

      // Use FormData if there's an image file, otherwise send JSON
      let body;
      let headers = {};
      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        fd.append('name', form.name);
        fd.append('description', form.description || '');
        fd.append('duration', String(parseInt(form.duration)));
        fd.append('price', String(parseFloat(form.price)));
        fd.append('category', form.category || '');
        body = fd;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          ...form,
          image_url: form.image_url || null,
          duration: parseInt(form.duration),
          price: parseFloat(form.price),
        });
      }

      const res = await fetchWithAuth(url, { method, headers, body });
      if (res.ok) { onSaved?.(); onClose?.(); }
      else { const data = await res.json(); setError(data.error || 'Failed to save service'); }
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-border w-full max-w-lg animate-scale-in overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface-warm">
          <h2 className="text-lg font-serif font-bold text-text">{isEdit ? 'Edit Service' : 'Add New Service'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-text-muted hover:text-text hover:bg-surface-alt transition-all flex items-center justify-center">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (<div className="p-3.5 bg-error-bg border border-red-200 rounded-xl text-sm text-error flex items-start gap-2.5"><span className="mt-0.5">⚠️</span><span>{error}</span></div>)}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Service Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Duration (min) *</label>
              <input type="number" min={1} value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Price ($) *</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Category</label>
            <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Hair, Grooming, Wellness"
              className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Service Image</label>
            <div className="flex items-start gap-3">
              <label className="relative flex-shrink-0 cursor-pointer group">
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-surface-warm flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50 group-hover:bg-primary-bg">
                  {(imagePreview || (isEdit && form.image_url && !imageFile)) ? (
                    <img src={imagePreview || form.image_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-text-muted p-2 text-center">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                      <span className="text-[10px]">Upload</span>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  onChange={handleImageChange} className="hidden" />
              </label>
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-xs text-text-muted">
                  {imageFile ? imageFile.name : (form.image_url ? 'Current image saved' : 'No image')}
                </p>
                <p className="text-[10px] text-text-muted">JPG, PNG, GIF, WebP, SVG. Max 5MB.</p>
                {(imagePreview || form.image_url) && (
                  <button type="button" onClick={clearImage}
                    className="text-xs text-error hover:text-error/80 font-medium transition-colors">
                    Remove image
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-text-secondary border border-border hover:bg-surface-alt transition-all">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm">
              {submitting ? 'Saving...' : (isEdit ? 'Update Service' : 'Create Service')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Shared Components ───────────────────────

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

function ErrorBlock({ message, onRetry }) {
  return (
    <div className="bg-white rounded-xl border border-border p-8 text-center">
      <div className="w-12 h-12 mx-auto mb-3 bg-error-bg rounded-xl flex items-center justify-center">😕</div>
      <p className="text-text-secondary text-sm mb-4">{message}</p>
      {onRetry && <button onClick={onRetry} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm">Try Again</button>}
    </div>
  );
}

function EmptyBlock({ icon, title, message }) {
  return (
    <div className="bg-white rounded-xl border border-border p-12 text-center">
      <div className="w-14 h-14 mx-auto mb-4 bg-primary-bg rounded-2xl flex items-center justify-center text-2xl">{icon}</div>
      <h3 className="text-lg font-semibold text-text mb-1">{title}</h3>
      <p className="text-text-secondary text-sm">{message}</p>
    </div>
  );
}

// ─── Settings Tab ──────────────────────────

function SettingsTab() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const { settings, refresh, getBusinessTypeLabel } = useBusiness();
  const [form, setForm] = useState({ business_name: '', business_type: '', business_description: '', primary_color: '#e11d48', category_colors: {} });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [loaded, setLoaded] = useState(false);
  // Track all known categories from services
  const [serviceCategories, setServiceCategories] = useState([]);

  // Fetch all service categories for the color picker
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
    setForm({
      ...form,
      category_colors: { ...form.category_colors, [category]: color },
    });
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
      } else {
        toast.error(data.error || 'Failed to save settings');
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-serif font-bold text-text">Business Settings</h2>
        <p className="text-sm text-text-secondary">Configure your business profile and appearance</p>
      </div>

      {/* Current business card preview */}
      <div className="bg-surface-warm rounded-xl border border-border p-5 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-sm"
          style={{ backgroundColor: form.primary_color + '15' }}>
          {BUSINESS_TYPES.find(t => t.id === form.business_type)?.icon || '🏪'}
        </div>
        <div>
          <h3 className="font-serif font-bold text-lg text-text">{form.business_name || 'My Business'}</h3>
          <p className="text-sm text-text-secondary">{getBusinessTypeLabel(form.business_type)}</p>
          {form.business_description && (
            <p className="text-xs text-text-muted mt-0.5">{form.business_description}</p>
          )}
        </div>
        <div className="ml-auto">
          <div className="w-8 h-8 rounded-full border-2 border-border"
            style={{ backgroundColor: form.primary_color }} />
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3.5 rounded-xl text-sm flex items-start gap-2.5 animate-fade-in ${
          message.type === 'success' ? 'bg-success-bg border border-green-200 text-success' : 'bg-error-bg border border-red-200 text-error'
        }`}>
          <span className="mt-0.5">{message.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Business Name</label>
          <input type="text" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })}
            placeholder="My Business" maxLength={200}
            className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Business Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-border rounded-xl p-2">
            {BUSINESS_TYPES.map(bt => (
              <button key={bt.id} type="button" onClick={() => setForm({ ...form, business_type: bt.id })}
                className={`flex items-center gap-3 p-3 rounded-xl text-left text-sm transition-all duration-200 ${
                  form.business_type === bt.id
                    ? 'bg-primary-bg border-2 border-primary'
                    : 'border-2 border-transparent hover:bg-surface-alt'
                }`}>
                <span className="text-xl">{bt.icon}</span>
                <div>
                  <span className="font-medium text-text">{bt.label}</span>
                  <p className="text-xs text-text-muted">{bt.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-1.5">
            Selected: <span className="font-medium text-text">{BUSINESS_TYPES.find(t => t.id === form.business_type)?.label || form.business_type}</span>
          </p>
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
            <input type="text" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })}
              pattern="^#[0-9a-fA-F]{6}$" placeholder="#e11d48"
              className="w-32 px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm font-mono transition-all" />
            <div className="flex-1 h-10 rounded-xl border border-border" style={{ backgroundColor: form.primary_color }} />
          </div>
        </div>

        {/* Category Colors Section */}
        {serviceCategories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Category Colors</label>
            <p className="text-xs text-text-muted mb-3">Customize the color for each service category</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-border rounded-xl p-3 bg-surface-warm/50">
              {serviceCategories.map(cat => {
                const currentColor = form.category_colors[cat] || undefined;
                return (
                  <div key={cat} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-border/70 hover:border-border transition-all">
                    <input type="color" value={currentColor || '#e11d48'}
                      onChange={e => updateCategoryColor(cat, e.target.value)}
                      className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent flex-shrink-0" />
                    <span className="flex-1 text-sm font-medium text-text truncate">{cat}</span>
                    <button type="button" title="Reset color"
                      onClick={() => {
                        const next = { ...form.category_colors };
                        delete next[cat];
                        setForm({ ...form, category_colors: next });
                      }}
                      className="text-text-muted hover:text-text text-xs px-1.5 py-0.5 rounded-lg hover:bg-surface-alt transition-all">Reset</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {serviceCategories.length === 0 && (
          <div className="p-4 bg-surface-warm rounded-xl border border-border/50">
            <p className="text-sm text-text-muted">No service categories yet. Add services first to customize their category colors.</p>
          </div>
        )}

        <button type="submit" disabled={saving}
          className="w-full py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
          style={{ backgroundColor: form.primary_color }}
          onMouseEnter={e => e.target.style.backgroundColor = form.primary_color + 'dd'}
          onMouseLeave={e => e.target.style.backgroundColor = form.primary_color}>
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </span>
          ) : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

// ─── Services Tab ──────────────────────────

function ServicesTab() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, service: null });
  const [restoreConfirm, setRestoreConfirm] = useState({ open: false, service: null });

  useEffect(() => { fetchServices(); }, []);

  async function fetchServices() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/services');
      const data = await res.json();
      if (res.ok) setServices(data.services);
      else setError(data.error || 'Failed to load services');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

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
        <button onClick={openCreate}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1.5">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
          Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <EmptyBlock icon="📭" title="No Services" message="Add your first service to get started." />
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
                        <svg className="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-text-secondary">{s.category || '—'}</td>
                  <td className="py-3 px-3 text-center text-text-secondary">{s.duration} min</td>
                  <td className="py-3 px-3 text-right font-medium text-text">${parseFloat(s.price).toFixed(2)}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      s.is_active ? 'bg-success-bg text-success border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)}
                        className="px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-bg rounded-lg transition-colors">Edit</button>
                      {s.is_active ? (
                        <button onClick={() => setDeleteConfirm({ open: true, service: s })}
                          className="px-2.5 py-1.5 text-xs font-medium text-error hover:bg-error-bg rounded-lg transition-colors">Deactivate</button>
                      ) : (
                        <button onClick={() => setRestoreConfirm({ open: true, service: s })}
                          className="px-2.5 py-1.5 text-xs font-medium text-success hover:bg-success-bg rounded-lg transition-colors">Restore</button>
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

// ─── Appointments Tab ─────────────────────

function AppointmentsTab() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  useEffect(() => { setPage(1); fetchAppointments(1); }, [statusFilter]);
  useEffect(() => { if (page > 1) fetchAppointments(page); }, [page]);

  async function fetchAppointments(pageOverride) {
    const cp = pageOverride ?? page;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(cp));
      params.set('limit', '10');
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetchWithAuth(`/api/admin/appointments?${params}`);
      const data = await res.json();
      if (res.ok) { setAppointments(data.appointments); if (data.pagination) setPagination(data.pagination); }
      else setError(data.error || 'Failed to load appointments');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function updateStatus(id, status) {
    try {
      await fetchWithAuth(`/api/admin/appointments/${id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      fetchAppointments();
    } catch { /* silent */ }
  }

  const statusColors = {
    confirmed: 'bg-success-bg text-success border-green-200',
    cancelled: 'bg-error-bg text-error border-red-200',
    completed: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBlock message={error} onRetry={fetchAppointments} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-text">All Appointments</h2>
          <p className="text-sm text-text-secondary">{pagination.total} total{pagination.totalPages > 1 ? ` (page ${pagination.page} of ${pagination.totalPages})` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface-warm border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-all">
            <option value="">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
          <button onClick={fetchAppointments} className="p-2 text-text-secondary hover:text-primary hover:bg-primary-bg rounded-xl transition-colors" title="Refresh">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 8a7 7 0 0113-3M15 1v4h-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 8a7 7 0 01-13 3M1 15v-4h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {appointments.length === 0 ? (
        <EmptyBlock icon="📭" title="No Appointments" message="No appointments match your filter." />
      ) : (
        <>
          <div className="space-y-3">
            {appointments.map(apt => {
              const aptDate = new Date(`${apt.date}T${apt.time}`);
              return (
                <div key={apt.id} className="bg-white rounded-xl border border-border p-4 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="font-semibold text-text">{apt.service_name}</h3>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColors[apt.status] || 'bg-gray-50 text-gray-700'}`}>{apt.status}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
                        <span>👤 {apt.user_name} ({apt.user_email})</span>
                        <span>📅 {aptDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>🕐 {aptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                        <span>⏱ {apt.service_duration} min</span>
                        <span className="font-medium text-primary">${parseFloat(apt.service_price).toFixed(2)}</span>
                      </div>
                      {apt.notes && <p className="mt-1 text-xs text-text-muted">📝 {apt.notes}</p>}
                    </div>
                    {apt.status !== 'cancelled' && (
                      <div className="flex-shrink-0 flex gap-1">
                        {apt.status === 'confirmed' && (
                          <button onClick={() => updateStatus(apt.id, 'completed')}
                            className="px-2.5 py-1.5 text-xs font-medium text-success hover:bg-success-bg border border-green-200 rounded-lg transition-colors">✓ Complete</button>
                        )}
                        {apt.status === 'completed' && (
                          <button onClick={() => updateStatus(apt.id, 'confirmed')}
                            className="px-2.5 py-1.5 text-xs font-medium text-warning hover:bg-warning-bg border border-amber-200 rounded-lg transition-colors">↺ Reopen</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-border gap-4">
              <p className="text-sm text-text-muted">Showing {(pagination.page - 1) * pagination.limit + 1}&ndash;{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</p>
              <div className="flex items-center gap-1.5">
                <button disabled={pagination.page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs font-medium rounded-xl border border-border text-text-secondary hover:bg-surface-alt transition-all disabled:opacity-30">◀ Prev</button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-9 h-9 text-xs font-medium rounded-xl transition-all ${p === pagination.page ? 'bg-primary text-white shadow-sm' : 'border border-border text-text-secondary hover:bg-surface-alt'}`}>{p}</button>
                ))}
                <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  className="px-3 py-1.5 text-xs font-medium rounded-xl border border-border text-text-secondary hover:bg-surface-alt transition-all disabled:opacity-30">Next ▶</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Users Tab ─────────────────────────────

function UsersTab() {
  const { user: currentUser, fetchWithAuth } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, user: null });
  const [roleChange, setRoleChange] = useState({ open: false, user: null, newRole: '' });

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/users');
      const data = await res.json();
      if (res.ok) setUsers(data.users);
      else setError(data.error || 'Failed to load users');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleRoleChange() {
    const { user: target, newRole } = roleChange;
    if (!target || !newRole) return;
    try {
      const res = await fetchWithAuth(`/api/admin/users/${target.id}/role`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast.success(`User ${newRole === 'admin' ? 'promoted to' : 'demoted to'} ${newRole}`);
        setRoleChange({ open: false, user: null, newRole: '' }); fetchUsers(); }
    } catch { /* silent */ }
  }

  async function handleDelete() {
    const target = deleteConfirm.user;
    if (!target) return;
    try {
      const res = await fetchWithAuth(`/api/admin/users/${target.id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('User deleted'); setDeleteConfirm({ open: false, user: null }); fetchUsers(); }
    } catch { /* silent */ }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBlock message={error} onRetry={fetchUsers} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-text">User Management</h2>
          <p className="text-sm text-text-secondary">{users.length} total users</p>
        </div>
      </div>
      {users.length === 0 ? (
        <EmptyBlock icon="👥" title="No Users" message="No users registered yet." />
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
              {users.map(u => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-surface-alt/30 transition-colors">
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: '#e11d48' }}>
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
                        <button onClick={() => setRoleChange({ open: true, user: u, newRole: u.role === 'admin' ? 'customer' : 'admin' })}
                          className="px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-bg rounded-lg transition-colors">{u.role === 'admin' ? 'Demote' : 'Promote'}</button>
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

      <ConfirmDialog open={roleChange.open}
        title={roleChange.newRole === 'admin' ? 'Promote to Admin?' : 'Demote to Customer?'}
        message={roleChange.user ? `${roleChange.newRole === 'admin' ? 'Promote' : 'Demote'} "${roleChange.user.name}" (${roleChange.user.email}) to ${roleChange.newRole}?` : ''}
        confirmLabel={roleChange.newRole === 'admin' ? 'Yes, Promote' : 'Yes, Demote'} cancelLabel="Cancel"
        variant={roleChange.newRole === 'admin' ? 'primary' : 'warning'}
        onConfirm={handleRoleChange} onCancel={() => setRoleChange({ open: false, user: null, newRole: '' })} />

      <ConfirmDialog open={deleteConfirm.open} title="Delete User?"
        message={deleteConfirm.user ? `Permanently delete "${deleteConfirm.user.name}" and all their appointments?` : ''}
        confirmLabel="Yes, Delete" cancelLabel="Cancel" variant="danger"
        onConfirm={handleDelete} onCancel={() => setDeleteConfirm({ open: false, user: null })} />
    </div>
  );
}

// ─── Main Admin Dashboard ──────────────────

export default function AdminDashboard() {
  const { user, fetchWithAuth } = useAuth();
  const { settings } = useBusiness();
  const [tab, setTab] = useState('settings');
  const [stats, setStats] = useState({ services: 0, appointments: 0, users: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const tabs = [
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'services', label: 'Services', icon: '📋' },
    { id: 'appointments', label: 'Appointments', icon: '📅' },
    { id: 'users', label: 'Users', icon: '👥' },
  ];

  useEffect(() => {
    if (user?.role === 'admin') fetchStats();
  }, [user]);

  async function fetchStats() {
    try {
      const [svcRes, aptRes, usrRes] = await Promise.all([
        fetchWithAuth('/api/admin/services'),
        fetchWithAuth('/api/admin/appointments?limit=1'),
        fetchWithAuth('/api/admin/users'),
      ]);
      const svc = await svcRes.json();
      const apt = await aptRes.json();
      const usr = await usrRes.json();
      setStats({
        services: svc.services?.filter(s => s.is_active).length || 0,
        appointments: apt.pagination?.total || 0,
        users: usr.users?.length || 0,
      });
    } catch { /* silent */ }
    setLoadingStats(false);
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-white rounded-3xl border border-border p-10 max-w-md text-center shadow-sm animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-bg rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-xl font-serif font-semibold text-text mb-2">Access Denied</h2>
          <p className="text-text-secondary text-sm">You need admin privileges to access this area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="mb-8">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: settings?.primary_color || '#e11d48' }}>Administration</span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-text tracking-tight">Admin Dashboard</h1>
        <p className="text-text-secondary mt-1">Manage your business, services, appointments, and users</p>
      </div>

      {/* Stats Cards */}
      {!loadingStats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setTab('settings')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ backgroundColor: `${settings?.primary_color || '#e11d48'}15` }}>⚙️</div>
              <div>
                <p className="text-lg font-bold text-text">{settings?.business_name || 'My Business'}</p>
                <p className="text-xs text-text-muted truncate">{settings?.business_type || 'salon'}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setTab('services')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-bg rounded-xl flex items-center justify-center text-lg">📋</div>
              <div>
                <p className="text-2xl font-bold text-text">{stats.services}</p>
                <p className="text-xs text-text-muted">Active Services</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setTab('appointments')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success-bg rounded-xl flex items-center justify-center text-lg">📅</div>
              <div>
                <p className="text-2xl font-bold text-text">{stats.appointments}</p>
                <p className="text-xs text-text-muted">Appointments</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setTab('users')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-lg">👥</div>
              <div>
                <p className="text-2xl font-bold text-text">{stats.users}</p>
                <p className="text-xs text-text-muted">Users</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6 bg-white rounded-2xl border border-border p-1.5 shadow-sm">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
              tab === t.id ? 'text-white shadow-sm' : 'text-text-secondary hover:text-text hover:bg-surface-alt'
            }`}
            style={tab === t.id ? { backgroundColor: settings?.primary_color || '#e11d48' } : {}}>
            <span className="mr-1.5">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        {tab === 'settings' && <SettingsTab />}
        {tab === 'services' && <ServicesTab />}
        {tab === 'appointments' && <AppointmentsTab />}
        {tab === 'users' && <UsersTab />}
      </div>
    </div>
  );
}
