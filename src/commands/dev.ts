import { spawn } from 'child_process'
import { watch } from './watch.js'

export async function dev(args: string[]) {
  const runProc = spawn(process.execPath, [process.argv[1], 'run'], {
    stdio: 'inherit',
    env: process.env,
  })

  runProc.on('error', (err) => {
    console.error('Server failed:', err)
    process.exit(1)
  })

  process.on('SIGINT', () => {
    runProc.kill()
    process.exit(0)
  })

  await watch(args)
}
