export default function SelectControl({ prop, value, options, onChange }) {
  return (
    <select className="prop-select" value={value}
      onChange={e => onChange?.(prop, e.target.value)}>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  )
}
