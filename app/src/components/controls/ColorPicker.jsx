import { useState } from 'react'
import { rgbToHex } from '../../utils'

export default function ColorPicker({ prop, value, onChange }) {
  const hex = rgbToHex(value)
  const [local, setLocal] = useState(hex)

  return (
    <div className="color-control">
      <div className="color-swatch">
        <div className="color-swatch-inner" style={{ background: local }} />
        <input type="color" value={local}
          onInput={e => { setLocal(e.target.value); onChange?.(prop, e.target.value) }}
        />
      </div>
      <input type="text" className="color-hex" value={local} maxLength={7}
        onChange={e => { setLocal(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange?.(prop, e.target.value) }}
      />
    </div>
  )
}
