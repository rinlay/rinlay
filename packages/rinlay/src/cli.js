import { startDev } from './dev.js'

export async function run(args) {
  const cmd = args[0]
  if (!cmd || cmd === 'dev') {
    await startDev({
      root: process.cwd(),
      port: Number(process.env.PORT) || 5173,
      host: process.env.HOST || '127.0.0.1',
    })
    return
  }

  console.error(`Unknown command: ${cmd}

Usage:
  rinlay        start dev server
  rinlay dev    start dev server
`)
  process.exit(1)
}
