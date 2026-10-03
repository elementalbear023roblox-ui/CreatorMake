import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL("./vercel-static", import.meta.url)),
  base: "./",
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: {
      "@": projectRoot,
    },
  },
  build: {
    outDir: fileURLToPath(new URL("./site", import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    target: "es2020",
  },
});
