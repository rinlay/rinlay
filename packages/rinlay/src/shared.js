import fsp from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

export async function loadTsconfig(root) {
  const file = path.join(root, 'tsconfig.json')
  try {
    const raw = await fsp.readFile(file, 'utf8')
    const json = JSON.parse(raw.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''))
    const opts = json.compilerOptions || {}
    return {
      outDir: path.resolve(root, opts.outDir || '.rinlay'),
      rootDir: path.resolve(root, opts.rootDir || 'src'),
    }
  } catch {
    return {
      outDir: path.join(root, '.rinlay'),
      rootDir: path.join(root, 'src'),
    }
  }
}

export function resolveTsc(root) {
  const require = createRequire(path.join(root, 'package.json'))
  try {
    return path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc')
  } catch {
    const here = createRequire(import.meta.url)
    return path.join(path.dirname(here.resolve('typescript/package.json')), 'bin', 'tsc')
  }
}

/** Absolute dir that holds react's index.js (usually .../dist) */
export function resolveReactDir(root) {
  const require = createRequire(path.join(root, 'package.json'))
  return path.dirname(require.resolve('react'))
}

export function productionImportMap() {
  const imports = {
    react: './react/index.js',
    'react/jsx-runtime': './react/jsx-runtime.js',
    'react/jsx-dev-runtime': './react/jsx-dev-runtime.js',
    'react-dom': './react/react-dom.js',
    'react-dom/client': './react/client.js',
  }
  return `<script type="importmap">\n${JSON.stringify({ imports }, null, 2)}\n</script>`
}

/**
 * Rewrite Vite-style template paths for static outDir:
 *   /src/main.tsx → ./main.js
 *   /src/index.css → ./index.css
 */
export function rewriteHtmlForBuild(html) {
  let out = html
  out = out.replace(
    /\b(src|href)=(["'])\/?src\/([^"']+)\.tsx?\2/g,
    (_, attr, q, file) => `${attr}=${q}./${file}.js${q}`,
  )
  out = out.replace(
    /\b(src|href)=(["'])\/?src\/([^"']+\.css)\2/g,
    (_, attr, q, file) => `${attr}=${q}./${file}${q}`,
  )
  if (!out.includes('type="importmap"')) {
    const map = productionImportMap()
    if (/<\/head>/i.test(out)) {
      out = out.replace(/<\/head>/i, `  ${map}\n</head>`)
    } else {
      out = map + out
    }
  }
  return out
}

export async function copyDirJs(srcDir, destDir) {
  await fsp.mkdir(destDir, { recursive: true })
  for (const name of await fsp.readdir(srcDir)) {
    if (!name.endsWith('.js') && !name.endsWith('.js.map')) continue
    const src = path.join(srcDir, name)
    const st = await fsp.stat(src)
    if (!st.isFile()) continue
    await fsp.copyFile(src, path.join(destDir, name))
  }
}

export async function copyCss(rootDir, outDir) {
  async function walk(dir) {
    for (const name of await fsp.readdir(dir)) {
      const abs = path.join(dir, name)
      const st = await fsp.stat(abs)
      if (st.isDirectory()) {
        await walk(abs)
        continue
      }
      if (!name.endsWith('.css')) continue
      const rel = path.relative(rootDir, abs)
      const dest = path.join(outDir, rel)
      await fsp.mkdir(path.dirname(dest), { recursive: true })
      await fsp.copyFile(abs, dest)
    }
  }
  try {
    await walk(rootDir)
  } catch {
    /* no src */
  }
}
