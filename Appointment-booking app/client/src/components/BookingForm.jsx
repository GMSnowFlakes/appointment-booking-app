import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBusiness } from '../context/BusinessContext';
import AvailabilityCalendar from './AvailabilityCalendar';

const STEPS = [
  { num: 1, label: 'Service', icon: (
    <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
  )},
  { num: 2, label: 'Date & Time', icon: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" strokeLinecap="round" />
    </>
  )},
  { num: 3, label: 'Confirm', icon: (
    <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
  )},
];

function StepBar({ current, color }) {
  return (
    <div className="flex items-center gap-0 mb-10 w-full">
      {STEPS.map((s, i) => {
        const done = current > s.num;
        const active = current === s.num;
        return (
          <div key={s.num} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2"
                style={{
                  background: done || active ? color : 'transparent',
                  borderColor: done || active ? color : 'var(--color-border)',
                  boxShadow: active ? `0 0 0 4px ${color}20` : 'none',
                }}
              >
                {done ? (
                  <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    style={{ color: active ? '#fff' : 'var(--color-text-muted)' }}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                  >
                    {s.icon}
                  </svg>
                )}
              </div>
              <span
                className="text-xs font-medium hidden sm:block whitespace-nowrap"
                style={{ color: done || active ? color : 'var(--color-text-muted)' }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-3 h-0.5 mt-[-12px] sm:mt-[-24px] relative">
                <div className="absolute inset-0 bg-border rounded-full" />
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{ width: done ? '100%' : '0%', background: color }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BookingForm({ onBooked, onCheckout }) {
  const { user, fetchWithAuth } = useAuth();
  const toast = useToast();
  const { settings } = useBusiness();
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [step, setStep] = useState(1);

  const color = settings?.primary_color || '#e11d48';

  useEffect(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(d => { if (d.services) setServices(d.services); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleCalendarSelect(newDate, newTime) {
    setDate(newDate);
    setTime(newTime);
    setMessage(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    if (!selectedService || !date || !time) {
      setMessage({ type: 'error', text: 'Please select a service, date, and time.' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: parseInt(selectedService), date, time, notes: notes.trim() || null }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Appointment booked successfully!');
        const svc = selectedServiceDetails;
        const apt = data.appointment || { id: data.id, service_id: svc?.id, service_name: svc?.name, price: svc?.price, duration: svc?.duration, deposit_required: svc?.deposit_required || 0 };
        setSelectedService(''); setDate(''); setTime(''); setNotes(''); setStep(1);
        if (onCheckout) onCheckout(apt);
        else onBooked?.();
      } else {
        toast.error(data.error || 'Failed to book appointment');
        setMessage({ type: 'error', text: data.error || 'Failed to book appointment' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const selectedServiceDetails = services.find(s => s.id === parseInt(selectedService));

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="card card-elevated p-10 max-w-md w-full text-center animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{ background: `${color}15` }}>
            <svg className="w-8 h-8" style={{ color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-xl font-serif font-semibold text-text mb-2">Sign in to book</h2>
          <p className="text-text-secondary text-sm">Create a free account or sign in to reserve your appointment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Page header */}
      <div className="text-center mb-10">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color }}>
          Book Now
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-text tracking-tight">
          Reserve Your Appointment
        </h1>
        <p className="text-text-secondary mt-2 text-sm">Complete the steps below to confirm your booking</p>
      </div>

      {/* Step bar */}
      <StepBar current={step} color={color} />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Step 1: Service ───────────────────────── */}
        {step === 1 && (
          <div className="card card-elevated p-6 sm:p-8 animate-fade-in">
            <h2 className="font-semibold text-text text-lg mb-5 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ background: color }}>1</span>
              Choose a Service
            </h2>

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 rounded-xl shimmer" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map(service => {
                  const isSelected = selectedService === String(service.id);
                  return (
                    <label
                      key={service.id}
                      className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'shadow-sm'
                          : 'border-border hover:border-border-strong hover:bg-surface-alt'
                      }`}
                      style={isSelected ? {
                        borderColor: color,
                        background: `${color}08`,
                        boxShadow: `0 0 0 1px ${color}30, var(--shadow-sm)`,
                      } : {}}
                    >
                      <input
                        type="radio"
                        name="service"
                        value={service.id}
                        checked={isSelected}
                        onChange={e => { setSelectedService(e.target.value); }}
                        className="sr-only"
                      />
                      {service.image_url ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-border/50">
                          <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg flex-shrink-0 bg-surface-alt border border-border/50 flex items-center justify-center"
                          style={{ background: isSelected ? `${color}15` : '' }}>
                          <svg className="w-5 h-5" style={{ color: isSelected ? color : 'var(--color-text-muted)' }}
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-text leading-tight">{service.name}</p>
                        <p className="text-xs text-text-muted mt-0.5">{service.duration} min</p>
                      </div>
                      <span className="font-bold text-sm flex-shrink-0"
                        style={{ color: isSelected ? color : 'var(--color-text)' }}>
                        ${Number(service.price).toFixed(2)}
                      </span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: color }}>
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                            <path fillRule="evenodd" d="M10.28 2.28a.75.75 0 00-1.06 0L4.5 7 2.78 5.28a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l5.5-5.5a.75.75 0 000-1.06z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                type="button"
                disabled={!selectedService}
                onClick={() => setStep(2)}
                className="btn btn-lg"
                style={selectedService ? { background: color, color: '#fff', boxShadow: `0 4px 12px ${color}35` } : { background: 'var(--color-border)', color: 'var(--color-text-muted)', cursor: 'not-allowed' }}
              >
                Continue
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Date & Time ───────────────────── */}
        {step === 2 && (
          <div className="card card-elevated p-6 sm:p-8 animate-fade-in">
            <h2 className="font-semibold text-text text-lg mb-5 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ background: color }}>2</span>
              Select Date &amp; Time
            </h2>

            {/* Selected service recap */}
            {selectedServiceDetails && (
              <div className="mb-5 flex items-center gap-3 p-3.5 rounded-xl bg-surface-alt border border-border">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}15` }}>
                  <svg className="w-4 h-4" style={{ color }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 2H4a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-2M6 2a2 2 0 002 2h2a2 2 0 002-2M6 2a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-text">{selectedServiceDetails.name}</p>
                  <p className="text-xs text-text-muted">{selectedServiceDetails.duration} min · ${Number(selectedServiceDetails.price).toFixed(2)}</p>
                </div>
                <button type="button" onClick={() => setStep(1)}
                  className="text-xs font-medium hover:underline" style={{ color }}>
                  Change
                </button>
              </div>
            )}

            <AvailabilityCalendar
              date={date}
              time={time}
              serviceDuration={selectedServiceDetails?.duration || 60}
              onSelect={handleCalendarSelect}
            />

            {date && time && (
              <div className="mt-4 p-3.5 rounded-xl border animate-fade-in flex items-center gap-2.5 text-sm"
                style={{ background: `${color}08`, borderColor: `${color}25`, color }}>
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2 1.5" strokeLinecap="round" />
                </svg>
                <span>
                  <strong>{new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
                  {' '}at{' '}
                  <strong>{new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</strong>
                  {' '}&mdash; {selectedServiceDetails?.duration} min
                </span>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button type="button" onClick={() => setStep(1)} className="btn btn-secondary">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 8H3M7 4L3 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
              <button
                type="button"
                disabled={!date || !time}
                onClick={() => setStep(3)}
                className="btn btn-lg"
                style={date && time ? { background: color, color: '#fff', boxShadow: `0 4px 12px ${color}35` } : { background: 'var(--color-border)', color: 'var(--color-text-muted)', cursor: 'not-allowed' }}
              >
                Continue
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm ───────────────────────── */}
        {step === 3 && (
          <div className="card card-elevated p-6 sm:p-8 animate-fade-in">
            <h2 className="font-semibold text-text text-lg mb-5 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ background: color }}>3</span>
              Review &amp; Confirm
            </h2>

            {/* Summary */}
            {selectedServiceDetails && date && time && (
              <div className="rounded-2xl border border-border overflow-hidden mb-5">
                <div className="px-5 py-3.5 bg-surface-alt border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Booking Summary</p>
                </div>
                <div className="p-5 space-y-3">
                  {[
                    { label: 'Service', val: selectedServiceDetails.name },
                    { label: 'Date', val: new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) },
                    { label: 'Time', val: new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) },
                    { label: 'Duration', val: `${selectedServiceDetails.duration} minutes` },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between items-center text-sm">
                      <span className="text-text-secondary">{label}</span>
                      <span className="font-medium text-text text-right max-w-48">{val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 border-t border-border">
                    <span className="font-bold text-text">Total</span>
                    <span className="font-bold text-xl font-serif" style={{ color }}>
                      ${Number(selectedServiceDetails.price).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mb-5">
              <label htmlFor="booking-notes" className="input-label">
                Special requests <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <textarea
                id="booking-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any notes for the service provider…"
                rows={3}
                className="input resize-none"
              />
            </div>

            {/* Error */}
            {message?.type === 'error' && (
              <div className="mb-4 p-3.5 bg-error-bg border border-red-200 rounded-xl text-sm text-error animate-scale-in flex items-center gap-2.5"
                role="alert">
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zM7.25 4.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zM8 10.5a.75.75 0 100 1.5.75.75 0 000-1.5z" clipRule="evenodd" />
                </svg>
                {message.text}
              </div>
            )}

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(2)} className="btn btn-secondary">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 8H3M7 4L3 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedService || !date || !time}
                className="btn btn-lg"
                style={{ background: color, color: '#fff', boxShadow: `0 4px 16px ${color}40` }}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4.5 h-4.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Confirming…
                  </>
                ) : (
                  <>
                    <svg className="w-4.5 h-4.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Confirm Booking
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
