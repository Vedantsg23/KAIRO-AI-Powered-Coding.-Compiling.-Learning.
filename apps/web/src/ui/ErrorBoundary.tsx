import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  /** What to show instead of the children after an error (gets a retry callback). */
  fallback(error: Error, retry: () => void): ReactNode;
  children: ReactNode;
}

/** Keeps one failing part (e.g. the editor's chunk not loading) from blanking the whole console. */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("KAIRO: a panel failed to render", error, info.componentStack);
  }

  render() {
    if (this.state.error) return this.props.fallback(this.state.error, () => this.setState({ error: null }));
    return this.props.children;
  }
}
