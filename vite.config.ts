import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Production builds are served from GitHub Pages at /photoformat/
  base: mode === 'production' ? '/photoformat/' : '/',
}))
