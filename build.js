import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = __dirname
const DIST = path.join(ROOT, 'dist')
const RINLAY = path.join(ROOT, '.rinlay')
const REACT_DIST = path.join(ROOT, 'packages/mini-react/dist')

function runTsc() {
  const require = createRequire(import.meta.url)
  const tsc = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc')
  const result = spawnSync(process.execPath, [tsc, '-b', '--pretty', 'false'], {
    cwd: ROOT,
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

async function copyJs(srcDir, destDir) {
  await fsp.mkdir(destDir, { recursive: true })
  for (const name of await fsp.readdir(srcDir)) {
    if (!name.endsWith('.js') && !name.endsWith('.js.map')) continue
    const src = path.join(srcDir, name)
    const st = await fsp.stat(src)
    if (!st.isFile()) continue
    await fsp.copyFile(src, path.join(destDir, name))
  }
}

const INDEX_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>rinlay</title>
  <link rel="stylesheet" href="./index.css">
  <script type="importmap">
{
  "imports": {
    "react": "./react/index.js",
    "react/jsx-runtime": "./react/jsx-runtime.js",
    "react/jsx-dev-runtime": "./react/jsx-dev-runtime.js"
  }
}
  </script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.js"></script>
</body>
</html>
`

async function main() {
  runTsc()

  await fsp.rm(DIST, { recursive: true, force: true })
  await fsp.mkdir(DIST, { recursive: true })

  // app emit: .rinlay/*.js → dist/
  await copyJs(RINLAY, DIST)

  // styles
  await fsp.copyFile(path.join(ROOT, 'src/index.css'), path.join(DIST, 'index.css'))

  // mini-react runtime
  await copyJs(REACT_DIST, path.join(DIST, 'react'))

  // html (no HMR; paths point at dist assets)
  await fsp.writeFile(path.join(DIST, 'index.html'), INDEX_HTML)

  console.log('\n  built → dist/\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
