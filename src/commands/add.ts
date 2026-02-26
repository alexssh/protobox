import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function add(args: string[]) {
  const entity = args[0]
  const name = args[1]

  if (!entity || !name) {
    console.error('Usage: pbox add <app|component|view> <name>')
    process.exit(1)
  }

  const cwd = process.cwd()

  const presets: Record<string, (n: string) => void> = {
    app: (n) => addApp(cwd, n),
    component: (n) => addComponent(cwd, n),
    view: (n) => addView(cwd, n),
  }

  const fn = presets[entity]
  if (!fn) {
    console.error(`Unknown entity: ${entity}. Use: app, component, or view`)
    process.exit(1)
  }

  fn(name)
}

function addApp(cwd: string, name: string) {
  const basePascal = toPascal(name)
  const pascal = basePascal.endsWith('App') ? basePascal : `${basePascal}App`
  const kebab = toKebab(pascal)
  const appDir = resolve(cwd, 'src/apps', pascal)
  if (existsSync(appDir)) {
    console.error(`App ${pascal} already exists`)
    process.exit(1)
  }
  mkdirSync(appDir, { recursive: true })

  const template = readTemplate('app')
  const files = template.replace(/\{\{NAME\}\}/g, kebab).replace(/\{\{NAMEPASCAL\}\}/g, pascal)

  const parts = files.split('---FILE---')
  const configTs = parts[1]?.trim() ?? ''
  const appTsx = parts[2]?.trim() ?? ''
  const appScss = parts[3]?.trim() ?? ''
  const mainTsx = parts[4]?.trim() ?? ''
  const typesIndex = parts[5]?.trim() ?? ''

  const typesDir = resolve(cwd, 'src/@types', pascal)
  mkdirSync(typesDir, { recursive: true })

  writeFileSync(resolve(appDir, 'config.ts'), configTs)
  writeFileSync(resolve(appDir, `${pascal}.tsx`), appTsx)
  writeFileSync(resolve(appDir, `${pascal}.scss`), appScss)
  writeFileSync(resolve(appDir, 'main.tsx'), mainTsx)
  writeFileSync(resolve(typesDir, 'index.ts'), typesIndex)
  console.log(`Created app: src/apps/${pascal}`)
}

function addComponent(cwd: string, name: string) {
  const pascal = toPascal(name)
  const kebab = toKebab(pascal)
  const baseDir = resolve(cwd, 'src/components', pascal)
  const v1Dir = resolve(baseDir, 'v1')
  mkdirSync(v1Dir, { recursive: true })

  const template = readTemplate('component')
  const files = template.replace(/\{\{NAME\}\}/g, kebab).replace(/\{\{NAMEPASCAL\}\}/g, pascal)

  const parts = files.split('---FILE---')
  const componentTsx = parts[1]?.trim() ?? ''
  const componentScss = parts[2]?.trim() ?? ''
  const indexTs = parts[3]?.trim() ?? ''

  writeFileSync(resolve(v1Dir, `${pascal}.tsx`), componentTsx)
  writeFileSync(resolve(v1Dir, `${pascal}.scss`), componentScss)
  writeFileSync(resolve(baseDir, 'index.ts'), indexTs)
  console.log(`Created component: src/components/${pascal}`)
}

function addView(cwd: string, name: string) {
  const basePascal = toPascal(name)
  const pascal = basePascal.endsWith('View') ? basePascal : `${basePascal}View`
  const kebab = toKebab(pascal)
  const baseDir = resolve(cwd, 'src/views', pascal)
  const v1Dir = resolve(baseDir, 'v1')
  mkdirSync(v1Dir, { recursive: true })

  const template = readTemplate('view')
  const files = template.replace(/\{\{NAME\}\}/g, kebab).replace(/\{\{NAMEPASCAL\}\}/g, pascal)

  const parts = files.split('---FILE---')
  const dataTs = parts[1]?.trim() ?? ''
  const viewTsx = parts[2]?.trim() ?? ''
  const viewScss = parts[3]?.trim() ?? ''
  const indexTs = parts[4]?.trim() ?? ''

  writeFileSync(resolve(v1Dir, `${pascal}Data.ts`), dataTs)
  writeFileSync(resolve(v1Dir, `${pascal}.tsx`), viewTsx)
  writeFileSync(resolve(v1Dir, `${pascal}.scss`), viewScss)
  writeFileSync(resolve(baseDir, 'index.ts'), indexTs)
  console.log(`Created view: src/views/${pascal}`)
}

function readTemplate(type: string): string {
  const path = resolve(__dirname, '../templates/presets', `${type}.txt`)
  if (!existsSync(path)) {
    console.error(`Template not found: ${path}`)
    process.exit(1)
  }
  return readFileSync(path, 'utf-8')
}

function toPascal(s: string): string {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^./, (c) => c.toUpperCase())
}

function toKebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase()
}
