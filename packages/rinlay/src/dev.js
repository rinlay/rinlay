import http from 'node:http'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { WebSocketServer } from './ws.js'
import { loadTsconfig, resolveTsc } from './shared.js'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.tsx': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
}

const TS_EXTS = new Set(['.ts', '.tsx'])
const WATCH_EXTS = new Set(['.html', '.css', '.js', '.mjs', '.ts', '.tsx'])
const IGNORE_DIRS = new Set(['.git', 'node_modules', '.DS_Store'])

const HMR_CLIENT = /* html */ `
<script type="module">
(() => {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  let ws
  let timer

  function connect() {
    ws = new WebSocket(protocol + '//' + location.host)
    ws.addEventListener('open', () => console.log('[rinlay] connected'))
    ws.addEventListener('close', () => {
      clearTimeout(timer)
      timer = setTimeout(connect, 1000)
    })
    ws.addEventListener('message', (event) => {
      let msg
      try { msg = JSON.parse(event.data) } catch { return }
      if (msg.type === 'reload') {
        console.log('[rinlay] full reload:', msg.path)
        location.reload()
        return
      }
      if (msg.type === 'css' && msg.path) {
        console.log('[rinlay] css hot update:', msg.path)
        updateStylesheet(msg.path)
      }
    })
  }

  function updateStylesheet(filePath) {
    const links = document.querySelectorAll('link[rel="stylesheet"]')
    let hit = false
    for (const link of links) {
      const href = link.getAttribute('href') || ''
      const clean = href.split('?')[0]
      if (clean === filePath || clean.endsWith(filePath) || filePath.endsWith(clean.replace(/^\\//, ''))) {
        const url = new URL(href, location.href)
        url.searchParams.set('t', String(Date.now()))
        link.href = url.pathname + url.search
        hit = true
      }
    }
    if (!hit) location.reload()
  }

  connect()
})()
</script>
`

function toPublicPath(root, absPath) {
  return '/' + path.relative(root, absPath).split(path.sep).join('/')
}

function buildImportMap(root) {
  const require = createRequire(path.join(root, 'package.json'))
  const imports = {}
  let reactFile = ''
  for (const spec of ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime']) {
    try {
      const resolved = require.resolve(spec)
      imports[spec] = toPublicPath(root, resolved)
      if (spec === 'react') reactFile = resolved
    } catch {
      /* optional */
    }
  }
  if (reactFile) {
    const dir = path.dirname(reactFile)
    imports['react-dom'] = toPublicPath(root, path.join(dir, 'react-dom.js'))
    imports['react-dom/client'] = toPublicPath(root, path.join(dir, 'client.js'))
  }
  if (!Object.keys(imports).length) return ''
  return `<script type="importmap">\n${JSON.stringify({ imports }, null, 2)}\n</script>`
}

function injectHtml(html, importMap) {
  let out = html
  if (importMap && !out.includes('type="importmap"')) {
    if (/<\/head>/i.test(out)) {
      out = out.replace(/<\/head>/i, `${importMap}\n</head>`)
    } else {
      out = importMap + out
    }
  }
  if (!out.includes('[rinlay] connected')) {
    if (/<\/body>/i.test(out)) {
      out = out.replace(/<\/body>/i, `${HMR_CLIENT}</body>`)
    } else {
      out += HMR_CLIENT
    }
  }
  return out
}

function startTscWatch(root) {
  const tsc = resolveTsc(root)
  const child = spawn(process.execPath, [tsc, '-b', '-w', '--pretty', 'false', '--preserveWatchOutput'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const log = (buf) => {
    const text = buf
      .toString()
      .replace(/\x1b\[2J|\x1b\[3J|\x1b\[H|\x1bc/g, '')
      .trim()
    if (text) console.log(`[tsc] ${text}`)
  }
  child.stdout.on('data', log)
  child.stderr.on('data', log)
  child.on('exit', (code) => {
    if (code != null && code !== 0) console.error(`[tsc] exited with ${code}`)
  })
  const kill = () => {
    try {
      child.kill()
    } catch {
      /* ignore */
    }
  }
  process.on('exit', kill)
  process.on('SIGINT', () => {
    kill()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    kill()
    process.exit(0)
  })
  return child
}

async function waitForFile(filePath, ms = 5000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    try {
      await fsp.access(filePath)
      return true
    } catch {
      await new Promise((r) => setTimeout(r, 50))
    }
  }
  return false
}

/**
 * Vite-like dev: user only needs index.html.
 * rinlay runs tsc -w and serves the project; .ts/.tsx map to tsc emit.
 */
export async function startDev({ root, port, host }) {
  const indexHtml = path.join(root, 'index.html')
  try {
    await fsp.access(indexHtml)
  } catch {
    console.error(`\n  rinlay: missing index.html in ${root}\n`)
    process.exit(1)
  }

  const { outDir, rootDir } = await loadTsconfig(root)
  const importMap = buildImportMap(root)
  const outDirName = path.basename(outDir)
  const ignoreDirs = new Set([...IGNORE_DIRS, outDirName])

  function safeResolve(urlPath) {
    const decoded = decodeURIComponent(urlPath.split('?')[0])
    const rel = decoded === '/' ? '/index.html' : decoded
    const resolved = path.normalize(path.join(root, rel))
    if (!resolved.startsWith(root)) return null
    return resolved
  }

  function emitPathFor(absSource) {
    const rel = path.relative(rootDir, absSource)
    if (rel.startsWith('..')) return null
    return path.join(outDir, rel.replace(/\.tsx?$/, '.js'))
  }

  function emitPathForJsUrl(absJsPath) {
    const rel = path.relative(rootDir, absJsPath)
    if (rel.startsWith('..') || path.extname(rel) !== '.js') return null
    return path.join(outDir, rel)
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host}`)
      let filePath = safeResolve(url.pathname)
      if (!filePath) {
        res.writeHead(403).end('Forbidden')
        return
      }

      const ext = path.extname(filePath).toLowerCase()

      if (TS_EXTS.has(ext)) {
        const emitted = emitPathFor(filePath)
        if (!emitted || !(await waitForFile(emitted))) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end(`tsc emit missing for ${url.pathname}`)
          return
        }
        const body = await fsp.readFile(emitted)
        res.writeHead(200, {
          'Content-Type': 'text/javascript; charset=utf-8',
          'Cache-Control': 'no-store',
        })
        res.end(body)
        return
      }

      if (ext === '.js') {
        const emitted = emitPathForJsUrl(filePath)
        if (emitted && (await waitForFile(emitted, 1000))) {
          const body = await fsp.readFile(emitted)
          res.writeHead(200, {
            'Content-Type': 'text/javascript; charset=utf-8',
            'Cache-Control': 'no-store',
          })
          res.end(body)
          return
        }
      }

      let stat
      try {
        stat = await fsp.stat(filePath)
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not Found')
        return
      }

      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html')
        try {
          await fsp.access(filePath)
        } catch {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not Found')
          return
        }
      }

      const outExt = path.extname(filePath).toLowerCase()
      const type = MIME[outExt] || 'application/octet-stream'
      let body = await fsp.readFile(filePath)

      if (outExt === '.html') {
        body = Buffer.from(injectHtml(body.toString('utf8'), importMap), 'utf8')
      }

      res.writeHead(200, {
        'Content-Type': type,
        'Cache-Control': 'no-store',
      })
      res.end(body)
    } catch (err) {
      console.error(err)
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Internal Server Error')
    }
  })

  const wss = new WebSocketServer(server)

  function broadcast(payload) {
    const data = JSON.stringify(payload)
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(data)
    }
  }

  function shouldIgnore(absPath) {
    const rel = path.relative(root, absPath)
    if (rel.startsWith('..')) return true
    // ignore tsc emit dir (whatever outDir is)
    if (absPath === outDir || absPath.startsWith(outDir + path.sep)) return true
    const parts = rel.split(path.sep)
    return parts.some((p) => ignoreDirs.has(p) || p.startsWith('.'))
  }

  const debounce = new Map()

  function onChange(absPath) {
    if (shouldIgnore(absPath)) return
    const ext = path.extname(absPath).toLowerCase()
    if (!WATCH_EXTS.has(ext)) return

    clearTimeout(debounce.get(absPath))
    debounce.set(
      absPath,
      setTimeout(() => {
        debounce.delete(absPath)
        const publicPath = toPublicPath(root, absPath)
        if (ext === '.css') {
          broadcast({ type: 'css', path: publicPath })
          console.log(`[rinlay] change → ${publicPath}`)
        } else {
          const delay = TS_EXTS.has(ext) ? 150 : 0
          setTimeout(() => {
            broadcast({ type: 'reload', path: publicPath })
            console.log(`[rinlay] change → ${publicPath}`)
          }, delay)
        }
      }, 50),
    )
  }

  function watchDir(dir) {
    let watcher
    try {
      watcher = fs.watch(dir, { recursive: true }, (_event, filename) => {
        if (!filename) return
        onChange(path.join(dir, filename))
      })
    } catch {
      watcher = fs.watch(dir, (_event, filename) => {
        if (!filename) return
        const full = path.join(dir, filename)
        onChange(full)
        fsp
          .stat(full)
          .then((s) => {
            if (s.isDirectory() && !shouldIgnore(full)) watchDir(full)
          })
          .catch(() => {})
      })
    }
    watcher.on('error', (err) => console.error('[rinlay] watch error:', err.message))
  }

  startTscWatch(root)
  watchDir(root)

  await new Promise((resolve) => {
    server.listen(port, host, resolve)
  })

  console.log(`
  rinlay v${await readVersion()}  ready in ${path.basename(root)}

  ➜  Local:   http://${host}:${port}/
`)
}

async function readVersion() {
  try {
    const pkg = JSON.parse(
      await fsp.readFile(new URL('../package.json', import.meta.url), 'utf8'),
    )
    return pkg.version
  } catch {
    return '0.0.0'
  }
}
