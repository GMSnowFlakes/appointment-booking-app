import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// ─── Business Types ───────────────────────────

export const BUSINESS_TYPES = [
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

// ─── CSV Download Helper ───────────────────────

export function downloadCsv(fetchWithAuth, endpoint, filename) {
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

// ─── Spinner ───────────────────────────────────

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-text-secondary text-sm">Loading...</p>
      </div>
    </div>
  );
}

// ─── ErrorBlock ────────────────────────────────

export function ErrorBlock({ message, onRetry }) {
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

// ─── EmptyBlock ────────────────────────────────

export function EmptyBlock({ icon, title, message }) {
  return (
    <div className="bg-white rounded-xl border border-border p-12 text-center">
      <div className="w-14 h-14 mx-auto mb-4 bg-primary-bg rounded-2xl flex items-center justify-center">{icon}</div>
      <h3 className="text-lg font-semibold text-text mb-1">{title}</h3>
      <p className="text-text-secondary text-sm">{message}</p>
    </div>
  );
}

// ─── SVG Icon Components ───────────────────────

export function Icon({ name, className = 'w-5 h-5', ...rest }) {
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

// ─── Service Form Modal ─────────────────────

export function ServiceFormModal({ open, service, onClose, onSaved }) {
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
        body = JSON.stringify({ ...form, image_url: form.image_url || null, duration: parseInt(form.duration), price: parseFloat(form.price) });
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
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                      <span className="text-[10px]">Upload</span>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  onChange={handleImageChange} className="hidden" />
              </label>
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-xs text-text-muted">{imageFile ? imageFile.name : (form.image_url ? 'Current image saved' : 'No image')}</p>
                <p className="text-[10px] text-text-muted">JPG, PNG, GIF, WebP, SVG. Max 5MB.</p>
                {(imagePreview || form.image_url) && (
                  <button type="button" onClick={clearImage}
                    className="text-xs text-error hover:text-error/80 font-medium transition-colors">Remove image</button>
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

// ─── Schedule Modal (for Staff) ─────────────

export function ScheduleModal({ staff, onClose }) {
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
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-text-secondary border border-border hover:bg-surface-alt transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm">
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
