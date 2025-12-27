"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PlaylistSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          {/* Album Art Skeleton */}
          <Skeleton className="h-20 w-20 shrink-0 rounded-lg" />

          {/* Content Skeleton */}
          <div className="flex flex-1 flex-col justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>

          {/* Button Skeleton */}
          <div className="flex items-center">
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlaylistSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <PlaylistSkeleton key={i} />
      ))}
    </div>
  );
}


