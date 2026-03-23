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

// ── Readable name generation (text-first priority) ──
const SEMANTIC_TAGS = {
  'nav': 'Navegaci\u00f3n', 'header': 'Encabezado', 'footer': 'Pie de p\u00e1gina',
  'main': 'Contenido principal', 'aside': 'Barra lateral', 'section': 'Secci\u00f3n',
  'article': 'Art\u00edculo', 'form': 'Formulario', 'button': 'Bot\u00f3n',
  'img': 'Imagen', 'video': 'Video', 'input': 'Campo de texto',
  'select': 'Selector', 'textarea': '\u00c1rea de texto', 'ul': 'Lista',
  'ol': 'Lista numerada', 'li': '\u00cdtem de lista', 'table': 'Tabla', 'figure': 'Figura',
}

const ROLE_NAMES = {
  'navigation': 'Navegaci\u00f3n', 'banner': 'Encabezado', 'main': 'Contenido principal',
  'contentinfo': 'Pie de p\u00e1gina', 'search': 'B\u00fasqueda', 'dialog': 'Ventana de di\u00e1logo',
  'alert': 'Alerta', 'button': 'Bot\u00f3n',
}

const SEMANTIC_CLASSES = {
  'hero': 'Secci\u00f3n hero', 'navbar': 'Barra de navegaci\u00f3n', 'footer': 'Pie de p\u00e1gina',
  'card': 'Tarjeta', 'modal': 'Modal', 'sidebar': 'Barra lateral', 'banner': 'Banner',
  'header': 'Encabezado', 'btn': 'Bot\u00f3n', 'logo': 'Logo', 'menu': 'Men\u00fa',
  'container': 'Contenedor', 'wrapper': 'Contenedor', 'section': 'Secci\u00f3n',
  'grid': 'Cuadr\u00edcula', 'flex': 'Fila flexible', 'reveal': 'Elemento animado',
  'overlay': 'Superposici\u00f3n', 'badge': 'Etiqueta', 'chip': 'Chip', 'avatar': 'Avatar',
  'icon': '\u00cdcono', 'image': 'Imagen', 'slider': 'Carrusel', 'carousel': 'Carrusel',
  'accordion': 'Acorde\u00f3n', 'tab': 'Pesta\u00f1a', 'tooltip': 'Tooltip',
  'dropdown': 'Desplegable', 'pagination': 'Paginaci\u00f3n', 'breadcrumb': 'Migas de pan',
  'progress': 'Progreso', 'spinner': 'Cargando', 'skeleton': 'Esqueleto',
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function generateReadableName(el) {
  // Check saved names first
  const key = getElementKey(el)
  if (savedNames[key]) return savedNames[key]

  const tag = el.tag
  const text = (el.textContent || '').trim()
  const className = (typeof el.className === 'string' ? el.className : '') || ''
  const ariaLabel = el.ariaLabel || ''
  const role = el.role || ''
  const id = el.id || ''

  // P1: aria-label
  if (ariaLabel) return capitalize(ariaLabel)

  // P2: Visible text
  if (text.length >= 3 && text.length <= 60) {
    if (['h1','h2','h3','h4','h5','h6'].includes(tag)) {
      return text.length > 32 ? text.slice(0, 32) + '\u2026' : text
    }
    if (['p','span','a','button','label','li'].includes(tag)) {
      return text.length > 28 ? text.slice(0, 28) + '\u2026' : text
    }
    if (text.length <= 20) return text
  }

  // P3: Role
  if (role && ROLE_NAMES[role]) return ROLE_NAMES[role]

  // P4: Semantic ID
  if (id && id.length > 2 && !/^\d+$/.test(id)) {
    const humanId = id.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
    if (!humanId.match(/^[0-9\s]+$/)) return capitalize(humanId)
  }

  // P5: Semantic tag
  if (SEMANTIC_TAGS[tag]) return SEMANTIC_TAGS[tag]

  // P6: Semantic class
  const classLower = className.toLowerCase()
  for (const [k, name] of Object.entries(SEMANTIC_CLASSES)) {
    if (classLower.includes(k)) return name
  }

  // P7: Long text (aggressive truncation)
  if (text.length > 0) {
    return text.slice(0, 24) + '\u2026'
  }

  // Fallback: just the tag
  return tag
}

function getElementKey(data) {
  return data.tag + ':' + (data.id || '') + ':' + (typeof data.className === 'string' ? data.className.split(' ')[0] : '')
}

// ── Is name confusing? ──
function isNameConfusing(name, elementData) {
  // If name contains the actual text, it's fine
  if (elementData.textContent && name.includes(elementData.textContent.slice(0, 10))) return false
  // If truncated text, it's fine
  if (name.endsWith('\u2026')) return false
  // Vague semantic names
  const vagueNames = ['Secci\u00f3n', 'Contenedor', 'Elemento animado', 'Fila flexible', 'Cuadr\u00edcula']
  if (vagueNames.includes(name)) return true
  // Just a tag name
  if (['div','span','rect','path','svg','g','circle','line'].includes(name)) return true
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
  const readableName = name.textContent
  if (isNameConfusing(readableName, data) && !savedNames[key] && !ignoredElements.has(key)) {
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
        childCount: data.childCount,
        xpath: data.xpath || ''
      })
    })
    const result = await res.json()

    if (!result.ok) {
      if (result.error === 'NO_API_KEY') {
        showApiKeyHelp(chip)
      } else {
        chip.innerHTML = '<span class="suggest-star">\u2726</span> ' + (result.error || 'Error')
        chip.style.pointerEvents = 'auto'
      }
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

// ── API key help UI ──
function showApiKeyHelp(chip) {
  chip.className = 'suggest-result'
  chip.style.pointerEvents = 'auto'

  const cmd = 'echo "ANTHROPIC_API_KEY=tu_key_aqui" >> ~/.zshrc && source ~/.zshrc'

  chip.innerHTML = ''

  const title = document.createElement('div')
  title.className = 'suggest-name'
  title.innerHTML = '<span class="suggest-star">\u2726</span> Para nombres inteligentes necesito tu API key'
  chip.appendChild(title)

  const desc = document.createElement('div')
  desc.className = 'suggest-reason'
  desc.textContent = 'Agrega esta linea en tu terminal:'
  chip.appendChild(desc)

  const codeBlock = document.createElement('div')
  codeBlock.className = 'api-key-code'
  codeBlock.textContent = cmd
  chip.appendChild(codeBlock)

  const copyBtn = document.createElement('button')
  copyBtn.className = 'suggest-accept'
  copyBtn.textContent = 'Copiar comando'
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(cmd).then(() => {
      showToast('Comando copiado — pegalo en terminal')
      copyBtn.textContent = 'Reinicia Ojito con /ojito'
      copyBtn.style.opacity = '0.6'
      copyBtn.style.pointerEvents = 'none'
    })
  })
  chip.appendChild(copyBtn)
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

// ── Changes tracking ──
let pendingChanges = []
const propsPanel = document.getElementById('props-panel')
const changesBar = document.getElementById('changes-bar')
const changesCount = document.getElementById('changes-count')
const btnSend = document.getElementById('btn-send')
const btnReset = document.getElementById('btn-reset')

function updateChangesBar() {
  if (pendingChanges.length > 0) {
    changesBar.classList.remove('hidden')
    changesCount.textContent = pendingChanges.length + ' cambio' + (pendingChanges.length > 1 ? 's' : '')
  } else {
    changesBar.classList.add('hidden')
  }
}

function trackChange(property, oldValue, newValue) {
  if (!currentElement) return
  const existing = pendingChanges.findIndex(c => c.property === property && c.xpath === currentElement.xpath)
  const cls = typeof currentElement.className === 'string' ? currentElement.className.split(' ')[0] : ''
  const change = {
    elementName: generateReadableName(currentElement),
    selector: cls ? '.' + cls : currentElement.tag,
    xpath: currentElement.xpath,
    property, oldValue: String(oldValue), newValue: String(newValue)
  }
  if (existing >= 0) pendingChanges[existing] = change
  else pendingChanges.push(change)
  updateChangesBar()
}

function applyStyle(property, value) {
  if (!currentElement) return
  try {
    iframe.contentWindow.postMessage({
      type: 'ojito-apply-style',
      xpath: currentElement.xpath,
      property, value
    }, '*')
  } catch {}
}

btnSend.addEventListener('click', () => {
  if (pendingChanges.length === 0) return
  let prompt = 'Aplica los siguientes cambios de estilos CSS en el proyecto.\nPara cada elemento, localiza su clase o selector en el codigo fuente y actualiza los valores correspondientes:\n\n'
  pendingChanges.forEach(c => {
    prompt += '\u2022 ' + c.elementName + ' (' + c.selector + ')\n  ' + c.property + ': ' + c.oldValue + ' \u2192 ' + c.newValue + '\n\n'
  })
  prompt += 'Aplica cada cambio en el archivo CSS o modulo correspondiente. Confirma que archivos modificaste.'
  navigator.clipboard.writeText(prompt).then(() => {
    document.getElementById('send-modal').classList.remove('hidden')
    pendingChanges = []
    updateChangesBar()
  })
})

// Send modal close
document.getElementById('send-modal-close').addEventListener('click', () => {
  document.getElementById('send-modal').classList.add('hidden')
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.getElementById('send-modal').classList.add('hidden')
})

// Step-value input: direct edit + arrow keys
document.addEventListener('change', (e) => {
  const input = e.target.closest('.step-value')
  if (!input || !input.dataset.prop) return
  const prop = input.dataset.prop
  let val = parseFloat(input.value) || 0
  input.value = val
  const unit = input.closest('.stepper')?.querySelector('.prop-unit')?.textContent || 'px'
  const cssVal = unit ? val + unit : String(val)
  applyStyle(prop, cssVal)
  trackChange(prop, '', cssVal)
})
document.addEventListener('keydown', (e) => {
  const input = e.target.closest('.step-value')
  if (!input || !input.dataset.prop) return
  if (e.key === 'Enter') { input.blur(); return }
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
  e.preventDefault()
  const prop = input.dataset.prop
  const step = parseFloat(input.step) || 1
  const mult = e.shiftKey ? 10 : 1
  const delta = e.key === 'ArrowUp' ? step * mult : -step * mult
  let cur = parseFloat(input.value) || 0
  input.value = Math.round((cur + delta) * 100) / 100
  input.dispatchEvent(new Event('change'))
})

btnReset.addEventListener('click', () => {
  pendingChanges = []
  updateChangesBar()
  // Reload iframe to reset all styles
  const src = iframe.src
  iframe.src = 'about:blank'
  setTimeout(() => { iframe.src = src }, 100)
})

// ── Render props ──
function renderProps(styles, hasDirectText) {
  if (!styles) { propsPanel.innerHTML = ''; return }

  propsPanel.innerHTML = ''
  const isMob = window.innerWidth < 768

  // Helper: stepper row (replaces slider)
  function numericRow(label, prop, value, min, max, step, unit) {
    const row = document.createElement('div')
    row.className = 'prop-row'
    const lbl = document.createElement('span')
    lbl.className = 'prop-label'
    lbl.textContent = label
    row.appendChild(lbl)

    const ctrl = document.createElement('div')
    ctrl.className = 'prop-control stepper'

    const minus = document.createElement('button')
    minus.className = 'step-btn minus'
    minus.textContent = '\u2212'
    minus.dataset.prop = prop
    minus.dataset.step = step

    const valSpan = document.createElement('input')
    valSpan.type = 'number'
    valSpan.className = 'step-value'
    valSpan.value = Math.round(value * 100) / 100
    valSpan.dataset.prop = prop
    if (window.innerWidth < 768) valSpan.setAttribute('inputmode', 'decimal')

    const plus = document.createElement('button')
    plus.className = 'step-btn plus'
    plus.textContent = '+'
    plus.dataset.prop = prop
    plus.dataset.step = step

    const u = document.createElement('span')
    u.className = 'prop-unit'
    u.textContent = unit || 'px'

    const oldVal = value
    function doStep(delta) {
      let cur = parseFloat(valSpan.value) || 0
      let next = Math.round((cur + delta) * 100) / 100
      next = Math.max(min, Math.min(max, next))
      valSpan.value = next
      const cssVal = unit ? next + unit : String(next)
      applyStyle(prop, cssVal)
      trackChange(prop, (unit ? oldVal + unit : String(oldVal)), cssVal)
    }

    minus.addEventListener('click', (e) => { e.preventDefault(); doStep(-step) })
    plus.addEventListener('click', (e) => { e.preventDefault(); doStep(step) })

    // Hold to repeat
    let holdT, holdI
    function startHold(delta) {
      holdT = setTimeout(() => { holdI = setInterval(() => doStep(delta), 60) }, 400)
    }
    function stopHold() { clearTimeout(holdT); clearInterval(holdI) }
    minus.addEventListener('mousedown', () => startHold(-step))
    plus.addEventListener('mousedown', () => startHold(step))
    minus.addEventListener('touchstart', () => startHold(-step), { passive: true })
    plus.addEventListener('touchstart', () => startHold(step), { passive: true })
    document.addEventListener('mouseup', stopHold)
    document.addEventListener('touchend', stopHold)

    ctrl.appendChild(minus)
    ctrl.appendChild(valSpan)
    ctrl.appendChild(plus)
    ctrl.appendChild(u)
    row.appendChild(ctrl)
    return row
  }

  // Helper: select row
  function selectRow(label, prop, value, options) {
    const row = document.createElement('div')
    row.className = 'prop-row'
    const lbl = document.createElement('span')
    lbl.className = 'prop-label'
    lbl.textContent = label
    row.appendChild(lbl)

    const sel = document.createElement('select')
    sel.className = 'prop-select'
    options.forEach(opt => {
      const o = document.createElement('option')
      o.value = opt; o.textContent = opt
      if (opt === value) o.selected = true
      sel.appendChild(o)
    })
    const oldVal = value
    sel.addEventListener('change', () => {
      applyStyle(prop, sel.value)
      trackChange(prop, oldVal, sel.value)
    })
    row.appendChild(sel)
    return row
  }

  // Helper: color row
  function colorRow(label, prop, value) {
    const row = document.createElement('div')
    row.className = 'prop-row'
    const lbl = document.createElement('span')
    lbl.className = 'prop-label'
    lbl.textContent = label
    row.appendChild(lbl)

    const ctrl = document.createElement('div')
    ctrl.className = 'color-control'
    const hex = rgbToHex(value)

    const preview = document.createElement('div')
    preview.className = 'color-preview'
    preview.style.background = value
    const picker = document.createElement('input')
    picker.type = 'color'
    picker.value = hex
    preview.appendChild(picker)

    const hexIn = document.createElement('input')
    hexIn.type = 'text'
    hexIn.className = 'color-hex'
    hexIn.value = hex
    hexIn.maxLength = 7
    if (isMob) { hexIn.readOnly = true }

    const oldVal = value
    picker.addEventListener('input', () => {
      preview.style.background = picker.value
      hexIn.value = picker.value
      applyStyle(prop, picker.value)
    })
    picker.addEventListener('change', () => {
      trackChange(prop, oldVal, picker.value)
    })
    hexIn.addEventListener('change', () => {
      preview.style.background = hexIn.value
      picker.value = hexIn.value
      applyStyle(prop, hexIn.value)
      trackChange(prop, oldVal, hexIn.value)
    })

    ctrl.appendChild(preview)
    ctrl.appendChild(hexIn)
    row.appendChild(ctrl)
    return row
  }

  // Helper: spacing grid
  function spacingRow(label, props, values) {
    const row = document.createElement('div')
    row.className = 'prop-row'
    const lbl = document.createElement('span')
    lbl.className = 'prop-label'
    lbl.textContent = label
    row.appendChild(lbl)

    const grid = document.createElement('div')
    grid.className = 'spacing-grid'
    const center = document.createElement('div')
    center.className = 'spacing-center'

    const dirs = ['Top', 'Right', 'Bottom', 'Left']
    const inputs = {}
    dirs.forEach(d => {
      const inp = document.createElement('input')
      inp.className = 'spacing-input'
      inp.value = Math.round(values[d.toLowerCase()] || 0)
      if (isMob) { inp.readOnly = true }
      const cssProp = props + d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
      const oldVal = inp.value
      inp.addEventListener('change', () => {
        applyStyle(cssProp, inp.value + 'px')
        trackChange(cssProp, oldVal + 'px', inp.value + 'px')
      })
      inputs[d] = inp
    })

    center.appendChild(inputs['Top'])
    const mid = document.createElement('div')
    mid.className = 'spacing-middle'
    const box = document.createElement('div')
    box.className = 'spacing-box'
    mid.appendChild(inputs['Left'])
    mid.appendChild(box)
    mid.appendChild(inputs['Right'])
    center.appendChild(mid)
    center.appendChild(inputs['Bottom'])
    grid.appendChild(center)
    row.appendChild(grid)
    return row
  }

  function addGroup(title, rows) {
    if (rows.length === 0) return
    const group = document.createElement('div')
    group.className = 'prop-group'
    const label = document.createElement('div')
    label.className = 'prop-group-label'
    label.textContent = title
    group.appendChild(label)
    rows.forEach(r => group.appendChild(r))
    propsPanel.appendChild(group)
  }

  // Layout
  const layoutRows = []
  layoutRows.push(selectRow('display', 'display', styles.display, ['block','flex','grid','inline','inline-flex','inline-block','none']))
  if (styles.display === 'flex' || styles.display === 'inline-flex') {
    layoutRows.push(selectRow('direction', 'flexDirection', styles.flexDirection, ['row','column','row-reverse','column-reverse']))
    layoutRows.push(selectRow('justify', 'justifyContent', styles.justifyContent, ['flex-start','center','flex-end','space-between','space-around','space-evenly']))
    layoutRows.push(selectRow('align', 'alignItems', styles.alignItems, ['flex-start','center','flex-end','stretch','baseline']))
    layoutRows.push(selectRow('wrap', 'flexWrap', styles.flexWrap, ['nowrap','wrap','wrap-reverse']))
    layoutRows.push(numericRow('gap', 'gap', parseFloat(styles.gap) || 0, 0, 100, 1, 'px'))
  }
  addGroup('Layout', layoutRows)

  // Spacing — individual steppers
  const spacingRows = []
  spacingRows.push(numericRow('pad-T', 'paddingTop', styles.paddingTop, 0, 500, 1, 'px'))
  spacingRows.push(numericRow('pad-R', 'paddingRight', styles.paddingRight, 0, 500, 1, 'px'))
  spacingRows.push(numericRow('pad-B', 'paddingBottom', styles.paddingBottom, 0, 500, 1, 'px'))
  spacingRows.push(numericRow('pad-L', 'paddingLeft', styles.paddingLeft, 0, 500, 1, 'px'))
  spacingRows.push(numericRow('mrg-T', 'marginTop', styles.marginTop, -500, 500, 1, 'px'))
  spacingRows.push(numericRow('mrg-R', 'marginRight', styles.marginRight, -500, 500, 1, 'px'))
  spacingRows.push(numericRow('mrg-B', 'marginBottom', styles.marginBottom, -500, 500, 1, 'px'))
  spacingRows.push(numericRow('mrg-L', 'marginLeft', styles.marginLeft, -500, 500, 1, 'px'))
  addGroup('Spacing', spacingRows)

  // Sizing
  const sizingRows = []
  sizingRows.push(numericRow('width', 'width', parseFloat(styles.width) || 0, 0, 2000, 1, 'px'))
  sizingRows.push(numericRow('height', 'height', parseFloat(styles.height) || 0, 0, 2000, 1, 'px'))
  addGroup('Tamano', sizingRows)

  // Visual
  const visualRows = []
  const bgIsTransparent = !styles.backgroundColor || styles.backgroundColor === 'rgba(0, 0, 0, 0)' || styles.backgroundColor === 'transparent'
  if (!bgIsTransparent) visualRows.push(colorRow('bg-color', 'backgroundColor', styles.backgroundColor))
  visualRows.push(numericRow('opacity', 'opacity', parseFloat(styles.opacity) || 1, 0, 1, 0.01, ''))
  if (styles.borderRadius > 0) visualRows.push(numericRow('radius', 'borderRadius', styles.borderRadius, 0, 100, 1, 'px'))
  if (styles.boxShadow && styles.boxShadow !== 'none') {
    const bsRow = document.createElement('div')
    bsRow.className = 'prop-row'
    const bsLbl = document.createElement('span')
    bsLbl.className = 'prop-label'
    bsLbl.textContent = 'shadow'
    bsRow.appendChild(bsLbl)
    const bsIn = document.createElement('input')
    bsIn.className = 'text-input'
    bsIn.value = styles.boxShadow
    bsIn.addEventListener('change', () => {
      applyStyle('boxShadow', bsIn.value)
      trackChange('boxShadow', styles.boxShadow, bsIn.value)
    })
    bsRow.appendChild(bsIn)
    visualRows.push(bsRow)
  }
  if (visualRows.length > 0) addGroup('Visual', visualRows)

  // Typography
  if (hasDirectText) {
    const typoRows = []
    typoRows.push(colorRow('color', 'color', styles.color))
    typoRows.push(numericRow('size', 'fontSize', styles.fontSize, 8, 96, 1, 'px'))
    typoRows.push(selectRow('weight', 'fontWeight', styles.fontWeight, ['100','200','300','400','500','600','700','800','900']))
    const lh = parseFloat(styles.lineHeight) || 1.5
    typoRows.push(numericRow('line-h', 'lineHeight', lh, 0.8, 3, 0.1, ''))
    typoRows.push(numericRow('spacing', 'letterSpacing', parseFloat(styles.letterSpacing) || 0, -5, 20, 0.5, 'px'))
    addGroup('Tipografia', typoRows)
  }
}

function rgbToHex(rgb) {
  if (!rgb || rgb === 'transparent') return '#000000'
  if (rgb.startsWith('#')) return rgb
  const m = rgb.match(/\d+/g)
  if (!m || m.length < 3) return '#000000'
  return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('')
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
    // Request site context from bridge
    setTimeout(() => {
      try { iframe.contentWindow.postMessage({ type: 'ojito-get-context' }, '*') } catch {}
    }, 500)
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
  if (!e.data) return

  // Site context
  if (e.data.type === 'ojito-context' && e.data.context) {
    fetch('/api/set-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(e.data.context)
    }).catch(() => {})
    return
  }

  // Element selection
  if (e.data.type !== 'ojito-element') return
  const { element, children } = e.data
  if (!element) return

  renderElementInfo(element)
  renderTree(element, children || [])
  renderProps(e.data.styles, e.data.hasDirectText)

  if (isMobile) showMobileSheet()
})

init()
