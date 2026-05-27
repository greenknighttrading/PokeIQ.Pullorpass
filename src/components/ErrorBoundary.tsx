import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** When this value changes, the boundary resets (e.g., pass location.pathname) */
  resetKey?: string | number;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface to console; production telemetry can hook in here later.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleReload = () => {
    try {
      // Best-effort: clear potentially corrupted local caches before reload.
      window.location.reload();
    } catch {
      // ignore
    }
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              This page hit an unexpected error. Try reloading — if it keeps happening, head back home.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={this.handleReload} variant="default" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" /> Reload
            </Button>
            <Button onClick={this.handleGoHome} variant="outline" size="sm">
              Go home
            </Button>
          </div>
          {import.meta.env.DEV && this.state.error?.message ? (
            <pre className="text-left text-xs text-muted-foreground/70 bg-muted/30 rounded-md p-3 overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;