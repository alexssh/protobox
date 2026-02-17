import { build } from './build.js'
import { watch as fsWatch } from 'fs'
import { resolve } from 'path'

export async function watch(_args: string[]) {
  const cwd = process.cwd()
  const srcDir = resolve(cwd, 'src')

  const runBuild = () => build([])

  await runBuild()

  fsWatch(srcDir, { recursive: true }, (event, filename) => {
    if (filename && !filename.includes('node_modules')) {
      console.log(`\n[${event}] ${filename}`)
      runBuild()
    }
  })

  console.log('Watching for changes...')
}
