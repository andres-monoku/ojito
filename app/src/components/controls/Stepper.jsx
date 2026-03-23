import { useState, useRef } from 'react'

const SIZE_PROPS = ['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight']
const UNITS = ['px', '%', 'vh', 'vw', 'auto']

export default function Stepper({ prop, value, min = -999, max = 9999, step = 1, unit = 'px', onChange }) {
  const [localVal, setLocalVal] = useState(parseFloat(value) || 0)
  const [localUnit, setLocalUnit] = useState(unit)
  const holdRef = useRef(null)
  const hasSizeUnit = SIZE_PROPS.includes(prop)
  const isAuto = localUnit === 'auto'

  const clamp = v => {
    const rounded = Math.round(v * 100) / 100
    return Math.max(min, Math.min(max, rounded))
  }

  function emitChange(val, u) {
    if (u === 'auto') { onChange?.(prop, 'auto'); return }
    onChange?.(prop, val + u)
  }

  function apply(newVal) {
    const clamped = clamp(newVal)
    setLocalVal(clamped)
    emitChange(clamped, localUnit)
  }

  function startHold(delta) {
    apply(localVal + delta)
    holdRef.current = setTimeout(() => {
      holdRef.current = setInterval(() => {
        setLocalVal(prev => {
          const next = clamp(prev + delta)
          emitChange(next, localUnit)
          return next
        })
      }, 60)
    }, 400)
  }
  function stopHold() { clearTimeout(holdRef.current); clearInterval(holdRef.current) }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flex: 1, minWidth: 0 }}>
      <button className="step-btn" disabled={isAuto}
        onMouseDown={() => !isAuto && startHold(-step)} onMouseUp={stopHold} onMouseLeave={stopHold}
        onTouchStart={e => { e.preventDefault(); !isAuto && startHold(-step) }} onTouchEnd={stopHold}>
        −
      </button>
      <input type="number" className="step-value" value={isAuto ? '' : localVal} disabled={isAuto}
        placeholder={isAuto ? 'auto' : ''} style={{ minWidth: 0 }}
        onChange={e => { const v = parseFloat(e.target.value) || 0; setLocalVal(v); emitChange(v, localUnit) }}
        onKeyDown={e => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const s = e.shiftKey ? step * 10 : step
            apply(localVal + (e.key === 'ArrowUp' ? s : -s))
          }
        }} />
      <button className="step-btn" disabled={isAuto}
        onMouseDown={() => !isAuto && startHold(step)} onMouseUp={stopHold} onMouseLeave={stopHold}
        onTouchStart={e => { e.preventDefault(); !isAuto && startHold(step) }} onTouchEnd={stopHold}>
        +
      </button>
      {hasSizeUnit ? (
        <select className="unit-select" value={localUnit}
          onChange={e => {
            const u = e.target.value
            setLocalUnit(u)
            if (u === 'auto') { onChange?.(prop, 'auto') }
            else { emitChange(localVal, u) }
          }}>
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      ) : (
        <span className="step-unit" style={{ flexShrink: 0 }}>{unit}</span>
      )}
    </div>
  )
}
