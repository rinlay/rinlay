import http from 'node:http'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { WebSocketServer } from './ws.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = __dirname
const OUT = path.join(ROOT, '.rinlay')
const PORT = Number(process.env.PORT) || 5173
const HOST = process.env.HOST || '127.0.0.1'

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
const IGNORE_DIRS = new Set(['.git', 'node_modules', '.DS_Store', '.rinlay', 'dist'])

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

function safeResolve(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0])
  const rel = decoded === '/' ? '/index.html' : decoded
  const resolved = path.normalize(path.join(ROOT, rel))
  if (!resolved.startsWith(ROOT)) return null
  return resolved
}

/** Map /src/foo.tsx → .rinlay/foo.js */
function emitPathFor(absSource) {
  const rel = path.relative(path.join(ROOT, 'src'), absSource)
  if (rel.startsWith('..')) return null
  const base = rel.replace(/\.tsx?$/, '.js')
  return path.join(OUT, base)
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

const IMPORT_MAP = /* html */ `
<script type="importmap">
{
  "imports": {
    "react": "/packages/rinlay-react/dist/index.js",
    "react/jsx-runtime": "/packages/rinlay-react/dist/jsx-runtime.js",
    "react/jsx-dev-runtime": "/packages/rinlay-react/dist/jsx-dev-runtime.js"
  }
}
</script>
`

function injectHmr(html) {
  let out = html
  if (!out.includes('type="importmap"')) {
    if (/<\/head>/i.test(out)) {
      out = out.replace(/<\/head>/i, `${IMPORT_MAP}</head>`)
    } else {
      out = IMPORT_MAP + out
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

/** /src/foo.js → .rinlay/foo.js when source was .ts/.tsx */
function emitPathForJsUrl(absJsPath) {
  const rel = path.relative(path.join(ROOT, 'src'), absJsPath)
  if (rel.startsWith('..') || path.extname(rel) !== '.js') return null
  return path.join(OUT, rel)
}

function startTscWatch() {
  const require = createRequire(import.meta.url)
  const tsc = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc')
  const child = spawn(process.execPath, [tsc, '-b', '-w', '--pretty', 'false', '--preserveWatchOutput'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const log = (buf) => {
    const text = buf.toString()
      .replace(/\x1b\[2J|\x1b\[3J|\x1b\[H|\x1bc/g, '')
      .trim()
    if (text) console.log(`[tsc] ${text}`)
  }
  child.stdout.on('data', log)
  child.stderr.on('data', log)
  child.on('exit', (code) => {
    if (code != null && code !== 0) console.error(`[tsc] exited with ${code}`)
  })
  process.on('exit', () => child.kill())
  process.on('SIGINT', () => {
    child.kill()
    process.exit(0)
  })
  return child
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

    // Serve tsc emit for .ts / .tsx
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

    // /src/App.js → .rinlay/App.js (tsc relative imports)
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
      body = Buffer.from(injectHmr(body.toString('utf8')), 'utf8')
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

function toPublicPath(absPath) {
  return '/' + path.relative(ROOT, absPath).split(path.sep).join('/')
}

function broadcast(payload) {
  const data = JSON.stringify(payload)
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(data)
  }
}

function shouldIgnore(absPath) {
  const rel = path.relative(ROOT, absPath)
  if (rel.startsWith('..')) return true
  const parts = rel.split(path.sep)
  return parts.some((p) => IGNORE_DIRS.has(p) || p.startsWith('.'))
}

const debounce = new Map()

function onChange(absPath) {
  if (shouldIgnore(absPath)) return
  const ext = path.extname(absPath).toLowerCase()
  if (!WATCH_EXTS.has(ext)) return

  const key = absPath
  clearTimeout(debounce.get(key))
  debounce.set(
    key,
    setTimeout(() => {
      debounce.delete(key)
      const publicPath = toPublicPath(absPath)
      if (ext === '.css') {
        broadcast({ type: 'css', path: publicPath })
      } else {
        // Give tsc a moment to emit before browser reloads
        const delay = TS_EXTS.has(ext) ? 150 : 0
        setTimeout(() => {
          broadcast({ type: 'reload', path: publicPath })
          console.log(`[rinlay] change → ${publicPath}`)
        }, delay)
      }
      if (ext === '.css') console.log(`[rinlay] change → ${publicPath}`)
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
      fsp.stat(full).then((s) => {
        if (s.isDirectory() && !shouldIgnore(full)) watchDir(full)
      }).catch(() => {})
    })
  }
  watcher.on('error', (err) => console.error('[rinlay] watch error:', err.message))
}

startTscWatch()
watchDir(ROOT)

server.listen(PORT, HOST, () => {
  console.log(`\n  rinlay dev server (tsc)\n  ➜  http://${HOST}:${PORT}/\n`)
})
