import { BookOpen, Compass, Home } from "lucide-react";

interface Props {
  title: string;
  text: string;
  back: string;
  learn: string;
  /** Rendered by the caller so this works both inside and outside the i18n layout. */
  renderLink: (href: string, className: string, children: React.ReactNode) => React.ReactNode;
}

/** Branded 404 used by app/[locale]/not-found.tsx and the root app/not-found.tsx fallback. */
export function NotFoundView({ title, text, back, learn, renderLink }: Props) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-20 text-center">
      <div className="absolute left-1/2 top-1/3 -z-10 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-grad-brand opacity-15 blur-3xl" />
      <span className="grid size-16 place-items-center rounded-3xl bg-grad-brand text-white shadow-xl shadow-brand/25">
        <Compass className="size-8" />
      </span>
      <p className="mt-6 font-display text-7xl font-bold sm:text-8xl">
        <span className="text-grad-brand">404</span>
      </p>
      <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-md leading-relaxed text-muted">{text}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {renderLink(
          "/",
          "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-grad-brand px-6 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:brightness-110",
          <>
            <Home className="size-4" /> {back}
          </>,
        )}
        {renderLink(
          "/learn",
          "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 text-sm font-semibold hover:border-brand/40",
          <>
            <BookOpen className="size-4" /> {learn}
          </>,
        )}
      </div>
    </main>
  );
}
