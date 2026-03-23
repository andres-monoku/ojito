import { useState } from 'react'
import { useOjito } from '../context/OjitoContext'

export default function ChangesBar() {
  const { pendingChanges, discardChanges, clearChanges } = useOjito()
  const [showModal, setShowModal] = useState(false)

  if (pendingChanges.length === 0 && !showModal) return null

  function sendToClip() {
    let prompt = 'Aplica los siguientes cambios de estilos CSS en el proyecto.\n\n'
    pendingChanges.forEach(c => {
      prompt += `• ${c.elementName} (${c.selector})\n  ${c.property}: ${c.oldValue} → ${c.newValue}\n\n`
    })
    prompt += 'Aplica cada cambio en el archivo CSS o modulo correspondiente. Confirma que archivos modificaste.'
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
