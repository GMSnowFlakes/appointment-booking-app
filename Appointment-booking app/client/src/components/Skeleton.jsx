/* ─── Reusable skeleton loading components ─────── */

export function SkeletonBar({ width = '100%', height = '14px', className = '' }) {
  return (
    <div
      className={`rounded-lg bg-border/60 animate-pulse ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCircle({ size = '32px', className = '' }) {
  return (
    <div
      className={`rounded-full bg-border/60 animate-pulse flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonBlock({ className = '' }) {
  return <div className={`rounded-xl bg-border/60 animate-pulse ${className}`} />;
}

/* ─── Service card skeleton ──────────────────── */

export function ServiceCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden animate-pulse">
      <div className="h-1.5 w-full bg-border/40" />
      <div className="p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <SkeletonBar width="64px" height="18px" />
          <SkeletonBar width="24px" height="24px" className="rounded-lg" />
        </div>
        <SkeletonBar width="70%" height="20px" />
        <SkeletonBar width="100%" height="14px" />
        <SkeletonBar width="60%" height="14px" />
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/50">
          <SkeletonBar width="64px" height="16px" />
          <SkeletonBar width="64px" height="24px" />
        </div>
      </div>
    </div>
  );
}

/* ─── Appointment card skeleton ─────────────── */

export function AppointmentCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 sm:p-6 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2.5">
            <SkeletonCircle size="10px" />
            <SkeletonBar width="160px" height="18px" />
            <SkeletonBar width="72px" height="16px" className="rounded-full" />
          </div>
          <div className="flex gap-4">
            <SkeletonBar width="120px" height="14px" />
            <SkeletonBar width="80px" height="14px" />
            <SkeletonBar width="60px" height="14px" />
          </div>
        </div>
        <div className="flex gap-1.5">
          <SkeletonBar width="72px" height="28px" className="rounded-xl" />
          <SkeletonBar width="60px" height="28px" className="rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ─── Admin stats skeleton ──────────────────── */

export function StatsCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-border p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="w-10 h-10 rounded-xl" />
        <div className="space-y-2 flex-1">
          <SkeletonBar width="60%" height="18px" />
          <SkeletonBar width="40%" height="12px" />
        </div>
      </div>
    </div>
  );
}

/* ─── Table row skeleton ────────────────────── */

export function TableRowSkeleton({ cols = 7 }) {
  return (
    <tr className="border-b border-border/50 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-3">
          <SkeletonBar width={i === 0 ? '120px' : i === cols - 1 ? '80px' : '60px'} height="14px" />
        </td>
      ))}
    </tr>
  );
}
