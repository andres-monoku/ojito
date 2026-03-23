import { useState, useRef } from 'react'

export default function Stepper({ prop, value, min = -999, max = 9999, step = 1, unit = 'px', showUnit = true, onChange }) {
  const [localVal, setLocalVal] = useState(parseFloat(value) || 0)
  const holdRef = useRef(null)
  const clamp = v => Math.max(min, Math.min(max, Math.round(v / step) * step))

  function apply(newVal) {
    const clamped = clamp(newVal)
    setLocalVal(clamped)
    onChange?.(prop, unit ? clamped + unit : String(clamped))
  }

  function startHold(delta) {
    apply(localVal + delta)
    holdRef.current = setTimeout(() => {
      holdRef.current = setInterval(() => {
        setLocalVal(prev => {
          const next = clamp(prev + delta)
          onChange?.(prop, unit ? next + unit : String(next))
          return next
        })
      }, 60)
    }, 400)
  }
  function stopHold() { clearTimeout(holdRef.current); clearInterval(holdRef.current) }

  return (
    <div className="stepper">
      <button className="step-btn" onMouseDown={() => startHold(-step)} onMouseUp={stopHold} onMouseLeave={stopHold}
        onTouchStart={e => { e.preventDefault(); startHold(-step) }} onTouchEnd={stopHold}>−</button>
      <input type="number" className="step-value" value={localVal}
        onChange={e => { const v = parseFloat(e.target.value) || 0; setLocalVal(v); onChange?.(prop, unit ? v + unit : String(v)) }}
        onKeyDown={e => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const s = e.shiftKey ? step * 10 : step
            apply(localVal + (e.key === 'ArrowUp' ? s : -s))
          }
        }} />
      <button className="step-btn" onMouseDown={() => startHold(step)} onMouseUp={stopHold} onMouseLeave={stopHold}
        onTouchStart={e => { e.preventDefault(); startHold(step) }} onTouchEnd={stopHold}>+</button>
      {showUnit && <span className="step-unit">{unit}</span>}
    </div>
  )
}
