import { SkeletonHeader, SkeletonPage, SkeletonRows } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonRows count={3} />
    </SkeletonPage>
  );
}
