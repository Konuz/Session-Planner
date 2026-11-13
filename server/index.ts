import { createServer } from 'node:http'
import { isIP } from 'node:net'
import { readFile, realpath, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { astrobinPhoto, type AstroBinEnv } from './astrobin.ts'
import { photoApi, type PhotoEnv } from './photo.ts'

const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' }

/** `ALLOWED_HOSTS`: nazwy (po przecinku), pod którymi serwer jest publikowany, np. za reverse proxy. */
export type ServerEnv = AstroBinEnv & PhotoEnv & { ALLOWED_HOSTS?: string }

/**
 * Ochrona przed DNS rebinding: obca strona, której domena wskazuje na 127.0.0.1, wysyła własną nazwę w Host.
 * Przepuszczamy adresy IP (rebinding wymaga nazwy domenowej), localhost i nazwy z ALLOWED_HOSTS.
 */
function allowedHost(host: string | undefined, env: ServerEnv): boolean {
  if (!host) return true
  let name: string
  try { name = new URL(`http://${host}`).hostname } catch { return false }
  if (isIP(name.replace(/^\[|\]$/g, '')) || name === 'localhost' || name.endsWith('.localhost')) return true
  return (env.ALLOWED_HOSTS ?? '').split(',').some((allowed) => allowed.trim().toLowerCase() === name)
}

/**
 * Wariant .br/.gz utworzony przy buildzie (`scripts/compress-dist.ts`); kompresja w czasie żądania blokowałaby pętlę
 * zdarzeń. Wariant starszy od pliku (częściowa przebudowa dist/) jest pomijany.
 */
async function compressedVariant(file: string, mtimeMs: number, acceptEncoding: string): Promise<{ path: string; encoding: string } | null> {
  const accepted = acceptEncoding.toLowerCase()
  for (const [suffix, encoding] of [['.br', 'br'], ['.gz', 'gzip']] as const) {
    if (!accepted.includes(encoding)) continue
    const variant = await stat(file + suffix).catch(() => null)
    if (variant?.isFile() && variant.mtimeMs >= mtimeMs) return { path: file + suffix, encoding }
  }
  return null
}

export function createAppServer({ distDir = fileURLToPath(new URL('../dist/', import.meta.url)), env = process.env, fetchImpl = fetch }: { distDir?: string; env?: ServerEnv; fetchImpl?: typeof fetch } = {}) {
  const root = resolve(distDir)
  return createServer(async (req, res) => {
    let apiRequest = false
    try {
      if (!allowedHost(req.headers.host, env)) { res.writeHead(403).end(); return }
      res.setHeader('X-Content-Type-Options', 'nosniff')
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
      const info = await stat(realFile)
      // Pliki w assets/ mają skrót treści w nazwie, więc mogą być buforowane bez końca. Reszta (w tym /data/) jest
      // rewalidowana: słaby ETag z rozmiaru i czasu modyfikacji pozwala odpowiedzieć 304 bez treści.
      const cache = path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
      const etag = `W/"${info.size.toString(36)}-${Math.floor(info.mtimeMs).toString(36)}"`
      const headers: Record<string, string> = { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': cache, ETag: etag, Vary: 'Accept-Encoding' }
      if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers).end(); return }
      const variant = await compressedVariant(realFile, info.mtimeMs, String(req.headers['accept-encoding'] ?? ''))
      if (variant) headers['Content-Encoding'] = variant.encoding
      const body = await readFile(variant?.path ?? realFile)
      res.writeHead(200, headers)
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
