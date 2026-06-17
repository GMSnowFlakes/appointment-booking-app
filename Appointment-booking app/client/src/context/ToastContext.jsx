import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const removeToast = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    timers.current[id] = setTimeout(() => removeToast(id), duration);
    return id;
  }, [removeToast]);

  const toast = useMemo(() => ({
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container rendered here */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-3 pointer-events-none max-w-sm w-full"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="alert"
            className={`
              pointer-events-auto animate-slide-up
              px-4 py-3.5 rounded-2xl shadow-lg border
              flex items-start gap-3 text-sm font-medium
              backdrop-blur-md
              ${typeStyles[t.type] || typeStyles.success}
            `}
            style={{ animationDuration: '0.35s' }}
          >
            <span className="flex-shrink-0 mt-0.5">{typeIcons[t.type]}</span>
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity p-0.5"
              aria-label="Dismiss"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const typeIcons = {
  success: '✅',
  error: '⚠️',
  info: '💡',
  warning: '🔔',
};

const typeStyles = {
  success: 'bg-surface/95 text-success border-green-200 shadow-green-500/10',
  error: 'bg-surface/95 text-error border-red-200 shadow-red-500/10',
  info: 'bg-surface/95 text-primary border-primary/20 shadow-primary-500/10',
  warning: 'bg-surface/95 text-warning border-amber-200 shadow-amber-500/10',
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
