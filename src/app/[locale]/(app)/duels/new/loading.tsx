import { SkeletonHeader, SkeletonPage, SkeletonRows } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader subtitle={false} />
      <SkeletonRows count={8} />
    </SkeletonPage>
  );
}
