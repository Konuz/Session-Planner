import { createServer } from 'node:http'
import { readFile, realpath } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { astrobinPhoto, type AstroBinEnv } from './astrobin.ts'
import { photoApi, type PhotoEnv } from './photo.ts'

const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' }

export function createAppServer({ distDir = fileURLToPath(new URL('../dist/', import.meta.url)), env = process.env, fetchImpl = fetch }: { distDir?: string; env?: AstroBinEnv & PhotoEnv; fetchImpl?: typeof fetch } = {}) {
  const root = resolve(distDir)
  return createServer(async (req, res) => {
    let apiRequest = false
    try {
      const url = new URL(req.url ?? '/', 'http://localhost')
      apiRequest = url.pathname.startsWith('/api/')
      if (url.pathname.startsWith('/api/photo/')) return await photoApi(req, res, env, fetchImpl)
      if (url.pathname === '/api/astrobin-photo') return await astrobinPhoto(req, res, env, fetchImpl)
      if (url.pathname.startsWith('/api/')) { res.writeHead(404).end(); return }
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return }
      let path: string
      try { path = decodeURIComponent(url.pathname) } catch { res.writeHead(400).end(); return }
      // Bajt zerowy nie jest poprawną ścieżką; fs rzuciłby ERR_INVALID_ARG_VALUE, czyli 500.
      if (path.includes('\0')) { res.writeHead(400).end(); return }
      const file = resolve(root, `.${path === '/' ? '/index.html' : path}`)
      if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return }
      const realRoot = await realpath(root)
      const realFile = await realpath(file)
      if (!realFile.startsWith(realRoot + sep)) { res.writeHead(403).end(); return }
      const body = await readFile(realFile)
      res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
      res.end(req.method === 'HEAD' ? undefined : body)
    } catch (error) {
      if (res.headersSent) { res.destroy(); return }
      const missingFile = !apiRequest && error instanceof Error && 'code' in error
        && (error.code === 'ENOENT' || error.code === 'ENOTDIR' || error.code === 'EISDIR')
      res.writeHead(missingFile ? 404 : 500).end()
    }
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.HOST || '127.0.0.1'
  const port = Number(process.env.PORT || 4173)
  createAppServer().listen(port, host, () => console.log(`Tracker: http://${host}:${port}`))
}
