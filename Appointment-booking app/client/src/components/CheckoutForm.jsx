import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';

export default function CheckoutForm({ appointment, onSuccess, onCancel }) {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [paymentMethod, setPaymentMethod] = useState('paypal');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState('review'); // review, processing, success
  const [paypalReady, setPaypalReady] = useState(false);
  const paypalBtnRef = useRef(null);
  const paypalRenderedRef = useRef(false);
  const couponRef = useRef(null);

  // Keep couponRef in sync with coupon state
  useEffect(() => { couponRef.current = coupon; }, [coupon]);

  const servicePrice = appointment?.price || 0;
  const depositRequired = appointment?.deposit_required || 0;
  const amountDue = depositRequired > 0 ? depositRequired : servicePrice;
  const discountCents = coupon?.discount_cents || 0;
  const finalAmount = Math.max(0, amountDue * 100 - discountCents);

  // ─── Load PayPal SDK when PayPal method is selected ─────
  useEffect(() => {
    if (paymentMethod !== 'paypal' || !PAYPAL_CLIENT_ID) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    if (window.paypal) { setPaypalReady(true); return; }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = () => setPaypalReady(true);
    script.onerror = () => toast.error('Failed to load PayPal SDK');
    document.body.appendChild(script);

    return () => { /* keep script loaded once loaded */ };
  }, [paymentMethod]);

  // ─── Render PayPal buttons ─────────────────────────────
  useEffect(() => {
    if (!paypalReady || !paypalBtnRef.current || paypalRenderedRef.current) return;
    if (!window.paypal) return;

    paypalRenderedRef.current = true;

    window.paypal.Buttons({
      createOrder: async () => {
        const res = await fetchWithAuth('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointment_id: appointment.id, payment_method: 'paypal' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create order');
        return data.paypalOrderId;
      },
      onApprove: async (data) => {
        const currentCoupon = couponRef.current;
        setPaymentStep('processing');
        try {
          // Apply coupon first if entered (reads ref for latest value)
          if (currentCoupon && !currentCoupon.applied) {
            await fetchWithAuth('/api/coupons/apply', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: currentCoupon.coupon.code, appointment_id: appointment.id }),
            });
          }

          // Confirm & capture server-side
          const confirmRes = await fetchWithAuth('/api/payments/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appointment_id: appointment.id,
              payment_method: 'paypal',
              payment_id: data.orderID,
              status: 'succeeded',
            }),
          });
          const confirmData = await confirmRes.json();
          if (!confirmRes.ok) throw new Error(confirmData.error || 'Payment confirmation failed');

          toast.success('Payment successful!');
          setPaymentStep('success');
          onSuccess?.();
        } catch (err) {
          toast.error(err.message);
          setPaymentStep('review');
        }
      },
      onError: (err) => {
        toast.error(err.message || 'PayPal payment failed');
        setPaymentStep('review');
      },
    }).render(paypalBtnRef.current);

    // Reset render flag on unmount so buttons re-render if component remounts
    return () => { paypalRenderedRef.current = false; };
  }, [paypalReady]);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await fetchWithAuth('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, appointment_id: appointment.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setCoupon(data);
        toast.success(`Coupon applied! ${data.coupon.discount_display}`);
      } else {
        toast.error(data.error || 'Invalid coupon');
        setCoupon(null);
      }
    } catch (err) {
      toast.error(err.message);
    }
    setCouponLoading(false);
  }

  if (paymentStep === 'success') {
    return (
      <div className="text-center py-8 animate-scale-in">
        <div className="w-16 h-16 mx-auto mb-4 bg-success-bg rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-success" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text mb-1">Payment Complete!</h3>
        <p className="text-text-secondary text-sm">Your appointment has been confirmed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-warm rounded-xl border border-border p-4">
        <h3 className="font-semibold text-text mb-3">Payment Summary</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">{appointment.service_name}</span>
            <span className="text-text font-medium">${servicePrice.toFixed(2)}</span>
          </div>

          {depositRequired > 0 && (
            <>
              <div className="flex justify-between text-success">
                <span>Deposit required</span>
                <span className="font-medium">${(depositRequired / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-text-muted text-xs">
                <span>Remaining due at service</span>
                <span>${((servicePrice * 100 - depositRequired) / 100).toFixed(2)}</span>
              </div>
            </>
          )}

          <div className="border-t border-border pt-2 mt-2">
            {coupon && (
              <div className="flex justify-between text-primary">
                <span>Discount ({coupon.coupon.discount_display})</span>
                <span className="font-medium">-${(discountCents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-text font-bold">
              <span>Total Due Now</span>
              <span>${(finalAmount / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Coupon input */}
        {!coupon && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={e => setCouponCode(e.target.value)}
              placeholder="Coupon code"
              className="flex-1 px-3 py-2 bg-white border border-border rounded-lg text-sm"
            />
            <button
              onClick={handleApplyCoupon}
              disabled={couponLoading || !couponCode.trim()}
              className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-all"
            >
              {couponLoading ? '...' : 'Apply'}
            </button>
          </div>
        )}
        {coupon && (
          <div className="mt-2 flex items-center justify-between bg-primary-bg rounded-lg px-3 py-2">
            <span className="text-sm text-primary font-medium">{coupon.coupon.code} — {coupon.coupon.discount_display}</span>
            <button onClick={() => setCoupon(null)} className="text-error text-xs hover:underline">Remove</button>
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div className="flex gap-2">
        <button
          onClick={() => setPaymentMethod('paypal')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
            paymentMethod === 'paypal'
              ? 'bg-[#0070ba] text-white border-[#0070ba]'
              : 'bg-white text-text-secondary border-border hover:border-[#0070ba]'
          }`}
        >
          🅿️ PayPal
        </button>
      </div>

      {/* PayPal Button Container */}
      {paymentMethod === 'paypal' && (
        <div className="pt-2">
          {!PAYPAL_CLIENT_ID ? (
            <p className="text-sm text-text-muted text-center py-4">
              PayPal is not configured yet. Please set VITE_PAYPAL_CLIENT_ID in your environment.
            </p>
          ) : (
            <>
              <div ref={paypalBtnRef} className="min-h-[40px]" />
              {!paypalReady && (
                <div className="flex items-center justify-center py-4">
                  <div className="w-5 h-5 border-2 border-[#0070ba]/30 border-t-[#0070ba] rounded-full animate-spin" />
                  <span className="ml-2 text-sm text-text-muted">Loading PayPal...</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-alt transition-all">
          Cancel
        </button>
      </div>
    </div>
  );
}
