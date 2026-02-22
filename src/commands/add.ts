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
  const pascal = toPascal(name)
  const kebab = toKebab(name)
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

  const typesDir = resolve(cwd, 'src/@types', pascal)
  mkdirSync(typesDir, { recursive: true })
  writeFileSync(
    resolve(typesDir, 'index.ts'),
    `/** Types specific to the ${pascal} app. Import from "@/types/${pascal}". */\nexport {};\n`,
  )

  writeFileSync(
    resolve(appDir, `${pascal}.scss`),
    `.${kebab}-app {\n  padding: 1rem;\n  font-family: system-ui;\n}\n\n.${kebab}-app__title {\n  margin: 0 0 1rem;\n}\n\n.${kebab}-app__params {\n  font-size: 0.875rem;\n  background: #f5f5f5;\n  padding: 1rem;\n  border-radius: 4px;\n}\n`,
  )
  writeFileSync(resolve(appDir, 'config.ts'), configTs)
  writeFileSync(resolve(appDir, `${pascal}.tsx`), appTsx)
  writeFileSync(
    resolve(appDir, 'main.tsx'),
    `import React from "react"\nimport ReactDOM from "react-dom/client"\nimport ${pascal} from "./${pascal}"\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <${pascal} />\n  </React.StrictMode>,\n)\n`,
  )
  console.log(`Created app: src/apps/${pascal}`)
}

function addComponent(cwd: string, name: string) {
  const pascal = toPascal(name)
  const kebab = toKebab(name)
  const baseDir = resolve(cwd, 'src/components', pascal)
  const v1Dir = resolve(baseDir, 'v1')
  mkdirSync(v1Dir, { recursive: true })

  const template = readTemplate('component')
  const content = template.replace(/\{\{NAME\}\}/g, kebab).replace(/\{\{NAMEPASCAL\}\}/g, pascal)

  writeFileSync(resolve(v1Dir, `${pascal}.tsx`), content)
  writeFileSync(resolve(v1Dir, `${pascal}.scss`), `.${kebab} {\n  margin: 0;\n}\n`)
  writeFileSync(resolve(baseDir, 'index.ts'), `export { ${pascal} } from './v1/${pascal}'\n`)
  console.log(`Created component: src/components/${pascal}`)
}

function addView(cwd: string, name: string) {
  const pascal = toPascal(name)
  const kebab = toKebab(name)
  const baseDir = resolve(cwd, 'src/views', pascal)
  const v1Dir = resolve(baseDir, 'v1')
  mkdirSync(v1Dir, { recursive: true })

  const template = readTemplate('view')
  const files = template.replace(/\{\{NAME\}\}/g, kebab).replace(/\{\{NAMEPASCAL\}\}/g, pascal)

  const parts = files.split('---FILE---')
  if (parts.length >= 3) {
    const dataTs = parts[1]?.trim() ?? ''
    const viewTsx = parts[2]?.trim() ?? ''
    writeFileSync(resolve(v1Dir, `${pascal}Data.ts`), dataTs)
    writeFileSync(resolve(v1Dir, `${pascal}.tsx`), viewTsx)
  } else {
    writeFileSync(resolve(v1Dir, `${pascal}.tsx`), files.trim())
  }

  writeFileSync(resolve(v1Dir, `${pascal}.scss`), `.${kebab}-view {\n  margin-top: 1rem;\n}\n`)
  writeFileSync(resolve(baseDir, 'index.ts'), `export { ${pascal} } from './v1/${pascal}'\n`)
  console.log(`Created view: src/views/${pascal}`)
}

function readTemplate(type: string): string {
  const path = resolve(__dirname, '../templates/presets', `${type}.txt`)
  if (existsSync(path)) return readFileSync(path, 'utf-8')
  return getDefaultTemplate(type)
}

function getDefaultTemplate(type: string): string {
  if (type === 'app') {
    return `---FILE---
import { paramBoolean, paramString } from "protobox/parameters";

export default {
  title: "{{NAMEPASCAL}}",
  description: "{{NAMEPASCAL}} app",
  parameters: [
    paramBoolean("enabled", "Enabled", true),
    paramString("name", "Name", "{{NAMEPASCAL}}"),
  ],
};
---FILE---
import React from "react";
import { bem } from "protobox/bem";

const b = bem.bind(null, "{{NAME}}-app");

export default function {{NAMEPASCAL}}() {
  return <div className={b()}>{{NAMEPASCAL}} App</div>;
}
`
  }
  if (type === 'component') {
    return `import React from "react";
import { bem } from "protobox/bem";

const b = bem.bind(null, "{{NAME}}");

export function {{NAMEPASCAL}}() {
  return <div className={b()}>{{NAMEPASCAL}}</div>;
}
`
  }
  if (type === 'view') {
    return `---FILE---
export interface {{NAMEPASCAL}}Data {
  children?: React.ReactNode;
}

export const defaultData: {{NAMEPASCAL}}Data = {};
---FILE---
import React from "react";
import { bem } from "protobox/bem";

import { defaultData, type {{NAMEPASCAL}}Data } from "./{{NAMEPASCAL}}Data";

const b = bem.bind(null, "{{NAME}}-view");

interface {{NAMEPASCAL}}Props {
  data?: {{NAMEPASCAL}}Data;
}

export function {{NAMEPASCAL}}({ data = defaultData }: {{NAMEPASCAL}}Props) {
  return <div className={b()}>{data.children}</div>;
}
`
  }
  return ''
}

function toPascal(s: string): string {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^./, (c) => c.toUpperCase())
}

function toKebab(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase()
}
