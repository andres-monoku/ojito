const iframe = document.getElementById('target-iframe')
const elementInfo = document.getElementById('element-info')
const fab = document.getElementById('fab')

let inspecting = false

function showStatus(msg) {
  if (!msg) {
    elementInfo.innerHTML = '<span class="empty-state">Haz click en cualquier elemento</span>'
    return
  }
  elementInfo.innerHTML = '<div style="color:#888;font-size:12px;padding:4px 0;">' + msg + '</div>'
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
      iframe.src = 'about:blank'
      showStatus('Ejecuta /ojito en Claude Code para cargar tu proyecto')
    }
  } catch (e) {
    iframe.src = 'about:blank'
    showStatus('Ejecuta /ojito en Claude Code para cargar tu proyecto')
  }
}

async function loadTarget(url) {
  if (!url) return

  // 1. Clear iframe
  iframe.src = 'about:blank'
  showStatus('Conectando con ' + url + '...')

  // 2. Wait for server to respond (max 10 attempts)
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
    iframe.src = 'about:blank'
    showStatus('No se pudo conectar con ' + url)
    return
  }

  // 3. Load through proxy (same-origin, bridge auto-injected by server)
  // The catch-all in server.js proxies everything not under /app/ or /api/
  // Loading / in the iframe hits the proxy which forwards to the target root
  iframe.src = window.location.origin + '/'
  showStatus('')

  // Re-activate inspection on load
  iframe.addEventListener('load', function onLoad() {
    iframe.removeEventListener('load', onLoad)
    console.log('[ojito] iframe loaded, bridge should be auto-injected by proxy')
    if (inspecting) {
      setTimeout(() => {
        try {
          iframe.contentWindow.postMessage({ type: 'ojito-activate' }, '*')
          console.log('[ojito] sent activate to iframe')
        } catch (e) {
          console.warn('[ojito] postMessage failed', e)
        }
      }, 300)
    }
  })
}

// Toggle inspection mode
function toggleInspect() {
  inspecting = !inspecting
  fab.classList.toggle('active', inspecting)
  console.log('[ojito] inspect mode:', inspecting)

  try {
    iframe.contentWindow.postMessage({
      type: inspecting ? 'ojito-activate' : 'ojito-deactivate'
    }, '*')
    console.log('[ojito] sent', inspecting ? 'activate' : 'deactivate', 'to iframe')
  } catch (e) {
    console.warn('[ojito] postMessage failed', e)
  }
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
  console.log('[ojito] element received:', e.data)

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
  elementInfo.innerHTML = html
})

// Init
init()
