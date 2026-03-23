import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

const FONTS = [
  { name: 'Inter', cat: 'Sans' }, { name: 'DM Sans', cat: 'Sans' },
  { name: 'Outfit', cat: 'Sans' }, { name: 'Plus Jakarta Sans', cat: 'Sans' },
  { name: 'Geist', cat: 'Sans' }, { name: 'Helvetica Neue', cat: 'Sans' },
  { name: 'Arial', cat: 'Sans' }, { name: 'system-ui', cat: 'Sans' },
  { name: 'Playfair Display', cat: 'Serif' }, { name: 'Lora', cat: 'Serif' },
  { name: 'Merriweather', cat: 'Serif' }, { name: 'Georgia', cat: 'Serif' },
  { name: 'Bebas Neue', cat: 'Display' }, { name: 'Oswald', cat: 'Display' },
  { name: 'Syne', cat: 'Display' }, { name: 'Space Grotesk', cat: 'Display' },
  { name: 'JetBrains Mono', cat: 'Mono' }, { name: 'Fira Code', cat: 'Mono' },
]

// Preload Google Fonts for previews in the Ojito app
const preloaded = new Set()
function preloadFont(name) {
  if (preloaded.has(name) || ['Arial', 'Georgia', 'Helvetica Neue', 'system-ui'].includes(name)) return
  preloaded.add(name)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;600&display=swap`
  document.head.appendChild(link)
}
FONTS.forEach(f => preloadFont(f.name))

async function loadFontInIframe(name) {
  try {
    const doc = document.getElementById('project-frame')?.contentDocument
    if (!doc) return
    const id = 'ojito-gf-' + name.replace(/\s+/g, '_')
    if (doc.getElementById(id)) return
    const link = doc.createElement('link')
    link.id = id; link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap`
    doc.head.appendChild(link)
    await new Promise(r => { link.onload = r; setTimeout(r, 2000) })
  } catch {}
}

export default function FontPicker({ value, onChange }) {
  const cleanFont = value?.split(',')[0].trim().replace(/['"]/g, '') || ''
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = e => {
      if (triggerRef.current?.contains(e.target)) return
      if (dropdownRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function selectFont(name) {
    await loadFontInIframe(name)
    onChange?.('fontFamily', `'${name}', sans-serif`)
    setOpen(false)
    setQuery('')
  }

  const filtered = FONTS.filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
  const grouped = {}
  filtered.forEach(f => { if (!grouped[f.cat]) grouped[f.cat] = []; grouped[f.cat].push(f) })

  // Position dropdown relative to trigger
  const triggerRect = triggerRef.current?.getBoundingClientRect()

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <button
        ref={triggerRef}
        className={`font-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        style={{ fontFamily: cleanFont || 'inherit' }}
      >
        <span className="font-trigger-name">{cleanFont || 'Seleccionar'}</span>
        <span className="font-trigger-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && triggerRect && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: triggerRect.bottom + 2,
            left: triggerRect.left,
            width: triggerRect.width,
            background: 'var(--bg-panel, #1c1a18)',
            border: '1px solid var(--border-focus, #e8b86d)',
            borderRadius: '0 0 6px 6px',
            zIndex: 10000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <input
            type="text"
            placeholder="Buscar fuente..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            style={{
              width: '100%', height: '36px', border: 'none',
              borderBottom: '1px solid var(--border-subtle, #2a2825)',
              background: 'var(--bg-elevated, #242220)',
              color: 'var(--text-primary, #f0ece6)',
              fontSize: '12px', padding: '0 12px', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {Object.entries(grouped).map(([cat, fonts]) => (
              <div key={cat}>
                <div style={{
                  fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--text-tertiary, #7a7268)', padding: '8px 12px 4px',
                }}>{cat}</div>
                {fonts.map(f => (
                  <div
                    key={f.name}
                    onClick={() => selectFont(f.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', cursor: 'pointer',
                      background: f.name === cleanFont ? 'var(--accent-subtle, rgba(232,184,109,0.06))' : 'transparent',
                      transition: 'background 80ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, #2a2825)'}
                    onMouseLeave={e => e.currentTarget.style.background = f.name === cleanFont ? 'var(--accent-subtle)' : 'transparent'}
                  >
                    <span style={{
                      fontFamily: `'${f.name}', sans-serif`,
                      fontSize: '18px', color: 'var(--text-primary, #f0ece6)',
                      minWidth: '32px', fontWeight: 500,
                    }}>Aa</span>
                    <span style={{
                      fontSize: '12px',
                      color: f.name === cleanFont ? 'var(--accent, #e8b86d)' : 'var(--text-secondary, #a89f96)',
                      fontWeight: f.name === cleanFont ? 600 : 400,
                    }}>{f.name}</span>
                    {f.name === cleanFont && (
                      <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: '12px' }}>✓</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '16px 12px', color: 'var(--text-tertiary)', fontSize: '12px', textAlign: 'center' }}>
                No se encontraron fuentes
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
