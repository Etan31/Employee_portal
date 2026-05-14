import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// https://vite.dev/config/
export default defineConfig({
  publicDir: "./client/public",
  build: {
    outDir: "./client/dist",
    chunkSizeWarningLimit: 1000,
  },
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
});
