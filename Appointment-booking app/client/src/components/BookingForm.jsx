import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AvailabilityCalendar from './AvailabilityCalendar';

const STEPS = [
  { num: 1, label: 'Choose Service' },
  { num: 2, label: 'Select Date & Time' },
  { num: 3, label: 'Add Notes' },
];

export default function BookingForm({ onBooked }) {
  const { user, fetchWithAuth } = useAuth();
  const toast = useToast();
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [step, setStep] = useState(1);

  useEffect(() => { fetchServices(); }, []);

  async function fetchServices() {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      if (res.ok) setServices(data.services);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

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
        body: JSON.stringify({
          service_id: parseInt(selectedService),
          date,
          time,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Appointment booked successfully! 🎉');
        setMessage({ type: 'success', text: 'Appointment booked successfully! 🎉' });
        setSelectedService('');
        setDate('');
        setTime('');
        setNotes('');
        setStep(1);
        onBooked?.();
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
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-white rounded-3xl border border-border p-10 max-w-md text-center shadow-sm animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-bg rounded-2xl flex items-center justify-center">
            <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-xl font-serif font-semibold text-text mb-2">Sign In Required</h2>
          <p className="text-text-secondary text-sm">Please sign in to book an appointment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3">Book Now</span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-text tracking-tight">
          Reserve Your Appointment
        </h1>
        <p className="text-text-secondary mt-2">Complete the steps below to book your service</p>
      </div>

      {/* Step Progress */}
      <div className="flex items-center justify-center gap-0 mb-10">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <button
              type="button"
              onClick={() => {
                if ((s.num === 2 && selectedService) || (s.num === 3 && selectedService && date && time)) {
                  setStep(s.num);
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                step === s.num
                  ? 'bg-primary text-white shadow-sm'
                  : step > s.num
                  ? 'bg-primary-bg text-primary'
                  : 'text-text-muted'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s.num ? 'bg-white/20 text-white' :
                step > s.num ? 'bg-primary text-white' : 'bg-border text-text-muted'
              }`}>
                {step > s.num ? '✓' : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-8 sm:w-12 h-0.5 mx-1 rounded-full ${
                step > s.num ? 'bg-primary' : 'bg-border'
              }`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Service Selection */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-8 bg-primary-bg text-primary rounded-xl flex items-center justify-center text-sm font-bold">1</span>
              <h2 className="text-lg font-semibold text-text">Choose a Service</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map(service => (
                  <label
                    key={service.id}
                    className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedService === String(service.id)
                        ? 'border-primary bg-primary-bg'
                        : 'border-border hover:border-primary/30 hover:bg-surface-alt'
                    }`}
                  >
                    <input
                      type="radio"
                      name="service"
                      value={service.id}
                      checked={selectedService === String(service.id)}
                      onChange={e => { setSelectedService(e.target.value); setStep(2); }}
                      className="sr-only"
                    />
                    {service.image_url ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-surface-warm border border-border/50">
                        <img src={service.image_url} alt={service.name}
                          className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex-shrink-0 bg-surface-alt border border-border/50 flex items-center justify-center text-text-muted">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm text-text">{service.name}</span>
                        <span className="text-sm font-bold text-primary whitespace-nowrap">
                          ${Number(service.price).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">{service.duration} min</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                type="button"
                disabled={!selectedService}
                onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-8 bg-primary-bg text-primary rounded-xl flex items-center justify-center text-sm font-bold">2</span>
              <h2 className="text-lg font-semibold text-text">Select Date & Time</h2>
            </div>

            {selectedService ? (
              <AvailabilityCalendar
                date={date}
                time={time}
                serviceDuration={selectedServiceDetails?.duration || 60}
                onSelect={handleCalendarSelect}
              />
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-text-muted">Please select a service first.</p>
              </div>
            )}

            {selectedServiceDetails && date && time && (
              <div className="mt-4 p-4 bg-primary-bg rounded-xl border border-primary/10 animate-fade-in">
                <p className="text-sm text-primary flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="8" cy="8" r="6" />
                    <path d="M8 4.5V8l2 1.5" strokeLinecap="round" />
                  </svg>
                  <span className="font-medium">Appointment Summary:</span>{' '}
                  {selectedServiceDetails.name} ·{' '}
                  {new Date(`${date}T${time}`).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })}{' '}
                  at {new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit', hour12: true,
                  })}{' '}
                  · {selectedServiceDetails.duration} min ·{' '}
                  <span className="font-bold">${Number(selectedServiceDetails.price).toFixed(2)}</span>
                </p>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text border border-border rounded-xl hover:bg-surface-alt transition-all"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!date || !time}
                onClick={() => setStep(3)}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Notes */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-8 bg-primary-bg text-primary rounded-xl flex items-center justify-center text-sm font-bold">3</span>
              <h2 className="text-lg font-semibold text-text">Add Notes <span className="text-text-muted font-normal text-sm">(optional)</span></h2>
            </div>

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any special requests or information for the service provider..."
              rows={3}
              className="w-full px-4 py-3 bg-surface-warm border border-border rounded-xl text-sm transition-all resize-none"
            />

            {/* Summary card */}
            {selectedServiceDetails && date && time && (
              <div className="mt-4 p-4 bg-surface-warm rounded-xl border border-border">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Booking Summary</h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-text-secondary">Service</span><span className="font-medium text-text">{selectedServiceDetails.name}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Date</span><span className="font-medium text-text">{new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Time</span><span className="font-medium text-text">{new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Duration</span><span className="font-medium text-text">{selectedServiceDetails.duration} min</span></div>
                  <div className="flex justify-between pt-1.5 border-t border-border"><span className="font-semibold text-text">Total</span><span className="font-bold text-primary text-lg">${Number(selectedServiceDetails.price).toFixed(2)}</span></div>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text border border-border rounded-xl hover:bg-surface-alt transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedService || !date || !time}
                className="px-8 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Booking...
                  </span>
                ) : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-xl animate-fade-in flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-success-bg border border-green-200 text-success'
              : 'bg-error-bg border border-red-200 text-error'
          }`}>
            <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
            <p className="text-sm">{message.text}</p>
          </div>
        )}
      </form>
    </div>
  );
}
