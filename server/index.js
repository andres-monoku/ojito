import express from 'express'
import cors from 'cors'
import http from 'http'
import https from 'https'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3131

// Load .env manually (no dependency needed)
const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.+?)\s*$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  })
}

// Persist target to disk so it survives restarts
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

// Smart name suggestion via Claude API
app.post('/api/suggest-name', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'ANTHROPIC_API_KEY no configurada. Agrega tu key en ~/Documents/ojito/.env' })
  }

  const { tag, className, id, textContent, childCount } = req.body

  const systemPrompt = 'Eres el asistente de Ojito, un inspector visual de diseno. Tu tarea es generar nombres claros, cortos y semanticos para elementos HTML. Responde SOLO con un objeto JSON, sin markdown, sin explicaciones.'
  const userPrompt = `Genera un nombre claro en espanol para este elemento HTML. Debe ser 2-4 palabras maximo, descriptivo, que un disenador no tecnico entienda.

Elemento: ${tag}
Clase: ${className || '(sin clase)'}
ID: ${id || '(sin id)'}
Hijos: ${childCount} elementos hijos
Texto visible: ${textContent || '(sin texto)'}

Responde con este JSON exacto:
{"name": "Nombre sugerido", "reason": "Por que este nombre en maximo 8 palabras"}`

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    })

    const data = await apiRes.json()
    if (data.error) {
      return res.json({ ok: false, error: data.error.message })
    }

    const text = data.content?.[0]?.text || ''
    try {
      const parsed = JSON.parse(text)
      res.json({ ok: true, name: parsed.name, reason: parsed.reason })
    } catch {
      res.json({ ok: false, error: 'Response no es JSON valido' })
    }
  } catch (e) {
    res.json({ ok: false, error: e.message })
  }
})

// Root: redirect browser to Ojito UI, but let iframe through
app.get('/', (req, res, next) => {
  if (req.query._ojito) return next()
  res.redirect('/app/')
})

// Reverse proxy for everything else
app.use((req, res) => {
  if (!targetUrl) return res.status(502).send('No target configured')

  const target = new URL(targetUrl)
  const opts = {
    hostname: target.hostname,
    port: target.port || 80,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: target.host,
      'accept-encoding': 'identity',
    },
  }

  const client = target.protocol === 'https:' ? https : http
  const proxyReq = client.request(opts, (proxyRes) => {
    const ct = proxyRes.headers['content-type'] || ''
    const isHtml = ct.includes('text/html')

    if (isHtml) {
      const chunks = []
      proxyRes.on('data', (chunk) => chunks.push(chunk))
      proxyRes.on('end', () => {
        let html = Buffer.concat(chunks).toString('utf-8')
        const bridgeTag = '<script src="/ojito-bridge.js" data-ojito-bridge></script>'
        if (html.includes('</head>')) {
          html = html.replace('</head>', bridgeTag + '</head>')
        } else if (html.includes('</body>')) {
          html = html.replace('</body>', bridgeTag + '</body>')
        } else {
          html += bridgeTag
        }
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
