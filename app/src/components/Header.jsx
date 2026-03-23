import { useState } from 'react'
import { useOjito } from '../context/OjitoContext'

const VIEWPORTS = [
  { id: 'desktop', label: '🖥', title: 'Desktop (100%)', width: null },
  { id: 'tablet', label: '⊞', title: 'Tablet (768px)', width: 768 },
  { id: 'mobile', label: '☐', title: 'Mobile (375px)', width: 375 },
]

export default function Header() {
  const { isActive, toggleInspector, element } = useOjito()
  const [viewport, setViewport] = useState('desktop')
  const isMobile = window.innerWidth < 768

  function changeViewport(vp) {
    setViewport(vp.id)
    const iframe = document.getElementById('project-frame')
    const canvas = document.getElementById('canvas')
    if (!iframe || !canvas) return

    if (vp.width) {
      iframe.style.maxWidth = vp.width + 'px'
      iframe.style.margin = '0 auto'
      iframe.style.boxShadow = '0 0 0 1px var(--border-default)'
      iframe.style.borderRadius = '8px'
      canvas.style.background = 'var(--bg-base, #0e0d0c)'
      canvas.style.display = 'flex'
      canvas.style.alignItems = 'stretch'
      canvas.style.justifyContent = 'center'
      canvas.style.padding = '8px'
    } else {
      iframe.style.maxWidth = ''
      iframe.style.margin = ''
      iframe.style.boxShadow = ''
      iframe.style.borderRadius = ''
      canvas.style.background = ''
      canvas.style.display = ''
      canvas.style.alignItems = ''
      canvas.style.justifyContent = ''
      canvas.style.padding = ''
    }

    // After viewport change, re-query the selected element
    // so computed styles update to the new viewport size
    if (element?.xpath) {
      setTimeout(() => {
        iframe.contentWindow?.postMessage({
          type: 'ojito-reselect', xpath: element.xpath
        }, '*')
      }, 400)
    }
  }

  return (
    <header id="panel-header">
      <div className="header-brand">
        <span className="brand-eye">👁</span>
        <span className="brand-name">ojito</span>
      </div>
      <div className="header-actions">
        {!isMobile && (
          <div style={{ display: 'flex', gap: '2px', marginRight: '4px' }}>
            {VIEWPORTS.map(vp => (
              <button
                key={vp.id}
                title={vp.title}
                onClick={() => changeViewport(vp)}
                style={{
                  width: '28px', height: '24px', borderRadius: '4px',
                  background: viewport === vp.id ? 'var(--accent-dim)' : 'transparent',
                  border: viewport === vp.id ? '1px solid var(--border-focus)' : '1px solid transparent',
                  color: viewport === vp.id ? 'var(--accent)' : 'var(--text-tertiary)',
                  cursor: 'pointer', fontSize: '12px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', transition: 'all 100ms',
                  padding: 0,
                }}
              >
                {vp.id === 'desktop' ? '🖥' : vp.id === 'tablet' ? '⊞' : '☐'}
              </button>
            ))}
          </div>
        )}
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
