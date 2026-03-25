import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 5173,
    // Required for WebContainer API (Monaco + in-browser Node.js)
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    // Proxy /cdn/* → unpkg.com (for highlight.js CDN assets)
    proxy: {
      '/cdn': {
        target: 'https://unpkg.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/cdn/, ''),
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split large vendor chunks for better caching
        manualChunks: {
          react:   ['react', 'react-dom'],
          router:  ['react-router-dom'],
          monaco:  ['@monaco-editor/react'],
          socket:  ['socket.io-client'],
          ui:      ['react-toastify'],
        },
      },
    },
  },

  preview: {
    port: 4173,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
})