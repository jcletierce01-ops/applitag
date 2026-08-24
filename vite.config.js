import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @/ résout vers src/ — utiliser pour les imports inter-domaines
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
