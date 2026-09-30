import { SkeletonBlock, SkeletonHeader, SkeletonPage, SkeletonRows } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonBlock className="h-14 rounded-2xl" />
      <SkeletonRows count={6} />
    </SkeletonPage>
  );
}
