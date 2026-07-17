"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function PlaylistSkeleton() {
  return (
    <div>
      {/* Artwork tile skeleton */}
      <Skeleton className="aspect-square w-full rounded-lg" />
      {/* Label skeleton */}
      <div className="mt-2 space-y-1.5 px-0.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

// Rendered inside the dashboard's playlist grid — emits bare tiles.
export function PlaylistSkeletonList({ count = 10 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <PlaylistSkeleton key={i} />
      ))}
    </>
  );
}
