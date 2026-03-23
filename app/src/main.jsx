import React from 'react'
import ReactDOM from 'react-dom/client'
import { OjitoProvider } from './context/OjitoContext'
import App from './App'

const root = document.getElementById('react-panel')
if (root) {
  ReactDOM.createRoot(root).render(
    <OjitoProvider>
      <App />
    </OjitoProvider>
  )
}
