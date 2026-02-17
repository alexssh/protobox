import { defineConfig } from 'vite'
import { resolve } from 'path'

const projectRoot = process.cwd()
const appName = process.env.PROTO_APP_NAME ?? 'demo'
const appRoot = process.env.PROTO_APP_ROOT ?? resolve(projectRoot, 'src', 'apps', appName)
const outDir = process.env.PROTO_OUT_DIR ?? resolve(projectRoot, 'build')

export default defineConfig({
  base: './',
  root: appRoot,
  publicDir: false,
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  build: {
    outDir,
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: resolve(appRoot, 'index.html'),
    },
    target: 'es2022',
  },
  resolve: {
    alias: { '@': resolve(projectRoot, 'src') },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
})
