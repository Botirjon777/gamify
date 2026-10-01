import { SkeletonCards, SkeletonHeader, SkeletonPage } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonCards count={10} className="grid-cols-2 sm:grid-cols-3 2xl:grid-cols-5" />
    </SkeletonPage>
  );
}
