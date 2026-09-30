import { SkeletonBlock, SkeletonPage } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonBlock className="h-28" />
      <div className="grid gap-6 xl:grid-cols-2">
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-48" />
        <SkeletonBlock className="h-48" />
      </div>
    </SkeletonPage>
  );
}
