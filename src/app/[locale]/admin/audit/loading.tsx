import { SkeletonHeader, SkeletonPage, SkeletonRows } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader subtitle={false} />
      <SkeletonRows count={12} avatar={false} />
    </SkeletonPage>
  );
}
