import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      include: [
        'src/metier/formules.js',
        'src/shared/validators.js',
        'src/shared/format.js',
        'src/shared/utils.js',
        'src/config/validateEnv.js',
      ],
      reporter: ['text', 'json-summary'],
      thresholds: {
        statements: 100,
        functions:  100,
        lines:      100,
        branches:    95,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      // @/ résout vers src/ — utiliser pour les imports inter-domaines
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/html5-qrcode')) {
            return 'vendor-qrcode';
          }
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
