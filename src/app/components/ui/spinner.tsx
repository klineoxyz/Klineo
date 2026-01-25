import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "size-4 border-2",
    md: "size-6 border-2",
    lg: "size-8 border-3",
    xl: "size-12 border-4",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-accent border-t-transparent",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

// Full page loading spinner
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Inline loading spinner (for buttons, small sections)
export function InlineSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Spinner size="sm" />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

// Terminal-style loading indicator
export function TerminalLoader() {
  return (
    <div className="flex items-center gap-3 p-4 border border-border rounded-lg bg-card">
      <div className="flex gap-1">
        <div className="size-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0ms" }} />
        <div className="size-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: "150ms" }} />
        <div className="size-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-sm text-muted-foreground font-mono">Processing...</span>
    </div>
  );
}

// Progress bar
export function ProgressBar({ progress = 0 }: { progress: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <span className="text-xs text-muted-foreground">Loading data...</span>
        <span className="text-xs text-accent font-semibold">{progress}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
