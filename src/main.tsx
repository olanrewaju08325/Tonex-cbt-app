import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "katex/dist/katex.min.css";
import "./styles/index.css";

// 1. Environment variables check at startup
const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
const missingEnv = REQUIRED_ENV.filter(key => !import.meta.env[key]);

if (missingEnv.length > 0) {
  console.error(`🚨 Tonex CBT missing configuration: ${missingEnv.join(", ")}`);
  if (typeof window !== "undefined") {
    alert(`🚨 Configuration Error: Missing environment variables: ${missingEnv.join(", ")}. Please configure them in your .env file.`);
  }
}

// 2. LocalStorage Cache Versioning Invalidator
const CURRENT_CACHE_VERSION = "1.1.0";
const cachedVersion = localStorage.getItem("tonex_cache_version");

if (cachedVersion !== CURRENT_CACHE_VERSION) {
  console.warn(`🔄 Cache version mismatch (${cachedVersion} vs ${CURRENT_CACHE_VERSION}). Invalidating old local caches...`);
  
  // Keep Supabase auth sessions intact so users are not logged out
  const keysToKeep = Object.keys(localStorage).filter(k => k.includes("auth-token") || k.includes("user"));
  const keptData: Record<string, string> = {};
  
  keysToKeep.forEach(k => {
    const val = localStorage.getItem(k);
    if (val) keptData[k] = val;
  });
  
  localStorage.clear();
  
  // Restore kept sessions
  Object.entries(keptData).forEach(([k, val]) => localStorage.setItem(k, val));
  localStorage.setItem("tonex_cache_version", CURRENT_CACHE_VERSION);
  console.log("✅ Local cache successfully version-migrated.");
}

createRoot(document.getElementById("root")!).render(<App />);