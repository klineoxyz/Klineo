import React from "react";
import { Button } from "@/app/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render errors in children and shows a fallback instead of a blank screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[320px] flex flex-col items-center justify-center gap-4 p-6 bg-background text-foreground">
          <AlertTriangle className="size-12 text-destructive" />
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {this.state.error?.message ?? "An error occurred while loading this page."}
          </p>
          {this.props.onRetry && (
            <Button
              variant="outline"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.onRetry?.();
              }}
            >
              Try again
            </Button>
          )}
        </div>
      );
    }
    const { children } = this.props;
    if (children == null) {
      return (
        <div className="min-h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          No content
        </div>
      );
    }
    return children;
  }
}
