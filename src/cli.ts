#!/usr/bin/env node

import { init } from './commands/init.js'
import { build } from './commands/build.js'
import { watch } from './commands/watch.js'
import { run } from './commands/run.js'
import { add } from './commands/add.js'

const args = process.argv.slice(2)
const cmd = args[0]
const rest = args.slice(1)

const commands: Record<string, (args: string[]) => void | Promise<void>> = {
  init,
  build,
  watch,
  run,
  add,
}

async function main() {
  if (!cmd || !commands[cmd]) {
    console.log(`
Protobox - React prototyping framework

Usage: pbox <command> [options]

Commands:
  init              Scaffold a new project
  build             Build all apps
  watch             Build and watch for changes
  run               Start preview server
  add app           Add a new app
  add component     Add a new component
  add view          Add a new view
`)
    process.exit(1)
  }

  await commands[cmd](rest)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
