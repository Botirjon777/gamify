import { SkeletonHeader, SkeletonPage, SkeletonRows, SkeletonTabs } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonTabs />
      <SkeletonRows count={6} />
    </SkeletonPage>
  );
}
