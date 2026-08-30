import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

function cspPlugin() {
  let isBuild = false
  let apiUrl = 'https://applitag-api-production.up.railway.app'

  return {
    name: 'csp-meta',
    configResolved(config) {
      isBuild = config.command === 'build'
      if (isBuild) {
        const env = loadEnv(config.mode, process.cwd(), 'VITE_')
        if (env.VITE_API_URL) apiUrl = env.VITE_API_URL
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!isBuild) return html
        const csp = [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          `connect-src 'self' ${apiUrl} https://fonts.googleapis.com https://fonts.gstatic.com`,
          "img-src 'self' data: blob:",
          "worker-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'self'",
        ].join('; ')
        return html.replace(
          '<head>',
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`,
        )
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: [
        'src/metier/formules.ts',
        'src/shared/validators.ts',
        'src/shared/format.ts',
        'src/shared/utils.ts',
        'src/config/validateEnv.ts',
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
  plugins: [react(), cspPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'https://applitag-api-production.up.railway.app',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
        secure: true,
      },
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), display-capture=()',
    },
  },
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
