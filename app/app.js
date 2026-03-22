const iframe = document.getElementById('target-iframe')
const urlInput = document.getElementById('url-input')
const goBtn = document.getElementById('go-btn')
const elementInfo = document.getElementById('element-info')
const fab = document.getElementById('fab')

let inspecting = false
let currentTargetUrl = ''

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

// Fetch target from server and load it
async function init() {
  try {
    const res = await fetch('/api/target')
    const data = await res.json()
    if (data.url) {
      urlInput.value = data.url
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
  if (!url.startsWith('http')) url = 'http://' + url
  urlInput.value = url
  currentTargetUrl = url

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

  // 3. Only load if server responded
  if (ready) {
    iframe.src = url
    showStatus('')

    iframe.onload = function () {
      // Re-activate inspection if it was on
      if (inspecting) {
        setTimeout(function () {
          try {
            iframe.contentWindow.postMessage({ type: 'ojito-activate' }, '*')
          } catch (e) {}
        }, 200)
      }
    }
  } else {
    iframe.src = 'about:blank'
    showStatus('No se pudo conectar con ' + url)
  }
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

// Keyboard shortcut: Ctrl+Shift+X
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'X') {
    e.preventDefault()
    toggleInspect()
  }
})

// Listen for messages from bridge
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
  elementInfo.innerHTML = html
})

// Navigate on Go click or Enter
goBtn.addEventListener('click', function () {
  loadTarget(urlInput.value)
})

urlInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') loadTarget(urlInput.value)
})

// Init
init()
