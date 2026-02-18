import { defineConfig } from "vite";
import { resolve } from "path";
import { readdirSync } from "fs";

const libsDir = resolve(__dirname, "src/libs");
const entry = Object.fromEntries(
  readdirSync(libsDir)
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .map((f) => [f.replace(/\.(ts|tsx)$/, ""), resolve(libsDir, f)]),
);

export default defineConfig({
  build: {
    lib: {
      entry,
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
