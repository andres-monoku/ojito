const iframe = document.getElementById('project-frame')
const elementInfo = document.getElementById('element-info')
const treeContainer = document.getElementById('tree-container')
const fab = document.getElementById('fab')
const statusDot = document.getElementById('status-dot')
const statusText = document.getElementById('status-text')
const inspector = document.getElementById('inspector')
const canvas = document.getElementById('canvas')

let inspecting = false
let currentElement = null
let isMobile = window.innerWidth < 768

// Saved names from session
const savedNames = JSON.parse(sessionStorage.getItem('ojito-names') || '{}')
const ignoredElements = new Set()

window.addEventListener('resize', () => { isMobile = window.innerWidth < 768 })

// ── Tag classification ──
const TAG_TYPES = {
  container: ['div','section','main','article','nav','header','footer','aside','ul','ol','li','dl','form','fieldset','details','summary','figure'],
  text: ['h1','h2','h3','h4','h5','h6','p','span','label','strong','em','b','i','small','blockquote','pre','code','time','abbr'],
  interactive: ['button','a','input','select','textarea','option'],
  media: ['img','video','audio','svg','canvas','picture','source','iframe'],
}

function getTagType(tag) {
  for (const [type, tags] of Object.entries(TAG_TYPES)) {
    if (tags.includes(tag)) return type
  }
  return 'other'
}

function createTagPill(tag) {
  const pill = document.createElement('span')
  pill.className = 'tag-pill ' + getTagType(tag)
  pill.textContent = tag
  return pill
}

// ── Readable name generation ──
function generateReadableName(data) {
  // Check saved names first
  const key = getElementKey(data)
  if (savedNames[key]) return savedNames[key]

  if (data.ariaLabel) return data.ariaLabel
  if (/^h[1-6]$/.test(data.tag) && data.textContent) {
    return data.textContent.slice(0, 24) + (data.textContent.length > 24 ? '...' : '')
  }
  if (data.role) return data.role.charAt(0).toUpperCase() + data.role.slice(1)

  const cls = typeof data.className === 'string' ? data.className.split(' ')[0] : ''
  const semantic = ['hero','navbar','nav','footer','card','button','modal','sidebar','header','banner','menu','dialog','alert','toast']
  for (const s of semantic) {
    if (cls.toLowerCase().includes(s) || (data.id && data.id.toLowerCase().includes(s))) {
      return s.charAt(0).toUpperCase() + s.slice(1).replace(/[-_]/g, ' ')
    }
  }
  if (data.id && !data.id.match(/^\d+$/) && data.id.length > 2) {
    return data.id.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
  if (cls) {
    const clean = cls.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    if (clean.length <= 30) return clean
  }
  if (data.textContent && data.textContent.length > 0 && data.textContent.length <= 20) {
    return data.textContent
  }
  return data.tag + (data.childCount > 0 ? ' \u00b7 ' + data.childCount : '')
}

function getElementKey(data) {
  return data.tag + ':' + (data.id || '') + ':' + (typeof data.className === 'string' ? data.className.split(' ')[0] : '')
}

// ── Is name confusing? ──
function isNameConfusing(data) {
  const { tag, className, id, ariaLabel, role, textContent } = data
  if (ariaLabel || role) return false
  if (textContent && textContent.length > 3) return false
  if (id && !id.match(/^\d+$/) && id.length > 2) return false
  const cls = typeof className === 'string' ? className.split(' ')[0] : ''
  const technicalPattern = /^[\d\-_]+$|col-|row-|flex-|grid-|box_|wrapper|inner|outer/i
  if (cls && technicalPattern.test(cls)) return true
  if (!cls && !id && (!textContent || textContent.length === 0)) return true
  return false
}

// ── Render element info ──
function renderElementInfo(data) {
  currentElement = data
  const card = document.createElement('div')
  card.className = 'element-card'

  const main = document.createElement('div')
  main.className = 'element-main'
  main.appendChild(createTagPill(data.tag))
  const name = document.createElement('span')
  name.className = 'element-name'
  name.id = 'current-name'
  name.textContent = generateReadableName(data)
  main.appendChild(name)
  card.appendChild(main)

  const cls = typeof data.className === 'string' ? data.className.split(' ')[0] : ''
  if (cls) {
    const classEl = document.createElement('div')
    classEl.className = 'element-class'
    classEl.textContent = '.' + cls
    card.appendChild(classEl)
  }

  if (data.id) {
    const idEl = document.createElement('div')
    idEl.className = 'element-id'
    idEl.textContent = '#' + data.id
    card.appendChild(idEl)
  }

  // Suggestion chip
  const key = getElementKey(data)
  if (isNameConfusing(data) && !savedNames[key] && !ignoredElements.has(key)) {
    const chip = document.createElement('div')
    chip.className = 'suggest-chip'
    chip.innerHTML = '<span class="suggest-star">\u2726</span> Le damos un nombre mas claro?'
    chip.addEventListener('click', () => requestSuggestion(data, chip))
    card.appendChild(chip)
  }

  elementInfo.innerHTML = ''
  elementInfo.appendChild(card)
}

// ── Request name suggestion from Claude ──
async function requestSuggestion(data, chip) {
  chip.innerHTML = '<span class="suggest-loading"><span>.</span><span>.</span><span>.</span></span> Analizando'
  chip.style.pointerEvents = 'none'

  try {
    const res = await fetch('/api/suggest-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag: data.tag,
        className: data.className,
        id: data.id,
        textContent: data.textContent,
        childCount: data.childCount
      })
    })
    const result = await res.json()

    if (!result.ok) {
      chip.innerHTML = '<span class="suggest-star">\u2726</span> ' + (result.error || 'Error')
      chip.style.pointerEvents = 'auto'
      return
    }

    // Show suggestion with accept/ignore buttons
    chip.className = 'suggest-result'
    chip.innerHTML = ''

    const suggested = document.createElement('div')
    suggested.className = 'suggest-name'
    suggested.innerHTML = '<span class="suggest-star">\u2726</span> ' + result.name

    const reason = document.createElement('div')
    reason.className = 'suggest-reason'
    reason.textContent = result.reason

    const actions = document.createElement('div')
    actions.className = 'suggest-actions'

    const acceptBtn = document.createElement('button')
    acceptBtn.className = 'suggest-accept'
    acceptBtn.textContent = 'Usar este nombre'
    acceptBtn.addEventListener('click', () => {
      const key = getElementKey(data)
      savedNames[key] = result.name
      sessionStorage.setItem('ojito-names', JSON.stringify(savedNames))
      const nameEl = document.getElementById('current-name')
      if (nameEl) nameEl.textContent = result.name
      chip.remove()
      showToast('Nombre actualizado')
    })

    const ignoreBtn = document.createElement('button')
    ignoreBtn.className = 'suggest-ignore'
    ignoreBtn.textContent = 'Ignorar'
    ignoreBtn.addEventListener('click', () => {
      ignoredElements.add(getElementKey(data))
      chip.style.opacity = '0'
      setTimeout(() => chip.remove(), 200)
    })

    actions.appendChild(acceptBtn)
    actions.appendChild(ignoreBtn)
    chip.appendChild(suggested)
    chip.appendChild(reason)
    chip.appendChild(actions)
    chip.style.pointerEvents = 'auto'
  } catch (e) {
    chip.innerHTML = '<span class="suggest-star">\u2726</span> Sin conexion'
    chip.style.pointerEvents = 'auto'
  }
}

// ── Toast ──
function showToast(msg) {
  const existing = document.querySelector('.toast')
  if (existing) existing.remove()
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = '\u2713 ' + msg
  inspector.appendChild(toast)
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 200) }, 2000)
}

// ── Render tree ──
function renderTree(element, children) {
  treeContainer.innerHTML = ''

  if (isMobile) {
    // Horizontal scroll for mobile
    const row = document.createElement('div')
    row.className = 'tree-row-mobile'
    row.appendChild(createMobilePill(element, true))
    if (children) {
      children.slice(0, 8).forEach(child => {
        row.appendChild(createMobilePill(child, false))
      })
    }
    treeContainer.appendChild(row)
    return
  }

  const tree = document.createElement('div')
  tree.className = 'tree'
  tree.appendChild(createTreeNode(element, 0, true))
  if (children && children.length > 0) {
    const childrenWrap = document.createElement('div')
    childrenWrap.className = 'tree-children'
    const maxShow = 8
    children.slice(0, maxShow).forEach((child, i) => {
      const node = createTreeNode(child, 1, false)
      node.style.animationDelay = (i * 30) + 'ms'
      childrenWrap.appendChild(node)
    })
    if (children.length > maxShow) {
      const more = document.createElement('div')
      more.className = 'tree-more'
      more.textContent = '\u00b7\u00b7\u00b7 ' + (children.length - maxShow) + ' mas'
      childrenWrap.appendChild(more)
    }
    tree.appendChild(childrenWrap)
  }
  treeContainer.appendChild(tree)
}

function createMobilePill(data, isSelected) {
  const pill = document.createElement('div')
  pill.className = 'mobile-layer-pill' + (isSelected ? ' selected' : '')
  pill.appendChild(createTagPill(data.tag))
  const name = document.createElement('span')
  name.textContent = generateReadableName(data)
  pill.appendChild(name)
  return pill
}

function createTreeNode(data, depth, isSelected) {
  const node = document.createElement('div')
  node.className = 'tree-node' + (isSelected ? ' selected' : '')
  node.style.paddingLeft = (8 + depth * 4) + 'px'

  if (data.childCount > 0) {
    const toggle = document.createElement('span')
    toggle.className = 'tree-toggle'
    toggle.textContent = depth === 0 ? '\u25BC' : '\u25B6'
    node.appendChild(toggle)
  } else {
    const spacer = document.createElement('span')
    spacer.className = 'tree-spacer'
    node.appendChild(spacer)
  }

  node.appendChild(createTagPill(data.tag))
  const name = document.createElement('span')
  name.className = 'node-name'
  name.textContent = generateReadableName(data)
  node.appendChild(name)
  return node
}

// ── Status ──
function setStatus(active) {
  statusDot.classList.toggle('active', active)
  statusText.textContent = active ? 'activo' : 'inactivo'
}

function showStatus(msg) {
  elementInfo.innerHTML = '<div class="empty-state"><span class="empty-icon">&#x1F441;</span><span class="empty-text">' + msg + '</span></div>'
  treeContainer.innerHTML = '<div class="empty-state"><span class="empty-text">El arbol aparece al\nseleccionar un elemento</span></div>'
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Mobile sheet ──
function showMobileSheet() {
  if (!isMobile) return
  inspector.classList.add('visible')
  canvas.style.height = 'calc(100vh - 200px)'
  canvas.style.marginTop = '200px'
}

function hideMobileSheet() {
  if (!isMobile) return
  inspector.classList.remove('visible')
  canvas.style.height = '100vh'
  canvas.style.marginTop = '0'
}

// ── Init ──
async function init() {
  try {
    const res = await fetch('/api/target')
    const data = await res.json()
    if (data.url) {
      await loadTarget(data.url)
    } else {
      showStatus('Ejecuta /ojito en Claude Code\npara cargar tu proyecto')
    }
  } catch {
    showStatus('Ejecuta /ojito en Claude Code\npara cargar tu proyecto')
  }
}

async function loadTarget(url) {
  if (!url) return
  iframe.src = 'about:blank'
  showStatus('Conectando...')

  let ready = false
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch('/api/check-target')
      const data = await res.json()
      if (data.ok) { ready = true; break }
    } catch {}
    await sleep(1000)
  }

  if (!ready) {
    showStatus('Servidor del proyecto no activo')
    return
  }

  iframe.src = window.location.origin + '/?_ojito=1'
  showStatus('Activa el inspector y\nhaz click en un elemento')

  iframe.addEventListener('load', function onLoad() {
    iframe.removeEventListener('load', onLoad)
    if (inspecting) {
      setTimeout(() => {
        try { iframe.contentWindow.postMessage({ type: 'ojito-activate' }, '*') } catch {}
      }, 300)
    }
  })
}

// ── Toggle ──
function toggleInspect() {
  inspecting = !inspecting
  fab.classList.toggle('active', inspecting)
  setStatus(inspecting)

  if (!inspecting && isMobile) hideMobileSheet()

  try {
    iframe.contentWindow.postMessage({
      type: inspecting ? 'ojito-activate' : 'ojito-deactivate'
    }, '*')
  } catch {}
}

fab.addEventListener('click', toggleInspect)

document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.shiftKey && (e.key === 'X' || e.key === 'x')) {
    e.preventDefault()
    toggleInspect()
  }
})

// ── Messages from bridge ──
window.addEventListener('message', function (e) {
  if (!e.data || e.data.type !== 'ojito-element') return
  const { element, children } = e.data
  if (!element) return

  renderElementInfo(element)
  renderTree(element, children || [])

  if (isMobile) showMobileSheet()
})

init()
