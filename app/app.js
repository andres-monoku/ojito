const iframe = document.getElementById('target-iframe')
const urlInput = document.getElementById('url-input')
const goBtn = document.getElementById('go-btn')
const elementInfo = document.getElementById('element-info')
const fab = document.getElementById('fab')

let inspecting = false

function showIframeBlank(msg) {
  iframe.removeAttribute('src')
  iframe.srcdoc = '<html><body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#1a1a22;color:#555;font-family:system-ui,sans-serif;font-size:14px;text-align:center;padding:20px;">' + msg + '</body></html>'
}

function showError(msg) {
  elementInfo.innerHTML = '<div style="color:#f97316;font-size:12px;padding:4px 0;">' + msg + '</div>'
}

// Load target URL from server
async function loadTarget() {
  try {
    const res = await fetch('/api/target')
    const data = await res.json()
    if (data.url) {
      urlInput.value = data.url
      loadUrl(data.url)
    } else {
      showIframeBlank('Ejecuta /ojito en Claude Code para cargar tu proyecto')
    }
  } catch (e) {
    showIframeBlank('Ejecuta /ojito en Claude Code para cargar tu proyecto')
  }
}

async function loadUrl(url) {
  if (!url) return
  if (!url.startsWith('http')) url = 'http://' + url
  urlInput.value = url

  // Verify server is reachable before loading
  try {
    await fetch(url, { mode: 'no-cors', signal: AbortSignal.timeout(2000) })
  } catch {
    showIframeBlank('No hay servidor activo en ' + url)
    showError('No hay servidor activo en ' + url)
    return
  }

  // Save target to server so proxy knows where to forward
  await fetch('/api/target', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  })

  // Load through proxy — same origin, bridge auto-injected by server
  iframe.removeAttribute('srcdoc')
  iframe.src = '/proxy/'

  iframe.onload = function () {
    // If already inspecting, activate bridge in new page
    if (inspecting) {
      setTimeout(function () {
        try {
          iframe.contentWindow.postMessage({ type: 'ojito-activate' }, '*')
        } catch (e) {}
      }, 200)
    }
  }

  iframe.onerror = function () {
    showIframeBlank('Error al cargar ' + url)
    showError('Error al cargar ' + url)
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
  loadUrl(urlInput.value)
})

urlInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') loadUrl(urlInput.value)
})

// Init
loadTarget()
