import { access, mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { build } from '../src/build.ts'

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'rinlay-build-'))
  await mkdir(path.join(root, 'src'), { recursive: true })
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'fixture', type: 'module' }),
  )
  await writeFile(
    path.join(root, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { outDir: 'out', rootDir: 'src' } }),
  )
  await writeFile(path.join(root, 'src', 'index.css'), 'body{color:red}')
  await writeFile(
    path.join(root, 'index.html'),
    '<head><link rel="stylesheet" href="/src/index.css"></head><body><script type="module" src="/src/main.tsx"></script></body>',
  )
  return root
}

describe('build', () => {
  it('copies css and a rewritten index.html that loads react from unpkg', async () => {
    const root = await fixture()
    await build({ root })
    const html = await readFile(path.join(root, 'out', 'index.html'), 'utf8')
    const css = await readFile(path.join(root, 'out', 'index.css'), 'utf8')
    expect(html).toContain('src="./main.js"')
    expect(html).toContain('href="./index.css"')
    expect(html).toContain('https://unpkg.com/rinlay-react@0.1.8/dist/index.js')
    expect(css).toContain('color:red')
    await expect(access(path.join(root, 'out', 'react'))).rejects.toThrow()
  })
})
