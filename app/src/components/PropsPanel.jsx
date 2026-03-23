import { useOjito } from '../context/OjitoContext'
import Stepper from './controls/Stepper'
import OpacitySlider from './controls/OpacitySlider'
import ColorPicker from './controls/ColorPicker'
import SelectControl from './controls/SelectControl'
import FontPicker from './controls/FontPicker'
import SizingControl from './controls/SizingControl'
import SpacingGroup from './SpacingGroup'

function detectUnit(rawValue) {
  if (!rawValue || rawValue === 'auto') return 'auto'
  if (rawValue.includes('%')) return '%'
  if (rawValue.includes('vw')) return 'vw'
  if (rawValue.includes('vh')) return 'vh'
  if (rawValue.includes('rem')) return 'rem'
  if (rawValue.includes('em')) return 'em'
  return 'px'
}

function PropRow({ label, children }) {
  return (
    <div className="prop-row">
      <span className="prop-label">{label}</span>
      {children}
    </div>
  )
}

function PropGroup({ title, children }) {
  return (
    <div className="prop-group">
      <div className="prop-group-title">{title}</div>
      {children}
    </div>
  )
}

export default function PropsPanel() {
  const { styles, hasDirectText, trackChange, applyStyle } = useOjito()
  if (!styles) return null

  function handleChange(prop, value) {
    applyStyle(prop, value)
    trackChange(prop, '', value)
  }

  const isFlex = styles.display === 'flex' || styles.display === 'inline-flex'
  const bgTransparent = !styles.backgroundColor || styles.backgroundColor === 'rgba(0, 0, 0, 0)' || styles.backgroundColor === 'transparent'

  return (
    <div>
      {/* Layout */}
      <PropGroup title="LAYOUT">
        <PropRow label="display">
          <SelectControl prop="display" value={styles.display}
            options={['block','flex','grid','inline','inline-flex','inline-block','none']}
            onChange={handleChange} />
        </PropRow>
        {isFlex && <>
          <PropRow label="direction">
            <SelectControl prop="flexDirection" value={styles.flexDirection}
              options={['row','column','row-reverse','column-reverse']} onChange={handleChange} />
          </PropRow>
          <PropRow label="justify">
            <SelectControl prop="justifyContent" value={styles.justifyContent}
              options={['flex-start','center','flex-end','space-between','space-around','space-evenly']} onChange={handleChange} />
          </PropRow>
          <PropRow label="align">
            <SelectControl prop="alignItems" value={styles.alignItems}
              options={['flex-start','center','flex-end','stretch','baseline']} onChange={handleChange} />
          </PropRow>
          <PropRow label="gap">
            <Stepper prop="gap" value={parseFloat(styles.gap) || 0} min={0} max={200} step={1} unit="px" onChange={handleChange} />
          </PropRow>
        </>}
      </PropGroup>

      {/* Spacing */}
      <SpacingGroup styles={styles} onChange={handleChange} />

      {/* Sizing — Figma-style Hug/Fill/Fixed */}
      <PropGroup title="TAMAÑO">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>width</div>
            <SizingControl prop="width" rawValue={styles._rawWidth} computedValue={styles.width} onChange={handleChange} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>height</div>
            <SizingControl prop="height" rawValue={styles._rawHeight} computedValue={styles.height} onChange={handleChange} />
          </div>
        </div>
      </PropGroup>

      {/* Visual — always show all controls */}
      <PropGroup title="VISUAL">
        <PropRow label="bg-color">
          <ColorPicker prop="backgroundColor" value={styles.backgroundColor || 'transparent'} onChange={handleChange} />
        </PropRow>
        <PropRow label="opacity">
          <OpacitySlider value={styles.opacity} onChange={handleChange} />
        </PropRow>
        <PropRow label="radius">
          <Stepper prop="borderRadius" value={styles.borderRadius || 0} min={0} max={200} step={1} unit="px" onChange={handleChange} />
        </PropRow>
      </PropGroup>

      {/* Typography */}
      {hasDirectText && (
        <PropGroup title="TIPOGRAFÍA">
          <PropRow label="font">
            <FontPicker value={styles.fontFamily} onChange={handleChange} />
          </PropRow>
          <PropRow label="color">
            <ColorPicker prop="color" value={styles.color} onChange={handleChange} />
          </PropRow>
          <PropRow label="size">
            <Stepper prop="fontSize" value={styles.fontSize} min={8} max={200} step={1} unit="px" onChange={handleChange} />
          </PropRow>
          <PropRow label="weight">
            <SelectControl prop="fontWeight" value={styles.fontWeight}
              options={['100','200','300','400','500','600','700','800','900']} onChange={handleChange} />
          </PropRow>
          <PropRow label="line-h">
            <Stepper prop="lineHeight" value={parseFloat(styles.lineHeight) || 1.5} min={0.5} max={4} step={0.1} unit="" showUnit={false} onChange={handleChange} />
          </PropRow>
          <PropRow label="spacing">
            <Stepper prop="letterSpacing" value={parseFloat(styles.letterSpacing) || 0} min={-10} max={50} step={0.5} unit="px" onChange={handleChange} />
          </PropRow>
        </PropGroup>
      )}
    </div>
  )
}
