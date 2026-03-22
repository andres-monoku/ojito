// Ojito Bridge — injected into target iframe
// Waits for activation message from parent, then tracks clicks/hovers
;(function () {
  console.log('[ojito-bridge] loaded')
  var active = false
  var prev = null

  function onHover(e) {
    if (!active || e.target === prev) return
    e.target._ojitoPrev = e.target.style.outline
    e.target.style.outline = '2px solid rgba(59,130,246,0.4)'
  }

  function onHoverOut(e) {
    if (!active || e.target === prev) return
    e.target.style.outline = e.target._ojitoPrev || ''
  }

  function onClick(e) {
    if (!active) return
    e.preventDefault()
    e.stopPropagation()

    if (prev) prev.style.outline = prev._ojitoPrev || ''

    var el = e.target
    el._ojitoPrev = el.style.outline
    el.style.outline = '2px solid #3b82f6'
    prev = el

    window.parent.postMessage({
      type: 'ojito-element',
      tag: el.tagName.toLowerCase(),
      className: el.classList[0] || '',
      id: el.id || ''
    }, '*')
  }

  function activate() {
    active = true
    document.body.style.cursor = 'crosshair'
    console.log('[ojito-bridge] activated')
  }

  function deactivate() {
    active = false
    document.body.style.cursor = ''
    if (prev) {
      prev.style.outline = prev._ojitoPrev || ''
      prev = null
    }
  }

  // Listen for activation from parent
  window.addEventListener('message', function (e) {
    if (!e.data) return
    if (e.data.type === 'ojito-activate') activate()
    if (e.data.type === 'ojito-deactivate') deactivate()
  })

  // Register listeners (they check `active` flag internally)
  document.addEventListener('mouseover', onHover, true)
  document.addEventListener('mouseout', onHoverOut, true)
  document.addEventListener('click', onClick, true)
})()
