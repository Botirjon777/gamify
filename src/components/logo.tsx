import { Link } from "@/i18n/navigation";

/** Emblem only (book, brain, pencil, cap). 96 px covers 2× screens at this size, 192 px the rest. */
export function LogoMark({ className = "size-10" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pre-compressed static WebP, no optimizer needed
    <img
      src="/brand/logo-mark-96.webp"
      srcSet="/brand/logo-mark-96.webp 96w, /brand/logo-mark-192.webp 192w"
      sizes="48px"
      width={96}
      height={96}
      alt=""
      decoding="async"
      className={`shrink-0 ${className}`}
    />
  );
}

/** Emblem + name. The name is text, so study centers on their own subdomain show theirs. */
export function Logo({ name = "Zukkolar", href = "/" }: { name?: string; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
      <LogoMark />
      <span className="text-grad-brand">{name}</span>
    </Link>
  );
}

/** The full logo (emblem with the ZUKKOLAR wordmark) — footer and other roomy places. */
export function LogoFull({ className = "w-36" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pre-compressed static WebP, no optimizer needed
    <img src="/brand/logo-full-320.webp" width={320} height={304} alt="Zukkolar" loading="lazy" decoding="async" className={`h-auto ${className}`} />
  );
}
