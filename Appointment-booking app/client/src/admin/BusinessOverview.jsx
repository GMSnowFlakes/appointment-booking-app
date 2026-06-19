import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { Spinner, Icon } from './shared';

export default function BusinessOverview() {
  const { fetchWithAuth } = useAuth();
  const { settings } = useBusiness();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [todayApts, setTodayApts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const primaryColor = settings?.primary_color || '#e11d48';

  const loadDashboard = useCallback(() => {
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
  }, [fetchWithAuth]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

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
      {/* KPI Row */}
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

      {/* Main Grid */}
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
            <div className="text-center py-8 text-text-muted text-sm"><p>No appointments scheduled for today.</p></div>
          ) : (
            <div className="space-y-2">
              {todayApts.map(apt => {
                const aptDate = new Date(`${apt.date}T${apt.time}`);
                return (
                  <div key={apt.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/70 hover:border-border hover:bg-surface-alt/30 transition-all">
                    <div className="w-12 text-center flex-shrink-0">
                      <p className="text-xs font-bold text-text">{aptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: primaryColor }}>
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
            <div><h3 className="font-semibold text-text">Revenue Insights</h3><p className="text-xs text-text-muted">Monthly performance</p></div>
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

      {/* Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
              <Icon name="clock" className="w-4 h-4" />
            </div>
            <div><h3 className="font-semibold text-text">Recent Activity</h3><p className="text-xs text-text-muted">Latest updates across your business</p></div>
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
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.type === 'booking' ? 'bg-blue-500' : item.type === 'customers' ? 'bg-purple-500' : item.type === 'revenue' ? 'bg-green-500' : item.type === 'growth' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <p className="flex-1 text-sm text-text truncate">{item.text}</p>
                <span className="text-[10px] text-text-muted flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" strokeLinecap="round" /></svg>
            </div>
            <div><h3 className="font-semibold text-text">Quick Actions</h3><p className="text-xs text-text-muted">Common tasks</p></div>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Add Service', desc: 'Create a new service offering', icon: 'services', path: '/admin/services', color: 'blue' },
              { label: 'Add Customer', desc: 'Register a new customer', icon: 'users', path: '/admin/users', color: 'purple' },
              { label: 'Create Coupon', desc: 'Launch a promotion or discount', icon: 'coupon', path: '/admin/coupons', color: 'amber' },
              { label: 'Invite Staff', desc: 'Add a team member', icon: 'people', path: '/admin/staff', color: 'emerald' },
              { label: 'Add Appointment', desc: 'Schedule a new booking', icon: 'calendar', path: '/admin/appointments', color: 'rose' },
            ].map(action => (
              <button key={action.label} onClick={() => navigate(action.path)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary-bg/20 transition-all text-left">
                <div className={`w-8 h-8 rounded-lg bg-${action.color}-50 text-${action.color}-600 border border-${action.color}-200 flex items-center justify-center flex-shrink-0`}>
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
