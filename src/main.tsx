import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { routes } from "@/routes/routes";
import { applyStoredTheme } from "@/lib/theme";
import { startAutoSync } from "@/sync/store";
import "./index.css";

// Apply the persisted light/dark choice before first paint.
applyStoredTheme();

// Pull-merge-push from WebDAV on launch (if enabled), then on an interval.
startAutoSync();

// Hash routing avoids server-side route config inside the Tauri webview.
const router = createHashRouter(routes);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
