import { useEffect, useRef } from 'react';

export default function ConfirmDialog({
  open,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => confirmBtnRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = e => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const variantStyles = {
    danger: {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
        </svg>
      ),
      iconBg: 'bg-error-bg',
      iconColor: 'text-error',
      confirmBg: 'bg-error hover:bg-red-700',
    },
    primary: {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
        </svg>
      ),
      iconBg: 'bg-primary-bg',
      iconColor: 'text-primary',
      confirmBg: 'bg-primary hover:bg-primary-dark',
    },
    warning: {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
        </svg>
      ),
      iconBg: 'bg-warning-bg',
      iconColor: 'text-warning',
      confirmBg: 'bg-warning hover:bg-amber-700',
    },
  };

  const styles = variantStyles[variant] || variantStyles.danger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onCancel} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-sm animate-scale-in overflow-hidden"
      >
        <div className="flex justify-center pt-8 pb-2">
          <div className={`w-14 h-14 rounded-2xl ${styles.iconBg} flex items-center justify-center ${styles.iconColor}`}>
            {styles.icon}
          </div>
        </div>

        <div className="px-6 pb-4 text-center">
          <h2 id="confirm-dialog-title" className="text-lg font-semibold text-text mb-2">{title}</h2>
          <p className="text-sm text-text-secondary leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-text-secondary border border-border hover:bg-surface-alt hover:text-text transition-all duration-200 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium text-white transition-all duration-200 shadow-sm disabled:opacity-50 focus:outline-none ${styles.confirmBg}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {confirmLabel}...
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
