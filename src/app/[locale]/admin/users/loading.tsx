import { SkeletonBlock, SkeletonHeader, SkeletonPage, SkeletonRows } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonBlock className="h-11 max-w-md rounded-xl" />
      <SkeletonRows count={10} />
    </SkeletonPage>
  );
}
