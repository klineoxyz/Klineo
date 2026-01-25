import { Card } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";

export function PositionsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-44 rounded" />
      </div>

      {/* Position Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-16" />
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-24 rounded" />
        <Skeleton className="h-9 w-24 rounded" />
        <Skeleton className="h-9 w-32 rounded" />
      </div>

      {/* Positions Table */}
      <Card className="overflow-hidden">
        {/* Table Header */}
        <div className="bg-muted/50 border-b border-border p-4">
          <div className="grid grid-cols-12 gap-4 text-xs font-medium">
            <div className="col-span-2">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="col-span-1">
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="col-span-1">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-2 space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="col-span-1">
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="col-span-1">
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-8 w-20 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded" />
          <Skeleton className="h-9 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}
