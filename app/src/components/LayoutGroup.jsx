import { useState, useEffect } from 'react'
import SizingControl from './controls/SizingControl'

/**
 * Unified Layout + Auto Layout + Sizing panel — Figma-inspired
 * Compact grid layout with visual controls
 */

const DISPLAY_OPTIONS = [
  { id: 'block', icon: '▬', label: 'Block' },
  { id: 'flex', icon: '⬒', label: 'Flex' },
  { id: 'grid', icon: '⊞', label: 'Grid' },
  { id: 'inline', icon: '—', label: 'Inline' },
  { id: 'none', icon: '✕', label: 'None' },
]

const DIRECTION_OPTIONS = [
  { id: 'row', icon: '→' },
  { id: 'column', icon: '↓' },
  { id: 'row-reverse', icon: '←' },
  { id: 'column-reverse', icon: '↑' },
]

const JUSTIFY_OPTIONS = [
  { id: 'flex-start', icon: '⫿⫿·' },
  { id: 'center', icon: '·⫿·' },
  { id: 'flex-end', icon: '·⫿⫿' },
  { id: 'space-between', icon: '⫿·⫿' },
  { id: 'space-around', icon: '·⫿·⫿·' },
]

const ALIGN_OPTIONS = [
  { id: 'flex-start', icon: '⫾' },
  { id: 'center', icon: '⫿' },
  { id: 'flex-end', icon: '⫾' },
  { id: 'stretch', icon: '⟛' },
]

const WRAP_OPTIONS = [
  { id: 'nowrap', label: 'No wrap' },
  { id: 'wrap', label: 'Wrap' },
]

const s = {
  group: { marginBottom: '16px' },
  title: {
    fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
    color: 'var(--text-secondary)', textTransform: 'uppercase',
    marginBottom: '8px', paddingBottom: '4px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: '6px',
    marginBottom: '6px',
  },
  label: {
    fontSize: '10px', color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)', minWidth: '14px',
    flexShrink: 0,
  },
  wideLabel: {
    fontSize: '10px', color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)', minWidth: '40px',
    flexShrink: 0,
  },
  btnGroup: {
    display: 'flex', gap: '2px', flex: 1,
  },
  btn: (active) => ({
    flex: 1, height: '28px', borderRadius: '5px',
    background: active ? 'var(--accent-dim)' : 'var(--bg-elevated)',
    border: `1px solid ${active ? 'var(--border-focus)' : 'var(--border-default)'}`,
    color: active ? 'var(--accent)' : 'var(--text-tertiary)',
    fontSize: '12px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 100ms', fontFamily: 'var(--font-ui)', padding: 0,
  }),
  smBtn: (active) => ({
    width: '28px', height: '28px', borderRadius: '5px', flexShrink: 0,
    background: active ? 'var(--accent-dim)' : 'var(--bg-elevated)',
    border: `1px solid ${active ? 'var(--border-focus)' : 'var(--border-default)'}`,
    color: active ? 'var(--accent)' : 'var(--text-tertiary)',
    fontSize: '13px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 100ms', padding: 0,
  }),
  inlineInput: {
    flex: 1, height: '28px', minWidth: 0,
    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
    borderRadius: '6px', color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500,
    textAlign: 'center', padding: '0 4px', outline: 'none',
    MozAppearance: 'textfield',
  },
  unit: {
    fontSize: '10px', color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)', flexShrink: 0,
  },
  divider: {
    height: '1px', background: 'var(--border-subtle)',
    margin: '8px 0',
  },
  pair: {
    display: 'flex', gap: '6px', flex: 1,
  },
  pairItem: {
    display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0,
  },
}

function InlineNum({ label, value, unit = 'px', prop, onChange }) {
  const [local, setLocal] = useState(parseFloat(value) || 0)
  useEffect(() => { setLocal(parseFloat(value) || 0) }, [value])

  return (
    <div style={s.pairItem}>
      <span style={{ ...s.label, minWidth: '10px' }}>{label}</span>
      <input type="number" style={s.inlineInput} value={local}
        onChange={e => { const v = parseFloat(e.target.value) || 0; setLocal(v); onChange?.(prop, v + unit) }}
        onKeyDown={e => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const step = e.shiftKey ? 10 : 1
            const delta = e.key === 'ArrowUp' ? step : -step
            const next = local + delta
            setLocal(next)
            onChange?.(prop, next + unit)
          }
        }}
      />
    </div>
  )
}

export default function LayoutGroup({ styles, onChange }) {
  if (!styles) return null

  const display = styles.display || 'block'
  const isFlex = display === 'flex' || display === 'inline-flex'
  const direction = styles.flexDirection || 'row'
  const justify = styles.justifyContent || 'flex-start'
  const align = styles.alignItems || 'stretch'
  const wrap = styles.flexWrap || 'nowrap'
  const gap = parseFloat(styles.gap) || 0

  return (
    <div style={s.group}>
      <div style={s.title}>AUTO LAYOUT</div>

      {/* Display mode */}
      <div style={s.row}>
        <div style={s.btnGroup}>
          {DISPLAY_OPTIONS.map(d => (
            <button key={d.id} style={s.btn(display === d.id || (d.id === 'flex' && display === 'inline-flex'))}
              title={d.label} onClick={() => onChange?.('display', d.id)}>
              {d.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Flex controls — only if flex */}
      {isFlex && (
        <>
          {/* Direction + Wrap */}
          <div style={s.row}>
            <div style={{ display: 'flex', gap: '2px' }}>
              {DIRECTION_OPTIONS.map(d => (
                <button key={d.id} style={s.smBtn(direction === d.id)}
                  title={d.id} onClick={() => onChange?.('flexDirection', d.id)}>
                  {d.icon}
                </button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
              {WRAP_OPTIONS.map(w => (
                <button key={w.id} style={{ ...s.btn(wrap === w.id), flex: 'none', padding: '0 8px', fontSize: '9px' }}
                  onClick={() => onChange?.('flexWrap', w.id)}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Justify + Align (visual buttons) */}
          <div style={s.row}>
            <span style={s.label} title="justify-content">J</span>
            <div style={s.btnGroup}>
              {JUSTIFY_OPTIONS.map(j => (
                <button key={j.id} style={s.smBtn(justify === j.id)}
                  title={j.id} onClick={() => onChange?.('justifyContent', j.id)}>
                  <span style={{ fontSize: '9px', letterSpacing: '-1px' }}>{j.icon}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={s.row}>
            <span style={s.label} title="align-items">A</span>
            <div style={s.btnGroup}>
              {ALIGN_OPTIONS.map((a, i) => (
                <button key={a.id + i} style={s.smBtn(align === a.id)}
                  title={a.id} onClick={() => onChange?.('alignItems', a.id)}>
                  {a.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Gap */}
          <div style={s.row}>
            <span style={s.wideLabel}>gap</span>
            <InlineNum label="" value={gap} unit="px" prop="gap" onChange={onChange} />
            <span style={s.unit}>px</span>
          </div>
        </>
      )}

      <div style={s.divider} />

      {/* Sizing — W and H stacked */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={s.row}>
          <span style={{ ...s.label, minWidth: '14px', fontWeight: 600 }}>W</span>
          <SizingControl prop="width" rawValue={styles._rawWidth} computedValue={styles.width} onChange={onChange} />
        </div>
        <div style={s.row}>
          <span style={{ ...s.label, minWidth: '14px', fontWeight: 600 }}>H</span>
          <SizingControl prop="height" rawValue={styles._rawHeight} computedValue={styles.height} onChange={onChange} />
        </div>
      </div>
    </div>
  )
}
