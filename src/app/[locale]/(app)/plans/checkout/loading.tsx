import { Skeleton, SkeletonBlock, SkeletonHeader, SkeletonPage } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <Skeleton className="h-4 w-24" />
      <SkeletonHeader subtitle={false} />
      <SkeletonBlock className="h-52" />
      <SkeletonBlock className="h-72" />
    </SkeletonPage>
  );
}
