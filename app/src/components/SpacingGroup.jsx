import { useState } from 'react'

function SpacingChip({ prop, value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(Math.round(parseFloat(value) || 0))

  if (editing) {
    return (
      <input className="spacing-chip active" type="number" defaultValue={local} autoFocus
        style={{ width: '40px', height: '28px', background: 'var(--accent)', color: '#111', border: 'none',
          borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px', textAlign: 'center', outline: 'none' }}
        onFocus={e => e.target.select()}
        onBlur={e => { const v = Math.round(parseFloat(e.target.value) || 0); setLocal(v); setEditing(false); onChange?.(prop, v + 'px') }}
        onKeyDown={e => {
          if (e.key === 'Enter') e.target.blur()
          if (e.key === 'Escape') setEditing(false)
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const d = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1)
            e.target.value = (parseFloat(e.target.value) || 0) + d
            onChange?.(prop, parseFloat(e.target.value) + 'px')
          }
        }}
        onChange={e => onChange?.(prop, (parseFloat(e.target.value) || 0) + 'px')}
      />
    )
  }
  return <div className="spacing-chip" onClick={() => setEditing(true)}>{local}</div>
}

export default function SpacingGroup({ styles, onChange }) {
  if (!styles) return null
  return (
    <div className="prop-group">
      <div className="prop-group-title">ESPACIADO</div>
      <div className="spacing-diagram">
        <div className="spacing-zone margin-zone">
          <span className="spacing-zone-label">margin</span>
          <div className="spacing-zone-row">
            <SpacingChip prop="marginTop" value={styles.marginTop} onChange={onChange} />
          </div>
          <div className="spacing-zone-middle">
            <SpacingChip prop="marginLeft" value={styles.marginLeft} onChange={onChange} />
            <div className="spacing-zone padding-zone">
              <span className="spacing-zone-label">padding</span>
              <div className="spacing-zone-row">
                <SpacingChip prop="paddingTop" value={styles.paddingTop} onChange={onChange} />
              </div>
              <div className="spacing-zone-middle">
                <SpacingChip prop="paddingLeft" value={styles.paddingLeft} onChange={onChange} />
                <div className="spacing-element"><span className="spacing-element-label">elemento</span></div>
                <SpacingChip prop="paddingRight" value={styles.paddingRight} onChange={onChange} />
              </div>
              <div className="spacing-zone-row">
                <SpacingChip prop="paddingBottom" value={styles.paddingBottom} onChange={onChange} />
              </div>
            </div>
            <SpacingChip prop="marginRight" value={styles.marginRight} onChange={onChange} />
          </div>
          <div className="spacing-zone-row">
            <SpacingChip prop="marginBottom" value={styles.marginBottom} onChange={onChange} />
          </div>
        </div>
      </div>
    </div>
  )
}
