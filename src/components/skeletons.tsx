/** Skeleton building blocks — shaped like the real content so the page doesn't jump when it arrives. */

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={`skeleton rounded-xl ${className}`} style={style} />;
}

/** Wraps a loading.tsx: announced once to screen readers, visually just the skeleton. */
export function SkeletonPage({ children, label = "Yuklanmoqda…" }: { children: React.ReactNode; label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex animate-fade-in flex-col gap-6">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function SkeletonHeader({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      <Skeleton className="h-9 w-56 sm:h-10" />
      {subtitle && <Skeleton className="h-4 w-80 max-w-full" />}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
          <Skeleton className="size-11 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 6, className = "sm:grid-cols-2 lg:grid-cols-3" }: { count?: number; className?: string }) {
  return (
    <div className={`grid gap-3 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="mt-2 h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** List rows with avatar + two text lines + trailing value (leaderboard, friends, notifications…). */
export function SkeletonRows({ count = 8, avatar = true }: { count?: number; avatar?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
          {avatar && <Skeleton className="size-10 shrink-0 rounded-full" />}
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4" style={{ width: `${40 + ((i * 37) % 35)}%` }} />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonBlock({ className = "h-40" }: { className?: string }) {
  return <Skeleton className={`w-full rounded-3xl ${className}`} />;
}

export function SkeletonTabs({ count = 3 }: { count?: number }) {
  return (
    <div className="flex w-fit gap-1 rounded-xl border border-border bg-surface p-1">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-8 w-24 rounded-lg" />
      ))}
    </div>
  );
}
