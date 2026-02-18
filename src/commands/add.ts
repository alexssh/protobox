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
  const templatesDir = resolve(__dirname, '../templates/presets')

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
  const appDir = resolve(cwd, 'src/apps', name)
  if (existsSync(appDir)) {
    console.error(`App ${name} already exists`)
    process.exit(1)
  }
  mkdirSync(appDir, { recursive: true })

  const template = readTemplate('app')
  const files = template.replace(/\{\{NAME\}\}/g, name).replace(/\{\{NAMEPASCAL\}\}/g, toPascal(name))

  const parts = files.split('---FILE---')
  const configTs = parts[1]?.trim() ?? ''
  const appTsx = parts[2]?.trim() ?? ''

  const typesDir = resolve(cwd, 'src/types', name)
  mkdirSync(typesDir, { recursive: true })
  writeFileSync(
    resolve(typesDir, 'index.ts'),
    `/** Types specific to the ${name} app. Import from "@/types/${name}". */\nexport {};\n`,
  )

  writeFileSync(
    resolve(appDir, 'App.scss'),
    `.${name}-app {\n  padding: 1rem;\n  font-family: system-ui;\n}\n\n.${name}-app__title {\n  margin: 0 0 1rem;\n}\n\n.${name}-app__params {\n  font-size: 0.875rem;\n  background: #f5f5f5;\n  padding: 1rem;\n  border-radius: 4px;\n}\n`,
  )
  writeFileSync(resolve(appDir, 'config.ts'), configTs)
  writeFileSync(resolve(appDir, 'App.tsx'), appTsx)
  writeFileSync(
    resolve(appDir, 'main.tsx'),
    `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
  )
  console.log(`Created app: src/apps/${name}`)
}

function addComponent(cwd: string, name: string) {
  const baseDir = resolve(cwd, 'src/components', name)
  const v1Dir = resolve(baseDir, 'v1')
  mkdirSync(v1Dir, { recursive: true })

  const template = readTemplate('component')
  const content = template.replace(/\{\{NAME\}\}/g, name).replace(/\{\{NAMEPASCAL\}\}/g, toPascal(name))

  writeFileSync(resolve(v1Dir, `${toPascal(name)}.tsx`), content)
  writeFileSync(resolve(v1Dir, `${toPascal(name)}.scss`), `.${name} {\n  margin: 0;\n}\n`)
  writeFileSync(resolve(baseDir, 'index.ts'), `export { ${toPascal(name)} } from './v1/${toPascal(name)}'\n`)
  console.log(`Created component: src/components/${name}`)
}

function addView(cwd: string, name: string) {
  const baseDir = resolve(cwd, 'src/views', name)
  const v1Dir = resolve(baseDir, 'v1')
  mkdirSync(v1Dir, { recursive: true })

  const template = readTemplate('view')
  const content = template.replace(/\{\{NAME\}\}/g, name).replace(/\{\{NAMEPASCAL\}\}/g, toPascal(name))

  writeFileSync(resolve(v1Dir, `${toPascal(name)}.tsx`), content)
  writeFileSync(resolve(v1Dir, `${toPascal(name)}.scss`), `.${name}-view {\n  margin-top: 1rem;\n}\n`)
  writeFileSync(resolve(baseDir, 'index.ts'), `export { ${toPascal(name)} } from './v1/${toPascal(name)}'\n`)
  console.log(`Created view: src/views/${name}`)
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
    paramString("name", "Name", "{{NAME}}"),
  ],
};
---FILE---
import React from "react";

export default function App() {
  return <div>{{NAMEPASCAL}} App</div>;
}
`
  }
  if (type === 'component') {
    return `import React from "react";

export function {{NAMEPASCAL}}() {
  return <div>{{NAMEPASCAL}}</div>;
}
`
  }
  if (type === 'view') {
    return `import React from "react";

export function {{NAMEPASCAL}}() {
  return <div>{{NAMEPASCAL}} View</div>;
}
`
  }
  return ''
}

function toPascal(s: string): string {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^./, (c) => c.toUpperCase())
}
