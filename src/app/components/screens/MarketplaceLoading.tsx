import { Card } from "@/app/components/ui/card";
import { Skeleton, SkeletonTraderCard } from "@/app/components/ui/skeleton";

export function MarketplaceLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-[500px]" />
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 max-w-md rounded" />
        <Skeleton className="h-10 w-32 rounded" />
        <Skeleton className="h-10 w-32 rounded" />
        <Skeleton className="h-10 w-32 rounded" />
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-6 w-16" />
          </Card>
        ))}
      </div>

      {/* Trader Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonTraderCard key={i} />
        ))}
      </div>

      {/* Load More Button */}
      <div className="flex justify-center pt-4">
        <Skeleton className="h-10 w-32 rounded" />
      </div>
    </div>
  );
}
