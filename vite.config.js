import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// https://vite.dev/config/
export default defineConfig({
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:3000' } },
  publicDir: "./client/public",
  build: {
    outDir: "./client/dist",
    chunkSizeWarningLimit: 1000,
  },
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
});
