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
    selectElement(e.target)
  }

  function selectElement(el) {
    if (prev) prev.style.outline = prev._ojitoPrev || ''
    el._ojitoPrev = el.style.outline
    el.style.outline = '2px solid #e8b86d'
    prev = el

    var children = []
    var kids = el.children
    var max = Math.min(kids.length, 10)
    for (var i = 0; i < max; i++) {
      children.push(getElementData(kids[i], 30))
    }

    var elData = getElementData(el, 50)
    elData.xpath = getXPath(el)

    var computed = window.getComputedStyle(el)
    var v = function(p) { return computed.getPropertyValue(p).trim() }
    var n = function(p) { return parseFloat(v(p)) || 0 }
    // Try to get the authored CSS value (from matched rules) to preserve units
    var authored = function(prop) {
      try {
        // Check inline style first
        var inline = el.style.getPropertyValue(prop)
        if (inline) return inline
        // Check matched CSS rules
        var rules = el.ownerDocument.defaultView.getMatchedCSSRules
          ? el.ownerDocument.defaultView.getMatchedCSSRules(el) : null
        if (rules) {
          for (var i = rules.length - 1; i >= 0; i--) {
            var val = rules[i].style.getPropertyValue(prop)
            if (val) return val
          }
        }
      } catch(e) {}
      return ''
    }
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
      fontFamily: v('font-family'),
      textAlign: v('text-align'), textTransform: v('text-transform'),
      // Raw authored values for size props (to preserve %, vw, vh)
      _rawWidth: authored('width') || v('width'),
      _rawHeight: authored('height') || v('height'),
      _rawMaxWidth: authored('max-width') || v('max-width'),
      _rawMinHeight: authored('min-height') || v('min-height'),
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
    try {
      return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
    } catch (err) {
      return null
    }
  }

  function getXPath(el) {
    if (el.id) return '//*[@id="' + el.id + '"]'
    var parts = []
    var node = el
    while (node && node.nodeType === 1) {
      var idx = 1
      var sib = node.previousSibling
      while (sib) {
        if (sib.nodeType === 1 && sib.tagName === node.tagName) idx++
        sib = sib.previousSibling
      }
      parts.unshift(node.tagName.toLowerCase() + '[' + idx + ']')
      node = node.parentNode
    }
    return '/' + parts.join('/')
  }

  window.addEventListener('message', function (e) {
    if (!e.data) return
    if (e.data.type === 'ojito-activate') activate()
    if (e.data.type === 'ojito-deactivate') deactivate()
    if (e.data.type === 'ojito-reselect') {
      var target = e.data.xpath ? getElementByXpath(e.data.xpath) : prev
      if (target) selectElement(target)
      return
    }
    if (e.data.type === 'ojito-scroll-to-selected') {
      if (!prev) return
      var rect = prev.getBoundingClientRect()
      var vh = window.innerHeight
      var panelH = vh * 0.55
      if (rect.bottom > vh - panelH) {
        window.scrollBy({ top: rect.bottom - (vh - panelH) + 40, behavior: 'smooth' })
      }
      return
    }
    if (e.data.type === 'ojito-apply-style') {
      var target = getElementByXpath(e.data.xpath)
      if (!target) { console.warn('Ojito: element not found for', e.data.xpath); return }
      var cssProp = e.data.property.replace(/([A-Z])/g, '-$1').toLowerCase()
      // Apply to the target element
      target.style.setProperty(cssProp, e.data.value, 'important')
      // Also apply to all elements with the same class for consistency
      var cls = typeof target.className === 'string' ? target.className.split(/\s+/)[0] : ''
      if (cls && !cls.startsWith('ojito')) {
        var siblings = document.querySelectorAll('.' + CSS.escape(cls))
        for (var si = 0; si < siblings.length; si++) {
          siblings[si].style.setProperty(cssProp, e.data.value, 'important')
        }
      }
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
      // Extract project design tokens: colors and fonts
      var projectColors = new Set()
      var projectFonts = new Set()
      try {
        // Scan CSS variables from :root
        var rootStyle = getComputedStyle(document.documentElement)
        var sheets = document.styleSheets
        for (var s = 0; s < sheets.length; s++) {
          try {
            var rules = sheets[s].cssRules || sheets[s].rules
            if (!rules) continue
            for (var r = 0; r < rules.length; r++) {
              var rule = rules[r]
              if (!rule.style) continue
              // Colors
              var colorProps = ['color', 'background-color', 'border-color', 'fill', 'stroke']
              for (var ci = 0; ci < colorProps.length; ci++) {
                var cv = rule.style.getPropertyValue(colorProps[ci])
                if (cv && cv !== 'inherit' && cv !== 'initial' && cv !== 'transparent' && cv !== 'currentColor') {
                  projectColors.add(cv.trim())
                }
              }
              // CSS variables that look like colors
              var cssText = rule.cssText || ''
              var varMatches = cssText.match(/--[a-zA-Z0-9-]+:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))/g)
              if (varMatches) {
                for (var vi = 0; vi < varMatches.length; vi++) {
                  var parts = varMatches[vi].split(':')
                  if (parts[1]) projectColors.add(parts[1].trim())
                }
              }
              // Fonts
              var ff = rule.style.getPropertyValue('font-family')
              if (ff) {
                ff.split(',').forEach(function(f) {
                  var clean = f.trim().replace(/['"]/g, '')
                  if (clean && clean !== 'inherit' && clean !== 'sans-serif' && clean !== 'serif' && clean !== 'monospace' && clean !== 'system-ui')
                    projectFonts.add(clean)
                })
              }
            }
          } catch(e) { /* cross-origin sheet */ }
        }
        // Also scan loaded Google Fonts links
        var links = document.querySelectorAll('link[href*="fonts.googleapis.com"]')
        links.forEach(function(link) {
          var match = link.href.match(/family=([^&:]+)/g)
          if (match) match.forEach(function(m) {
            var name = decodeURIComponent(m.replace('family=', '').replace(/\+/g, ' '))
            projectFonts.add(name)
          })
        })
      } catch(e) {}
      context.projectColors = Array.from(projectColors).slice(0, 30)
      context.projectFonts = Array.from(projectFonts).slice(0, 15)
      window.parent.postMessage({ type: 'ojito-context', context: context }, '*')
    }
  })

  document.addEventListener('mouseover', onHover, true)
  document.addEventListener('mouseout', onHoverOut, true)
  document.addEventListener('click', onClick, true)

  // Mobile touch selection
  document.addEventListener('touchend', function (e) {
    if (!active) return
    e.preventDefault()
    e.stopPropagation()
    var touch = e.changedTouches[0]
    var el = document.elementFromPoint(touch.clientX, touch.clientY)
    if (el) selectElement(el)
  }, { capture: true, passive: false })
})()
