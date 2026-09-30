import { Skeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto flex w-full max-w-3xl animate-fade-in flex-col gap-5 px-4 pt-10">
      <span className="sr-only">Yuklanmoqda…</span>
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="grid gap-2.5">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}
