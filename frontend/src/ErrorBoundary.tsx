import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("PawHub UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: 640, margin: "0 auto" }}>
          <h1 style={{ color: "#b42318" }}>Something went wrong</h1>
          <pre style={{ background: "#f6f6f6", padding: "1rem", overflow: "auto", fontSize: "0.85rem" }}>
            {this.state.error.message}
          </pre>
          <button type="button" style={{ marginTop: "1rem", padding: "0.5rem 1rem" }} onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
