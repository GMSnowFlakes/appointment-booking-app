import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

// ─── Business Overview ──────────────────────────
// The main dashboard landing page — KPIs, today's schedule, revenue insights, activity, quick actions

function BusinessOverview() {
  const { fetchWithAuth } = useAuth();
  const { settings } = useBusiness();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [todayApts, setTodayApts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const primaryColor = settings?.primary_color || '#e11d48';

  function loadDashboard() {
    setLoading(true);
    setLoadError(false);
    Promise.all([
      fetchWithAuth('/api/analytics/summary?period=all'),
      fetchWithAuth('/api/admin/appointments?limit=5&sort=date:asc'),
    ]).then(async ([anlRes, todayRes]) => {
      let anl, today;
      try { anl = anlRes.ok ? await anlRes.json() : { summary: {} }; } catch { anl = { summary: {} }; }
      try { today = todayRes.ok ? await todayRes.json() : { appointments: [] }; } catch { today = { appointments: [] }; }
      const s = anl.summary || {};
      setData({
        todayBookings: s.today_bookings || 0,
        revenueThisMonth: parseFloat(s.this_month?.revenue) || 0,
        activeCustomers: s.active_customers || 0,
        staffUtilization: s.staff_utilization || 0,
        revenueGrowth: s.revenue_growth,
        bookingGrowth: s.booking_growth,
        totalRevenue: parseFloat(s.total_revenue) || 0,
        totalBookings: s.total_bookings || 0,
        thisMonth: s.this_month,
        lastMonth: s.last_month,
        avgValue: parseFloat(s.avg_booking_value) || 0,
        cancellations: s.cancellations || 0,
      });
      setTodayApts(today.appointments || []);
      setLoading(false);
    }).catch(() => { setLoadError(true); setLoading(false); });
  }

  useEffect(() => { loadDashboard(); }, []);

  if (loading) return <Spinner />;
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-14 h-14 mx-auto mb-4 bg-warning-bg rounded-2xl flex items-center justify-center">
          <svg className="w-7 h-7 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text mb-2">Unable to load dashboard data</h3>
        <p className="text-text-secondary text-sm mb-6 max-w-sm text-center">Please try again or contact support if the problem persists.</p>
        <button onClick={loadDashboard} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── KPI Row ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Appointments", value: data?.todayBookings || 0, icon: 'calendar', color: '#2563eb', change: null },
          { label: 'Revenue This Month', value: `$${(data?.revenueThisMonth || 0).toLocaleString()}`, icon: 'dollar', color: '#059669', change: data?.revenueGrowth },
          { label: 'Active Customers', value: data?.activeCustomers || 0, icon: 'users', color: '#7c3aed', change: null },
          { label: 'Staff Utilization', value: data?.staffUtilization ? `${Math.round(data.staffUtilization * 100)}%` : '—', icon: 'people', color: '#d97706', change: null },
        ].map(kpi => (
          <div key={kpi.label} className="relative overflow-hidden bg-white rounded-xl border border-border p-5 shadow-sm">
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: kpi.color }} />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: kpi.color }}>{kpi.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: kpi.color + '12' }}>
                <Icon name={kpi.icon} className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-text">{kpi.value}</p>
            {kpi.change != null && (
              <div className="flex items-center gap-1 mt-1.5">
                <Icon name={kpi.change >= 0 ? 'arrowUp' : 'arrowDown'} className={`w-3.5 h-3.5 ${kpi.change >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-xs font-medium ${kpi.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(parseFloat(kpi.change)).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Main Grid: Today's Schedule + Revenue Insights ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                <Icon name="calendar" className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-text">Today's Schedule</h3>
                <p className="text-xs text-text-muted">{todayApts.length} appointment{todayApts.length !== 1 ? 's' : ''} today</p>
              </div>
            </div>
            <button onClick={() => navigate('/admin/appointments')}
              className="text-xs font-medium text-primary hover:text-primary-dark transition-colors px-3 py-1.5 rounded-lg bg-primary-bg hover:bg-primary/10">
              View All Appointments →
            </button>
          </div>
          {todayApts.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              <p>No appointments scheduled for today.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayApts.map(apt => {
                const aptDate = new Date(`${apt.date}T${apt.time}`);
                return (
                  <div key={apt.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/70 hover:border-border hover:bg-surface-alt/30 transition-all">
                    <div className="w-12 text-center flex-shrink-0">
                      <p className="text-xs font-bold text-text">{aptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: primaryColor }}>
                      {(apt.user_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{apt.user_name}</p>
                      <p className="text-xs text-text-muted truncate">{apt.service_name}{apt.staff_name ? ` · ${apt.staff_name}` : ''}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      apt.status === 'confirmed' ? 'bg-success-bg text-success border-green-200' :
                      apt.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>{apt.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Revenue Insights */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <Icon name="trending" className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-text">Revenue Insights</h3>
              <p className="text-xs text-text-muted">Monthly performance</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-alt/50">
              <span className="text-sm text-text-secondary">This Month</span>
              <div className="text-right">
                <p className="text-lg font-bold text-text">${(data?.thisMonth?.revenue || 0).toLocaleString()}</p>
                <p className="text-xs text-text-muted">{data?.thisMonth?.bookings || 0} bookings</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-alt/30">
              <span className="text-sm text-text-secondary">Last Month</span>
              <div className="text-right">
                <p className="text-lg font-bold text-text">${(data?.lastMonth?.revenue || 0).toLocaleString()}</p>
                <p className="text-xs text-text-muted">{data?.lastMonth?.bookings || 0} bookings</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-alt/30">
              <span className="text-sm text-text-secondary">Avg. Value</span>
              <div className="text-right">
                <p className="text-lg font-bold text-text">${parseFloat(data?.avgValue || 0).toFixed(2)}</p>
                <p className="text-xs text-text-muted">per booking</p>
              </div>
            </div>
            {data?.totalRevenue > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-alt/30">
                <span className="text-sm text-text-secondary">All Time</span>
                <div className="text-right">
                  <p className="text-lg font-bold text-text">${data.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-text-muted">{data.totalBookings} total bookings</p>
                </div>
              </div>
            )}
          </div>

          {data?.bookingGrowth != null && (
            <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border">
              <Icon name={data.bookingGrowth >= 0 ? 'arrowUp' : 'arrowDown'} className={`w-4 h-4 ${data.bookingGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-xs font-medium ${data.bookingGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(parseFloat(data.bookingGrowth)).toFixed(1)}% booking growth
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Activity + Quick Actions ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
              <Icon name="clock" className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-text">Recent Activity</h3>
              <p className="text-xs text-text-muted">Latest updates across your business</p>
            </div>
          </div>
          <div className="space-y-1">
            {[
              { type: 'booking', text: `${data?.totalBookings || 0} total bookings across all services`, time: 'Lifetime' },
              { type: 'customers', text: `${data?.activeCustomers || 0} active customers served`, time: 'All time' },
              { type: 'revenue', text: `${data?.revenueThisMonth > 0 ? '$' + data.revenueThisMonth.toLocaleString() : '$0'} revenue this month`, time: 'MTD' },
              { type: 'cancellations', text: `${data?.cancellations || 0} cancellations recorded`, time: 'All time' },
              data?.revenueGrowth != null ? { type: 'growth', text: `Revenue ${data.revenueGrowth >= 0 ? 'grew' : 'declined'} by ${Math.abs(parseFloat(data.revenueGrowth)).toFixed(1)}%`, time: 'Period' } : null,
            ].filter(Boolean).map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-alt/50 transition-all">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  item.type === 'booking' ? 'bg-blue-500' :
                  item.type === 'customers' ? 'bg-purple-500' :
                  item.type === 'revenue' ? 'bg-green-500' :
                  item.type === 'growth' ? 'bg-emerald-500' :
                  'bg-amber-500'
                }`} />
                <p className="flex-1 text-sm text-text truncate">{item.text}</p>
                <span className="text-[10px] text-text-muted flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v10M3 8h10" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-text">Quick Actions</h3>
              <p className="text-xs text-text-muted">Common tasks</p>
            </div>
          </div>
          <div className="space-y-2">
            <button onClick={() => navigate('/admin/services')}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary-bg/20 transition-all text-left">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0">
                <Icon name="services" className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-text">Add Service</p>
                <p className="text-xs text-text-muted">Create a new service offering</p>
              </div>
            </button>
            <button onClick={() => navigate('/admin/users')}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary-bg/20 transition-all text-left">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center flex-shrink-0">
                <Icon name="users" className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-text">Add Customer</p>
                <p className="text-xs text-text-muted">Register a new customer</p>
              </div>
            </button>
            <button onClick={() => navigate('/admin/coupons')}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary-bg/20 transition-all text-left">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <Icon name="coupon" className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-text">Create Coupon</p>
                <p className="text-xs text-text-muted">Launch a promotion or discount</p>
              </div>
            </button>
            <button onClick={() => navigate('/admin/staff')}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary-bg/20 transition-all text-left">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                <Icon name="people" className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-text">Invite Staff</p>
                <p className="text-xs text-text-muted">Add a team member</p>
              </div>
            </button>
            <button onClick={() => navigate('/admin/appointments')}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary-bg/20 transition-all text-left">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center flex-shrink-0">
                <Icon name="calendar" className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-text">Add Appointment</p>
                <p className="text-xs text-text-muted">Schedule a new booking</p>
              </div>
            </button>
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
        // Show template import prompt if business type is not 'custom'
        if (form.business_type && form.business_type !== 'custom') {
          setShowTemplatePrompt(true);
        }
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

      {/* ── Template Import Prompt ───────────────── */}
      {showTemplatePrompt && !templateImportMsg && (
        <div className="mb-4 p-5 rounded-xl border border-primary/30 bg-primary-bg/30 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-text mb-1">Would you like to import recommended services and staff roles for this business type?</h4>
              <p className="text-xs text-text-secondary mb-3">This will add suggested services (with pricing and durations) and staff role templates. Existing services with the same name will not be duplicated.</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setImportingTemplate(true);
                    try {
                      const res = await fetchWithAuth('/api/admin/templates/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
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
                    } catch (err) {
                      setTemplateImportMsg({ type: 'error', text: err.message });
                    }
                    setImportingTemplate(false);
                    setShowTemplatePrompt(false);
                  }}
                  disabled={importingTemplate}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm flex items-center gap-2"
                >
                  {importingTemplate ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</>
                  ) : 'Use Recommended Setup'}
                </button>
                <button onClick={() => setShowTemplatePrompt(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-surface-alt transition-all">
                  Skip Setup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template import result message */}
      {templateImportMsg && (
        <div className={`mb-4 p-3.5 rounded-xl text-sm flex items-start gap-2.5 animate-fade-in ${
          templateImportMsg.type === 'success' ? 'bg-success-bg border border-green-200 text-success' : 'bg-error-bg border border-red-200 text-error'
        }`}>
          <span className="mt-0.5">{templateImportMsg.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{templateImportMsg.text}</span>
          <button onClick={() => setTemplateImportMsg(null)} className="ml-auto text-xs text-text-muted hover:text-text">Dismiss</button>
        </div>
      )}

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
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, user: null });
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/users?role=customer');
      const data = await res.json();
      if (res.ok) setUsers(data.users);
      else setError(data.error || 'Failed to load users');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
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
      {/* Search input */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="9" cy="9" r="6" /><path d="M13.5 13.5l4 4" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search customers..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all"
          />
        </div>
      </div>

      {(searchQuery ? users.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.toLowerCase().includes(searchQuery.toLowerCase())
      ) : users).length === 0 ? (
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
              {(searchQuery ? users.filter(u =>
                u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.phone?.toLowerCase().includes(searchQuery.toLowerCase())
              ) : users).map(u => (
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
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [availModal, setAvailModal] = useState({ open: false, staff: null });
  const [promoteConfirm, setPromoteConfirm] = useState({ open: false, member: null });
  
  // Add Staff form state
  const [staffForm, setStaffForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', role: '', serviceIds: []
  });
  const [staffFormError, setStaffFormError] = useState('');
  const [staffFormSubmitting, setStaffFormSubmitting] = useState(false);

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

  useEffect(() => { fetchStaff(); fetchServices(); }, []);

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

  async function fetchServices() {
    try {
      const res = await fetchWithAuth('/api/admin/services');
      const d = await res.json();
      if (res.ok) setServices(d.services || []);
    } catch { /* silent */ }
  }

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
      // 1) Create user as staff via admin endpoint
      const userRes = await fetchWithAuth('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${firstName.trim()} ${lastName.trim()}`, email: email.trim(), role: 'staff' }),
      });
      const userData = await userRes.json();
      if (!userRes.ok) { setStaffFormError(userData.error || 'Failed to create user'); setStaffFormSubmitting(false); return; }
      const userId = userData.user.id;

      // 2) Add as staff member
      const staffRes = await fetchWithAuth('/api/staff/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, title: role || null, phone: phone.trim() || null }),
      });
      const staffData = await staffRes.json();
      if (!staffRes.ok) { setStaffFormError(staffData.error || 'Failed to add staff'); setStaffFormSubmitting(false); return; }
      const newStaffId = staffData.staff?.id;

      // 3) Assign services if any selected
      if (newStaffId && serviceIds.length > 0) {
        await fetchWithAuth(`/api/staff/admin/${newStaffId}/services`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service_ids: serviceIds }),
        });
      }

      toast.success('Staff member added successfully');
      setFormOpen(false);
      setStaffForm({ firstName: '', lastName: '', email: '', phone: '', role: '', serviceIds: [] });
      fetchStaff();
    } catch (err) {
      setStaffFormError(err.message);
    }
    setStaffFormSubmitting(false);
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

  async function handlePromoteToAdmin() {
    const member = promoteConfirm.member;
    if (!member) return;
    try {
      const res = await fetchWithAuth(`/api/admin/users/${member.user_id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      serviceIds: prev.serviceIds.includes(id)
        ? prev.serviceIds.filter(sid => sid !== id)
        : [...prev.serviceIds, id],
    }));
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorBlock message={error} onRetry={fetchStaff} />;

  const filteredStaff = staffSearch
    ? staff.filter(m =>
        m.name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
        m.email?.toLowerCase().includes(staffSearch.toLowerCase()) ||
        (m.title || '').toLowerCase().includes(staffSearch.toLowerCase())
      )
    : staff;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-text">Staff Management</h2>
          <p className="text-sm text-text-secondary">{staff.length} staff members</p>
        </div>
        <button onClick={() => {
          setStaffForm({ firstName: '', lastName: '', email: '', phone: '', role: '', serviceIds: [] });
          setStaffFormError('');
          setFormOpen(true);
        }}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1.5">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
          Add Staff
        </button>
      </div>

      {/* Search input */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="9" cy="9" r="6" /><path d="M13.5 13.5l4 4" />
          </svg>
          <input
            type="text"
            value={staffSearch}
            onChange={e => setStaffSearch(e.target.value)}
            placeholder="Search staff..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all"
          />
        </div>
      </div>

      {filteredStaff.length === 0 ? (
        <EmptyBlock icon={<Icon name="people" className="w-6 h-6" />} title="No Staff" message={staffSearch ? 'No staff match your search.' : 'Add team members so customers can book with specific providers.'} />
      ) : (
        <div className="space-y-3">
          {filteredStaff.map(m => (
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
                {m.role !== 'admin' && (
                  <button onClick={() => setPromoteConfirm({ open: true, member: m })}
                    className="px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-bg rounded-lg transition-colors">
                    Promote
                  </button>
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

      {/* ── Add Staff Modal ──────────────────── */}
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
                <div className="p-3.5 bg-error-bg border border-red-200 rounded-xl text-sm text-error flex items-start gap-2.5">
                  <span className="mt-0.5">⚠️</span><span>{staffFormError}</span>
                </div>
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
                <input type="email" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder="staff@example.com"
                  className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Phone Number</label>
                <input type="tel" value={staffForm.phone} onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Role</label>
                <select value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all">
                  <option value="">Select a role...</option>
                  {STAFF_ROLES.map(r => (
                    <option key={r.id} value={r.label}>{r.label}</option>
                  ))}
                </select>
              </div>
              {services.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Services Assigned</label>
                  <div className="border border-border rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5">
                    {services.filter(s => s.is_active).map(s => (
                      <label key={s.id} className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-lg hover:bg-surface-alt/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={staffForm.serviceIds.includes(s.id)}
                          onChange={() => toggleService(s.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-text">{s.name}</span>
                        <span className="text-xs text-text-muted ml-auto">${parseFloat(s.price).toFixed(2)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {services.length === 0 && (
                <p className="text-xs text-text-muted italic">No active services available. Create services first.</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setFormOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-text-secondary border border-border hover:bg-surface-alt transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={staffFormSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm">
                  {staffFormSubmitting ? 'Saving...' : 'Save Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Promote Confirmation ─────────────── */}
      <ConfirmDialog open={promoteConfirm.open}
        title="Promote to Admin?"
        message={promoteConfirm.member ? `Promote "${promoteConfirm.member.name}" (${promoteConfirm.member.email}) to admin? They will gain full access to all settings.` : ''}
        confirmLabel="Yes, Promote" cancelLabel="Cancel" variant="primary"
        onConfirm={handlePromoteToAdmin} onCancel={() => setPromoteConfirm({ open: false, member: null })} />

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
  const { fetchWithAuth, user } = useAuth();
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetchWithAuth('/api/admin/coupons');
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          console.warn('Coupons API: Expected JSON, got', ct, '| Status:', res.status);
          setError('Unable to load dashboard data');
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          console.warn('Coupons API: Status', res.status, data);
          setError(data.error || 'Unable to load dashboard data');
          setLoading(false);
          return;
        }
        if (!data || !Array.isArray(data.coupons)) {
          console.warn('Coupons API: Response shape invalid', data);
          setError('Unable to load dashboard data');
          setLoading(false);
          return;
        }
        setCoupons(data.coupons);
      } catch (err) {
        console.warn('Coupons API: Network error', err.message);
        setError('Unable to load dashboard data. Please try again.');
      }
      setLoading(false);
    }
    if (user?.role === 'admin') load();
    else setLoading(false);
  }, [user]);

  async function handleToggleActive(coupon) {
    try {
      const res = await fetchWithAuth(`/api/admin/coupons/${coupon.id}/toggle`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.warn('Coupons toggle API: Status', res.status, data);
        toast.error(data.error || 'Unable to update coupon');
        return;
      }
      toast.success(coupon.is_active ? 'Coupon deactivated' : 'Coupon reactivated');
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
    } catch (err) {
      console.warn('Coupons toggle API: Network error', err.message);
      toast.error('Unable to update coupon. Please try again.');
    }
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

  if (loading) return <Spinner />;
  if (error) return <ErrorBlock message={error} onRetry={() => window.location.reload()} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-text">Coupon Management</h2>
          <p className="text-sm text-text-secondary">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      {coupons.length === 0 ? (
        <EmptyBlock icon={<Icon name="coupon" className="w-6 h-6" />} title="No Coupons" message="Create a coupon to offer discounts and promotions." />
      ) : (
        <div className="space-y-3">
          {coupons.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-border p-4 flex items-center gap-4 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <Icon name="coupon" className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text">{c.code}</span>
                  <span className="text-xs font-medium text-primary">{c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`} off</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.is_active ? 'bg-success-bg text-success border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {c.description && <p className="text-xs text-text-muted mt-0.5">{c.description}</p>}
                <p className="text-xs text-text-muted mt-0.5">
                  {c.usage_count || 0} uses{c.max_uses ? ` / ${c.max_uses} max` : ''} · {c.min_appointment_value ? `Min $${c.min_appointment_value}` : 'No minimum'}
                </p>
              </div>
              <button onClick={() => handleToggleActive(c)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${c.is_active ? 'text-warning hover:bg-warning-bg' : 'text-success hover:bg-success-bg'}`}>
                {c.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Templates Tab ──────────────────────────

function TemplatesTab() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [disabled, setDisabled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editModal, setEditModal] = useState({ open: false, id: '', label: '', roles: '', services: '', isNew: false });
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  useEffect(() => { fetchTemplates(); }, []);

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
                  placeholder={loadingTemplate ? 'Loading template...' : "One role per line, e.g.:&#10;Stylist&#10;Barber&#10;Massage Therapist"}
                  rows={4} className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm transition-all resize-none" />
                <p className="text-xs text-text-muted mt-1">Each line becomes a staff role title</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Services</label>
                <textarea value={editModal.services}
                  onChange={e => setEditModal({ ...editModal, services: e.target.value })}
                  placeholder={loadingTemplate ? 'Loading template...' : "One per line: Name, Duration, Price, Category&#10;e.g.:&#10;Haircut, 30, 35, Hair&#10;Facial, 60, 65, Skincare"}
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


export default function AdminDashboard() {
  const { user, fetchWithAuth } = useAuth();
  const { settings } = useBusiness();
  const { tab } = useParams();

  const primaryColor = settings?.primary_color || '#e11d48';
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: primaryColor, boxShadow: `0 2px 8px ${primaryColor}40` }}>
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: primaryColor + '12', color: primaryColor }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
            Administration
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-text tracking-tight">Business Overview</h1>
        <p className="text-text-secondary mt-2 text-sm">Monitor today's activity and track business performance — from services to revenue</p>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        {(!tab || tab === 'story') && <BusinessOverview />}
        {tab === 'staff' && <StaffTab />}
        {tab === 'services' && <ServicesTab />}
        {tab === 'appointments' && <AppointmentsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'finance' && <FinanceTab />}
        {tab === 'developer' && <DeveloperTab />}
        {tab === 'ical' && <ICalManagerTab />}
        {tab === 'public' && <PublicBookingTab />}
        {tab === 'widget' && <WidgetsTab />}
        {tab === 'coupons' && <CouponsTab />}
        {tab === 'analytics' && <AnalyticsDashboard />}
        {tab === 'templates' && <TemplatesTab />}
      </div>
    </div>
  );
}