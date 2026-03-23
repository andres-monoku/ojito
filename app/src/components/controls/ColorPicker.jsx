import { useState } from 'react'
import { useOjito } from '../../context/OjitoContext'
import { rgbToHex } from '../../utils'

function normalizeColor(c) {
  if (!c || c === 'transparent') return null
  if (c.startsWith('#')) return c.toLowerCase()
  const m = c.match(/\d+/g)
  if (!m || m.length < 3) return null
  return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('')
}

function dedup(colors) {
  const seen = new Set()
  return colors.filter(c => {
    const hex = normalizeColor(c)
    if (!hex || seen.has(hex)) return false
    seen.add(hex)
    return true
  }).map(c => normalizeColor(c)).filter(Boolean)
}

export default function ColorPicker({ prop, value, onChange }) {
  const { projectColors } = useOjito()
  const hex = rgbToHex(value)
  const [local, setLocal] = useState(hex)
  const [showPalette, setShowPalette] = useState(false)

  const palette = dedup(projectColors || [])

  function apply(color) {
    setLocal(color)
    onChange?.(prop, color)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div className="color-control">
        <div className="color-swatch" onClick={() => setShowPalette(p => !p)}>
          <div className="color-swatch-inner" style={{ background: local }} />
          <input type="color" value={local}
            onInput={e => apply(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
        </div>
        <input type="text" className="color-hex" value={local} maxLength={7}
          onChange={e => {
            setLocal(e.target.value)
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) apply(e.target.value)
          }} />
        {palette.length > 0 && (
          <button onClick={() => setShowPalette(p => !p)} title="Paleta del proyecto"
            style={{
              width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
              color: showPalette ? 'var(--accent)' : 'var(--text-tertiary)',
              fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 100ms',
            }}>
            ◆
          </button>
        )}
      </div>

      {/* Project palette */}
      {showPalette && palette.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '4px',
          padding: '6px', background: 'var(--bg-elevated)', borderRadius: '8px',
          border: '1px solid var(--border-default)',
        }}>
          {palette.map((color, i) => (
            <div key={i} onClick={() => { apply(color); setShowPalette(false) }}
              title={color}
              style={{
                width: '24px', height: '24px', borderRadius: '6px',
                background: color, cursor: 'pointer',
                border: color === local ? '2px solid var(--accent)' : '1px solid var(--border-default)',
                transition: 'transform 80ms',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
