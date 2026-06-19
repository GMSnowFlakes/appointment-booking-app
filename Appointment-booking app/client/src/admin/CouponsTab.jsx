import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner, ErrorBlock, EmptyBlock, Icon } from './shared';

export default function CouponsTab() {
  const { fetchWithAuth, user } = useAuth();
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* eslint-disable react-hooks/set-state-in-effect */
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
  }, [user, fetchWithAuth]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
