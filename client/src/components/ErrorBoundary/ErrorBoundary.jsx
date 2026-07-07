import { Component } from "react";
import { ServerError } from "../../pages/ErrorPage/ErrorPage.jsx";
import { logError } from "../../utils/logger.js";

// React error boundaries must be class components -- there is no hook equivalent.
export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logError("Uncaught render error:", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      // Standalone: the crash may have originated inside the app shell itself,
      // so the fallback can't assume DashboardLayout still renders correctly.
      return <ServerError code={500} standalone />;
    }
    return this.props.children;
  }
}
