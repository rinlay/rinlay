import { startDev } from './dev.js'
import { build } from './build.js'

export async function run(args) {
  const cmd = args[0]
  const root = process.cwd()

  if (!cmd || cmd === 'dev') {
    await startDev({
      root,
      port: Number(process.env.PORT) || 5173,
      host: process.env.HOST || '127.0.0.1',
    })
    return
  }

  if (cmd === 'build') {
    await build({ root })
    return
  }

  console.error(`Unknown command: ${cmd}

Usage:
  rinlay        start dev server
  rinlay dev    start dev server
  rinlay build  copy html/css/react into outDir
`)
  process.exit(1)
}
