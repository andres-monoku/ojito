import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useOjito } from '../../context/OjitoContext'

const GOOGLE_FONTS = [
  { name: 'Inter', cat: 'Sans' }, { name: 'DM Sans', cat: 'Sans' },
  { name: 'Outfit', cat: 'Sans' }, { name: 'Plus Jakarta Sans', cat: 'Sans' },
  { name: 'Geist', cat: 'Sans' }, { name: 'Helvetica Neue', cat: 'Sans' },
  { name: 'Playfair Display', cat: 'Serif' }, { name: 'Lora', cat: 'Serif' },
  { name: 'Merriweather', cat: 'Serif' },
  { name: 'Bebas Neue', cat: 'Display' }, { name: 'Oswald', cat: 'Display' },
  { name: 'Syne', cat: 'Display' }, { name: 'Space Grotesk', cat: 'Display' },
  { name: 'JetBrains Mono', cat: 'Mono' }, { name: 'Fira Code', cat: 'Mono' },
]

const preloaded = new Set()
function preloadFont(name) {
  if (preloaded.has(name) || ['Arial', 'Georgia', 'Helvetica Neue', 'system-ui'].includes(name)) return
  preloaded.add(name)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;600&display=swap`
  document.head.appendChild(link)
}

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
  const { projectFonts } = useOjito()
  const cleanFont = value?.split(',')[0].trim().replace(/['"]/g, '') || ''
  const [open, setOpen] = useState(false)
  const [showGoogle, setShowGoogle] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)

  // Preload project fonts + google fonts
  useEffect(() => {
    projectFonts?.forEach(f => preloadFont(f))
    GOOGLE_FONTS.forEach(f => preloadFont(f.name))
  }, [projectFonts])

  useEffect(() => {
    if (!open) return
    const handler = e => {
      if (triggerRef.current?.contains(e.target)) return
      if (dropdownRef.current?.contains(e.target)) return
      setOpen(false)
      setShowGoogle(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function selectFont(name) {
    await loadFontInIframe(name)
    onChange?.('fontFamily', `'${name}', sans-serif`)
    setOpen(false)
    setShowGoogle(false)
    setQuery('')
  }

  const hasProjectFonts = projectFonts && projectFonts.length > 0
  const filteredProject = hasProjectFonts
    ? projectFonts.filter(f => f.toLowerCase().includes(query.toLowerCase()))
    : []
  const filteredGoogle = GOOGLE_FONTS.filter(f =>
    f.name.toLowerCase().includes(query.toLowerCase()) &&
    !projectFonts?.includes(f.name)
  )

  const triggerRect = triggerRef.current?.getBoundingClientRect()

  const s = {
    cat: { fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary, #7a7268)', padding: '8px 12px 4px' },
    opt: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer', transition: 'background 80ms' },
    aa: { fontSize: '18px', color: 'var(--text-primary, #f0ece6)', minWidth: '32px', fontWeight: 500 },
    name: (sel) => ({ fontSize: '12px', color: sel ? 'var(--accent, #e8b86d)' : 'var(--text-secondary, #a89f96)', fontWeight: sel ? 600 : 400 }),
    check: { marginLeft: 'auto', color: 'var(--accent)', fontSize: '12px' },
    explore: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      padding: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
      color: 'var(--accent, #e8b86d)', borderTop: '1px solid var(--border-subtle, #2a2825)',
      background: 'var(--bg-elevated, #242220)', transition: 'background 100ms',
    },
  }

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <button ref={triggerRef} className={`font-trigger ${open ? 'open' : ''}`}
        onClick={() => { setOpen(o => !o); setShowGoogle(false); setQuery('') }}
        style={{ fontFamily: cleanFont || 'inherit' }}>
        <span className="font-trigger-name">{cleanFont || 'Seleccionar'}</span>
        <span className="font-trigger-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && triggerRect && createPortal(
        <div ref={dropdownRef} style={{
          position: 'fixed', top: triggerRect.bottom + 2, left: triggerRect.left,
          width: Math.max(triggerRect.width, 220),
          background: 'var(--bg-panel, #1c1a18)', border: '1px solid var(--border-focus, #e8b86d)',
          borderRadius: '0 0 8px 8px', zIndex: 10000, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          <input type="text" placeholder="Buscar fuente..." value={query}
            onChange={e => setQuery(e.target.value)} autoFocus
            style={{
              width: '100%', height: '36px', border: 'none', boxSizing: 'border-box',
              borderBottom: '1px solid var(--border-subtle, #2a2825)',
              background: 'var(--bg-elevated, #242220)', color: 'var(--text-primary, #f0ece6)',
              fontSize: '12px', padding: '0 12px', outline: 'none',
            }} />

          <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
            {/* Project fonts */}
            {hasProjectFonts && filteredProject.length > 0 && (
              <>
                <div style={s.cat}>Fuentes del proyecto</div>
                {filteredProject.map(f => {
                  const sel = f === cleanFont
                  return (
                    <div key={f} onClick={() => selectFont(f)} style={s.opt}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = sel ? 'var(--accent-subtle)' : 'transparent'}>
                      <span style={{ ...s.aa, fontFamily: `'${f}', sans-serif` }}>Aa</span>
                      <span style={s.name(sel)}>{f}</span>
                      {sel && <span style={s.check}>✓</span>}
                    </div>
                  )
                })}
              </>
            )}

            {/* No project fonts message */}
            {!hasProjectFonts && !showGoogle && (
              <div style={{ padding: '16px 12px', color: 'var(--text-tertiary)', fontSize: '12px', textAlign: 'center' }}>
                No se detectaron fuentes del proyecto
              </div>
            )}

            {/* Google Fonts section */}
            {showGoogle && filteredGoogle.length > 0 && (
              <>
                <div style={s.cat}>Google Fonts</div>
                {filteredGoogle.map(f => {
                  const sel = f.name === cleanFont
                  return (
                    <div key={f.name} onClick={() => selectFont(f.name)} style={s.opt}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = sel ? 'var(--accent-subtle)' : 'transparent'}>
                      <span style={{ ...s.aa, fontFamily: `'${f.name}', sans-serif` }}>Aa</span>
                      <span style={s.name(sel)}>{f.name}</span>
                      {sel && <span style={s.check}>✓</span>}
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {/* Explore Google Fonts button */}
          {!showGoogle && (
            <div onClick={() => setShowGoogle(true)} style={s.explore}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}>
              🔍 Explorar Google Fonts
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
