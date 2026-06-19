import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { Spinner, Icon } from './shared';

// ─── Helpers ───────────────────────────────────

function formatCurrency(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatNumber(n) {
  return Number(n).toLocaleString();
}

function timeBasedGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function BusinessOverview() {
  const { user, fetchWithAuth } = useAuth();
  const { settings } = useBusiness();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [todayApts, setTodayApts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const primaryColor = settings?.primary_color || '#e11d48';

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchWithAuth('/api/analytics/summary?period=all'),
      fetchWithAuth('/api/admin/appointments?limit=5&sort=date:asc'),
    ]).then(async ([anlRes, todayRes]) => {
      if (cancelled) return;
      let anl, today;
      try { anl = anlRes.ok ? await anlRes.json() : { summary: {} }; } catch { anl = { summary: {} }; }
      try { today = todayRes.ok ? await todayRes.json() : { appointments: [] }; } catch { today = { appointments: [] }; }
      if (cancelled) return;
      const s = anl.summary || {};
      setData({
        todayBookings: s.today_bookings || 0,
        revenueThisMonth: parseFloat(s.this_month?.revenue) || 0,
        activeCustomers: s.active_customers || 0,
        totalRevenue: parseFloat(s.total_revenue) || 0,
        totalBookings: s.total_bookings || 0,
        avgValue: parseFloat(s.avg_booking_value) || 0,
        cancellations: s.cancellations || 0,
        avgPerDay: s.avg_bookings_per_day || null,
        thisMonth: s.this_month,
        lastMonth: s.last_month,
        revenueGrowth: s.revenue_growth !== null ? parseFloat(s.revenue_growth) : null,
        bookingGrowth: s.booking_growth !== null ? parseFloat(s.booking_growth) : null,
      });
      setTodayApts(today.appointments || []);
      setLoading(false);
      setLoadError(false);
    }).catch(() => {
      if (!cancelled) { setLoadError(true); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [fetchWithAuth, retryCount]);

  // ── Computed trends ──────────────────────────

  // Avg booking value growth (MoM)
  let avgValueGrowth = null;
  if (data?.thisMonth?.bookings > 0 && data?.lastMonth?.bookings > 0) {
    const thisAvg = data.thisMonth.revenue / data.thisMonth.bookings;
    const lastAvg = data.lastMonth.revenue / data.lastMonth.bookings;
    if (lastAvg > 0) avgValueGrowth = ((thisAvg - lastAvg) / lastAvg) * 100;
  }

  // Avg per day growth (MoM)
  let perDayGrowth = null;
  if ((data?.thisMonth?.bookings || 0) > 0 && (data?.lastMonth?.bookings || 0) > 0) {
    const thisPd = data.thisMonth.bookings / 30;
    const lastPd = data.lastMonth.bookings / 30;
    if (lastPd > 0) perDayGrowth = ((thisPd - lastPd) / lastPd) * 100;
  }

  // Cancellation rate
  const totalScheduled = (data?.totalBookings || 0) + (data?.cancellations || 0);
  const cancelRate = totalScheduled > 0 ? ((data?.cancellations || 0) / totalScheduled) * 100 : 0;

  const firstName = user?.name?.split(' ')[0] || 'there';

  // ── Loading / Error states ───────────────────

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
        <button onClick={() => setRetryCount(c => c + 1)} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm">Retry</button>
      </div>
    );
  }

  // ── Metric card definitions ──────────────────

  const metricCards = [
    {
      label: "Today's Appointments",
      value: formatNumber(data?.todayBookings || 0),
      icon: 'calendar',
      color: '#2563eb',
      bgClass: 'bg-blue-50 border-blue-200',
      iconClass: 'text-blue-600',
      trend: data?.bookingGrowth,
      trendLabel: 'demand trend',
    },
    {
      label: 'Revenue This Month',
      value: formatCurrency(data?.revenueThisMonth || 0),
      icon: 'dollar',
      color: '#059669',
      bgClass: 'bg-emerald-50 border-emerald-200',
      iconClass: 'text-emerald-600',
      trend: data?.revenueGrowth,
      trendLabel: 'vs last month',
    },
    {
      label: 'Active Customers',
      value: formatNumber(data?.activeCustomers || 0),
      icon: 'users',
      color: '#7c3aed',
      bgClass: 'bg-purple-50 border-purple-200',
      iconClass: 'text-purple-600',
      trend: data?.bookingGrowth,
      trendLabel: 'demand proxy',
    },
    {
      label: 'Avg Booking Value',
      value: formatCurrency(data?.avgValue || 0),
      icon: 'trending',
      color: '#0891b2',
      bgClass: 'bg-cyan-50 border-cyan-200',
      iconClass: 'text-cyan-600',
      trend: avgValueGrowth,
      trendLabel: 'vs last month',
    },
    {
      label: 'Avg Per Day',
      value: data?.avgPerDay ?? '—',
      icon: 'clock',
      color: '#d97706',
      bgClass: 'bg-amber-50 border-amber-200',
      iconClass: 'text-amber-600',
      trend: perDayGrowth,
      trendLabel: 'vs last month',
    },
    {
      label: 'Cancel Rate',
      value: `${cancelRate.toFixed(1)}%`,
      icon: 'eyeball',
      color: '#dc2626',
      bgClass: 'bg-red-50 border-red-200',
      iconClass: 'text-red-600',
      trend: null,
      trendLabel: 'of bookings',
      subtitle: `${data?.cancellations || 0} total cancellations`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Personalized Greeting ──────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white to-surface-alt/60 rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.04] pointer-events-none"
          style={{ background: `radial-gradient(circle at 70% 30%, ${primaryColor}, transparent 70%)` }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm"
                style={{ backgroundColor: primaryColor + '15' }}>
                <span role="img" aria-label="wave">👋</span>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-text">
                  {timeBasedGreeting()}, {firstName}
                </h2>
                <p className="text-sm text-text-secondary">
                  Here's what's happening with your business today.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-alt/80 border border-border/50">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
              <span className="text-text-secondary font-medium">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6 Metric Cards ─────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map(card => {
          const trendVal = card.trend;
          const hasTrend = trendVal !== null && trendVal !== undefined && !isNaN(trendVal);
          const isUp = card.inverse ? trendVal < 0 : trendVal > 0;
          const isDown = card.inverse ? trendVal > 0 : trendVal < 0;

          return (
            <div key={card.label}
              className="relative group bg-white rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-200">
              {/* Top accent bar */}
              <div className="absolute top-0 left-4 right-4 h-0.5 rounded-full opacity-60"
                style={{ backgroundColor: card.color }} />

              <div className="flex items-start justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  {card.label}
                </span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${card.bgClass}`}>
                  <Icon name={card.icon} className={`w-[18px] h-[18px] ${card.iconClass}`} />
                </div>
              </div>

              <p className="text-2xl font-bold text-text tracking-tight mb-1.5">
                {card.value}
              </p>

              <div className="flex items-center gap-2 min-h-[22px]">
                {hasTrend ? (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    isUp
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : isDown
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-gray-50 text-gray-500 border border-gray-200'
                  }`}>
                    <Icon
                      name={isUp ? 'arrowUp' : isDown ? 'arrowDown' : 'arrowUp'}
                      className={`w-3 h-3 ${isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-gray-400'}`}
                    />
                    <span>
                      {isUp ? '+' : ''}{isDown ? '' : ''}{Math.abs(trendVal).toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-text-muted italic">No trend data</span>
                )}
                <span className="text-[10px] text-text-muted">{card.trendLabel}</span>
              </div>

              {card.subtitle && (
                <p className="text-[11px] text-text-muted mt-1">{card.subtitle}</p>
              )}

              {/* Hover shine effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          );
        })}
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
              <button onClick={() => navigate('/admin/appointments')}
                className="mt-2 text-xs font-medium text-primary hover:text-primary-dark transition-colors">
                Create one now →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayApts.map(apt => {
                const aptDate = new Date(`${apt.date}T${apt.time}`);
                return (
                  <div key={apt.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/70 hover:border-border hover:bg-surface-alt/30 transition-all">
                    <div className="w-14 text-center flex-shrink-0">
                      <p className="text-xs font-bold text-text">
                        {aptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </p>
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

          <div className="space-y-3">
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

          {data?.revenueGrowth !== null && (
            <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border">
              <Icon name={data.revenueGrowth >= 0 ? 'arrowUp' : 'arrowDown'} className={`w-4 h-4 ${data.revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-xs font-medium ${data.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(parseFloat(data.revenueGrowth)).toFixed(1)}% {data.revenueGrowth >= 0 ? 'growth' : 'decline'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Activity + Quick Actions ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              { type: 'cancellations', text: `${data?.cancellations || 0} cancellations recorded (${cancelRate.toFixed(1)}% rate)`, time: 'Lifetime' },
              data?.revenueGrowth !== null ? { type: 'growth', text: `Revenue ${data.revenueGrowth >= 0 ? 'grew' : 'declined'} by ${Math.abs(parseFloat(data.revenueGrowth)).toFixed(1)}%`, time: 'MoM' } : null,
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
            {[
              { label: 'Add Service', desc: 'Create a new service offering', icon: 'services', path: '/admin/services' },
              { label: 'Add Customer', desc: 'Register a new customer', icon: 'users', path: '/admin/users' },
              { label: 'Create Coupon', desc: 'Launch a promotion or discount', icon: 'coupon', path: '/admin/coupons' },
              { label: 'Invite Staff', desc: 'Add a team member', icon: 'people', path: '/admin/staff' },
              { label: 'Add Appointment', desc: 'Schedule a new booking', icon: 'calendar', path: '/admin/appointments' },
            ].map(action => (
              <button key={action.label} onClick={() => navigate(action.path)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary-bg/20 transition-all text-left group">
                <div className="w-8 h-8 rounded-lg bg-primary-bg/20 text-primary border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-bg/30 transition-colors">
                  <Icon name={action.icon} className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{action.label}</p>
                  <p className="text-xs text-text-muted">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
