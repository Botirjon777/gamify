import { Skeleton, SkeletonPage } from "@/components/skeletons";

export default function Loading() {
  return (
    <SkeletonPage>
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <Skeleton className="size-9 rounded-xl" />
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-5 w-40" />
      </div>
      {["w-48", "ml-auto w-36", "w-64", "ml-auto w-52"].map((w) => (
        <Skeleton key={w} className={`h-10 rounded-2xl ${w}`} />
      ))}
    </SkeletonPage>
  );
}
