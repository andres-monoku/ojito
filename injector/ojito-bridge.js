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

    var elData = getElementData(el, 50)
    elData.xpath = getXPath(el)

    // Computed styles
    var computed = window.getComputedStyle(el)
    var v = function(p) { return computed.getPropertyValue(p).trim() }
    var n = function(p) { return parseFloat(v(p)) || 0 }
    var styles = {
      display: v('display'), flexDirection: v('flex-direction'),
      justifyContent: v('justify-content'), alignItems: v('align-items'),
      flexWrap: v('flex-wrap'), gap: v('gap'),
      paddingTop: n('padding-top'), paddingRight: n('padding-right'),
      paddingBottom: n('padding-bottom'), paddingLeft: n('padding-left'),
      marginTop: n('margin-top'), marginRight: n('margin-right'),
      marginBottom: n('margin-bottom'), marginLeft: n('margin-left'),
      width: v('width'), height: v('height'),
      minWidth: v('min-width'), maxWidth: v('max-width'),
      minHeight: v('min-height'), maxHeight: v('max-height'),
      backgroundColor: v('background-color'), color: v('color'),
      opacity: v('opacity'), borderRadius: n('border-radius'),
      borderWidth: n('border-width'), borderStyle: v('border-style'),
      borderColor: v('border-color'), boxShadow: v('box-shadow'),
      fontSize: n('font-size'), fontWeight: v('font-weight'),
      lineHeight: v('line-height'), letterSpacing: v('letter-spacing'),
      textAlign: v('text-align'), textTransform: v('text-transform')
    }
    var hasDirectText = Array.from(el.childNodes).some(function(nd) {
      return nd.nodeType === 3 && nd.textContent.trim().length > 0
    })

    window.parent.postMessage({
      type: 'ojito-element',
      element: elData,
      children: children,
      styles: styles,
      hasDirectText: hasDirectText
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

  function getElementByXpath(xpath) {
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
  }

  function getXPath(el) {
    var parts = []
    var node = el
    while (node && node.nodeType === 1) {
      var idx = 1
      var sib = node.previousElementSibling
      while (sib) { idx++; sib = sib.previousElementSibling }
      parts.unshift(node.tagName.toLowerCase() + '[' + idx + ']')
      node = node.parentElement
    }
    return '/' + parts.join('/')
  }

  window.addEventListener('message', function (e) {
    if (!e.data) return
    if (e.data.type === 'ojito-activate') activate()
    if (e.data.type === 'ojito-deactivate') deactivate()
    if (e.data.type === 'ojito-apply-style') {
      var target = getElementByXpath(e.data.xpath)
      if (target) target.style[e.data.property] = e.data.value
      return
    }
    if (e.data.type === 'ojito-get-context') {
      var context = {
        title: document.title || '',
        metaDescription: (document.querySelector('meta[name="description"]') || {}).content || '',
        h1s: Array.from(document.querySelectorAll('h1')).map(function(h) { return h.textContent.trim() }).slice(0, 3),
        h2s: Array.from(document.querySelectorAll('h2')).map(function(h) { return h.textContent.trim() }).slice(0, 5),
        navItems: Array.from(document.querySelectorAll('nav a, [role="navigation"] a')).map(function(a) { return a.textContent.trim() }).filter(function(t) { return t.length > 0 }).slice(0, 8),
        bodyText: (document.body.innerText || '').trim().slice(0, 300)
      }
      window.parent.postMessage({ type: 'ojito-context', context: context }, '*')
    }
  })

  document.addEventListener('mouseover', onHover, true)
  document.addEventListener('mouseout', onHoverOut, true)
  document.addEventListener('click', onClick, true)
})()
