import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./hooks/auth.hooks.jsx";
import { AppDataProvider } from "./hooks/appData.hooks.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* ErrorBoundary nests inside AuthProvider so its fallback (ServerError, via useAuth) still has a provider. */}
    <AuthProvider>
      <ErrorBoundary>
        <AppDataProvider>
          <App />
        </AppDataProvider>
      </ErrorBoundary>
    </AuthProvider>
  </React.StrictMode>,
);
