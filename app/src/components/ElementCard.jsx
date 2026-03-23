import { useOjito } from '../context/OjitoContext'
import { getTagType, generateReadableName } from '../utils'

export default function ElementCard() {
  const { element } = useOjito()
  if (!element) return null

  const tagType = getTagType(element.tag)
  const name = generateReadableName(element)
  const cls = typeof element.className === 'string' ? element.className.split(' ')[0] : ''
  let meta = cls ? '.' + cls : ''
  if (element.id) meta += (meta ? '  ' : '') + '#' + element.id

  return (
    <div className="element-card">
      <div className="element-main">
        <span className={`tag-badge tag-${tagType}`}>{element.tag}</span>
        <span className="el-name">{name}</span>
      </div>
      {meta && <div className="el-meta">{meta}</div>}
    </div>
  )
}
