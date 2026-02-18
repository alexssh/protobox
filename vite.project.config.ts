import { defineConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const protoboxRoot = dirname(fileURLToPath(import.meta.url))
const projectRoot = process.cwd()
const appName = process.env.PBOX_APP_NAME ?? 'demo'
const appRoot = process.env.PBOX_APP_ROOT ?? resolve(projectRoot, 'src', 'apps', appName)
const outDir = process.env.PBOX_OUT_DIR ?? resolve(projectRoot, 'build')

export default defineConfig({
  base: './',
  root: appRoot,
  publicDir: false,
  css: {
    preprocessorOptions: {
      scss: { api: 'modern' },
    },
  },
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
    alias: [
      { find: /^protobox\/(.+)$/, replacement: resolve(protoboxRoot, 'dist/libs/$1.js') },
      { find: /^protobox$/, replacement: resolve(protoboxRoot, 'dist/libs/index.js') },
      { find: '@', replacement: resolve(projectRoot, 'src') },
    ],
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
})
