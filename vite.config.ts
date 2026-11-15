import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { astrobinPhoto } from './server/astrobin.ts'
import { createHipsProxy } from './server/hipsProxy.ts'
import { photoApi } from './server/photo.ts'
import type { ServerResponse } from 'node:http'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      {
        name: 'astrobin-photo-api',
        apply: 'serve',
        configureServer(server) {
          const apiError = (error: unknown, res: ServerResponse) => {
            server.config.logger.error(error instanceof Error ? error.stack ?? error.message : String(error))
            if (res.destroyed || res.writableEnded) return
            if (res.headersSent) { res.destroy(); return }
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'Błąd serwera. Spróbuj ponownie.' }))
          }
          server.middlewares.use('/api/photo', (req, res) => {
            photoApi(req, res, env).catch((error) => apiError(error, res))
          })
          server.middlewares.use('/api/astrobin-photo', (req, res) => {
            astrobinPhoto(req, res, env).catch((error) => apiError(error, res))
          })
          const hipsApi = createHipsProxy(env)
          server.middlewares.use('/api/hips', (req, res) => {
            hipsApi(req, res).catch((error) => apiError(error, res))
          })
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
    // Katalogi spoza źródeł aplikacji (ok. 150 tys. plików: bufory skryptów z kopią NSNS, regresor, wyniki analiz,
    // worktree sesji) blokowały serwer dev przez kilka minut po starcie, gdy obserwator je przeglądał.
    server: { watch: { ignored: ['**/scripts/.cache/**', '**/output/**', '**/astro-regressor-main/**', '**/research/**', '**/.claude/**', '**/dist/**', '**/dev-dist/**'] } },
    // Bez tego skaner zależności szuka plików HTML w całym projekcie, także w buforach skryptów.
    optimizeDeps: { entries: ['index.html'] },
    worker: { format: 'es' },
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  }
})
