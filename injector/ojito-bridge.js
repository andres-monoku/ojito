// Ojito Bridge — injected into target iframe via proxy
// Sends element info + children tree to parent on click
;(function () {
  var active = false
  var prev = null

  function getElementData(el, maxText) {
    return {
      tag: el.tagName.toLowerCase(),
      className: (typeof el.className === 'string' ? el.className : '') || '',
      id: el.id || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      role: el.getAttribute('role') || '',
      textContent: (el.textContent || '').trim().slice(0, maxText || 50),
      childCount: el.children.length
    }
  }

  function onHover(e) {
    if (!active || e.target === prev) return
    e.target._ojitoPrev = e.target.style.outline
    e.target.style.outline = '2px solid rgba(91,156,246,0.4)'
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
    el.style.outline = '2px solid #5b9cf6'
    prev = el

    // Collect children (max 10)
    var children = []
    var kids = el.children
    var max = Math.min(kids.length, 10)
    for (var i = 0; i < max; i++) {
      children.push(getElementData(kids[i], 30))
    }

    window.parent.postMessage({
      type: 'ojito-element',
      element: getElementData(el, 50),
      children: children
    }, '*')
  }

  function activate() {
    active = true
    document.body.style.cursor = 'crosshair'
  }

  function deactivate() {
    active = false
    document.body.style.cursor = ''
    if (prev) {
      prev.style.outline = prev._ojitoPrev || ''
      prev = null
    }
  }

  window.addEventListener('message', function (e) {
    if (!e.data) return
    if (e.data.type === 'ojito-activate') activate()
    if (e.data.type === 'ojito-deactivate') deactivate()
  })

  document.addEventListener('mouseover', onHover, true)
  document.addEventListener('mouseout', onHoverOut, true)
  document.addEventListener('click', onClick, true)
})()
