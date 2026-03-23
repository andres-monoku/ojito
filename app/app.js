const iframe = document.getElementById('project-frame')
const elementInfo = document.getElementById('element-info')
const treeContainer = document.getElementById('tree-container')
const fab = document.getElementById('fab')
const statusDot = document.getElementById('status-dot')
const statusText = document.getElementById('status-text')

let inspecting = false

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
  const type = getTagType(tag)
  const pill = document.createElement('span')
  pill.className = 'tag-pill ' + type
  pill.textContent = tag
  return pill
}

// ── Readable name generation ──
function generateReadableName(data) {
  if (data.ariaLabel) return data.ariaLabel
  if (/^h[1-6]$/.test(data.tag) && data.textContent) {
    return data.textContent.slice(0, 24) + (data.textContent.length > 24 ? '...' : '')
  }
  if (data.role) {
    return data.role.charAt(0).toUpperCase() + data.role.slice(1)
  }
  const cls = typeof data.className === 'string' ? data.className.split(' ')[0] : ''
  const semantic = ['hero','navbar','nav','footer','card','button','modal','sidebar','header','banner','menu','dialog','alert','toast']
  for (const s of semantic) {
    if (cls.toLowerCase().includes(s) || (data.id && data.id.toLowerCase().includes(s))) {
      return s.charAt(0).toUpperCase() + s.slice(1).replace(/[-_]/g, ' ')
    }
  }
  if (data.id) {
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

// ── Render element info ──
function renderElementInfo(data) {
  const card = document.createElement('div')
  card.className = 'element-card'

  const main = document.createElement('div')
  main.className = 'element-main'
  main.appendChild(createTagPill(data.tag))
  const name = document.createElement('span')
  name.className = 'element-name'
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

  elementInfo.innerHTML = ''
  elementInfo.appendChild(card)
}

// ── Render tree ──
function renderTree(element, children) {
  treeContainer.innerHTML = ''
  const tree = document.createElement('div')
  tree.className = 'tree'

  // Root node
  tree.appendChild(createTreeNode(element, children, 0, true))

  // Children
  if (children && children.length > 0) {
    const childrenWrap = document.createElement('div')
    childrenWrap.className = 'tree-children'

    const maxShow = 8
    const toShow = children.slice(0, maxShow)

    toShow.forEach((child, i) => {
      const node = createTreeNode(child, null, 1, false)
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

function createTreeNode(data, children, depth, isSelected) {
  const node = document.createElement('div')
  node.className = 'tree-node' + (isSelected ? ' selected' : '')
  node.style.paddingLeft = (8 + depth * 4) + 'px'

  const hasChildren = data.childCount > 0

  if (hasChildren && depth === 0) {
    const toggle = document.createElement('span')
    toggle.className = 'tree-toggle'
    toggle.textContent = '\u25BC'
    node.appendChild(toggle)
  } else if (hasChildren) {
    const toggle = document.createElement('span')
    toggle.className = 'tree-toggle'
    toggle.textContent = '\u25B6'
    node.appendChild(toggle)
  } else {
    const spacer = document.createElement('span')
    spacer.className = 'tree-spacer'
    node.appendChild(spacer)
  }

  const pill = createTagPill(data.tag)
  pill.classList.add('node-tag')
  node.appendChild(pill)

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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
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
  } catch (e) {
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
})

init()
