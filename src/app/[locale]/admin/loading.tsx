import { SkeletonBlock, SkeletonHeader, SkeletonPage, SkeletonStats } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader subtitle={false} />
      <SkeletonStats />
      <div className="grid gap-6 2xl:grid-cols-[1fr_380px]">
        <SkeletonBlock className="h-80" />
        <SkeletonBlock className="h-80" />
      </div>
    </SkeletonPage>
  );
}
