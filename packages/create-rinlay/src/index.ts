import fsp from 'node:fs/promises'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const PKG_NAME = 'create-rinlay'
const RINLAY_VERSION = '0.1.10'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = path.join(__dirname, '../template')

export async function run(args: string[]) {
  if (args.includes('--help') || args.includes('-h')) {
    printHelp()
    return
  }

  let projectName = args.find((arg) => !arg.startsWith('-'))
  if (!projectName) {
    projectName = await prompt('Project name: ')
  }

  projectName = projectName.trim()
  if (!projectName) {
    console.error('Project name is required.')
    process.exit(1)
  }

  if (!isValidProjectName(projectName)) {
    console.error(`Invalid project name: ${projectName}`)
    process.exit(1)
  }

  const targetDir = path.resolve(process.cwd(), projectName)
  if (fs.existsSync(targetDir)) {
    const stat = await fsp.stat(targetDir)
    if (stat.isDirectory() && (await fsp.readdir(targetDir)).length > 0) {
      console.error(`Target directory is not empty: ${targetDir}`)
      process.exit(1)
    }
  }

  await copyTemplate(TEMPLATE_DIR, targetDir, {
    name: projectName,
    rinlayVersion: RINLAY_VERSION,
  })

  const relativeDir = path.relative(process.cwd(), targetDir) || '.'
  console.log(`
Scaffolding project in ${relativeDir}...

Done. Now run:

  cd ${relativeDir}
  pnpm install
  pnpm dev
`)
}

function printHelp() {
  console.log(`Usage: ${PKG_NAME} [project-name]

Create a new rinlay app.

Options:
  -h, --help  Show this help message
`)
}

function prompt(question: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise<string>((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

export function isValidProjectName(name: string) {
  if (!name || name === '.' || name === '..') return false
  if (name.includes('/') || name.includes('\\')) return false
  return /^(?:@[a-z0-9][a-z0-9-._]*\/)?[a-zA-Z0-9][a-zA-Z0-9-._]*$/.test(name)
}

type TemplateVars = {
  name: string
  rinlayVersion: string
}

async function copyTemplate(from: string, to: string, vars: TemplateVars) {
  await fsp.mkdir(to, { recursive: true })
  const entries = await fsp.readdir(from, { withFileTypes: true })
  for (const entry of entries) {
    const src = path.join(from, entry.name)
    const dest = path.join(to, entry.name)
    if (entry.isDirectory()) {
      await copyTemplate(src, dest, vars)
      continue
    }
    let content = await fsp.readFile(src, 'utf8')
    content = content
      .replaceAll('{{name}}', vars.name)
      .replaceAll('{{rinlayVersion}}', vars.rinlayVersion)
    await fsp.writeFile(dest, content)
  }
}
