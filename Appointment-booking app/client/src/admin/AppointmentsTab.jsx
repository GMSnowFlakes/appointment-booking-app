import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Spinner, ErrorBlock, EmptyBlock, Icon, downloadCsv } from './shared';
import ImportCsvModal from '../components/ImportCsvModal';

export default function AppointmentsTab() {
  const { fetchWithAuth } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState({ page: 1, status: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [importOpen, setImportOpen] = useState(false);

  const exportAppointments = downloadCsv(fetchWithAuth, '/api/export/appointments', `appointments_${new Date().toISOString().slice(0, 10)}.csv`);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        params.set('page', String(query.page));
        params.set('limit', '10');
        if (query.status) params.set('status', query.status);
        const res = await fetchWithAuth(`/api/admin/appointments?${params}`);
        const data = await res.json();
        if (!cancelled) {
          if (res.ok) {
            setAppointments(data.appointments);
            if (data.pagination) setPagination(data.pagination);
            setLoading(false);
            setError('');
          } else {
            setError(data.error || 'Failed to load appointments');
            setLoading(false);
          }
        }
      } catch (err) {
        if (!cancelled) { setError(err.message); setLoading(false); }
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [fetchWithAuth, query]);

  function handleStatusFilterChange(newStatus) {
    setQuery({ page: 1, status: newStatus });
  }

  function handlePageClick(newPage) {
    setQuery(prev => ({ ...prev, page: newPage }));
  }

  async function updateStatus(id, status) {
    try {
      await fetchWithAuth(`/api/admin/appointments/${id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
    } catch { /* silent */ }
  }

  const statusColors = {
    confirmed: 'bg-success-bg text-success border-green-200',
    cancelled: 'bg-error-bg text-error border-red-200',
    completed: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBlock message={error} onRetry={() => setQuery(q => ({ ...q }))} />;

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
          <select value={query.status} onChange={e => handleStatusFilterChange(e.target.value)}
            className="px-3 py-2 bg-surface-warm border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-all">
            <option value="">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
          <button onClick={() => setQuery(q => ({ ...q }))} className="p-2 text-text-secondary hover:text-primary hover:bg-primary-bg rounded-xl transition-colors" title="Refresh">
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
                <button disabled={pagination.page <= 1} onClick={() => handlePageClick(pagination.page - 1)}
                  className="px-3 py-1.5 text-xs font-medium rounded-xl border border-border text-text-secondary hover:bg-surface-alt transition-all disabled:opacity-30">◀ Prev</button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => handlePageClick(p)}
                    className={`w-9 h-9 text-xs font-medium rounded-xl transition-all ${p === query.page ? 'bg-primary text-white shadow-sm' : 'border border-border text-text-secondary hover:bg-surface-alt'}`}>{p}</button>
                ))}
                <button disabled={pagination.page >= pagination.totalPages} onClick={() => handlePageClick(pagination.page + 1)}
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
        onImported={() => setQuery(q => ({ ...q }))}
      />
    </div>
  );
}
