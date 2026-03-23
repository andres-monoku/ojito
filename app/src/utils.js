const TAG_TYPES = {
  container: ['div','section','main','article','nav','header','footer','aside','ul','ol','li','dl','form','fieldset','details','summary','figure'],
  text: ['h1','h2','h3','h4','h5','h6','p','span','label','strong','em','b','i','small','blockquote','pre','code','time','abbr'],
  interactive: ['button','a','input','select','textarea','option'],
  media: ['img','video','audio','svg','canvas','picture','source','iframe'],
}

export function getTagType(tag) {
  for (const [type, tags] of Object.entries(TAG_TYPES)) {
    if (tags.includes(tag)) return type
  }
  return 'other'
}

const SEMANTIC_TAGS = {
  nav:'Navegación', header:'Encabezado', footer:'Pie de página',
  main:'Contenido principal', aside:'Barra lateral', section:'Sección',
  article:'Artículo', form:'Formulario', button:'Botón',
  img:'Imagen', video:'Video', input:'Campo de texto',
  select:'Selector', textarea:'Área de texto', ul:'Lista',
  ol:'Lista numerada', li:'Ítem de lista', table:'Tabla', figure:'Figura',
}

const SEMANTIC_CLASSES = {
  hero:'Sección hero', navbar:'Barra de navegación', footer:'Pie de página',
  card:'Tarjeta', modal:'Modal', sidebar:'Barra lateral', banner:'Banner',
  header:'Encabezado', btn:'Botón', logo:'Logo', menu:'Menú',
  container:'Contenedor', wrapper:'Contenedor', grid:'Cuadrícula',
  flex:'Fila flexible', reveal:'Elemento animado', overlay:'Superposición',
  slider:'Carrusel', carousel:'Carrusel', accordion:'Acordeón',
}

export function generateReadableName(el) {
  const tag = el.tag
  const text = (el.textContent || '').trim()
  const className = (typeof el.className === 'string' ? el.className : '') || ''
  const ariaLabel = el.ariaLabel || ''
  const role = el.role || ''
  const id = el.id || ''

  if (ariaLabel) return ariaLabel.charAt(0).toUpperCase() + ariaLabel.slice(1).toLowerCase()

  if (text.length >= 3 && text.length <= 60) {
    if (['h1','h2','h3','h4','h5','h6'].includes(tag)) return text.length > 32 ? text.slice(0,32) + '…' : text
    if (['p','span','a','button','label','li'].includes(tag)) return text.length > 28 ? text.slice(0,28) + '…' : text
    if (text.length <= 20) return text
  }

  if (id && id.length > 2 && !/^\d+$/.test(id)) {
    return id.replace(/[-_]/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replace(/^\w/,c=>c.toUpperCase())
  }

  if (SEMANTIC_TAGS[tag]) return SEMANTIC_TAGS[tag]

  const classLower = className.toLowerCase()
  for (const [k, name] of Object.entries(SEMANTIC_CLASSES)) {
    if (classLower.includes(k)) return name
  }

  if (text.length > 0) return text.slice(0,24) + '…'

  return tag
}

export function rgbToHex(rgb) {
  if (!rgb || rgb === 'transparent') return '#000000'
  if (rgb.startsWith('#')) return rgb
  const m = rgb.match(/\d+/g)
  if (!m || m.length < 3) return '#000000'
  return '#' + m.slice(0,3).map(n => parseInt(n).toString(16).padStart(2,'0')).join('')
}
