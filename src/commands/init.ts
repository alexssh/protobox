import { mkdirSync, cpSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function init(_args: string[]) {
  const cwd = process.cwd()
  const templateDir = resolve(__dirname, '../templates/project')

  if (existsSync(resolve(cwd, 'package.json'))) {
    console.error('Project already exists (package.json found)')
    process.exit(1)
  }

  cpSync(templateDir, cwd, { recursive: true })
  console.log('Project scaffolded. Run: npm install && pbox build')
}
