import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/libs/index.ts"),
        context: resolve(__dirname, "src/libs/context.tsx"),
        parameters: resolve(__dirname, "src/libs/parameters.ts"),
        useProtoParams: resolve(__dirname, "src/libs/useProtoParams.ts"),
      },
      formats: ["es"],
    },
    outDir: "dist/libs",
    target: "es2022",
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime", "immer"],
      output: {
        entryFileNames: "[name].js",
      },
    },
    minify: false,
    emptyOutDir: true,
    sourcemap: true,
  },
});
