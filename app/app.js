const iframe = document.getElementById('target-iframe')
const urlInput = document.getElementById('url-input')
const goBtn = document.getElementById('go-btn')
const elementInfo = document.getElementById('element-info')
const fab = document.getElementById('fab')

let inspecting = false

// Load target URL from server
async function loadTarget() {
  try {
    const res = await fetch('/api/target')
    const data = await res.json()
    if (data.url) {
      urlInput.value = data.url
      loadUrl(data.url)
    }
  } catch (e) {
    // Server not ready yet
  }
}

function loadUrl(url) {
  if (!url) return
  if (!url.startsWith('http')) url = 'http://' + url
  urlInput.value = url
  iframe.src = url

  // Inject bridge after iframe loads
  iframe.onload = function () {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document
      const existing = doc.querySelector('script[data-ojito-bridge]')
      if (!existing) {
        const s = doc.createElement('script')
        s.src = window.location.origin + '/ojito-bridge.js'
        s.dataset.ojitoBridge = ''
        doc.head.appendChild(s)
      }
    } catch (e) {
      console.warn('Ojito: cannot inject bridge (cross-origin)')
    }

    // If already inspecting, re-activate bridge in new page
    if (inspecting) {
      setTimeout(function () {
        try {
          iframe.contentWindow.postMessage({ type: 'ojito-activate' }, '*')
        } catch (e) {}
      }, 200)
    }
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
