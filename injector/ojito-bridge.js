// Ojito Bridge — injected into target iframe
// Sends element info to parent via postMessage
;(function () {
  var prev = null

  document.addEventListener('click', function (e) {
    e.preventDefault()
    e.stopPropagation()

    if (prev) prev.style.outline = prev._ojitoPrevOutline || ''

    var el = e.target
    el._ojitoPrevOutline = el.style.outline
    el.style.outline = '2px solid #3b82f6'
    prev = el

    window.parent.postMessage({
      type: 'ojito-element',
      tag: el.tagName.toLowerCase(),
      className: (typeof el.className === 'string' ? el.className.split(' ')[0] : '') || '',
      id: el.id || ''
    }, '*')
  }, true)

  document.addEventListener('mouseover', function (e) {
    if (e.target === prev) return
    e.target._ojitoPrevOutline = e.target.style.outline
    e.target.style.outline = '2px solid rgba(59,130,246,0.4)'
  }, true)

  document.addEventListener('mouseout', function (e) {
    if (e.target === prev) return
    e.target.style.outline = e.target._ojitoPrevOutline || ''
  }, true)
})()
