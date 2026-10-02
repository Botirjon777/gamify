import { Skeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto flex w-full max-w-2xl animate-fade-in flex-col items-center gap-4 rounded-3xl border border-border bg-surface p-10">
      <span className="sr-only">Yuklanmoqda…</span>
      <Skeleton className="size-16 rounded-3xl" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="mt-4 grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
