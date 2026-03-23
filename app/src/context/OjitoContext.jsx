import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const OjitoContext = createContext(null)

export function OjitoProvider({ children }) {
  const [isActive, setIsActive] = useState(false)
  const [element, setElement] = useState(null)
  const [childElements, setChildElements] = useState([])
  const [styles, setStyles] = useState(null)
  const [hasDirectText, setHasDirectText] = useState(false)
  const [pendingChanges, setPendingChanges] = useState([])
  const [projectColors, setProjectColors] = useState([])
  const [projectFonts, setProjectFonts] = useState([])

  // Listen for toggle events from app.js (keyboard shortcut, mobile FAB)
  useEffect(() => {
    const handleToggle = () => toggleInspector()
    const handleOff = () => { setIsActive(false); const iframe = document.getElementById('project-frame'); iframe?.contentWindow?.postMessage({ type: 'ojito-deactivate' }, '*') }
    window.addEventListener('ojito-toggle', handleToggle)
    window.addEventListener('ojito-toggle-off', handleOff)
    return () => { window.removeEventListener('ojito-toggle', handleToggle); window.removeEventListener('ojito-toggle-off', handleOff) }
  })

  useEffect(() => {
    function handleMessage(e) {
      if (e.data?.type === 'ojito-context') {
        if (e.data.context?.projectColors) setProjectColors(e.data.context.projectColors)
        if (e.data.context?.projectFonts) setProjectFonts(e.data.context.projectFonts)
      }
      if (e.data?.type === 'ojito-element') {
        setElement(e.data.element)
        setChildElements(e.data.children || [])
        setStyles(e.data.styles || null)
        setHasDirectText(e.data.hasDirectText || false)
        if (window.innerWidth < 768) {
          document.getElementById('inspector')?.classList.add('panel-open')
          const c = document.getElementById('canvas')
          if (c) c.style.height = '45vh'
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const applyStyle = useCallback((property, value) => {
    const iframe = document.getElementById('project-frame')
    iframe?.contentWindow?.postMessage({
      type: 'ojito-apply-style',
      xpath: element?.xpath,
      property,
      value
    }, '*')
  }, [element])

  const trackChange = useCallback((property, oldValue, newValue) => {
    applyStyle(property, newValue)
    setPendingChanges(prev => {
      const filtered = prev.filter(c => !(c.property === property && c.xpath === element?.xpath))
      const cls = typeof element?.className === 'string' ? element.className.split(' ')[0] : ''
      return [...filtered, {
        elementName: element?.tag || 'element',
        selector: cls ? '.' + cls : element?.tag,
        xpath: element?.xpath,
        property,
        oldValue: String(oldValue),
        newValue: String(newValue)
      }]
    })
  }, [element, applyStyle])

  const toggleInspector = useCallback(() => {
    const next = !isActive
    setIsActive(next)
    const iframe = document.getElementById('project-frame')
    iframe?.contentWindow?.postMessage({
      type: next ? 'ojito-activate' : 'ojito-deactivate'
    }, '*')
  }, [isActive])

  const discardChanges = useCallback(() => {
    setPendingChanges([])
    const iframe = document.getElementById('project-frame')
    if (iframe) { const s = iframe.src; iframe.src = 'about:blank'; setTimeout(() => { iframe.src = s }, 100) }
  }, [])

  const clearChanges = useCallback(() => setPendingChanges([]), [])

  return (
    <OjitoContext.Provider value={{
      isActive, toggleInspector,
      element, childElements, styles, hasDirectText,
      pendingChanges, trackChange, applyStyle,
      discardChanges, clearChanges,
      projectColors, projectFonts
    }}>
      {children}
    </OjitoContext.Provider>
  )
}

export const useOjito = () => useContext(OjitoContext)
