import { Skeleton, SkeletonBlock, SkeletonPage } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <Skeleton className="h-4 w-32" />
      <SkeletonBlock className="h-72" />
      <div className="grid grid-cols-3 gap-3">
        <SkeletonBlock className="h-20 rounded-2xl" />
        <SkeletonBlock className="h-20 rounded-2xl" />
        <SkeletonBlock className="h-20 rounded-2xl" />
      </div>
    </SkeletonPage>
  );
}
