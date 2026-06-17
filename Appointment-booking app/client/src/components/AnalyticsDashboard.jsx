import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';

// ─── Period Selector ─────────────────────────

const PERIODS = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
  { id: 'all', label: 'All Time' },
];

// ─── SVG Bar Chart ───────────────────────────

function BarChart({ data, xKey, yKey, label, height = 200, color, formatY }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-text-muted text-sm">
        No data yet
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d[yKey]), 1);
  const barWidth = Math.max(8, Math.min(40, (600 / data.length) - 4));
  const chartHeight = height - 30;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${data.length * (barWidth + 4) + 40} ${height}`}
        className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const y = chartHeight - chartHeight * frac + 10;
          return (
            <g key={i}>
              <text x="35" y={y + 4} textAnchor="end" className="fill-text-muted text-[10px]">
                {formatY ? formatY(Math.round(maxVal * frac)) : Math.round(maxVal * frac)}
              </text>
              {frac > 0 && (
                <line x1="40" y1={y} x2={data.length * (barWidth + 4) + 35} y2={y}
                  className="stroke-border/50" strokeWidth="0.5" strokeDasharray="3,3" />
              )}
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const val = d[yKey];
          const barH = (val / maxVal) * chartHeight;
          const x = 45 + i * (barWidth + 4);
          const y = chartHeight - barH + 10;
          const isToday = xKey === 'date' && d[xKey] === new Date().toISOString().slice(0, 10);

          return (
            <g key={i}>
              <rect
                x={x} y={y} width={barWidth} height={Math.max(barH, 2)}
                rx="3" ry="3"
                className={isToday ? 'opacity-100' : 'opacity-80 hover:opacity-100'}
                fill={color || '#e11d48'}
                style={{ transition: 'opacity 0.2s' }}
              />
              {/* Tooltip on hover — use title */}
              <title>{`${d[xKey]}: ${formatY ? formatY(val) : val}`}</title>
            </g>
          );
        })}
      </svg>
      {label && (
        <p className="text-xs text-text-muted text-center mt-1">{label}</p>
      )}
    </div>
  );
}

// ─── Horizontal Bar (for busiest hours) ──────

function HorizontalBars({ data, labelKey, valueKey, max, color }) {
  if (!data || data.length === 0) {
    return <p className="text-text-muted text-sm py-4 text-center">No data yet</p>;
  }

  const maxVal = max || Math.max(...data.map(d => d[valueKey]), 1);

  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const pct = (d[valueKey] / maxVal) * 100;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-14 text-right text-xs font-medium text-text flex-shrink-0">
              {d[labelKey]}
            </span>
            <div className="flex-1 h-8 bg-surface-alt rounded-lg overflow-hidden relative">
              <div
                className="h-full rounded-lg transition-all duration-500 flex items-center px-2"
                style={{
                  width: `${Math.max(pct, 3)}%`,
                  backgroundColor: color || '#e11d48',
                  opacity: 0.85,
                }}
              >
                <span className="text-[11px] font-semibold text-white whitespace-nowrap drop-shadow-sm">
                  {d[valueKey]}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────

// eslint-disable-next-line no-unused-vars
function StatCard({ label, value, sub, icon, trend, color }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-text">{value}</div>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
      {trend !== undefined && trend !== null && (
        <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-success' : 'text-error'}`}>
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
            {trend >= 0 ? (
              <path d="M8 12L3 4h10L8 12z" />
            ) : (
              <path d="M8 4l5 8H3l5-8z" />
            )}
          </svg>
          <span>{Math.abs(trend)}% vs last month</span>
        </div>
      )}
    </div>
  );
}

// ─── Summary Section ──────────────────────────

function SummarySection({ summary, primaryColor }) {
  const stats = [
    { label: 'Total Bookings', value: summary.total_bookings?.toLocaleString() || 0, icon: '📅', trend: summary.booking_growth },
    { label: 'Total Revenue', value: `$${parseFloat(summary.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: '💰', trend: summary.revenue_growth },
    { label: 'Avg Booking', value: `$${parseFloat(summary.avg_booking_value || 0).toFixed(2)}`, icon: '📊' },
    { label: 'Active Customers', value: summary.active_customers || 0, icon: '👤' },
    { label: 'Cancellations', value: summary.cancellations || 0, icon: '❌' },
    { label: 'Avg/Day', value: summary.avg_bookings_per_day || 0, icon: '📈' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((s, i) => (
        <StatCard key={i} {...s} color={primaryColor} />
      ))}
    </div>
  );
}

// ─── Main Analytics Dashboard ─────────────────

export default function AnalyticsDashboard() {
  const { fetchWithAuth } = useAuth();
  const { settings } = useBusiness();
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [summary, setSummary] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [busiestHours, setBusiestHours] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [commissions, setCommissions] = useState([]);

  const primaryColor = settings?.primary_color || '#e11d48';

  useEffect(() => {
    fetchAll();
  }, [period]);

  async function fetchAll() {
    setLoading(true);
    setError('');
    try {
      const [sumRes, revRes, bhRes, tsRes, comRes] = await Promise.all([
        fetchWithAuth(`/api/analytics/summary?period=${period}`),
        fetchWithAuth(`/api/analytics/revenue?period=${period}`),
        fetchWithAuth(`/api/analytics/busiest-hours?period=${period}`),
        fetchWithAuth(`/api/analytics/top-services?period=${period}`),
        fetchWithAuth(`/api/analytics/commissions?period=${period}`),
      ]);

      if (!sumRes.ok) { const d = await sumRes.json(); console.warn('Analytics summary | Status:', sumRes.status, '| Body:', d); throw new Error('Unable to load dashboard data'); }
      if (!revRes.ok) { const d = await revRes.json(); console.warn('Analytics revenue | Status:', revRes.status, '| Body:', d); throw new Error('Unable to load dashboard data'); }
      if (!bhRes.ok) { const d = await bhRes.json(); console.warn('Analytics busiest-hours | Status:', bhRes.status, '| Body:', d); throw new Error('Unable to load dashboard data'); }
      if (!tsRes.ok) { const d = await tsRes.json(); console.warn('Analytics top-services | Status:', tsRes.status, '| Body:', d); throw new Error('Unable to load dashboard data'); }
      if (!comRes.ok) { const d = await comRes.json(); console.warn('Analytics commissions | Status:', comRes.status, '| Body:', d); throw new Error('Unable to load dashboard data'); }

      const [sumData, revData, bhData, tsData, comData] = await Promise.all([
        sumRes.json(), revRes.json(), bhRes.json(), tsRes.json(), comRes.json(),
      ]);

      setSummary(sumData.summary);
      setRevenueData(revData.daily || []);
      setBusiestHours(bhData.hourly || []);
      setTopServices(tsData.services || []);
      setCommissions(comData.commissions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // — Loading state —
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Period selector skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-surface-alt rounded-lg animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-8 w-16 bg-surface-alt rounded-lg animate-pulse" />)}
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-surface rounded-xl border border-border p-5 animate-pulse">
              <div className="h-4 w-16 bg-surface-alt rounded mb-3" />
              <div className="h-8 w-24 bg-surface-alt rounded" />
            </div>
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="h-5 w-40 bg-surface-alt rounded mb-4" />
          <div className="h-[200px] bg-surface-alt/50 rounded-xl" />
        </div>
      </div>
    );
  }

  // — Error state —
  if (error) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center animate-fade-in">
        <div className="w-12 h-12 mx-auto mb-3 bg-error-bg rounded-xl flex items-center justify-center text-xl">😕</div>
        <p className="text-text-secondary text-sm mb-4">{error}</p>
        <button onClick={fetchAll}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all shadow-sm"
          style={{ backgroundColor: primaryColor }}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + Period */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-text">Analytics & Reports</h2>
          <p className="text-sm text-text-secondary">
            {summary?.total_bookings || 0} total bookings · ${parseFloat(summary?.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} revenue
          </p>
        </div>
        <div className="flex items-center gap-1 bg-surface-warm rounded-xl border border-border p-1">
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p.id
                  ? 'text-white shadow-sm'
                  : 'text-text-secondary hover:text-text hover:bg-surface/50'
              }`}
              style={period === p.id ? { backgroundColor: primaryColor } : {}}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      {summary && <SummarySection summary={summary} primaryColor={primaryColor} />}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart — wider */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text">Daily Revenue</h3>
            <span className="text-lg font-bold text-primary" style={{ color: primaryColor }}>
              ${parseFloat(revenueData.reduce((s, d) => s + d.revenue, 0) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <BarChart
            data={revenueData}
            xKey="date"
            yKey="revenue"
            color={primaryColor}
            formatY={v => `$${v}`}
          />
          {revenueData.length > 0 && (
            <div className="flex items-center justify-between mt-3 text-xs text-text-muted">
              <span>{revenueData[0]?.date}</span>
              <span>{revenueData.length} days</span>
              <span>{revenueData[revenueData.length - 1]?.date}</span>
            </div>
          )}
        </div>

        {/* Busiest Hours */}
        <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text">Busiest Hours</h3>
            {busiestHours.length > 0 && (
              <span className="text-xs text-text-muted">
                Peak: <strong className="text-text">{busiestHours.reduce((max, h) => h.bookings > max.bookings ? h : max).hour}</strong>
              </span>
            )}
          </div>
          <HorizontalBars
            data={busiestHours.slice(0, 8)}
            labelKey="hour"
            valueKey="bookings"
            color={primaryColor}
          />
          {busiestHours.length === 0 && (
            <p className="text-text-muted text-sm py-4 text-center">No booking data yet</p>
          )}
        </div>
      </div>

      {/* Two-column: Top Services + Commissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
          <h3 className="font-semibold text-text mb-4">Top Services</h3>
          {topServices.length === 0 ? (
            <p className="text-text-muted text-sm py-4 text-center">No service data yet</p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-6 font-semibold text-text-muted text-[11px] uppercase tracking-wider">#</th>
                    <th className="text-left py-2 px-2 font-semibold text-text-muted text-[11px] uppercase tracking-wider">Service</th>
                    <th className="text-center py-2 px-2 font-semibold text-text-muted text-[11px] uppercase tracking-wider">Bookings</th>
                    <th className="text-right py-2 px-4 font-semibold text-text-muted text-[11px] uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topServices.map((s, i) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-surface-alt/30 transition-colors">
                      <td className="py-3 px-6">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-amber-50 text-amber-700' :
                          i === 1 ? 'bg-surface-alt text-text-secondary' :
                          i === 2 ? 'bg-orange-50 text-orange-700' :
                          'bg-surface-alt text-text-muted'
                        }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="font-medium text-text">{s.name}</span>
                        {s.category && <span className="text-xs text-text-muted ml-2">({s.category})</span>}
                      </td>
                      <td className="py-3 px-2 text-center font-medium text-text">{s.bookings}</td>
                      <td className="py-3 px-4 text-right font-medium text-text">
                        ${parseFloat(s.revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Staff Commissions */}
        <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
          <h3 className="font-semibold text-text mb-4">Staff Commissions</h3>
          {commissions.length === 0 ? (
            <p className="text-text-muted text-sm py-4 text-center">No commission data yet</p>
          ) : (
            <div className="space-y-3">
              {commissions.map(c => (
                <div key={c.staff_id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-warm/50 border border-border/70 hover:border-border transition-all">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: primaryColor }}>
                    {c.staff_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text text-sm">{c.staff_name}</p>
                    <p className="text-xs text-text-muted">{c.total_appointments} appointments</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-text">${c.total_commission?.toFixed(2)}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-success font-medium">{c.paid.count} paid</span>
                      {c.pending.count > 0 && (
                        <>
                          <span className="text-text-muted text-[10px]">·</span>
                          <span className="text-[10px] text-warning font-medium">{c.pending.count} pending</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Empty state hint */}
          {commissions.length === 0 && summary?.total_bookings > 0 && (
            <p className="text-xs text-text-muted text-center mt-2">
              Commission records appear once staff members have completed appointments with commission rules configured.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
