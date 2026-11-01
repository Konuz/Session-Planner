import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { astrobinPhoto } from './server/astrobin.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      {
        name: 'astrobin-photo-api',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use('/api/astrobin-photo', (req, res) => { void astrobinPhoto(req, res, env) })
        },
      },
      VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png'],
      manifest: {
        name: 'KONUZASTRO Tracker',
        short_name: 'Tracker',
        description: 'Planer sesji astrofotograficznych KONUZASTRO',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        lang: 'pl',
        icons: [{ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        globIgnores: ['data/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/data/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'tracker-data', expiration: { maxEntries: 200 } },
          },
        ],
      },
      }),
    ],
    build: { target: 'es2022', chunkSizeWarningLimit: 700 },
    worker: { format: 'es' },
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  }
})
