import { SkeletonBlock, SkeletonHeader, SkeletonPage } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="grid gap-6 2xl:grid-cols-2">
        <SkeletonBlock className="h-80" />
        <SkeletonBlock className="h-48" />
        <SkeletonBlock className="h-56" />
        <SkeletonBlock className="h-56" />
      </div>
    </SkeletonPage>
  );
}
