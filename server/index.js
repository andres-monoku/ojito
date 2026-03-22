import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3131

let targetUrl = ''

app.use(cors())
app.use(express.json())

// Serve app/ as static files
app.use(express.static(join(__dirname, '..', 'app')))

// Serve the bridge script
app.get('/ojito-bridge.js', (req, res) => {
  res.sendFile(join(__dirname, '..', 'injector', 'ojito-bridge.js'))
})

// Status check
app.get('/api/status', (req, res) => {
  res.json({ ok: true })
})

// Set target URL
app.post('/api/target', (req, res) => {
  targetUrl = req.body.url || ''
  res.json({ ok: true, url: targetUrl })
})

// Get target URL
app.get('/api/target', (req, res) => {
  res.json({ url: targetUrl })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ojito corriendo en http://localhost:${PORT}`)
})
