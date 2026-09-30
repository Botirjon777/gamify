import { SkeletonBlock, SkeletonHeader, SkeletonPage } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="grid gap-5 pt-3 lg:grid-cols-3">
        <SkeletonBlock className="h-[26rem]" />
        <SkeletonBlock className="h-[26rem]" />
        <SkeletonBlock className="h-[26rem]" />
      </div>
    </SkeletonPage>
  );
}
