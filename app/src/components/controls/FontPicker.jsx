import { useState, useRef, useEffect } from 'react'

const FONTS = [
  { name: 'Inter', cat: 'Sans' }, { name: 'DM Sans', cat: 'Sans' },
  { name: 'Outfit', cat: 'Sans' }, { name: 'Plus Jakarta Sans', cat: 'Sans' },
  { name: 'Geist', cat: 'Sans' }, { name: 'Helvetica Neue', cat: 'Sans' },
  { name: 'Arial', cat: 'Sans' },
  { name: 'Playfair Display', cat: 'Serif' }, { name: 'Lora', cat: 'Serif' },
  { name: 'Georgia', cat: 'Serif' },
  { name: 'Bebas Neue', cat: 'Display' }, { name: 'Oswald', cat: 'Display' },
  { name: 'Syne', cat: 'Display' }, { name: 'Space Grotesk', cat: 'Display' },
  { name: 'JetBrains Mono', cat: 'Mono' }, { name: 'Fira Code', cat: 'Mono' },
]

async function loadFontInIframe(name) {
  try {
    const doc = document.getElementById('project-frame')?.contentDocument
    if (!doc) return
    const id = 'ojito-gf-' + name.replace(/\s+/g, '_')
    if (doc.getElementById(id)) return
    const link = doc.createElement('link')
    link.id = id; link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;500;600;700&display=swap`
    doc.head.appendChild(link)
    await new Promise(r => { link.onload = r; setTimeout(r, 2000) })
  } catch {}
}

export default function FontPicker({ value, onChange }) {
  const cleanFont = value?.split(',')[0].trim().replace(/['"]/g, '') || ''
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function selectFont(name) {
    await loadFontInIframe(name)
    onChange?.('fontFamily', `'${name}', sans-serif`)
    setOpen(false); setQuery('')
  }

  const filtered = FONTS.filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
  const grouped = {}
  filtered.forEach(f => { if (!grouped[f.cat]) grouped[f.cat] = []; grouped[f.cat].push(f) })

  return (
    <div className="font-picker" ref={ref} style={{ flex: 1, position: 'relative' }}>
      <button className={`font-trigger ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)}
        style={{ fontFamily: cleanFont || 'inherit' }}>
        <span className="font-trigger-name">{cleanFont || 'Seleccionar'}</span>
        <span className="font-trigger-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="font-dropdown">
          <input type="text" className="font-search" placeholder="Buscar fuente..." value={query}
            onChange={e => setQuery(e.target.value)} autoFocus />
          <div className="font-options">
            {Object.entries(grouped).map(([cat, fonts]) => (
              <div key={cat}>
                <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', padding: '6px 12px 2px' }}>{cat}</div>
                {fonts.map(f => (
                  <div key={f.name} className={`font-option ${f.name === cleanFont ? 'selected' : ''}`} onClick={() => selectFont(f.name)}>
                    <span className="font-option-aa" style={{ fontFamily: `'${f.name}', sans-serif` }}>Aa</span>
                    <span className="font-option-name">{f.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
