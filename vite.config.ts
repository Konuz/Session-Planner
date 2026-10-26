import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      {
        name: 'astrobin-photo-api',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use('/api/astrobin-photo', async (req, res) => {
            if (req.method !== 'GET') {
              res.statusCode = 405
              res.setHeader('Allow', 'GET')
              res.end()
              return
            }

            const subject = new URL(req.url ?? '/', 'http://localhost').searchParams.get('subject')?.trim()
            if (!subject || subject.length > 80) {
              res.statusCode = 400
              res.end()
              return
            }
            if (!env.ASTROBIN_API_KEY || !env.ASTROBIN_API_SECRET) {
              res.statusCode = 503
              res.end()
              return
            }

            const compactSubject = subject.replace(/\s+/g, '')
            const queries = [
              ['subjects', subject],
              ...(compactSubject === subject ? [] : [['subjects', compactSubject]]),
              ['title__icontains', subject],
            ]
            for (const [filter, value] of queries) {
              const url = new URL('https://www.astrobin.com/api/v1/image/')
              url.searchParams.set('user', 'Konuz')
              url.searchParams.set(filter, value)
              url.searchParams.set('limit', '10')
              url.searchParams.set('format', 'json')
              url.searchParams.set('api_key', env.ASTROBIN_API_KEY)
              url.searchParams.set('api_secret', env.ASTROBIN_API_SECRET)

              try {
                const response = await fetch(url, { headers: { 'User-Agent': 'KONUZASTRO Tracker (AstroBin API)' } })
                if (!response.ok) {
                  res.statusCode = 502
                  res.end()
                  return
                }
                const data = await response.json() as { objects?: Array<{ url_regular?: unknown; url_thumb?: unknown; url_gallery?: unknown; title?: unknown }> }
                const image = data.objects?.find((item) => {
                  const imageUrl = item.url_regular ?? item.url_thumb
                  return typeof imageUrl === 'string' && /^https:\/\/.+\.astrobin\.com\//.test(imageUrl) && typeof item.url_gallery === 'string'
                })
                if (!image) continue

                res.setHeader('Cache-Control', 'private, max-age=3600')
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({
                  imageUrl: image.url_regular ?? image.url_thumb,
                  galleryUrl: image.url_gallery,
                  title: image.title,
                }))
                return
              } catch {
                res.statusCode = 502
                res.end()
                return
              }
            }

            res.statusCode = 204
            res.end()
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
    worker: { format: 'es' },
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  }
})
