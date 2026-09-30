import { SkeletonBlock, SkeletonPage, SkeletonRows } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonBlock className="h-40" />
      <div className="grid grid-cols-3 gap-3">
        <SkeletonBlock className="h-20 rounded-2xl" />
        <SkeletonBlock className="h-20 rounded-2xl" />
        <SkeletonBlock className="h-20 rounded-2xl" />
      </div>
      <SkeletonRows count={5} />
    </SkeletonPage>
  );
}
