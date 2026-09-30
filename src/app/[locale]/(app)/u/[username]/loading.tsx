import { SkeletonBlock, SkeletonCards, SkeletonPage, SkeletonStats } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonBlock className="h-44" />
      <SkeletonStats />
      <SkeletonCards count={6} className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6" />
    </SkeletonPage>
  );
}
