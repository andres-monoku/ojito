import { useState } from 'react'

export default function OpacitySlider({ value, onChange }) {
  const [local, setLocal] = useState(Math.round((parseFloat(value) || 1) * 100))

  return (
    <div className="opacity-control" style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
      <input type="range" className="opacity-slider" min={0} max={100} step={1} value={local}
        style={{ '--opacity-pct': local + '%' }}
        onInput={e => { const v = parseInt(e.target.value); setLocal(v); onChange?.('opacity', (v / 100).toString()) }}
      />
      <span className="opacity-value">{local}%</span>
    </div>
  )
}
