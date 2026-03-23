import express from 'express'
import cors from 'cors'
import http from 'http'
import https from 'https'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { homedir } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3131

// ── API key lookup (multi-source) ──
function getAnthropicKey() {
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('Ojito: API key desde variable de entorno')
    return process.env.ANTHROPIC_API_KEY
  }

  const paths = [
    join(homedir(), '.claude', 'credentials'),
    join(homedir(), '.claude', '.credentials'),
    join(homedir(), '.config', 'claude', 'credentials'),
    join(homedir(), '.claude', 'config.json'),
    join(homedir(), '.config', 'claude', 'config.json'),
    join(__dirname, '..', '.env'),
    join(homedir(), '.env'),
  ]

  for (const p of paths) {
    if (!existsSync(p)) continue
    try {
      const raw = readFileSync(p, 'utf8').trim()
      if (raw.startsWith('{')) {
        const json = JSON.parse(raw)
        const key = json.api_key || json.anthropic_api_key || json.ANTHROPIC_API_KEY || json.claudeApiKey
        if (key && key.startsWith('sk-ant-')) {
          console.log('Ojito: API key desde', p)
          return key
        }
      }
      const lines = raw.split('\n')
      for (const line of lines) {
        const match = line.match(/^ANTHROPIC_API_KEY\s*=\s*["']?(.+?)["']?\s*$/)
        if (match && match[1].startsWith('sk-ant-')) {
          console.log('Ojito: API key desde', p)
          return match[1]
        }
        if (line.trim().startsWith('sk-ant-')) {
          console.log('Ojito: API key desde', p)
          return line.trim()
        }
      }
    } catch {}
  }

  console.warn('Ojito: No se encontro API key')
  return null
}

const anthropicKey = getAnthropicKey()
if (anthropicKey) console.log('Ojito: Naming inteligente activado')
else console.log('Ojito: Sin API key — naming desactivado')

// ── Persist target to disk ──
const TARGET_FILE = join(__dirname, '.target')
let targetUrl = ''
try { targetUrl = readFileSync(TARGET_FILE, 'utf-8').trim() } catch {}
function saveTarget(url) {
  targetUrl = url
  try { writeFileSync(TARGET_FILE, url) } catch {}
}

// ── Site context (in-memory, per session) ──
let siteContext = null

app.use(cors())
app.use(express.json())

// Ojito app UI at /app/
app.use('/app', express.static(join(__dirname, '..', 'app')))

// Bridge script
app.get('/ojito-bridge.js', (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.sendFile(join(__dirname, '..', 'injector', 'ojito-bridge.js'))
})

// ── API ──
app.get('/api/status', (req, res) => res.json({ ok: true }))

app.post('/api/target', (req, res) => {
  saveTarget(req.body.url || '')
  siteContext = null // reset context when target changes
  res.json({ ok: true, url: targetUrl })
})

app.get('/api/target', (req, res) => res.json({ url: targetUrl }))

// Server-side reachability check
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

// ── Site context ──
app.post('/api/set-context', (req, res) => {
  siteContext = req.body || null
  res.json({ ok: true })
})

// ── Smart name suggestion ──
app.post('/api/suggest-name', async (req, res) => {
  const apiKey = anthropicKey || getAnthropicKey()
  if (!apiKey) {
    return res.json({ ok: false, error: 'NO_API_KEY' })
  }

  const { tag, className, id, textContent, childCount, xpath } = req.body

  const contextBlock = siteContext ? `
Contexto del sitio:
- Titulo: ${siteContext.title || '(sin titulo)'}
- Descripcion: ${siteContext.metaDescription || '(sin descripcion)'}
- Headings principales: ${(siteContext.h1s || []).join(', ') || '(ninguno)'}
- Secciones: ${(siteContext.h2s || []).join(', ') || '(ninguna)'}
- Navegacion: ${(siteContext.navItems || []).join(', ') || '(ninguna)'}
` : 'No hay contexto disponible del sitio.'

  const systemPrompt = 'Eres el asistente de Ojito, inspector visual de diseno. Generas nombres claros y cortos para elementos HTML basandote en el contexto real del sitio. Responde SOLO con JSON valido, sin markdown.'

  const userPrompt = `${contextBlock}

Genera un nombre claro en espanol para este elemento. Debe ser 2-4 palabras, descriptivo, que un disenador no tecnico entienda facilmente.

Elemento: ${tag}
Clase CSS: ${className || 'ninguna'}
ID: ${id || 'ninguno'}
Hijos directos: ${childCount}
Texto visible: ${textContent || 'ninguno'}
Posicion en pagina: ${xpath || 'desconocida'}

Responde con este JSON exacto:
{"name": "Nombre sugerido", "reason": "Razon en maximo 8 palabras"}`

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

// Root: redirect browser to Ojito UI, let iframe through
app.get('/', (req, res, next) => {
  if (req.query._ojito) return next()
  res.redirect('/app/')
})

// Reverse proxy
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
  console.log(`API key: ${anthropicKey ? 'detectada' : 'no encontrada'}`)
})
