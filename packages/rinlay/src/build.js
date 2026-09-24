import fsp from 'node:fs/promises'
import path from 'node:path'
import {
  loadTsconfig,
  resolveReactDir,
  rewriteHtmlForBuild,
  copyDirJs,
  copyCss,
} from './shared.js'

/**
 * Copy index.html (rewritten) + css + react into outDir
 * so `.rinlay/` (or tsconfig outDir) is a static site.
 * Does not run tsc — emit is assumed to already be in outDir.
 */
export async function build({ root }) {
  const indexHtml = path.join(root, 'index.html')
  try {
    await fsp.access(indexHtml)
  } catch {
    console.error(`\n  rinlay build: missing index.html in ${root}\n`)
    process.exit(1)
  }

  const { outDir, rootDir } = await loadTsconfig(root)

  // react runtime → outDir/react/
  const reactDir = resolveReactDir(root)
  await copyDirJs(reactDir, path.join(outDir, 'react'))

  // styles from src → outDir
  await copyCss(rootDir, outDir)

  // index.html template → outDir (paths rewritten for static serve)
  const html = await fsp.readFile(indexHtml, 'utf8')
  await fsp.writeFile(path.join(outDir, 'index.html'), rewriteHtmlForBuild(html))

  const rel = path.relative(root, outDir) || outDir
  console.log(`\n  rinlay build → ${rel}/\n`)
}
