import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { build } from '../src/build.ts'

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'rinlay-build-'))
  await mkdir(path.join(root, 'src'), { recursive: true })
  await mkdir(path.join(root, 'node_modules', 'react'), { recursive: true })
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'fixture', type: 'module' }),
  )
  await writeFile(
    path.join(root, 'node_modules', 'react', 'package.json'),
    JSON.stringify({ name: 'react', exports: { '.': './index.js' } }),
  )
  await writeFile(path.join(root, 'node_modules', 'react', 'index.js'), 'export {}\n')
  await writeFile(path.join(root, 'node_modules', 'react', 'client.js'), 'export {}\n')
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
  it('copies css, the react runtime, and a rewritten index.html', async () => {
    const root = await fixture()
    await build({ root })
    const html = await readFile(path.join(root, 'out', 'index.html'), 'utf8')
    const css = await readFile(path.join(root, 'out', 'index.css'), 'utf8')
    const runtime = await readFile(path.join(root, 'out', 'react', 'index.js'), 'utf8')
    expect(html).toContain('src="./main.js"')
    expect(html).toContain('href="./index.css"')
    expect(css).toContain('color:red')
    expect(runtime).toContain('export')
  })
})
