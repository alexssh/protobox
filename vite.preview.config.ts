import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: resolve(__dirname, "src/preview"),
  publicDir: resolve(__dirname, "src/preview/public"),
  build: {
    outDir: resolve(__dirname, "dist/preview"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "src/preview/index.html"),
    },
    target: "es2022",
  },
  resolve: {
    alias: [
      { find: /^protobox\/(.+)$/, replacement: resolve(__dirname, "src/libs/$1.ts") },
      { find: /^protobox$/, replacement: resolve(__dirname, "src/libs/index.ts") },
      { find: "@", replacement: resolve(__dirname, "src/preview") },
    ],
  },
  server: {
    port: 5174,
    fs: { allow: ["..", "../.."] },
  },
});
