import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from './ConfirmDialog';

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

export default function PublicBookingTab() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, page: null });

  // Use relative URL for shareable links — in production client & server are on the same domain.
  // In development (port 5173 client vs 3001 server), replace with your server URL.
  const isDev = window.location.port === '5173';
  const baseUrl = isDev ? window.location.origin.replace(':5173', ':3001') : window.location.origin;

  useEffect(() => { fetchPages(); }, []);

  async function fetchPages() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/public-pages');
      const d = await res.json();
      if (res.ok) setPages(d.pages || []);
    } catch { /* silent */ }
    setLoading(false);
  }

  async function handleSave(data) {
    try {
      const url = editing ? `/api/admin/public-pages/${editing.id}` : '/api/admin/public-pages';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      const d = await res.json();
      if (res.ok) { toast.success(editing ? 'Page updated' : 'Page created'); setFormOpen(false); setEditing(null); fetchPages(); }
      else { toast.error(d.error); }
    } catch (err) { toast.error(err.message); }
  }

  async function handleDelete() {
    const target = deleteConfirm.page;
    if (!target) return;
    try {
      const res = await fetchWithAuth(`/api/admin/public-pages/${target.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });
      if (res.ok) { toast.success('Page deactivated'); setDeleteConfirm({ open: false, page: null }); fetchPages(); }
    } catch (err) { toast.error(err.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-serif font-bold text-text">Public Booking Pages</h2>
          <p className="text-sm text-text-secondary">Create shareable booking pages anyone can use without signing up — no-auth, shareable links, embeddable widgets</p>
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1.5">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
          Create Page
        </button>
      </div>

      {loading ? <Spinner /> : pages.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-primary-bg rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text mb-1">No Booking Pages Yet</h3>
          <p className="text-sm text-text-secondary mb-4">Create a public booking page to let anyone book appointments without signing up.</p>
          <button onClick={() => { setEditing(null); setFormOpen(true); }}
            className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm">
            Create Your First Page
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {pages.map(p => {
            const pageUrl = `${baseUrl}/book/${p.slug}`;
            const embedJsUrl = `${baseUrl}/api/book/${p.slug}/embed.js`;
            const isActive = p.is_active !== false;

            return (
              <div key={p.id} className={`bg-surface rounded-xl border ${isActive ? 'border-border' : 'border-dashed border-border/50'} overflow-hidden shadow-sm hover:shadow-md transition-all`}>
                <div className="px-6 py-4 border-b border-border bg-surface-warm/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isActive ? 'bg-primary-bg' : 'bg-surface-alt'}`}>
                      <svg className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-text-muted'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-text">{p.title || 'Booking Page'}</h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isActive ? 'bg-success-bg text-success border-green-200' : 'badge-inactive'}`}>
                        {isActive ? 'Published' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => { setEditing(p); setFormOpen(true); }}
                    className="px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-bg rounded-lg transition-colors">
                    Edit
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Shareable Link */}
                  {isActive && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-text mb-1.5 uppercase tracking-wider">📋 Shareable Link</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-surface-warm border border-border rounded-xl px-4 py-2.5 text-sm text-text font-mono truncate">
                            {pageUrl}
                          </div>
                          <CopyButton text={pageUrl} label="Copy Link" />
                          <a href={pageUrl} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-2 text-xs font-medium text-text-secondary hover:text-text border border-border rounded-xl hover:bg-surface-alt transition-all inline-flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                            Open
                          </a>
                        </div>
                      </div>

                      {/* Embed Code */}
                      <div>
                        <label className="block text-xs font-semibold text-text mb-1.5 uppercase tracking-wider">🔌 Embed Code</label>
                        <div className="bg-surface-warm border border-border rounded-xl p-4">
                          <code className="block text-xs font-mono text-text break-all select-all leading-relaxed whitespace-pre-wrap">
{`<script src="${embedJsUrl}" data-widget="${p.slug}"></script>`}
                          </code>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <CopyButton text={`<script src="${embedJsUrl}" data-widget="${p.slug}"></script>`} label="Copy Embed Code" />
                          <a href={`${baseUrl}/api/book/${p.slug}/embed.js`} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary hover:text-primary-dark font-medium">
                            View embed script →
                          </a>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted pt-2 border-t border-border/50">
                    <span>Slug: <code className="font-mono text-text">/{p.slug}</code></span>
                    {p.seo_description && <span>Description: {p.seo_description}</span>}
                    {p.redirect_url && <span>Redirects to: {p.redirect_url}</span>}
                    <span>Created: {new Date(p.created_at + 'Z').toLocaleDateString()}</span>
                  </div>

                  {/* Actions */}
                  {isActive && (
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={() => setDeleteConfirm({ open: true, page: p })}
                        className="text-xs font-medium text-error hover:bg-error-bg px-2.5 py-1.5 rounded-lg transition-colors">
                        Deactivate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <PublicPageFormModal
          page={editing}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog open={deleteConfirm.open} title="Deactivate Booking Page?"
        message={deleteConfirm.page ? `Deactivate "${deleteConfirm.page.title}"? The page and any embed widgets will stop working.` : ''}
        confirmLabel="Yes, Deactivate" cancelLabel="Cancel" variant="danger"
        onConfirm={handleDelete} onCancel={() => setDeleteConfirm({ open: false, page: null })} />
    </div>
  );
}

function PublicPageFormModal({ page, onClose, onSave }) {
  const [form, setForm] = useState({
    slug: page?.slug || '',
    title: page?.title || 'Book an Appointment',
    seo_description: page?.seo_description || '',
    redirect_url: page?.redirect_url || '',
    require_auth: page?.require_auth || false,
    require_phone: page?.require_phone || false,
    custom_css: page?.custom_css || '',
  });
  const [submitting, setSubmitting] = useState(false);

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.slug.trim() || !form.title.trim()) return;
    setSubmitting(true);
    await onSave({
      ...form,
      slug: slugify(form.slug),
      require_auth: form.require_auth ? 1 : 0,
      require_phone: form.require_phone ? 1 : 0,
    });
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-lg animate-scale-in overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-surface-warm">
          <h3 className="text-lg font-serif font-bold text-text">{page ? 'Edit Booking Page' : 'Create Booking Page'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" placeholder="Book an Appointment" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">URL Slug *</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-text-muted font-mono">{window.location.origin}/book/</span>
              <input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: slugify(e.target.value) })}
                className="flex-1 px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm font-mono" placeholder="my-business" />
            </div>
            <p className="text-xs text-text-muted mt-1">Auto-generated from your input, must be unique</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">SEO Description</label>
            <textarea value={form.seo_description} onChange={e => setForm({ ...form, seo_description: e.target.value })}
              rows={2} className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm resize-none"
              placeholder="Brief description for search engines (optional)" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Redirect URL (after booking)</label>
            <input type="url" value={form.redirect_url} onChange={e => setForm({ ...form, redirect_url: e.target.value })}
              className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm"
              placeholder="https://yoursite.com/thank-you (optional)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border cursor-pointer hover:bg-surface-alt transition-all">
              <input type="checkbox" checked={form.require_auth} onChange={e => setForm({ ...form, require_auth: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <div>
                <span className="text-sm font-medium text-text">Require Auth</span>
                <p className="text-xs text-text-muted">Customers must sign in</p>
              </div>
            </label>
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border cursor-pointer hover:bg-surface-alt transition-all">
              <input type="checkbox" checked={form.require_phone} onChange={e => setForm({ ...form, require_phone: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <div>
                <span className="text-sm font-medium text-text">Require Phone</span>
                <p className="text-xs text-text-muted">Phone number required</p>
              </div>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Custom CSS (optional)</label>
            <textarea value={form.custom_css} onChange={e => setForm({ ...form, custom_css: e.target.value })}
              rows={3} className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm font-mono resize-none"
              placeholder=".service-btn { border-radius: 8px; }" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-alt transition-all">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm">
              {submitting ? 'Saving...' : (page ? 'Update Page' : 'Create Page')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
