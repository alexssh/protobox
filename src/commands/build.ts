import { readdirSync, existsSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

export async function build(args: string[]) {
  const cwd = process.cwd()
  const appsDir = resolve(cwd, 'src/apps')

  if (!existsSync(appsDir)) {
    console.error('No src/apps directory. Run pbox init first.')
    process.exit(1)
  }

  const allApps = readdirSync(appsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  if (allApps.length === 0) {
    console.error('No apps found in src/apps')
    process.exit(1)
  }

  const filter = args.filter((a) => !a.startsWith('-'))
  const apps = filter.length > 0 ? allApps.filter((a) => filter.includes(a)) : allApps

  if (apps.length === 0) {
    console.error(`No matching apps found. Available: ${allApps.join(', ')}`)
    process.exit(1)
  }

  const buildDir = resolve(cwd, 'build')
  if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true })

  const start = Date.now()
  for (const app of apps) {
    buildApp(cwd, app)
  }
  const ms = Date.now() - start

  const ts = new Date().toLocaleTimeString('en-GB', { hour12: false })
  console.log(`${ts} [${apps.join(', ')}] built (${ms}ms)`)
}

export function buildApp(cwd: string, appName: string) {
  const appsDir = resolve(cwd, 'src/apps')
  const appDir = resolve(appsDir, appName)
  const buildDir = resolve(cwd, 'build')
  const configPath = resolve(appDir, 'config.ts')

  if (!existsSync(configPath)) {
    console.warn(`Skipping ${appName}: no config.ts`)
    return
  }

  if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true })

  const outDir = join(buildDir, appName)
  mkdirSync(outDir, { recursive: true })

  const meta = extractMetadata(appDir, appName)
  const defaultParams =
    (meta.parameters as unknown[])?.reduce((acc, p: { key: string; default: unknown }) => {
      acc[p.key] = p.default
      return acc
    }, {} as Record<string, unknown>) ?? {}

  const tempDir = join(buildDir, '.pbox-temp', appName)
  mkdirSync(tempDir, { recursive: true })
  cpSync(appDir, tempDir, { recursive: true })
  writeFileSync(resolve(tempDir, 'index.html'), generateAppHtml(appName, meta.title as string, defaultParams))

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
        stdio: 'pipe',
        shell: true,
        env: { ...process.env, PBOX_APP_NAME: appName, PBOX_APP_ROOT: tempDir },
      },
    )

    if (result.status !== 0) {
      const stderr = result.stderr?.toString().trim()
      if (stderr) console.error(stderr)
      console.error(`Build failed for ${appName}`)
      return
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }

  const appIndexHtml = resolve(appDir, 'index.html')
  if (existsSync(appIndexHtml)) rmSync(appIndexHtml)

  writeFileSync(resolve(outDir, 'metadata.json'), JSON.stringify(meta, null, 2))
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
  const indexed: Array<{ index: number; param: Record<string, unknown> }> = []

  for (const m of content.matchAll(/paramBoolean\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*(true|false)\s*\)/g)) {
    indexed.push({ index: m.index!, param: { type: 'boolean', key: m[1], label: m[2], default: m[3] === 'true' } })
  }
  for (const m of content.matchAll(/paramNumber\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*(\d+(?:\.\d+)?)/g)) {
    indexed.push({ index: m.index!, param: { type: 'number', key: m[1], label: m[2], default: parseFloat(m[3] as string) } })
  }
  for (const m of content.matchAll(/paramString\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*["']([^"']*)["']\s*\)/g)) {
    indexed.push({ index: m.index!, param: { type: 'string', key: m[1], label: m[2], default: m[3] } })
  }
  for (const m of content.matchAll(
    /paramOption\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*["']([^"']*)["']\s*,\s*\[([\s\S]*?)\]\s*\)/g,
  )) {
    indexed.push({ index: m.index!, param: { type: 'option', key: m[1], label: m[2], default: m[3], options: parseOptionsArray(m[4]) } })
  }
  for (const m of content.matchAll(
    /paramOptionMulti\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*\[([\s\S]*?)\]\s*,\s*\[([\s\S]*?)\]\s*\)/g,
  )) {
    indexed.push({ index: m.index!, param: { type: 'option-multi', key: m[1], label: m[2], default: parseStringArray(m[3]), options: parseOptionsArray(m[4]) } })
  }

  return indexed.sort((a, b) => a.index - b.index).map((e) => e.param)
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
