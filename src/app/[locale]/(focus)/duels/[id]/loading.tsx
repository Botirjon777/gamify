import { Skeleton, SkeletonPage } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:py-8">
      <SkeletonPage>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-14 rounded-xl" />
      </SkeletonPage>
    </div>
  );
}
