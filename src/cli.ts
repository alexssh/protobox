#!/usr/bin/env node

import { init } from './commands/init.js'
import { build } from './commands/build.js'
import { watch } from './commands/watch.js'
import { run } from './commands/run.js'
import { dev } from './commands/dev.js'
import { add } from './commands/add.js'

const args = process.argv.slice(2)
const cmd = args[0]
const rest = args.slice(1)

const commands: Record<string, (args: string[]) => void | Promise<void>> = {
  init,
  build,
  watch,
  run,
  dev,
  add,
}

async function main() {
  if (!cmd || !commands[cmd]) {
    console.log(`
Protobox - React prototyping framework

Usage: pbox <command> [options]

Commands:
  init              Scaffold a new project
  build [App...]    Build apps (all if no args)
  watch [App...]    Watch & rebuild (all if no args)
  run               Start preview server
  dev [App...]      Run server + watch (all apps if no args)
  add app           Add a new app
  add component     Add a new component
  add view          Add a new view

Examples:
  pbox build                Build all apps
  pbox build Chart          Build only Chart
  pbox watch Lists          Watch & rebuild only Lists
  pbox watch Chart Lists    Watch & rebuild Chart and Lists
`)
    process.exit(1)
  }

  await commands[cmd](rest)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
