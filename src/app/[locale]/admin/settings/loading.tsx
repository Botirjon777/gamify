import { SkeletonBlock, SkeletonHeader, SkeletonPage, SkeletonTabs } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader subtitle={false} />
      <SkeletonTabs />
      <SkeletonBlock className="h-44 rounded-2xl" />
      <SkeletonBlock className="h-44 rounded-2xl" />
    </SkeletonPage>
  );
}
