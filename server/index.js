import express from 'express'
import cors from 'cors'
import http from 'http'
import https from 'https'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3131

// Persist target to disk so it survives restarts
import { readFileSync, writeFileSync } from 'fs'
const TARGET_FILE = join(__dirname, '.target')
let targetUrl = ''
try { targetUrl = readFileSync(TARGET_FILE, 'utf-8').trim() } catch {}
function saveTarget(url) {
  targetUrl = url
  try { writeFileSync(TARGET_FILE, url) } catch {}
}

app.use(cors())
app.use(express.json())

// Ojito app UI at /app/
app.use('/app', express.static(join(__dirname, '..', 'app')))

// Bridge script
app.get('/ojito-bridge.js', (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.sendFile(join(__dirname, '..', 'injector', 'ojito-bridge.js'))
})

// API
app.get('/api/status', (req, res) => res.json({ ok: true }))
app.post('/api/target', (req, res) => {
  saveTarget(req.body.url || '')
  res.json({ ok: true, url: targetUrl })
})
app.get('/api/target', (req, res) => res.json({ url: targetUrl }))

// Server-side check: verify the target is reachable from this machine
app.get('/api/check-target', (req, res) => {
  if (!targetUrl) return res.json({ ok: false, error: 'No target' })
  const target = new URL(targetUrl)
  const client = target.protocol === 'https:' ? https : http
  const check = client.request({
    hostname: target.hostname,
    port: target.port || 80,
    path: '/',
    method: 'HEAD',
    timeout: 2000,
  }, (r) => {
    res.json({ ok: true, status: r.statusCode })
  })
  check.on('error', (e) => res.json({ ok: false, error: e.message }))
  check.on('timeout', () => { check.destroy(); res.json({ ok: false, error: 'timeout' }) })
  check.end()
})

// Root: redirect browser to Ojito UI, but let iframe through
app.get('/', (req, res, next) => {
  if (req.query._ojito) return next() // iframe request — fall through to proxy
  res.redirect('/app/')
})

// Reverse proxy for everything else
// Serves the target project same-origin so we can inject the bridge
app.use((req, res) => {
  if (!targetUrl) return res.status(502).send('No target configured')

  // Skip API and app routes (already handled above)
  const target = new URL(targetUrl)
  const opts = {
    hostname: target.hostname,
    port: target.port || 80,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: target.host,
      // Request uncompressed so we can modify HTML
      'accept-encoding': 'identity',
    },
  }

  const client = target.protocol === 'https:' ? https : http
  const proxyReq = client.request(opts, (proxyRes) => {
    const ct = proxyRes.headers['content-type'] || ''
    const isHtml = ct.includes('text/html')

    if (isHtml) {
      // Collect HTML, inject bridge, send
      const chunks = []
      proxyRes.on('data', (chunk) => chunks.push(chunk))
      proxyRes.on('end', () => {
        let html = Buffer.concat(chunks).toString('utf-8')

        // Inject bridge script
        const bridgeTag = '<script src="/ojito-bridge.js" data-ojito-bridge></script>'
        if (html.includes('</head>')) {
          html = html.replace('</head>', bridgeTag + '</head>')
        } else if (html.includes('</body>')) {
          html = html.replace('</body>', bridgeTag + '</body>')
        } else {
          html += bridgeTag
        }

        // Send with updated length
        const buf = Buffer.from(html, 'utf-8')
        const headers = { ...proxyRes.headers }
        delete headers['content-length']
        delete headers['content-encoding']
        delete headers['transfer-encoding']
        headers['content-length'] = buf.length
        res.writeHead(proxyRes.statusCode, headers)
        res.end(buf)
      })
    } else {
      // Non-HTML: pipe binary through unchanged
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res)
    }
  })

  proxyReq.on('error', (err) => {
    res.status(502).send('Proxy error: ' + err.message)
  })

  req.pipe(proxyReq)
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ojito corriendo en http://localhost:${PORT}`)
})
