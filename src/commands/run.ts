import { createServer, type ServerResponse } from 'http'
import { readFileSync, existsSync, readdirSync, watch as fsWatch } from 'fs'
import { resolve, join, extname, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5174

export async function run(_args: string[]) {
  const cwd = process.cwd()
  const pboxRoot = resolve(__dirname, '..')
  const previewDir = resolve(pboxRoot, 'dist/preview')
  const buildDir = resolve(cwd, 'build')

  if (!existsSync(resolve(previewDir, 'index.html'))) {
    console.error('Preview not built. Run: npm run build (from protobox package)')
    process.exit(1)
  }

  const mimes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.ico': 'image/x-icon',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.eot': 'application/vnd.ms-fontobject',
  }

  const sseClients = new Set<ServerResponse>()
  let reloadTimer: ReturnType<typeof setTimeout> | null = null

  function notifyReload() {
    if (reloadTimer) clearTimeout(reloadTimer)
    reloadTimer = setTimeout(() => {
      for (const client of sseClients) {
        client.write('data: reload\n\n')
      }
    }, 300)
  }

  if (existsSync(buildDir)) {
    fsWatch(buildDir, { recursive: true }, () => notifyReload())
  }
  fsWatch(cwd, (_, filename) => {
    if (filename === 'build' && existsSync(buildDir)) {
      fsWatch(buildDir, { recursive: true }, () => notifyReload())
      notifyReload()
    }
  })

  const server = createServer((req, res) => {
    let path = req.url ?? '/'
    const q = path.indexOf('?')
    if (q >= 0) path = path.slice(0, q)

    if (path === '/') path = '/index.html'

    if (path === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })
      res.write('data: connected\n\n')
      sseClients.add(res)
      req.on('close', () => sseClients.delete(res))
      return
    }

    if (path === '/api/apps') {
      if (!existsSync(buildDir)) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify([]))
        return
      }
      const apps = readdirSync(buildDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'assets')
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

    if (path.startsWith('/assets/')) {
      const rel = path.slice(8)
      const filePath = resolve(buildDir, 'assets', rel)
      if (existsSync(filePath)) {
        const ext = extname(filePath)
        res.writeHead(200, {
          'Content-Type': mimes[ext] ?? 'application/octet-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(readFileSync(filePath))
        return
      }
    }

    if (path.startsWith('/apps/')) {
      const rel = path.slice(6)
      const filePath = resolve(buildDir, rel)
      if (existsSync(filePath)) {
        const ext = extname(filePath)
        let body: Buffer | string = readFileSync(filePath)
        if (ext === '.html') {
          const html = body.toString('utf-8')
          if (html.includes('</body>')) {
            const script = `<script>(function(){document.addEventListener('keydown',function(e){if((e.metaKey||e.ctrlKey)&&e.key==='.'){e.preventDefault();window.parent.postMessage({type:'pbox-toggle-ui'},'*');}});})();</script>`
            body = html.replace('</body>', script + '</body>')
          }
        }
        res.writeHead(200, {
          'Content-Type': mimes[ext] ?? 'application/octet-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(body)
        return
      }
    }

    const filePath = resolve(previewDir, path.slice(1))
    if (existsSync(filePath)) {
      const ext = extname(filePath)
      res.writeHead(200, {
        'Content-Type': mimes[ext] ?? 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
      })
      res.end(readFileSync(filePath))
      return
    }

    res.writeHead(404)
    res.end('Not found')
  })

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Preview: http://localhost:${PORT}`)
    const url = `http://localhost:${PORT}`
    const cmd =
      process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
    spawn(cmd, [url], { stdio: 'ignore' }).unref()
  })
}
