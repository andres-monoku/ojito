import { useOjito } from '../context/OjitoContext'
import { getTagType, generateReadableName } from '../utils'

export default function LayersTree() {
  const { element, childElements } = useOjito()
  if (!element) return null

  const nodes = [element, ...(childElements || []).slice(0, 8)]

  return (
    <div className="layers-tree">
      {nodes.map((node, i) => {
        const tagType = getTagType(node.tag)
        const name = generateReadableName(node)
        return (
          <div key={i} className={`layer-node ${i === 0 ? 'selected' : ''}`}>
            <span className={`tag-badge tag-${tagType}`}>{node.tag}</span>
            <span className="layer-node-name">{name}</span>
          </div>
        )
      })}
    </div>
  )
}
