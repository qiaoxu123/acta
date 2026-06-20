import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Tauri expects a fixed dev port and ignores Vite's HMR over the network.
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // Prevent Vite from clearing Rust compiler errors in the terminal.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // Tauri's own files are watched by the Rust side.
      ignored: ["**/src-tauri/**"],
    },
  },
  // Produce assets the Tauri webview can load relative to the bundle.
  build: {
    target: "es2021",
    minify: "esbuild",
    sourcemap: false,
  },
});
