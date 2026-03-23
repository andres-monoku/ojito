import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: '../public/panel',
    emptyOutDir: true,
    rollupOptions: {
      input: 'panel.html',
    },
  },
  server: {
    port: 3132,
  }
})
