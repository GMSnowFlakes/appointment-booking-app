import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBusiness } from '../context/BusinessContext';
import ConfirmDialog from './ConfirmDialog';
import AnalyticsDashboard from './AnalyticsDashboard';
import ImportCsvModal from './ImportCsvModal';
import FinanceTab from './FinanceTab';
import DeveloperTab from './DeveloperTab';
import ICalManagerTab from './iCalManagerTab';
import PublicBookingTab from './PublicBookingTab';
import WidgetsTab from './WidgetsTab';

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

  /* eslint-disable react-hooks/set-state-in-effect */
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
  /* eslint-enable react-hooks/set-state-in-effect */

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

// ─── CSV Download Helper ───────────────────────

function downloadCsv(fetchWithAuth, endpoint, filename) {
  return async function handleDownload() {
    try {
      const res = await fetchWithAuth(endpoint);
      if (!res.ok) throw new Error('Failed to export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV download failed:', err);
    }
  };
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
      <div className="w-12 h-12 mx-auto mb-3 bg-error-bg rounded-xl flex items-center justify-center">
        <svg className="w-6 h-6 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      </div>
      <p className="text-text-secondary text-sm mb-4">{message}</p>
      {onRetry && <button onClick={onRetry} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm">Try Again</button>}
    </div>
  );
}

function EmptyBlock({ icon, title, message }) {
  return (
    <div className="bg-white rounded-xl border border-border p-12 text-center">
      <div className="w-14 h-14 mx-auto mb-4 bg-primary-bg rounded-2xl flex items-center justify-center">{icon}</div>
      <h3 className="text-lg font-semibold text-text mb-1">{title}</h3>
      <p className="text-text-secondary text-sm">{message}</p>
    </div>
  );
}

// ─── SVG Icon Components ───────────────────────

function Icon({ name, className = 'w-5 h-5', ...rest }) {
  const svgProps = { className, ...rest };
  const icons = {
    storyline: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>,
    settings: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>,
    people: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
    services: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>,
    coupon: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
    analytics: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
    finance: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
    developer: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
    ical: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    public: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
    widget: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><path d="M6 6h.01M6 18h.01" /></svg>,
    calendar: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    users: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
    sparkle: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" /><path d="M18 15l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" /></svg>,
    eyeball: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
    trending: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
    dollar: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
    clock: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    checkBadge: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>,
    arrowUp: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>,
    arrowDown: <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  };
  return icons[name] || <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>;
}

// ─── Business Story Tab ─────────────────────────
// A narrative overview showing the whole production flow — the story of the business

function StoryTab() {
  const { fetchWithAuth } = useAuth();
  const { settings } = useBusiness();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const exportRevenue = downloadCsv(fetchWithAuth, '/api/export/revenue', `revenue_${new Date().toISOString().slice(0, 10)}.csv`);

  async function loadStory() {
    setLoading(true);
    try {
      const [svcRes, aptRes, usrRes, staffRes, anlRes] = await Promise.all([
        fetchWithAuth('/api/admin/services'),
        fetchWithAuth('/api/admin/appointments?limit=1'),
        fetchWithAuth('/api/admin/users'),
        fetchWithAuth('/api/staff/admin'),
        fetchWithAuth('/api/analytics/summary?period=all'),
      ]);
      const svc = await svcRes.json();
      const apt = await aptRes.json();
      const usr = await usrRes.json();
      const stf = await staffRes.json();
      const anl = anlRes.ok ? await anlRes.json() : { summary: {} };

      const s = anl.summary || {};
      setData({
        bookings: s.total_bookings || 0,
        revenue: parseFloat(s.total_revenue) || 0,
        avgValue: parseFloat(s.avg_booking_value) || 0,
        customers: s.active_customers || 0,
        cancellations: s.cancellations || 0,
        growth: s.revenue_growth,
        bookingGrowth: s.booking_growth,
        thisMonth: s.this_month,
        lastMonth: s.last_month,
        services: svc.services?.filter(x => x.is_active).length || 0,
        totalServices: svc.services?.length || 0,
        appointments: apt.pagination?.total || 0,
        totalUsers: usr.users?.length || 0,
        staff: stf.staff?.length || 0,
      });
    } catch { /* silent */ }
    setLoading(false);
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadStory();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) return <Spinner />;

  const storyChapters = [
    { label: 'Business Founded', desc: settings?.business_name || 'Your Business', icon: 'sparkle', color: 'bg-amber-50 text-amber-600 border-amber-200', stat: settings?.business_type || 'salon', unit: 'type' },
    { label: 'Services Offered', desc: 'Crafting quality experiences', icon: 'services', color: 'bg-blue-50 text-blue-600 border-blue-200', stat: data?.services || 0, unit: 'active' },
    { label: 'Team Members', desc: 'Skilled professionals', icon: 'people', color: 'bg-purple-50 text-purple-600 border-purple-200', stat: data?.staff || 0, unit: 'staff' },
    { label: 'Customers Served', desc: 'Happy clients served', icon: 'users', color: 'bg-green-50 text-green-600 border-green-200', stat: data?.customers || 0, unit: 'people' },
    { label: 'Appointments Booked', desc: 'Total reservations fulfilled', icon: 'calendar', color: 'bg-rose-50 text-rose-600 border-rose-200', stat: data?.bookings || 0, unit: 'bookings' },
    { label: 'Revenue Generated', desc: 'Total earnings to date', icon: 'dollar', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', stat: `$${data?.revenue > 0 ? parseFloat(data.revenue).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}`, unit: 'gross' },
  ];

  const primaryColor = settings?.primary_color || '#e11d48';

  return (
    <div className="space-y-8">
      {/* Hero section — the "About" of the business */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-white to-surface-warm p-8">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Icon name="storyline" className="w-5 h-5" style={{ color: primaryColor }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: primaryColor }}>The Story</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-text mt-1">
            {settings?.business_name || 'Your Business'}
          </h2>
          <p className="text-text-secondary mt-2 max-w-2xl leading-relaxed">
            {settings?.business_description || 'A complete overview of your business journey — from the services you offer to every appointment fulfilled. This is your production story, showing how your team turns every booking into an experience.'}
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-text-muted bg-surface-warm px-3 py-1.5 rounded-lg border border-border">
              <Icon name="eyeball" className="w-4 h-4" />
              <span>{data?.totalUsers || 0} registered users</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-muted bg-surface-warm px-3 py-1.5 rounded-lg border border-border">
              <Icon name="services" className="w-4 h-4" />
              <span>{data?.totalServices || 0} total services</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-muted bg-surface-warm px-3 py-1.5 rounded-lg border border-border">
              <Icon name="trending" className="w-4 h-4" />
              <span>{data?.bookings || 0} lifetime bookings</span>
            </div>
            <button onClick={exportRevenue}
              className="flex items-center gap-2 text-sm text-primary font-medium bg-primary-bg px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Export Revenue CSV
            </button>
          </div>
        </div>
      </div>

      {/* Production timeline — narrative flow */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {storyChapters.map((ch, i) => (
          <div key={i} className="relative group">
            <div className={`rounded-xl border ${ch.color} p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white shadow-sm border border-inherit mb-3">
                <Icon name={ch.icon} className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-text">{ch.stat}</p>
              <p className="text-xs text-text-muted mt-0.5">{ch.unit}</p>
              <p className="text-sm font-medium text-text mt-2">{ch.label}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{ch.desc}</p>
            </div>
            {/* Connector arrow between cards (hidden on mobile) */}
            {i < storyChapters.length - 1 && (
              <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-text-muted/30">
                <Icon name="arrowUp" className="w-4 h-4 rotate-90" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Growth metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor + '15' }}>
              <Icon name="trending" className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <span className="text-sm font-semibold text-text">Monthly Performance</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-muted">This Month</p>
              <p className="text-lg font-bold text-text">{data?.thisMonth?.bookings || 0} bookings</p>
              <p className="text-sm font-semibold" style={{ color: primaryColor }}>${(data?.thisMonth?.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Last Month</p>
              <p className="text-lg font-bold text-text">{data?.lastMonth?.bookings || 0} bookings</p>
              <p className="text-sm text-text-secondary">${(data?.lastMonth?.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
            </div>
          </div>
          {data?.growth != null && (
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
              <Icon name={data.growth >= 0 ? 'arrowUp' : 'arrowDown'} className={`w-4 h-4 ${data.growth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-sm font-medium ${data.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(parseFloat(data.growth)).toFixed(1)}% revenue growth
              </span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor + '15' }}>
              <Icon name="checkBadge" className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <span className="text-sm font-semibold text-text">Service Quality</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-text-secondary">Avg. Booking Value</span>
                <span className="font-semibold text-text">${parseFloat(data?.avgValue || 0).toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min((data?.avgValue || 0) / 100 * 100, 100)}%`, backgroundColor: primaryColor }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-text-secondary">Retention Rate</span>
                <span className="font-semibold text-text">{(data?.bookings && data?.customers ? (data.bookings / Math.max(data.customers, 1)).toFixed(1) : '0')}x</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.min((data?.bookings && data?.customers ? (data.bookings / Math.max(data.customers, 1)) * 20 : 0), 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor + '15' }}>
              <Icon name="clock" className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <span className="text-sm font-semibold text-text">Production Overview</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="text-sm text-text-secondary">Active Services</span>
              <span className="text-sm font-semibold text-text">{data?.services || 0}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="text-sm text-text-secondary">Team Size</span>
              <span className="text-sm font-semibold text-text">{data?.staff || 0}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="text-sm text-text-secondary">Appointments</span>
              <span className="text-sm font-semibold text-text">{data?.appointments || 0}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="text-sm text-text-secondary">Registered Users</span>
              <span className="text-sm font-semibold text-text">{data?.totalUsers || 0}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-text-secondary">Cancellations</span>
              <span className="text-sm font-semibold text-text">{data?.cancellations || 0}</span>
            </div>
          </div>
        </div>
      </div>
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
  const [serviceCategories, setServiceCategories] = useState([]);

  useEffect(() => {
    fetch('/api/services/categories')
      .then(r => r.json())
      .then(d => { if (d.categories) setServiceCategories(d.categories.sort()); })
      .catch(() => {});
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
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
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const exportServices = downloadCsv(fetchWithAuth, '/api/export/services', `services_${new Date().toISOString().slice(0, 10)}.csv`);

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
  // const toast = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [importOpen, setImportOpen] = useState(false);

  const exportAppointments = downloadCsv(fetchWithAuth, '/api/export/appointments', `appointments_${new Date().toISOString().slice(0, 10)}.csv`);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setPage(1); fetchAppointments(1); }, [statusFilter]);
  useEffect(() => { if (page > 1) fetchAppointments(page); }, [page]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
          <button onClick={() => setImportOpen(true)}
            className="px-3 py-2 border border-dashed border-primary/40 text-primary rounded-xl text-sm font-medium hover:bg-primary-bg transition-all flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            Import CSV
          </button>
          <button onClick={exportAppointments}
            className="px-3 py-2 border border-border text-text-secondary rounded-xl text-sm font-medium hover:bg-surface-alt hover:text-text transition-all flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export CSV
          </button>
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
        <EmptyBlock icon={<Icon name="calendar" className="w-6 h-6" />} title="No Appointments" message="No appointments match your filter." />
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

      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/api/import/appointments"
        templateEndpoint="/api/import/appointments/template"
        title="Import Appointments"
        description="Upload a CSV with customer_email, service_name, date, and time. Existing customers are matched by email; new ones are auto-created."
        onImported={() => fetchAppointments()}
      />
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
  const [importOpen, setImportOpen] = useState(false);

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
        <button onClick={() => setImportOpen(true)}
          className="px-3 py-2 border border-dashed border-primary/40 text-primary rounded-xl text-sm font-medium hover:bg-primary-bg transition-all flex items-center gap-1.5">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
          Import Customers
        </button>
      </div>
      {users.length === 0 ? (
        <EmptyBlock icon={<Icon name="users" className="w-6 h-6" />} title="No Users" message="No users registered yet." />
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

      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/api/import/customers"
        templateEndpoint="/api/import/customers/template"
        title="Import Customers"
        description="Upload a CSV with name, email, and optional password/role columns. Duplicate emails are skipped."
        onImported={() => fetchUsers()}
      />
    </div>
  );
}

// ─── Staff Tab ─────────────────────────────

function StaffTab() {
  const { fetchWithAuth, user } = useAuth();
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [availModal, setAvailModal] = useState({ open: false, staff: null });

  useEffect(() => { fetchStaff(); fetchUsers(); }, []);

  async function fetchStaff() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/staff/admin');
      const d = await res.json();
      if (res.ok) setStaff(d.staff || []);
      else setError(d.error || 'Failed to load staff');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function fetchUsers() {
    try {
      const res = await fetchWithAuth('/api/admin/users');
      const d = await res.json();
      if (res.ok) setUsers(d.users || []);
    } catch { /* silent */ }
  }

  async function handleCreate(userId) {
    try {
      const res = await fetchWithAuth('/api/staff/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) { toast.success('Staff member added'); fetchStaff(); setFormOpen(false); }
      else { const d = await res.json(); toast.error(d.error); }
    } catch (err) { toast.error(err.message); }
  }

  async function handleToggleActive(member) {
    try {
      await fetchWithAuth(`/api/staff/admin/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: member.is_active ? false : true }),
      });
      fetchStaff();
    } catch { /* silent */ }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBlock message={error} onRetry={fetchStaff} />;

  const nonStaffUsers = users.filter(u => !staff.some(s => s.user_id === u.id) && u.id !== user?.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-text">Staff Management</h2>
          <p className="text-sm text-text-secondary">{staff.length} staff members</p>
        </div>
        <button onClick={() => setFormOpen(true)}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1.5">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
          Add Staff
        </button>
      </div>

      {staff.length === 0 ? (
        <EmptyBlock icon={<Icon name="people" className="w-6 h-6" />} title="No Staff" message="Add team members so customers can book with specific providers." />
      ) : (
        <div className="space-y-3">
          {staff.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-border p-4 flex items-center gap-4 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: m.color || '#6366f1' }}>
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
                  className="px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-bg rounded-lg transition-colors">
                  Schedule
                </button>
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
          <div className="relative bg-white rounded-2xl shadow-xl border border-border w-full max-w-md animate-scale-in p-6">
            <h3 className="text-lg font-serif font-bold text-text mb-4">Add Staff Member</h3>
            {nonStaffUsers.length === 0 ? (
              <p className="text-text-secondary text-sm">All users are already staff members.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {nonStaffUsers.map(u => (
                  <button key={u.id} onClick={() => handleCreate(u.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-alt border border-border transition-all text-left">
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-medium text-text text-sm">{u.name}</p>
                      <p className="text-xs text-text-muted">{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setFormOpen(false)} className="mt-4 w-full py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-alt transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {availModal.open && (
        <ScheduleModal
          staff={availModal.staff}
          onClose={() => setAvailModal({ open: false, staff: null })}
        />
      )}
    </div>
  );
}

// ─── Schedule Modal (for Staff) ─────────────

function ScheduleModal({ staff, onClose }) {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [schedule, setSchedule] = useState(
    days.map((name, i) => ({ day_of_week: i, start_time: '09:00', end_time: '17:00', enabled: i !== 0 && i !== 6 }))
  );
  const [saving, setSaving] = useState(false);

  function toggleDay(idx) {
    setSchedule(s => s.map((d, i) => i === idx ? { ...d, enabled: !d.enabled } : d));
  }

  function updateTime(idx, field, val) {
    setSchedule(s => s.map((d, i) => i === idx ? { ...d, [field]: val } : d));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const availability = schedule.filter(d => d.enabled).map(d => ({
        day_of_week: d.day_of_week,
        start_time: d.start_time,
        end_time: d.end_time,
      }));
      const res = await fetchWithAuth(`/api/staff/admin/${staff.id}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability }),
      });
      if (res.ok) { toast.success('Schedule saved'); onClose(); }
      else { const d = await res.json(); toast.error(d.error); }
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-border w-full max-w-lg animate-scale-in p-6">
        <h3 className="text-lg font-serif font-bold text-text mb-1">{staff.name}'s Schedule</h3>
        <p className="text-sm text-text-secondary mb-4">Set weekly availability</p>
        <div className="space-y-2">
          {schedule.map((d, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${d.enabled ? 'bg-white border-border' : 'bg-gray-50 border-dashed'}`}>
              <label className="flex items-center gap-2 w-28 cursor-pointer">
                <input type="checkbox" checked={d.enabled} onChange={() => toggleDay(i)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                <span className={`text-sm font-medium ${d.enabled ? 'text-text' : 'text-text-muted'}`}>{days[i].slice(0, 3)}</span>
              </label>
              {d.enabled && (
                <div className="flex items-center gap-2 ml-auto">
                  <input type="time" value={d.start_time} onChange={e => updateTime(i, 'start_time', e.target.value)}
                    className="px-2 py-1.5 bg-surface-warm border border-border rounded-lg text-sm w-24" />
                  <span className="text-text-muted">to</span>
                  <input type="time" value={d.end_time} onChange={e => updateTime(i, 'end_time', e.target.value)}
                    className="px-2 py-1.5 bg-surface-warm border border-border rounded-lg text-sm w-24" />
                </div>
              )}
              {!d.enabled && <span className="text-xs text-text-muted ml-auto">Day off</span>}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-alt transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm">
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Coupons Tab ────────────────────────────

function CouponsTab() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  // editing state managed via setEditing
  // eslint-disable-next-line no-unused-vars
  const [, setEditing] = useState(null);

  useEffect(() => { fetchCoupons(); }, []);

  async function fetchCoupons() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/coupons/admin');
      const d = await res.json();
      if (res.ok) setCoupons(d.coupons || []);
      else setError(d.error || 'Failed to load coupons');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleToggle(coupon) {
    try {
      await fetchWithAuth(`/api/coupons/admin/${coupon.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      });
      fetchCoupons();
    } catch { /* silent */ }
  }

  async function handleCreate(data) {
    try {
      const res = await fetchWithAuth('/api/coupons/admin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (res.ok) { toast.success('Coupon created'); setFormOpen(false); fetchCoupons(); }
      else { const d = await res.json(); toast.error(d.error); }
    } catch (err) { toast.error(err.message); }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBlock message={error} onRetry={fetchCoupons} />;

  const active = coupons.filter(c => c.is_active);
  const inactive = coupons.filter(c => !c.is_active);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-text">Discount Coupons</h2>
          <p className="text-sm text-text-secondary">{active.length} active, {inactive.length} inactive</p>
        </div>
        <button onClick={() => setFormOpen(true)}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1.5">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
          New Coupon
        </button>
      </div>

      {coupons.length === 0 ? (
        <EmptyBlock icon={<Icon name="coupon" className="w-6 h-6" />} title="No Coupons" message="Create discount codes to attract more customers." />
      ) : (
        <div className="space-y-2">
          {coupons.map(c => (
            <div key={c.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${!c.is_active ? 'opacity-50 border-dashed' : 'border-border'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.is_active ? 'bg-primary-bg' : 'bg-gray-50'}`}>
                <Icon name="coupon" className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-text">{c.code}</span>
                  <span className="text-sm font-medium text-primary">
                    {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `$${c.discount_value.toFixed(2)} OFF`}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.is_active ? 'bg-success-bg text-success border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  Used {c.current_uses || 0}/{c.max_uses || '∞'} times
                  {c.valid_until ? ` · Expires ${new Date(c.valid_until).toLocaleDateString()}` : ' · No expiry'}
                </div>
              </div>
              <button onClick={() => handleToggle(c)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${c.is_active ? 'text-warning hover:bg-warning-bg' : 'text-success hover:bg-success-bg'}`}>
                {c.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}

      {formOpen && <CouponFormModal onClose={() => setFormOpen(false)} onCreate={handleCreate} />}
    </div>
  );
}

// ─── Coupon Form Modal ─────────────────────

function CouponFormModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    code: '', discount_type: 'percentage', discount_value: 10,
    min_appointment_amount: 0, max_uses: 0, max_uses_per_user: 1,
    valid_from: '', valid_until: '', description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.code.trim()) return;
    setSubmitting(true);
    await onCreate({
      ...form,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      description: form.description || null,
    });
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-border w-full max-w-md animate-scale-in p-6">
        <h3 className="text-lg font-serif font-bold text-text mb-4">Create Coupon</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Code *</label>
            <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm font-mono" placeholder="SUMMER20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Type</label>
              <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}
                className="w-full px-3 py-2.5 bg-surface-warm border border-border rounded-xl text-sm">
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Value</label>
              <input type="number" min={1} max={form.discount_type === 'percentage' ? 100 : 9999}
                value={form.discount_value} onChange={e => setForm({ ...form, discount_value: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Valid From</label>
              <input type="date" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Valid Until</label>
              <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Max Uses</label>
              <input type="number" min={0} value={form.max_uses} onChange={e => setForm({ ...form, max_uses: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" placeholder="0 = unlimited" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Per User</label>
              <input type="number" min={1} value={form.max_uses_per_user} onChange={e => setForm({ ...form, max_uses_per_user: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Description</label>
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" placeholder="Summer Sale - 20% off" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-alt transition-all">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm">
              {submitting ? 'Creating...' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard ──────────────────

export default function AdminDashboard() {
  const { user, fetchWithAuth } = useAuth();
  const { settings } = useBusiness();
  const [tab, setTab] = useState('story');
  const [stats, setStats] = useState({ services: 0, appointments: 0, users: 0, staff: 0, coupons: 0, revenue: 0, customers: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const tabs = [
    { id: 'story', label: 'Story', icon: 'storyline' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'staff', label: 'Staff', icon: 'people' },
    { id: 'services', label: 'Services', icon: 'services' },
    { id: 'finance', label: 'Finance', icon: 'finance' },
    { id: 'developer', label: 'Developer', icon: 'developer' },
    { id: 'ical', label: 'Calendar', icon: 'ical' },
    { id: 'public', label: 'Public Pages', icon: 'public' },
    { id: 'widget', label: 'Widgets', icon: 'widget' },
    { id: 'coupons', label: 'Coupons', icon: 'coupon' },
    { id: 'analytics', label: 'Analytics', icon: 'analytics' },
    { id: 'appointments', label: 'Appointments', icon: 'calendar' },
    { id: 'users', label: 'Users', icon: 'users' },
  ];

  async function fetchStats() {
    try {
      const [svcRes, aptRes, usrRes, staffRes, coupRes, anlRes] = await Promise.all([
        fetchWithAuth('/api/admin/services'),
        fetchWithAuth('/api/admin/appointments?limit=1'),
        fetchWithAuth('/api/admin/users'),
        fetchWithAuth('/api/staff/admin'),
        fetchWithAuth('/api/coupons/admin'),
        fetchWithAuth('/api/analytics/summary?period=all'),
      ]);
      const svc = await svcRes.json();
      const apt = await aptRes.json();
      const usr = await usrRes.json();
      const stf = await staffRes.json();
      const cp = await coupRes.json();
      const anl = anlRes.ok ? await anlRes.json() : { summary: {} };
      setStats({
        services: svc.services?.filter(s => s.is_active).length || 0,
        appointments: apt.pagination?.total || 0,
        users: usr.users?.length || 0,
        staff: stf.staff?.length || 0,
        coupons: cp.coupons?.filter(c => c.is_active).length || 0,
        revenue: anl.summary?.total_revenue || 0,
        customers: anl.summary?.active_customers || 0,
      });
    } catch { /* silent */ }
    setLoadingStats(false);
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (user?.role === 'admin') fetchStats();
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const primaryColor = settings?.primary_color || '#e11d48';
  const accentBg = (opacity = '15') => `${primaryColor}${opacity}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: primaryColor }}>Administration</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-text tracking-tight">Dashboard</h1>
        <p className="text-text-secondary mt-1">Your business story — from services to revenue</p>
      </div>

      {/* Bento-grid Stats Cards */}
      {!loadingStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { tab: 'settings', label: 'Business', icon: 'settings', value: settings?.business_name || 'My Business', sub: settings?.business_type || 'salon', small: true },
            { tab: 'staff', label: 'Team', icon: 'people', value: stats.staff, sub: 'Staff members' },
            { tab: 'services', label: 'Services', icon: 'services', value: stats.services, sub: 'Active services' },
            { tab: 'appointments', label: 'Production', icon: 'calendar', value: stats.appointments, sub: 'Appointments' },
            { tab: 'coupons', label: 'Promotions', icon: 'coupon', value: stats.coupons, sub: 'Active coupons' },
            { tab: 'analytics', label: 'Revenue', icon: 'dollar', value: `$${stats.revenue > 0 ? parseFloat(stats.revenue).toLocaleString(undefined, { minimumFractionDigits: 0 }) : '0'}`, sub: stats.customers > 0 ? `${stats.customers} customers` : 'Total revenue' },
          ].map(card => (
            <div key={card.tab} role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setTab(card.tab); } }}
              onClick={() => setTab(card.tab)}
              className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 flex flex-col">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentBg() }}>
                  <Icon name={card.icon} className="w-4 h-4" style={{ color: primaryColor }} />
                </div>
                <span className="text-xs text-text-muted">{card.label}</span>
              </div>
              <p className={`font-bold text-text mt-auto ${card.small ? 'text-sm' : 'text-2xl'}`}>{card.value}</p>
              <p className="text-xs text-text-muted">{card.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab Navigation — cleaner, SVG icons */}
      <div className="flex items-center gap-1 mb-6 bg-white rounded-2xl border border-border p-1 shadow-sm overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              tab === t.id
                ? 'text-white shadow-sm'
                : 'text-text-secondary hover:text-text hover:bg-surface-alt'
            }`}
            style={tab === t.id ? { backgroundColor: primaryColor } : {}}>
            <Icon name={t.icon} className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        {tab === 'story' && <StoryTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'staff' && <StaffTab />}
        {tab === 'services' && <ServicesTab />}
        {tab === 'finance' && <FinanceTab />}
        {tab === 'developer' && <DeveloperTab />}
        {tab === 'ical' && <ICalManagerTab />}
        {tab === 'public' && <PublicBookingTab />}
        {tab === 'widget' && <WidgetsTab />}
        {tab === 'coupons' && <CouponsTab />}
        {tab === 'analytics' && <AnalyticsDashboard />}
        {tab === 'appointments' && <AppointmentsTab />}
        {tab === 'users' && <UsersTab />}
      </div>
    </div>
  );
}