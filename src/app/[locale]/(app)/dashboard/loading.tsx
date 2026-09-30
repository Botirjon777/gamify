import { SkeletonBlock, SkeletonCards, SkeletonPage, SkeletonStats } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonBlock className="h-36 sm:h-40" />
      <SkeletonStats />
      <SkeletonCards count={3} />
      <div className="grid gap-6 xl:grid-cols-2">
        <SkeletonBlock className="h-56" />
        <SkeletonBlock className="h-56" />
      </div>
    </SkeletonPage>
  );
}
