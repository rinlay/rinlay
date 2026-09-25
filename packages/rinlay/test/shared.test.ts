import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { loadTsconfig, productionImportMap, rewriteHtmlForBuild } from '../src/shared.ts'

describe('loadTsconfig', () => {
  it('reads outDir and rootDir', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'rinlay-'))
    await writeFile(
      path.join(root, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { outDir: 'out', rootDir: 'app' } }),
    )
    const config = await loadTsconfig(root)
    expect(config.outDir).toBe(path.join(root, 'out'))
    expect(config.rootDir).toBe(path.join(root, 'app'))
  })

  it('falls back when tsconfig is missing', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'rinlay-'))
    const config = await loadTsconfig(root)
    expect(config.outDir).toBe(path.join(root, '.rinlay'))
    expect(config.rootDir).toBe(path.join(root, 'src'))
  })
})

describe('rewriteHtmlForBuild', () => {
  it('rewrites entry paths and injects the production import map', () => {
    const html = rewriteHtmlForBuild(`<!doctype html>
<head>
  <link rel="stylesheet" href="/src/index.css">
</head>
<body>
  <script type="module" src="/src/main.tsx"></script>
</body>`)
    expect(html).toContain('href="./index.css"')
    expect(html).toContain('src="./main.js"')
    expect(html).toContain('"react": "https://unpkg.com/rinlay-react@0.1.8/dist/index.js"')
    expect(html).toContain('"react-dom/client": "https://unpkg.com/rinlay-react@0.1.8/dist/client.js"')
  })

  it('keeps an import map that is already present', () => {
    const html = rewriteHtmlForBuild('<head><script type="importmap">{}</script></head>')
    expect(html.match(/importmap/g)).toHaveLength(1)
  })
})

describe('productionImportMap', () => {
  it('points react and react-dom at the unpkg runtime', () => {
    const map = productionImportMap()
    expect(map).toContain('https://unpkg.com/rinlay-react@0.1.8/dist/index.js')
    expect(map).toContain('https://unpkg.com/rinlay-react@0.1.8/dist/client.js')
  })
})
