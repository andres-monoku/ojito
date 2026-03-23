import { useState } from 'react'
import { useOjito } from '../context/OjitoContext'

function buildTreePrompt(changes) {
  // Group changes by element selector
  const groups = {}
  changes.forEach(c => {
    const key = c.selector || c.elementName
    if (!groups[key]) {
      groups[key] = { name: c.elementName, selector: c.selector, xpath: c.xpath, props: [] }
    }
    groups[key].props.push(c)
  })

  let prompt = 'Aplica estos cambios de estilos CSS en el proyecto.\n'
  prompt += 'Localiza cada elemento por su selector y actualiza las propiedades indicadas.\n'
  prompt += 'IMPORTANTE: Usa unidades relativas (%, vw, vh) cuando el valor original las usa.\n'
  prompt += 'No conviertas valores relativos a pixeles absolutos.\n\n'

  Object.values(groups).forEach(group => {
    prompt += `${group.name} (${group.selector})\n`
    prompt += `${'─'.repeat(40)}\n`
    group.props.forEach(p => {
      const prop = p.property.replace(/([A-Z])/g, '-$1').toLowerCase()
      prompt += `  ${prop}: ${p.newValue}\n`
    })
    prompt += '\n'
  })

  prompt += 'Busca cada selector en los archivos CSS, CSS modules, Tailwind classes, o estilos inline del proyecto.\n'
  prompt += 'Si el elemento usa clases de utilidad (Tailwind), actualiza la clase correspondiente.\n'
  prompt += 'Confirma que archivos modificaste.'

  return prompt
}

export default function ChangesBar() {
  const { pendingChanges, discardChanges, clearChanges } = useOjito()
  const [showModal, setShowModal] = useState(false)

  if (pendingChanges.length === 0 && !showModal) return null

  function sendToClip() {
    const prompt = buildTreePrompt(pendingChanges)
    navigator.clipboard.writeText(prompt).then(() => {
      clearChanges()
      setShowModal(true)
    })
  }

  return (
    <>
      {pendingChanges.length > 0 && (
        <div className="changes-bar">
          <div className="changes-info">
            <span className="changes-count">{pendingChanges.length} cambio{pendingChanges.length > 1 ? 's' : ''}</span>
          </div>
          <div className="changes-actions">
            <button className="btn-secondary" onClick={discardChanges}>Descartar</button>
            <button className="btn-primary" onClick={sendToClip}>Enviar a Claude →</button>
          </div>
        </div>
      )}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">📋</div>
            <h2 className="modal-title">Prompt copiado</h2>
            <p className="modal-body">Pégalo en Claude Code con <kbd>⌘V</kbd><br/>y se aplicarán los cambios en tu código.</p>
            <button className="btn-primary btn-full" onClick={() => setShowModal(false)}>Entendido</button>
          </div>
        </div>
      )}
    </>
  )
}
