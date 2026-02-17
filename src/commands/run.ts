import { createServer } from 'http'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve, join, extname, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5174

export async function run(_args: string[]) {
  const cwd = process.cwd()
  const protoRoot = resolve(__dirname, '..')
  const previewDir = resolve(protoRoot, 'dist/preview')

  if (!existsSync(resolve(previewDir, 'index.html'))) {
    console.error('Preview not built. Run: npm run build (from proto package)')
    process.exit(1)
  }

  const mimes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.ico': 'image/x-icon',
  }

  const server = createServer((req, res) => {
    let path = req.url ?? '/'
    const q = path.indexOf('?')
    if (q >= 0) path = path.slice(0, q)

    if (path === '/') path = '/index.html'
    if (path === '/api/apps') {
      const buildDir = resolve(cwd, 'build')
      if (!existsSync(buildDir)) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify([]))
        return
      }
      const apps = readdirSync(buildDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
        .map((d) => {
          const metaPath = join(buildDir, d.name, 'metadata.json')
          let meta = { appName: d.name, title: d.name, parameters: [] }
          if (existsSync(metaPath)) {
            meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
          }
          return meta
        })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(apps))
      return
    }

    if (path.startsWith('/apps/')) {
      const rel = path.slice(6)
      const buildDir = resolve(cwd, 'build')
      const filePath = resolve(buildDir, rel)
      if (existsSync(filePath)) {
        const ext = extname(filePath)
        res.writeHead(200, { 'Content-Type': mimes[ext] ?? 'application/octet-stream' })
        res.end(readFileSync(filePath))
        return
      }
    }

    const filePath = resolve(previewDir, path.slice(1))
    if (existsSync(filePath)) {
      const ext = extname(filePath)
      res.writeHead(200, { 'Content-Type': mimes[ext] ?? 'application/octet-stream' })
      res.end(readFileSync(filePath))
      return
    }

    res.writeHead(404)
    res.end('Not found')
  })

  server.listen(PORT, () => {
    console.log(`Preview: http://localhost:${PORT}`)
    const url = `http://localhost:${PORT}`
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
    spawn(cmd, [url], { stdio: 'ignore' }).unref()
  })
}
