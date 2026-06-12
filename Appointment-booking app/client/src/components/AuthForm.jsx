import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function AuthForm({ mode, onSuccess, onToggle }) {
  const { login, register } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === 'login';

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
        toast.success(`Welcome back!`);
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

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white rounded-3xl shadow-sm border border-border p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary-bg rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                {isLogin ? (
                  <>
                    <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" />
                    <path d="M8 12h8" strokeLinecap="round" />
                    <path d="M12 8v8" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M19 8v6" strokeLinecap="round" />
                    <path d="M22 11h-6" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </div>
            <h1 className="text-2xl font-serif font-bold text-text">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-text-secondary mt-1.5 text-sm">
              {isLogin
                ? 'Sign in to manage your appointments'
                : 'Register to start booking premium services'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3.5 bg-error-bg border border-red-200 rounded-xl text-sm text-error animate-fade-in flex items-start gap-2.5">
              <span className="mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-surface-warm border border-border rounded-xl text-sm transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-surface-warm border border-border rounded-xl text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 bg-surface-warm border border-border rounded-xl text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-text-muted">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Toggle */}
          <p className="text-center text-sm text-text-secondary">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => onToggle?.()}
              className="text-primary hover:text-primary-dark font-medium transition-colors"
            >
              {isLogin ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
