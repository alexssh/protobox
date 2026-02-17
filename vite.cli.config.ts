import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/cli.ts"),
      formats: ["es"],
      fileName: "cli",
    },
    outDir: "dist",
    target: "node18",
    rollupOptions: {
      external: ["path", "fs", "child_process", "http", "url"],
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: false,
    emptyOutDir: false,
  },
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
});
