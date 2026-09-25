import fsp from 'node:fs/promises'
import path from 'node:path'
import { loadTsconfig, rewriteHtmlForBuild, copyCss } from './shared.js'

/**
 * Copy index.html (rewritten) + css into outDir
 * so `.rinlay/` (or tsconfig outDir) is a static site.
 * React comes from the unpkg import map in the HTML.
 * Does not run tsc — emit is assumed to already be in outDir.
 */
export async function build({ root }: { root: string }) {
  const indexHtml = path.join(root, 'index.html')
  try {
    await fsp.access(indexHtml)
  } catch {
    console.error(`\n  rinlay build: missing index.html in ${root}\n`)
    process.exit(1)
  }

  const { outDir, rootDir } = await loadTsconfig(root)

  await copyCss(rootDir, outDir)

  const html = await fsp.readFile(indexHtml, 'utf8')
  await fsp.writeFile(path.join(outDir, 'index.html'), rewriteHtmlForBuild(html))

  const rel = path.relative(root, outDir) || outDir
  console.log(`\n  rinlay build → ${rel}/\n`)
}
