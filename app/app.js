// Ojito app.js — handles iframe loading, keyboard shortcut, mobile FAB
// The inspector panel is rendered by React (loaded from /panel/)

const iframe = document.getElementById('project-frame')
const inspector = document.getElementById('inspector')
const canvas = document.getElementById('canvas')
const mobileFab = document.getElementById('mobile-inspect-btn')

let isMobile = window.innerWidth < 768
window.addEventListener('resize', () => { isMobile = window.innerWidth < 768 })

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Load React panel ──
function loadReactPanel() {
  const script = document.createElement('script')
  script.type = 'module'
  script.src = '/panel/panel.html'
  // Actually we need to load the built JS. Vite outputs assets in /panel/assets/
  // We'll load the panel.html which has the script tag
  // Better approach: load the built JS directly
  fetch('/panel/panel.html')
    .then(r => r.text())
    .then(html => {
      // Extract script src from built HTML
      const match = html.match(/src="([^"]+\.js)"/)
      if (match) {
        const s = document.createElement('script')
        s.type = 'module'
        s.src = '/panel/' + match[1].replace(/^\//, '')
        document.body.appendChild(s)
      }
      // Extract CSS link
      const cssMatch = html.match(/href="([^"]+\.css)"/)
      if (cssMatch) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = '/panel/' + cssMatch[1].replace(/^\//, '')
        document.head.appendChild(link)
      }
    })
    .catch(e => console.warn('Ojito: could not load React panel', e))
}

// ── Load target project in iframe ──
async function init() {
  try {
    const res = await fetch('/api/target')
    const data = await res.json()
    if (data.url) {
      await loadTarget(data.url)
    }
  } catch {}

  // Load React panel
  loadReactPanel()
}

async function loadTarget(url) {
  if (!url) return
  iframe.src = 'about:blank'

  let ready = false
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch('/api/check-target')
      const data = await res.json()
      if (data.ok) { ready = true; break }
    } catch {}
    await sleep(1000)
  }

  if (!ready) return

  iframe.src = window.location.origin + '/?_ojito=1'

  // Request site context after load
  iframe.addEventListener('load', function onLoad() {
    iframe.removeEventListener('load', onLoad)
    setTimeout(() => {
      try { iframe.contentWindow.postMessage({ type: 'ojito-get-context' }, '*') } catch {}
    }, 500)
  })
}

// ── Keyboard shortcut: Ctrl+Shift+X ──
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && (e.key === 'X' || e.key === 'x')) {
    e.preventDefault()
    // Dispatch custom event that React listens to
    window.dispatchEvent(new CustomEvent('ojito-toggle'))
  }
})

// ── Mobile FAB ──
if (mobileFab) {
  mobileFab.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('ojito-toggle'))
  })
}

// ── Mobile panel show/hide (called from React via window events) ──
window.addEventListener('ojito-show-panel', () => {
  if (!isMobile) return
  inspector.classList.add('panel-open')
  canvas.style.height = '45vh'
})

window.addEventListener('ojito-hide-panel', () => {
  if (!isMobile) return
  inspector.classList.remove('panel-open')
  canvas.style.height = '100vh'
})

// ── Swipe down to close on mobile ──
let touchStartY = 0
inspector.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY }, { passive: true })
inspector.addEventListener('touchend', (e) => {
  const delta = e.changedTouches[0].clientY - touchStartY
  if (delta > 60) window.dispatchEvent(new CustomEvent('ojito-toggle-off'))
}, { passive: true })

init()
