import { useState, useEffect } from 'react';
import { safeFetchJson } from '../hooks/useSafeFetch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBusiness } from '../context/BusinessContext';
import ConfirmDialog from './ConfirmDialog';

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
      <div className="p-6">{children}</div>
    </div>
  );
}

function EmptyBlock({ icon, title, message }) {
  return (
    <div className="p-12 text-center">
      <div className="w-14 h-14 mx-auto mb-4 bg-primary-bg rounded-2xl flex items-center justify-center">{icon}</div>
      <h3 className="text-lg font-semibold text-text mb-1">{title}</h3>
      <p className="text-text-secondary text-sm">{message}</p>
    </div>
  );
}

// ─── API Keys Section ───────────────────────

function ApiKeysSection() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState(null);
  const [revokeConfirm, setRevokeConfirm] = useState({ open: false, key: null });

  useEffect(() => { fetchKeys(); }, []);

  async function fetchKeys() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/api-keys');
      const sf = await safeFetchJson(res, 'ApiKeys');
      if (sf.ok) setKeys(sf.data?.api_keys || []);
      else console.warn(sf.error);
    } catch (err) { console.warn('ApiKeys | Error:', err.message); }
    setLoading(false);
  }

  async function handleCreate(data) {
    try {
      const res = await fetchWithAuth('/api/admin/api-keys', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success('API key created! Copy it now — it won\'t be shown again.');
        setRevealedKey(d.key);
        setCreateOpen(false);
        fetchKeys();
      } else { toast.error(d.error); }
    } catch (err) { toast.error(err.message); }
  }

  async function handleRevoke() {
    const target = revokeConfirm.key;
    if (!target) return;
    try {
      const res = await fetchWithAuth(`/api/admin/api-keys/${target.id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('API key revoked'); setRevokeConfirm({ open: false, key: null }); fetchKeys(); }
    } catch (err) { toast.error(err.message); }
  }

  if (loading) return <Spinner />;

  return (
    <SectionCard title="API Keys" description={`${keys.filter(k => k.is_active).length} active keys`}
      action={
        <button onClick={() => setCreateOpen(true)}
          className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-all shadow-sm flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
          Create Key
        </button>
      }>
      {/* Revealed key banner */}
      {revealedKey && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-800 mb-1">API Key Created — Copy it now!</p>
              <p className="text-amber-700 text-xs mb-2">This is the only time you'll see the full key.</p>
              <div className="bg-surface border border-amber-200 rounded-lg p-3 font-mono text-xs text-text break-all select-all">
                {revealedKey}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(revealedKey); toast.success('Copied!'); }}
                className="mt-2 px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors">
                Copy to Clipboard
              </button>
            </div>
            <button onClick={() => setRevealedKey(null)} className="text-amber-600 hover:text-amber-800 shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
      )}

      {keys.length === 0 ? (
        <EmptyBlock icon={
          <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        } title="No API Keys" message="Create an API key for third-party integrations." />
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className={`flex items-center gap-4 p-3 rounded-xl border ${!k.is_active ? 'opacity-40 border-dashed border-border' : 'border-border/70'}`}>
              <div className="w-9 h-9 rounded-lg bg-primary-bg flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text text-sm">{k.name}</span>
                  <code className="text-xs bg-surface-warm px-1.5 py-0.5 rounded border border-border text-text-muted font-mono">{k.key_prefix}...</code>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${k.is_active ? 'bg-success-bg text-success border-green-200' : 'badge-inactive'}`}>
                    {k.is_active ? 'Active' : 'Revoked'}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Created by {k.user_name || 'Unknown'} · {new Date(k.created_at + 'Z').toLocaleDateString()}
                  {k.last_used_at && ` · Last used: ${new Date(k.last_used_at + 'Z').toLocaleDateString()}`}
                </p>
              </div>
              {k.is_active && (
                <button onClick={() => setRevokeConfirm({ open: true, key: k })}
                  className="px-2.5 py-1.5 text-xs font-medium text-error hover:bg-error-bg rounded-lg transition-colors">
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <ApiKeyFormModal
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
          users={[]}
        />
      )}

      <ConfirmDialog open={revokeConfirm.open} title="Revoke API Key?"
        message={revokeConfirm.key ? `Revoke "${revokeConfirm.key.name}"? Applications using this key will lose access immediately.` : ''}
        confirmLabel="Yes, Revoke" cancelLabel="Cancel" variant="danger"
        onConfirm={handleRevoke} onCancel={() => setRevokeConfirm({ open: false, key: null })} />
    </SectionCard>
  );
}

function ApiKeyFormModal({ onClose, onCreate }) {
  const { fetchWithAuth } = useAuth();
  const [form, setForm] = useState({ user_id: '', name: '', permissions: [] });
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWithAuth('/api/admin/users').then(r => r.json()).then(d => {
      if (d.users) setUsers(d.users);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.user_id) return;
    setSubmitting(true);
    await onCreate({ ...form, user_id: parseInt(form.user_id) });
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-sm animate-scale-in p-6">
        <h3 className="text-lg font-serif font-bold text-text mb-4">Create API Key</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text mb-1">User *</label>
            <select value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })}
              className="w-full px-3 py-2.5 bg-surface-warm border border-border rounded-xl text-sm">
              <option value="">Select a user...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Key Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-surface-warm border border-border rounded-xl text-sm" placeholder="e.g. Production API" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-alt transition-all">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm">
              {submitting ? 'Creating...' : 'Create Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Audit Log Section ──────────────────────

function AuditLogSection() {
  const { fetchWithAuth } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ action: '', user_id: '', search: '' });

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.action) params.set('action', filter.action);
      if (filter.user_id) params.set('user_id', filter.user_id);
      const res = await fetchWithAuth(`/api/admin/audit-log?${params}`);
      const sf = await safeFetchJson(res, 'AuditLog');
      if (sf.ok) setLogs(sf.data?.log || []);
      else console.warn(sf.error);
    } catch (err) { console.warn('AuditLog | Error:', err.message); }
    setLoading(false);
  }

  const actionColors = {
    'appointment.create': 'bg-green-50 text-green-700 border-green-200',
    'appointment.cancel': 'bg-red-50 text-red-700 border-red-200',
    'appointment.update': 'bg-blue-50 text-blue-700 border-blue-200',
    'user.login': 'bg-purple-50 text-purple-700 border-purple-200',
    'user.register': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'service.create': 'bg-amber-50 text-amber-700 border-amber-200',
    'service.update': 'bg-amber-50 text-amber-700 border-amber-200',
    'service.delete': 'bg-orange-50 text-orange-700 border-orange-200',
    'payment.create': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'payment.refund': 'bg-rose-50 text-rose-700 border-rose-200',
    'admin.action': 'bg-surface-alt text-text-secondary border-border',
  };

  if (loading) return <Spinner />;

  return (
    <SectionCard title="Audit Log" description={`${logs.length} recent events`}
      action={
        <button onClick={fetchLogs}
          className="p-2 text-text-secondary hover:text-primary hover:bg-primary-bg rounded-lg transition-colors" title="Refresh">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 8a7 7 0 0113-3M15 1v4h-4M15 8a7 7 0 01-13 3M1 15v-4h4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      }>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select value={filter.action} onChange={e => setFilter({ ...filter, action: e.target.value })}
          className="px-3 py-1.5 bg-surface-warm border border-border rounded-lg text-xs focus:outline-none focus:border-primary">
          <option value="">All Actions</option>
          <option value="appointment.create">Appt Created</option>
          <option value="appointment.cancel">Appt Cancelled</option>
          <option value="appointment.update">Appt Updated</option>
          <option value="user.login">User Login</option>
          <option value="user.register">User Register</option>
          <option value="service.create">Service Created</option>
          <option value="service.update">Service Updated</option>
          <option value="service.delete">Service Deleted</option>
          <option value="payment.create">Payment Created</option>
          <option value="payment.refund">Payment Refunded</option>
          <option value="admin.action">Admin Action</option>
        </select>
        <button onClick={fetchLogs}
          className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-all shadow-sm">
          Apply Filter
        </button>
      </div>

      {logs.length === 0 ? (
        <EmptyBlock icon={
          <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        } title="No Events" message="No audit log entries match your filter." />
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {logs.map(l => (
            <div key={l.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-surface-alt/50 transition-colors">
              <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full border shrink-0 mt-0.5 ${actionColors[l.action] || 'badge-inactive'}`}>
                {l.action?.replace('.', ' ')}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-text">{l.name || l.email || 'System'}</span>
                  <span className="text-text-muted">·</span>
                  <span className="text-text-muted">{l.entity_type} #{l.entity_id}</span>
                  {l.details && typeof l.details === 'object' && (
                    <span className="text-text-muted">· {Object.keys(l.details).slice(0, 2).join(', ')}</span>
                  )}
                </div>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {new Date(l.created_at + 'Z').toLocaleString()}
                  {l.ip_address && ` · ${l.ip_address}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Active Sessions Section ────────────────

function SessionsSection() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokeConfirm, setRevokeConfirm] = useState({ open: false, session: null });

  useEffect(() => { fetchSessions(); }, []);

  async function fetchSessions() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/sessions');
      const sf = await safeFetchJson(res, 'Sessions');
      if (sf.ok) setSessions(sf.data?.sessions || []);
      else console.warn(sf.error);
    } catch (err) { console.warn('Sessions | Error:', err.message); }
    setLoading(false);
  }

  async function handleRevoke() {
    const target = revokeConfirm.session;
    if (!target) return;
    try {
      const res = await fetchWithAuth('/api/admin/sessions/revoke', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: target.id }),
      });
      if (res.ok) { toast.success('Session revoked'); setRevokeConfirm({ open: false, session: null }); fetchSessions(); }
    } catch (err) { toast.error(err.message); }
  }

  if (loading) return <Spinner />;

  return (
    <SectionCard title="Active Sessions" description={`${sessions.length} active session${sessions.length !== 1 ? 's' : ''}`}>
      {sessions.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-6">No active sessions.</p>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-alt/50 transition-colors">
              <div className="w-7 h-7 rounded-full bg-primary-bg flex items-center justify-center text-xs font-bold text-primary">
                {s.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-text">{s.name}</span>
                  <span className="text-xs text-text-muted">{s.email}</span>
                </div>
                <p className="text-[10px] text-text-muted">
                  Last active: {s.last_activity_at ? new Date(s.last_activity_at + 'Z').toLocaleString() : 'Unknown'}
                  {s.ip_address && ` · ${s.ip_address}`}
                </p>
              </div>
              <button onClick={() => setRevokeConfirm({ open: true, session: s })}
                className="px-2 py-1 text-xs font-medium text-error hover:bg-error-bg rounded-lg transition-colors shrink-0">
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={revokeConfirm.open} title="Revoke Session?"
        message={revokeConfirm.session ? `Force logout "${revokeConfirm.session.name}"? They will need to sign in again.` : ''}
        confirmLabel="Yes, Revoke" cancelLabel="Cancel" variant="danger"
        onConfirm={handleRevoke} onCancel={() => setRevokeConfirm({ open: false, session: null })} />
    </SectionCard>
  );
}

// ─── 2FA Section ────────────────────────────

function TwoFactorSection() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [secret, setSecret] = useState(null);

  async function handleGenerate() {
    try {
      const res = await fetchWithAuth('/api/admin/2fa/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d = await res.json();
      if (res.ok) setSecret(d);
      else toast.error(d.error);
    } catch (err) { toast.error(err.message); }
  }

  async function handleDisable() {
    try {
      const res = await fetchWithAuth('/api/admin/2fa/disable', { method: 'POST' });
      if (res.ok) { toast.success('2FA disabled'); setSecret(null); }
    } catch (err) { toast.error(err.message); }
  }

  return (
    <SectionCard title="Two-Factor Authentication" description="Enhance account security with TOTP">
      {secret ? (
        <div className="space-y-3">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-semibold text-amber-800 mb-2">Setup Instructions</p>
            <ol className="text-xs text-amber-700 space-y-1.5 list-decimal ml-4">
              <li>Open your authenticator app (Google Authenticator, Authy, etc.)</li>
              <li>Tap "Add" and scan the QR code</li>
              <li>If you can't scan, enter the secret key manually</li>
            </ol>
          </div>
          <div className="bg-surface-warm rounded-xl border border-border p-4">
            <p className="text-xs font-medium text-text mb-1">Secret Key</p>
            <code className="block text-sm font-mono bg-surface border border-border rounded-lg p-3 break-all select-all">{secret.secret}</code>
          </div>
          <p className="text-xs text-text-muted">
            QR URI: <code className="text-primary">{secret.qr_uri?.slice(0, 60)}...</code>
          </p>
          <button onClick={handleDisable}
            className="px-4 py-2 text-sm font-medium text-error hover:bg-error-bg rounded-xl transition-all border border-red-200">
            Disable 2FA
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-text-secondary mb-4">Add an extra layer of security to your account.</p>
          <button onClick={handleGenerate}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm">
            Set Up 2FA
          </button>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Main Developer Tab ─────────────────────

export default function DeveloperTab() {
  const { settings } = useBusiness();
  const primaryColor = settings?.primary_color || '#e11d48';

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-serif font-bold text-text">Developer</h2>
        <p className="text-sm text-text-secondary">API keys, audit logs, sessions, and security settings</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm" style={{ borderLeftColor: primaryColor, borderLeftWidth: '3px' }}>
          <p className="text-2xl font-bold text-text">API</p>
          <p className="text-xs text-text-muted">Manage access keys</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm" style={{ borderLeftColor: '#8b5cf6', borderLeftWidth: '3px' }}>
          <p className="text-2xl font-bold text-text">Audit</p>
          <p className="text-xs text-text-muted">Event log viewer</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm" style={{ borderLeftColor: '#06b6d4', borderLeftWidth: '3px' }}>
          <p className="text-2xl font-bold text-text">Sessions</p>
          <p className="text-xs text-text-muted">Active user sessions</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm" style={{ borderLeftColor: '#10b981', borderLeftWidth: '3px' }}>
          <p className="text-2xl font-bold text-text">2FA</p>
          <p className="text-xs text-text-muted">Security settings</p>
        </div>
      </div>

      <ApiKeysSection />
      <AuditLogSection />
      <SessionsSection />
      <TwoFactorSection />
    </div>
  );
}
