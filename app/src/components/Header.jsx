import { useOjito } from '../context/OjitoContext'

export default function Header() {
  const { isActive, toggleInspector } = useOjito()

  return (
    <header id="panel-header">
      <div className="header-brand">
        <span className="brand-eye">👁</span>
        <span className="brand-name">ojito</span>
      </div>
      <div className="header-actions">
        <div className={`status ${isActive ? 'active' : 'inactive'}`}>
          <span className="status-dot" />
          <span className="status-label">{isActive ? 'activo' : 'inactivo'}</span>
        </div>
        <button
          className={`fab-btn ${isActive ? 'active' : ''}`}
          onClick={toggleInspector}
          title="Ctrl+Shift+X"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
