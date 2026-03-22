const iframe = document.getElementById('project-frame')
const elementInfo = document.getElementById('element-info')
const fab = document.getElementById('fab')

let inspecting = false

function showStatus(msg) {
  elementInfo.style.fontStyle = 'italic'
  elementInfo.style.color = '#555'
  elementInfo.innerHTML = msg
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// Fetch target from server and load via proxy
async function init() {
  try {
    const res = await fetch('/api/target')
    const data = await res.json()
    if (data.url) {
      await loadTarget(data.url)
    } else {
      showStatus('Ejecuta /ojito en Claude Code para cargar tu proyecto')
    }
  } catch (e) {
    showStatus('Ejecuta /ojito en Claude Code para cargar tu proyecto')
  }
}

async function loadTarget(url) {
  if (!url) return

  iframe.src = 'about:blank'
  showStatus('Conectando con ' + url + '...')

  // Wait for server to respond (max 10 attempts)
  let ready = false
  for (let i = 0; i < 10; i++) {
    try {
      await fetch(url, { mode: 'no-cors', signal: AbortSignal.timeout(1000) })
      ready = true
      break
    } catch {
      await sleep(1000)
    }
  }

  if (!ready) {
    showStatus('No se pudo conectar con ' + url)
    return
  }

  // Load through proxy (same-origin, bridge auto-injected by server)
  iframe.src = window.location.origin + '/'
  showStatus('Haz click en cualquier elemento')

  iframe.addEventListener('load', function onLoad() {
    iframe.removeEventListener('load', onLoad)
    if (inspecting) {
      setTimeout(() => {
        try {
          iframe.contentWindow.postMessage({ type: 'ojito-activate' }, '*')
        } catch (e) {}
      }, 300)
    }
  })
}

// Toggle inspection mode
function toggleInspect() {
  inspecting = !inspecting
  fab.classList.toggle('active', inspecting)

  try {
    iframe.contentWindow.postMessage({
      type: inspecting ? 'ojito-activate' : 'ojito-deactivate'
    }, '*')
  } catch (e) {}
}

// FAB click
fab.addEventListener('click', toggleInspect)

// Keyboard shortcut: Ctrl+Shift+X (both cases)
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.shiftKey && (e.key === 'X' || e.key === 'x')) {
    e.preventDefault()
    toggleInspect()
  }
})

// Listen for messages from bridge in iframe
window.addEventListener('message', function (e) {
  if (!e.data || e.data.type !== 'ojito-element') return

  const { tag, className, id } = e.data
  let html = '<div class="element-info">'
  html += '<div class="info-row"><span class="info-label">Tag</span>'
  html += '<span class="info-value">&lt;' + tag + '&gt;</span></div>'

  if (className) {
    html += '<div class="info-row"><span class="info-label">Class</span>'
    html += '<span class="info-value class-value">.' + className + '</span></div>'
  }

  if (id) {
    html += '<div class="info-row"><span class="info-label">ID</span>'
    html += '<span class="info-value id-value">#' + id + '</span></div>'
  }

  html += '</div>'
  elementInfo.style.fontStyle = 'normal'
  elementInfo.style.color = ''
  elementInfo.innerHTML = html
})

// Init
init()
