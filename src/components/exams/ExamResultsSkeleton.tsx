import { Skeleton } from "@/components/ui/skeleton";

export function ExamResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Skeleton className="skeleton-shimmer size-10 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="skeleton-shimmer h-4 w-3/4 rounded-md" />
              <Skeleton className="skeleton-shimmer h-3 w-1/2 rounded-md" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <Skeleton className="skeleton-shimmer h-7 w-16 rounded-md" />
            <Skeleton className="skeleton-shimmer h-4 w-10 rounded-md" />
          </div>
          <Skeleton className="skeleton-shimmer h-2 w-full rounded-full" />
          <Skeleton className="skeleton-shimmer h-9 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
