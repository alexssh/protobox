import { build, buildApp } from './build.js'
import { watch as fsWatch, readdirSync, readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'

export async function watch(args: string[]) {
  const cwd = process.cwd()
  const srcDir = resolve(cwd, 'src')
  const appsDir = resolve(cwd, 'src/apps')

  const filterApps = args.filter((a) => !a.startsWith('-'))

  if (filterApps.length > 0) {
    const allApps = existsSync(appsDir)
      ? readdirSync(appsDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
      : []
    const invalid = filterApps.filter((a) => !allApps.includes(a))
    if (invalid.length > 0) {
      console.error(`Unknown app(s): ${invalid.join(', ')}. Available: ${allApps.join(', ')}`)
      process.exit(1)
    }
    console.log(`Watching app(s): ${filterApps.join(', ')}`)
  }

  await build(filterApps)

  let debounce: ReturnType<typeof setTimeout> | null = null
  const pendingApps = new Set<string>()
  let building = false

  let lastTrigger = ''

  async function flush() {
    if (building || pendingApps.size === 0) return
    building = true

    const apps = new Set(pendingApps)
    pendingApps.clear()

    const start = Date.now()
    try {
      for (const app of apps) {
        buildApp(cwd, app)
      }
      const ms = Date.now() - start
      const ts = new Date().toLocaleTimeString('en-GB', { hour12: false })
      const trigger = lastTrigger ? ` ${lastTrigger} →` : ''
      console.log(`${ts}${trigger} [${[...apps].join(', ')}] rebuilt (${ms}ms)`)
    } catch (e) {
      console.error('Build error:', e)
    }

    building = false
    if (pendingApps.size > 0) flush()
  }

  fsWatch(srcDir, { recursive: true }, (_event, filename) => {
    if (!filename || filename.includes('node_modules')) return

    const normalized = filename.replace(/\\/g, '/')
    const appMatch = normalized.match(/^apps\/([^/]+)/)
    const assetsMatch = normalized.startsWith('assets/')

    if (assetsMatch) {
      lastTrigger = normalized
      const allApps = existsSync(appsDir)
        ? readdirSync(appsDir, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => d.name)
        : []
      const scope = filterApps.length > 0 ? allApps.filter((a) => filterApps.includes(a)) : allApps
      scope.forEach((a) => pendingApps.add(a))
    } else if (appMatch) {
      const appName = appMatch[1]
      if (filterApps.length > 0 && !filterApps.includes(appName)) return
      lastTrigger = `apps/${appName}/${normalized.split('/').pop()}`
      pendingApps.add(appName)
    } else {
      const affected = findAffectedApps(cwd, normalized, filterApps)
      lastTrigger = normalized.split('/').slice(0, 2).join('/')
      affected.forEach((a) => pendingApps.add(a))
    }

    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(flush, 200)
  })

  console.log('Watching for changes...')
}

function getModuleKey(relPath: string): string {
  const parts = relPath.split('/')
  if ((parts[0] === 'components' || parts[0] === 'views') && parts.length > 1) {
    return `${parts[0]}/${parts[1]}`
  }
  return parts[0]
}

function extractAtImports(content: string): string[] {
  const imports: string[] = []
  for (const m of content.matchAll(/from\s+['"]@\/([^'"]+)['"]/g)) {
    imports.push(m[1])
  }
  return imports
}

function findTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  const results: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findTsFiles(full))
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      results.push(full)
    }
  }
  return results
}

function dirImportsAny(dir: string, modules: Set<string>): boolean {
  for (const file of findTsFiles(dir)) {
    const content = readFileSync(file, 'utf-8')
    for (const imp of extractAtImports(content)) {
      if (modules.has(getModuleKey(imp))) return true
    }
  }
  return false
}

function findAffectedApps(cwd: string, changedRelPath: string, filterApps: string[]): string[] {
  const srcDir = resolve(cwd, 'src')
  const appsDir = resolve(srcDir, 'apps')

  const changedModule = getModuleKey(changedRelPath)

  // Build transitive closure of shared modules that depend on changedModule
  const depModules = new Set<string>([changedModule])
  let grew = true
  while (grew) {
    grew = false
    for (const dir of ['components', 'views']) {
      const baseDir = resolve(srcDir, dir)
      if (!existsSync(baseDir)) continue
      for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const key = `${dir}/${entry.name}`
        if (depModules.has(key)) continue
        if (dirImportsAny(resolve(baseDir, entry.name), depModules)) {
          depModules.add(key)
          grew = true
        }
      }
    }
  }

  const allApps = readdirSync(appsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  const scope = filterApps.length > 0 ? allApps.filter((a) => filterApps.includes(a)) : allApps

  return scope.filter((app) => dirImportsAny(resolve(appsDir, app), depModules))
}
