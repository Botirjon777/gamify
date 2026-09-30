import { Skeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto flex w-full max-w-2xl animate-fade-in flex-col items-center gap-4 rounded-3xl border border-border bg-surface p-10">
      <span className="sr-only">Yuklanmoqda…</span>
      <Skeleton className="size-16 rounded-3xl" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="mt-4 h-12 w-48" />
    </div>
  );
}
