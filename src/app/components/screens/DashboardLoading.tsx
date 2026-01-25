import { Card } from "@/app/components/ui/card";
import { Skeleton, SkeletonStatCard, SkeletonTable } from "@/app/components/ui/skeleton";
import { TerminalLoader } from "@/app/components/ui/spinner";

export function DashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* System Alerts Skeleton */}
      <div className="border border-[#FFB000]/20 bg-[#FFB000]/5 rounded-lg p-4">
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      {/* Key Metrics - 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-16" />
          </Card>
        ))}
      </div>

      {/* Secondary Metrics - 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3 w-28" />
          </Card>
        ))}
      </div>

      {/* Active Copy Traders */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-32 rounded" />
        </div>
        
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-4 flex-1">
                <Skeleton className="size-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="flex gap-8">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
              <Skeleton className="h-9 w-24 ml-4 rounded" />
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <Skeleton className="h-6 w-40 mb-6" />
        <SkeletonTable rows={5} />
      </Card>

      {/* Terminal Loading Indicator */}
      <div className="flex justify-center">
        <TerminalLoader />
      </div>
    </div>
  );
}
