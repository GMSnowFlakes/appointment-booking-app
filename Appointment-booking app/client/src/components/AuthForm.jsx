import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBusiness } from '../context/BusinessContext';

function EyeIcon({ open }) {
  return (
    <svg className="w-4.5 h-4.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      {open ? (
        <>
          <path d="M1 10s3.6-6.5 9-6.5S19 10 19 10s-3.6 6.5-9 6.5S1 10 1 10z" />
          <circle cx="10" cy="10" r="2.5" />
        </>
      ) : (
        <>
          <path d="M3 3l14 14M12.45 12.45A2.5 2.5 0 017.55 7.55M9.88 4.6C9.92 4.6 9.96 4.59 10 4.59c5.4 0 9 6.41 9 6.41a16.4 16.4 0 01-1.86 2.54" strokeLinecap="round" />
          <path d="M6.54 6.54A16.7 16.7 0 001 11s3.6 6.5 9 6.5a8.6 8.6 0 004.46-1.27" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function FeatureItem({ text }) {
  return (
    <li className="flex items-center gap-3 text-sm text-white/80">
      <svg className="w-4 h-4 flex-shrink-0 text-white/60" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" clipRule="evenodd" />
      </svg>
      {text}
    </li>
  );
}

export default function AuthForm({ mode, onSuccess, onToggle }) {
  const { login, register } = useAuth();
  const toast = useToast();
  const { settings } = useBusiness();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isLogin = mode === 'login';
  const color = settings?.primary_color || '#e11d48';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isLogin && !form.name.trim()) { setError('Name is required'); return; }
    if (!form.email.trim()) { setError('Email is required'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setSubmitting(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      } else {
        await register(form.name, form.email, form.password);
        toast.success(`Account created! Welcome, ${form.name}!`);
      }
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function update(field, val) {
    setForm(f => ({ ...f, [field]: val }));
    if (error) setError('');
  }

  return (
    <div className="auth-split">
      {/* ── Left decorative panel (desktop only) ─────────── */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(145deg, ${color}, ${color}cc)` }}
      >
        {/* Noise grain */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`
          }} />

        {/* Decorative circles */}
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-white/5" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3 animate-fade-in-left">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1.5" y="3.5" width="17" height="15" rx="2" />
              <path d="M1.5 8.5h17" /><path d="M6 1.5V5.5M14 1.5V5.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xl font-serif font-bold text-white">
            {settings?.business_name || 'BookEase'}
          </span>
        </div>

        {/* Main copy */}
        <div className="relative z-10 animate-fade-in-left delay-100">
          <h2 className="font-serif font-bold text-white leading-tight mb-4"
            style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}>
            {isLogin
              ? 'Welcome back to effortless booking'
              : 'Your appointments, perfectly organised'}
          </h2>
          <p className="text-white/70 text-sm leading-relaxed mb-8 max-w-xs">
            {isLogin
              ? 'Sign in to view your upcoming appointments and book new services.'
              : 'Create your account and start booking premium services in seconds.'}
          </p>

          <ul className="space-y-3">
            <FeatureItem text="Instant confirmation & reminders" />
            <FeatureItem text="Reschedule or cancel anytime" />
            <FeatureItem text="Secure payments with Stripe & PayPal" />
            <FeatureItem text="Loyalty rewards & gift cards" />
          </ul>
        </div>

        {/* Bottom testimonial */}
        <div className="relative z-10 animate-fade-in-left delay-200 p-4 bg-white/10 rounded-2xl border border-white/20">
          <p className="text-white/90 text-sm italic leading-relaxed">
            &ldquo;Booking an appointment has never been this simple. I love the reminders and how easy it is to reschedule.&rdquo;
          </p>
          <div className="flex items-center gap-2.5 mt-3">
            <div className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center text-white text-xs font-bold">S</div>
            <div>
              <p className="text-white text-xs font-semibold">Sarah M.</p>
              <p className="text-white/60 text-xs">Regular client</p>
            </div>
            <div className="ml-auto flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-3 h-3 text-yellow-300 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────── */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-surface-warm">
        <div className="w-full max-w-md mx-auto animate-fade-in-right">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: color }}>
              <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1.5" y="3.5" width="17" height="15" rx="2" />
                <path d="M1.5 8.5h17" /><path d="M6 1.5V5.5M14 1.5V5.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-lg font-serif font-bold text-text">{settings?.business_name || 'BookEase'}</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="font-serif font-bold text-text text-3xl tracking-tight mb-1.5">
              {isLogin ? 'Sign in' : 'Create account'}
            </h1>
            <p className="text-text-secondary text-sm">
              {isLogin ? 'Enter your credentials to continue.' : 'Fill in your details to get started.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3.5 bg-error-bg border border-red-200 rounded-xl text-sm text-error animate-scale-in flex items-start gap-2.5"
              role="alert" aria-live="polite">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zM7.25 4.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zM8 10.5a.75.75 0 100 1.5.75.75 0 000-1.5z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {!isLogin && (
              <div>
                <label htmlFor="auth-name" className="input-label">Full name</label>
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  className="input"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="input-label">Email address</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-password" className="input-label mb-0">Password</label>
                {isLogin && (
                  <button type="button" className="text-xs font-medium hover:underline"
                    style={{ color }}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder={isLogin ? '••••••••' : 'Min. 6 characters'}
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  className="input pr-11"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-lg w-full mt-2"
              style={{
                background: color,
                color: '#fff',
                boxShadow: `0 4px 16px ${color}40`,
              }}
            >
              {submitting ? (
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                isLogin ? 'Sign in' : 'Create account'
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="divider-label mt-6">
            <span>{isLogin ? 'Don\'t have an account?' : 'Already have an account?'}</span>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="btn btn-secondary w-full mt-4"
          >
            {isLogin ? 'Create a free account' : 'Sign in instead'}
          </button>

          <p className="text-center text-xs text-text-muted mt-6 leading-relaxed">
            By continuing, you agree to our{' '}
            <span className="underline cursor-pointer">Terms of Service</span>{' '}
            and{' '}
            <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
