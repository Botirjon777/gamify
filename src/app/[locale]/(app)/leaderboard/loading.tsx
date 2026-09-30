import { SkeletonHeader, SkeletonPage, SkeletonRows, SkeletonTabs } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="flex flex-wrap gap-3">
        <SkeletonTabs count={2} />
        <SkeletonTabs count={2} />
      </div>
      <SkeletonRows count={10} />
    </SkeletonPage>
  );
}
