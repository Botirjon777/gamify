import { Skeleton, SkeletonCards, SkeletonHeader, SkeletonPage } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-14 rounded-2xl" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <SkeletonCards count={4} className="sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" />
        </div>
      ))}
    </SkeletonPage>
  );
}
