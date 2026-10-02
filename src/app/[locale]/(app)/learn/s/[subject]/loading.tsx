import { Skeleton, SkeletonCards, SkeletonPage } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-2xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <SkeletonCards count={6} className="sm:grid-cols-2 2xl:grid-cols-3" />
    </SkeletonPage>
  );
}
