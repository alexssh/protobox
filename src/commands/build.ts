import { readdirSync, existsSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

export async function build(_args: string[]) {
  const cwd = process.cwd()
  const appsDir = resolve(cwd, 'src/apps')

  if (!existsSync(appsDir)) {
    console.error('No src/apps directory. Run pbox init first.')
    process.exit(1)
  }

  const apps = readdirSync(appsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  if (apps.length === 0) {
    console.error('No apps found in src/apps')
    process.exit(1)
  }

  const buildDir = resolve(cwd, 'build')
  if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true })

  for (const app of apps) {
    const appDir = resolve(appsDir, app)
    const configPath = resolve(appDir, 'config.ts')

    if (!existsSync(configPath)) {
      console.warn(`Skipping ${app}: no config.ts`)
      continue
    }

    const outDir = join(buildDir, app)
    mkdirSync(outDir, { recursive: true })

    const meta = extractMetadata(appDir, app)
    const defaultParams =
      (meta.parameters as unknown[])?.reduce((acc, p: { key: string; default: unknown }) => {
        acc[p.key] = p.default
        return acc
      }, {} as Record<string, unknown>) ?? {}

    const tempDir = join(buildDir, '.pbox-temp', app)
    mkdirSync(tempDir, { recursive: true })
    cpSync(appDir, tempDir, { recursive: true })
    writeFileSync(resolve(tempDir, 'index.html'), generateAppHtml(app, meta.title as string, defaultParams))

    try {
      const result = spawnSync(
        'npx',
        [
          'vite',
          'build',
          '--config',
          resolve(dirname(fileURLToPath(import.meta.url)), '../vite.project.config.ts'),
          '--outDir',
          outDir,
          '--emptyOutDir',
          'true',
        ],
        {
          cwd,
          stdio: 'inherit',
          shell: true,
          env: { ...process.env, PBOX_APP_NAME: app, PBOX_APP_ROOT: tempDir },
        },
      )

      if (result.status !== 0) process.exit(result.status ?? 1)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }

    const appIndexHtml = resolve(appDir, 'index.html')
    if (existsSync(appIndexHtml)) rmSync(appIndexHtml)

    writeFileSync(resolve(outDir, 'metadata.json'), JSON.stringify(meta, null, 2))
  }

  console.log(`Built ${apps.length} app(s) in build/`)
}

function extractMetadata(appDir: string, appName: string): Record<string, unknown> {
  const configPath = resolve(appDir, 'config.ts')
  const content = readFileSync(configPath, 'utf-8')

  const titleMatch = content.match(/title:\s*["']([^"']+)["']/)
  const descMatch = content.match(/description:\s*["']([^"']*)["']/)

  return {
    appName,
    title: titleMatch?.[1] ?? appName,
    description: descMatch?.[1] ?? '',
    parameters: parseParametersFromSource(content),
  }
}

function parseParametersFromSource(content: string): unknown[] {
  const params: unknown[] = []

  // paramBoolean(key, label, default)
  for (const m of content.matchAll(/paramBoolean\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*(true|false)\s*\)/g)) {
    params.push({ type: 'boolean', key: m[1], label: m[2], default: m[3] === 'true' })
  }
  // paramNumber(key, label, default, opts?)
  for (const m of content.matchAll(/paramNumber\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*(\d+(?:\.\d+)?)/g)) {
    params.push({ type: 'number', key: m[1], label: m[2], default: parseFloat(m[3]) })
  }
  // paramString(key, label, default)
  for (const m of content.matchAll(/paramString\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*["']([^"']*)["']\s*\)/g)) {
    params.push({ type: 'string', key: m[1], label: m[2], default: m[3] })
  }
  // paramOption(key, label, default, options)
  for (const m of content.matchAll(
    /paramOption\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*["']([^"']*)["']\s*,\s*\[([\s\S]*?)\]\s*\)/g,
  )) {
    const opts = parseOptionsArray(m[4])
    params.push({ type: 'option', key: m[1], label: m[2], default: m[3], options: opts })
  }
  // paramOptionMulti(key, label, default, options)
  for (const m of content.matchAll(
    /paramOptionMulti\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*\[([\s\S]*?)\]\s*,\s*\[([\s\S]*?)\]\s*\)/g,
  )) {
    const opts = parseOptionsArray(m[4])
    const defaultArr = parseStringArray(m[3])
    params.push({ type: 'option-multi', key: m[1], label: m[2], default: defaultArr, options: opts })
  }

  return params
}

function parseOptionsArray(s: string): Array<{ value: string; label: string }> {
  const opts: Array<{ value: string; label: string }> = []
  for (const m of s.matchAll(/\{\s*value:\s*["']([^"']*)["']\s*,\s*label:\s*["']([^"']*)["']\s*\}/g)) {
    opts.push({ value: m[1], label: m[2] })
  }
  return opts
}

function generateAppHtml(appName: string, title: string, defaultParams: Record<string, unknown>): string {
  const paramsJson = JSON.stringify(defaultParams)
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <script>window.__PBOX_PARAMS__=${paramsJson};</script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
`
}

function parseStringArray(s: string): string[] {
  const arr: string[] = []
  for (const m of s.matchAll(/["']([^"']*)["']/g)) {
    arr.push(m[1])
  }
  return arr
}
