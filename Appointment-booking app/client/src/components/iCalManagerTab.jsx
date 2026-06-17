import { useState, useEffect } from 'react';
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
      {copied ? '✅ Copied!' : (label || 'Copy Link')}
    </button>
  );
}

export default function ICalManagerTab() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const { settings } = useBusiness();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeToken, setActiveToken] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchTokens(); }, []);

  async function fetchTokens() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/ical/tokens');
      const d = await res.json();
      if (res.ok) {
        setTokens(d.tokens || []);
        const active = (d.tokens || []).find(t => t.is_active);
        setActiveToken(active || null);
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetchWithAuth('/api/ical/tokens', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success('Calendar subscription created');
        setActiveToken(d.token);
        setTokens(prev => [d.token, ...prev]);
      } else { toast.error(d.error); }
    } catch (err) { toast.error(err.message); }
    setCreating(false);
  }

  async function handleRevoke(token) {
    try {
      const res = await fetchWithAuth(`/api/ical/tokens/${token.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Token revoked');
        if (activeToken?.id === token.id) setActiveToken(null);
        fetchTokens();
      }
    } catch (err) { toast.error(err.message); }
  }

  const feedUrl = activeToken?.ical_url || '';

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-serif font-bold text-text">Calendar Sync</h2>
        <p className="text-sm text-text-secondary">Subscribe to your appointments in Google Calendar, Apple Calendar, or Outlook</p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mb-3">
            <span className="text-lg font-bold">1</span>
          </div>
          <h4 className="font-semibold text-text text-sm mb-1">Generate Feed</h4>
          <p className="text-xs text-text-muted">Create a unique private iCal link. Old links are automatically deactivated.</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center mb-3">
            <span className="text-lg font-bold">2</span>
          </div>
          <h4 className="font-semibold text-text text-sm mb-1">Copy the Link</h4>
          <p className="text-xs text-text-muted">Copy your private feed URL to use in your calendar app.</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 border border-green-200 flex items-center justify-center mb-3">
            <span className="text-lg font-bold">3</span>
          </div>
          <h4 className="font-semibold text-text text-sm mb-1">Auto-Sync</h4>
          <p className="text-xs text-text-muted">Appointments automatically appear and update in your external calendar.</p>
        </div>
      </div>

      {/* Active Feed */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-surface-warm/50 flex items-center justify-between">
          <div>
            <h3 className="text-base font-serif font-bold text-text">Your Calendar Feed</h3>
            <p className="text-xs text-text-muted mt-0.5">Use this URL to subscribe in any calendar app</p>
          </div>
          <button onClick={handleCreate} disabled={creating}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm flex items-center gap-1.5">
            {creating ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
            ) : (
              <><svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
              Generate New Feed</>
            )}
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <Spinner />
          ) : activeToken ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                <p className="text-amber-800 font-medium mb-1">⚠️ Keep this URL private</p>
                <p className="text-amber-700 text-xs">Anyone with this link can view your appointment schedule. Treat it like a password.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">iCal Feed URL</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 block bg-surface-warm border border-border rounded-xl px-4 py-2.5 text-sm font-mono text-text break-all select-all">
                    {feedUrl}
                  </code>
                  <CopyButton text={feedUrl} />
                </div>
              </div>

              {/* Subscribe buttons */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">Subscribe in one click</label>
                <div className="flex flex-wrap gap-2">
                  <a href={`webcal://${feedUrl.replace(/^https?:\/\//, '')}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border bg-surface-warm hover:bg-surface-alt hover:border-border-strong transition-all">
                    <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Apple Calendar
                  </a>
                  <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border bg-surface-warm hover:bg-surface-alt hover:border-border-strong transition-all">
                    <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Google Calendar
                  </a>
                  <a href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}&name=${encodeURIComponent(settings?.business_name || 'Appointments')}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border bg-surface-warm hover:bg-surface-alt hover:border-border-strong transition-all">
                    <svg className="w-4 h-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Outlook
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto mb-4 bg-primary-bg rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-text mb-1">No Calendar Feed</h3>
              <p className="text-sm text-text-secondary mb-4">Generate a private iCal link to sync your appointments with any calendar app.</p>
              <button onClick={handleCreate}
                className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm">
                Generate Feed
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Token history */}
      {tokens.length > 0 && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-surface-warm/50">
            <h3 className="text-base font-serif font-bold text-text">Feed History</h3>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {tokens.map(t => (
                <div key={t.id} className="flex items-center gap-4 p-3 rounded-xl border border-border/70">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.is_active ? 'bg-green-50 text-green-600' : 'bg-surface-alt text-text-muted'}`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${t.is_active ? 'bg-success-bg text-success border-green-200' : 'badge-inactive'}`}>
                        {t.is_active ? 'Active' : 'Revoked'}
                      </span>
                      <span className="text-xs text-text-muted">
                        Created {new Date(t.created_at + 'Z').toLocaleDateString()}
                      </span>
                      {t.calendar_type && <span className="text-xs text-text-muted">· {t.calendar_type}</span>}
                    </div>
                  </div>
                  {t.is_active && (
                    <button onClick={() => handleRevoke(t)}
                      className="px-2.5 py-1.5 text-xs font-medium text-error hover:bg-error-bg rounded-lg transition-colors">
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
