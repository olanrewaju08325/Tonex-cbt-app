import { RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { router } from "./routes";
import { Toaster } from "sonner";
import { AuthProvider } from "../contexts/AuthContext";
import { queryClient } from "../lib/queryClient";
import { InstallPrompt } from "./components/InstallPrompt";
import { OfflineBanner } from "./components/OfflineBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OfflineBanner />
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
        <InstallPrompt />
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: "#0F172A",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#E2E8F0",
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
