import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { isValidProjectName, run } from '../src/index.js'

describe('isValidProjectName', () => {
  it('accepts simple names', () => {
    expect(isValidProjectName('my-app')).toBe(true)
    expect(isValidProjectName('demo123')).toBe(true)
  })

  it('rejects invalid names', () => {
    expect(isValidProjectName('')).toBe(false)
    expect(isValidProjectName('.')).toBe(false)
    expect(isValidProjectName('foo/bar')).toBe(false)
  })
})

describe('run', () => {
  it('scaffolds a project from the template', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'create-rinlay-'))
    const prev = process.cwd()
    try {
      process.chdir(root)
      await run(['hello-rinlay'])

      const files = await readdir(root)
      expect(files).toEqual(expect.arrayContaining(['hello-rinlay']))
      expect(await readdir(path.join(root, 'hello-rinlay'))).toEqual(
        expect.arrayContaining(['index.html', 'package.json', 'tsconfig.json', 'src']),
      )

      const pkg = JSON.parse(await readFile(path.join(root, 'hello-rinlay/package.json'), 'utf8'))
      expect(pkg.name).toBe('hello-rinlay')
      expect(pkg.dependencies.react).toBe('npm:rinlay-react@0.1.10')
      expect(pkg.devDependencies.rinlay).toBe('^0.1.10')

      const html = await readFile(path.join(root, 'hello-rinlay/index.html'), 'utf8')
      expect(html).toContain('<title>hello-rinlay</title>')
    } finally {
      process.chdir(prev)
      await rm(root, { recursive: true, force: true })
    }
  })
})
