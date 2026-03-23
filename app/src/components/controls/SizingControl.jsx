import { useState, useEffect } from 'react'

/**
 * Figma-style sizing control with modes:
 * - Fixed: explicit px value
 * - Fill: 100% of parent (width:100%, flex:1)
 * - Hug: fit content (width:fit-content, height:auto)
 * - Auto: browser default (auto)
 */

const MODES = [
  { id: 'hug', label: 'Hug', title: 'Ajustar al contenido' },
  { id: 'fill', label: 'Fill', title: 'Llenar contenedor' },
  { id: 'fixed', label: 'Fix', title: 'Valor fijo' },
]

function detectMode(rawValue, computedValue) {
  if (!rawValue) return 'hug'
  const r = rawValue.trim().toLowerCase()
  if (r === 'auto' || r === 'fit-content' || r === 'max-content' || r === 'min-content') return 'hug'
  if (r === '100%' || r === '100vw' || r === '100vh') return 'fill'
  if (r.includes('%') && parseFloat(r) >= 95) return 'fill'
  return 'fixed'
}

function detectUnit(rawValue) {
  if (!rawValue) return 'px'
  const r = rawValue.trim()
  if (r.includes('%')) return '%'
  if (r.includes('vw')) return 'vw'
  if (r.includes('vh')) return 'vh'
  if (r.includes('rem')) return 'rem'
  if (r.includes('em')) return 'em'
  return 'px'
}

const UNITS = ['px', '%', 'vw', 'vh', 'rem']

export default function SizingControl({ prop, rawValue, computedValue, onChange }) {
  const [mode, setMode] = useState(() => detectMode(rawValue, computedValue))
  const [numVal, setNumVal] = useState(() => parseFloat(computedValue) || 0)
  const [unit, setUnit] = useState(() => detectUnit(rawValue))

  useEffect(() => {
    setMode(detectMode(rawValue, computedValue))
    setNumVal(parseFloat(computedValue) || 0)
    setUnit(detectUnit(rawValue))
  }, [rawValue, computedValue])

  function applyMode(newMode) {
    setMode(newMode)
    switch (newMode) {
      case 'hug':
        onChange?.(prop, prop === 'height' ? 'auto' : 'fit-content')
        break
      case 'fill':
        onChange?.(prop, '100%')
        setUnit('%')
        setNumVal(100)
        break
      case 'fixed':
        onChange?.(prop, Math.round(numVal) + 'px')
        setUnit('px')
        break
    }
  }

  function applyValue(val, u) {
    setNumVal(val)
    setUnit(u)
    onChange?.(prop, val + u)
  }

  const isFixed = mode === 'fixed'

  const s = {
    container: {
      display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0, overflow: 'hidden',
    },
    modeRow: {
      display: 'flex', gap: '2px', minWidth: 0,
    },
    modeBtn: (active) => ({
      flex: 1, height: '24px', borderRadius: '4px', padding: 0,
      background: active ? 'var(--accent-dim)' : 'var(--bg-elevated)',
      border: `1px solid ${active ? 'var(--border-focus)' : 'var(--border-default)'}`,
      color: active ? 'var(--accent)' : 'var(--text-tertiary)',
      fontSize: '9px', fontWeight: active ? 600 : 400,
      cursor: 'pointer', display: 'flex', alignItems: 'center',
      justifyContent: 'center', transition: 'all 100ms',
      fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap',
    }),
    valueRow: {
      display: 'flex', alignItems: 'center', gap: '3px',
    },
    input: {
      flex: 1, height: '28px', minWidth: 0,
      background: isFixed ? 'var(--bg-elevated)' : 'var(--bg-active)',
      border: '1px solid var(--border-default)', borderRadius: '6px',
      color: isFixed ? 'var(--text-primary)' : 'var(--text-disabled)',
      fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500,
      textAlign: 'center', padding: '0 4px', outline: 'none',
      MozAppearance: 'textfield',
    },
    unitSelect: {
      height: '28px', minWidth: '40px',
      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
      borderRadius: '6px', color: 'var(--text-secondary)',
      fontFamily: 'var(--font-mono)', fontSize: '10px',
      padding: '0 4px', cursor: 'pointer', appearance: 'none',
      textAlign: 'center', outline: 'none',
    },
    readOnly: {
      flex: 1, height: '28px',
      background: 'var(--bg-active)', border: '1px solid var(--border-default)',
      borderRadius: '6px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'var(--font-mono)',
      fontSize: '12px', color: 'var(--text-tertiary)',
    },
  }

  return (
    <div style={s.container}>
      {/* Mode buttons */}
      <div style={s.modeRow}>
        {MODES.map(m => (
          <button key={m.id} style={s.modeBtn(mode === m.id)}
            title={m.title} onClick={() => applyMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Value row */}
      {isFixed ? (
        <div style={s.valueRow}>
          <input type="number" style={s.input} value={Math.round(numVal * 100) / 100}
            onChange={e => {
              const v = parseFloat(e.target.value) || 0
              setNumVal(v)
              onChange?.(prop, v + unit)
            }}
            onKeyDown={e => {
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault()
                const step = e.shiftKey ? 10 : 1
                const delta = e.key === 'ArrowUp' ? step : -step
                const next = Math.max(0, numVal + delta)
                applyValue(next, unit)
              }
            }}
          />
          <select style={s.unitSelect} value={unit}
            onChange={e => { setUnit(e.target.value); applyValue(numVal, e.target.value) }}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      ) : (
        <div style={s.readOnly}>
          {mode === 'hug' ? 'Auto' : '100%'}
        </div>
      )}
    </div>
  )
}
