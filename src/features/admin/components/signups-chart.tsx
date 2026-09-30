/**
 * Daily sign-ups, single series → no legend (the title names it). Thin bars (≤24px) with a 4px rounded
 * top, square at the baseline, 2px gaps, recessive 1px grid, hover tooltip per bar, and a table view.
 */
export function SignupsChart({
  data,
  title,
  subtitle,
  tooltip,
  tableLabel,
}: {
  data: { day: string; count: number }[];
  title: string;
  subtitle: string;
  tooltip: (day: string, count: number) => string;
  tableLabel: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  // Nice round top for the axis: 1, 2, 5, 10, 20, 50…
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((s) => s * 4 >= max) ?? Math.ceil(max / 4);
  const top = step * 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);
  const total = data.reduce((s, d) => s + d.count, 0);
  const label = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;

  return (
    <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <p className="font-display text-2xl font-bold">{total}</p>
      </div>

      <div className="mt-6 flex gap-3" role="img" aria-label={`${title}: ${total}`}>
        {/* y axis */}
        <div className="relative w-6 shrink-0 text-right text-[11px] text-muted" style={{ height: 180 }}>
          {ticks.map((v) => (
            <span key={v} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(v / top) * 100}%` }}>
              {v}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height: 180 }}>
          {ticks.map((v) => (
            <div key={v} className="absolute inset-x-0 h-px bg-border" style={{ bottom: `${(v / top) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-0.5">
            {data.map((d) => (
              <div key={d.day} className="group relative flex h-full flex-1 items-end justify-center">
                {/* hit target is the full column, larger than the bar */}
                <div
                  className="w-full max-w-6 rounded-t bg-brand transition group-hover:brightness-110"
                  style={{ height: d.count ? `max(${(d.count / top) * 100}%, 3px)` : 0 }}
                />
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-xs font-semibold text-white shadow-lg group-hover:block">
                  {tooltip(label(d.day), d.count)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* x axis: every 5th day */}
      <div className="ml-9 mt-2 flex gap-0.5 text-[11px] text-muted">
        {data.map((d, i) => (
          <span key={d.day} className="flex-1 text-center">
            {i % 5 === 0 || i === data.length - 1 ? label(d.day) : ""}
          </span>
        ))}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted hover:text-foreground">{tableLabel}</summary>
        <table className="mt-2 w-full max-w-xs text-left">
          <tbody>
            {data.map((d) => (
              <tr key={d.day} className="border-b border-border last:border-0">
                <td className="py-1 text-muted">{d.day}</td>
                <td className="py-1 text-right font-semibold">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
