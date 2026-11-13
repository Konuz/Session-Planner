import { afterEach, expect, it, vi } from 'vitest'
import { request } from 'node:http'
import { mkdir, mkdtemp, readFile, rm, symlink, utimes, writeFile } from 'node:fs/promises'
import { brotliDecompressSync, gunzipSync } from 'node:zlib'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createAppServer } from '../../server/index.ts'

vi.mock('node:fs/promises', async (original) => {
  const fs = await original<typeof import('node:fs/promises')>()
  return { ...fs, readFile: vi.fn(fs.readFile) }
})

afterEach(() => vi.restoreAllMocks())

it('produkcyjny serwer dostarcza frontend i endpoint AstroBin z sekretami wyłącznie po stronie serwera', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tracker-server-'))
  const privateDir = await mkdtemp(join(tmpdir(), 'tracker-server-private-'))
  await writeFile(join(dir, 'index.html'), '<html>Tracker</html>')
  await writeFile(join(privateDir, 'secret.txt'), 'private file')
  await symlink(privateDir, join(dir, 'escape'), 'junction')
  const upstream = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ objects: [{ url_regular: 'https://cdn.astrobin.com/image.jpg', url_gallery: 'https://www.astrobin.com/abc/', title: 'M 51' }] })))
  const server = createAppServer({ distDir: dir, env: { ASTROBIN_API_KEY: 'test-key', ASTROBIN_API_SECRET: 'test-secret' }, fetchImpl: upstream })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('listen')
  const base = `http://127.0.0.1:${address.port}`
  try {
    expect(await (await fetch(base)).text()).toContain('Tracker')
    const response = await fetch(`${base}/api/astrobin-photo?subject=M%2051`)
    const photo = await response.json()
    expect(photo).toEqual({ imageUrl: 'https://cdn.astrobin.com/image.jpg', galleryUrl: 'https://www.astrobin.com/abc/', title: 'M 51' })
    expect(JSON.stringify(photo)).not.toContain('test-secret')
    const url = new URL(String(upstream.mock.calls[0][0]))
    expect(url.searchParams.get('api_secret')).toBe('test-secret')
    expect(url.searchParams.get('user')).toBe('Konuz')
    expect((await fetch(`${base}/api/astrobin-photo?subject=M51`, { method: 'POST' })).status).toBe(405)
    expect((await fetch(`${base}/api/astrobin-photo`)).status).toBe(400)
    expect((await fetch(`${base}/.env.local`)).status).toBe(404)
    expect((await fetch(`${base}/assets/missing.js`)).status).toBe(404)
    expect((await fetch(`${base}/escape/secret.txt`)).status).toBe(403)
    expect((await fetch(`${base}/..%5c..%5cpackage.json`)).status).toBe(403)
    expect((await fetch(`${base}/%00`)).status).toBe(400)
    expect((await fetch(`${base}/index.html%00.js`)).status).toBe(400)
    expect((await fetch(base, { method: 'HEAD' })).headers.get('Content-Type')).toContain('text/html')
    vi.mocked(readFile).mockRejectedValueOnce(Object.assign(new Error('private filesystem details'), { code: 'EACCES' }))
    const failedRead = await fetch(base)
    expect(failedRead.status).toBe(500)
    expect(await failedRead.text()).not.toContain('private filesystem details')
    vi.mocked(readFile).mockRejectedValueOnce(Object.assign(new Error('missing catalog'), { code: 'ENOENT' }))
    expect((await fetch(`${base}/api/photo/distances?id=M51`)).status).toBe(500)
    upstream.mockResolvedValueOnce(new Response('', { status: 500 }))
    expect((await fetch(`${base}/api/astrobin-photo?subject=M51`)).status).toBe(502)
    const cancel = vi.fn()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new TextEncoder().encode('{"objects":[]}')); controller.close() },
      cancel,
    })
    upstream.mockResolvedValueOnce(new Response(stream, { headers: { 'Content-Length': String(1024 * 1024 + 1) } }))
    expect((await fetch(`${base}/api/astrobin-photo?subject=M51`)).status).toBe(502)
    expect(cancel).toHaveBeenCalledTimes(1)
    upstream.mockImplementation(async () => new Response(JSON.stringify({ objects: [] })))
    expect((await fetch(`${base}/api/astrobin-photo?subject=M51`)).status).toBe(204)
  } finally {
    await new Promise<void>((r, reject) => server.close((e) => e ? reject(e) : r()))
    await rm(dir, { recursive: true, force: true })
    await rm(privateDir, { recursive: true, force: true })
  }
})

it('podaje wstępnie skompresowane warianty i odpowiada 304 na zgodny ETag (audyt C04)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tracker-compress-'))
  await writeFile(join(dir, 'index.html'), '<html>Tracker</html>')
  await mkdir(join(dir, 'data'))
  const json = JSON.stringify({ objects: Array.from({ length: 400 }, (_, i) => ({ id: `NGC ${i}` })) })
  await writeFile(join(dir, 'data', 'catalog.json'), json)
  await writeFile(join(dir, 'data', 'sky.json'), '{"stale":true}')
  const { compressDist } = await import('../../scripts/compress-dist.ts')
  const result = await compressDist(dir)
  expect(result.files).toBe(1)
  // Wariant starszy od pliku (np. po częściowej przebudowie) nie może zostać podany.
  await writeFile(join(dir, 'data', 'sky.json.br'), 'nieaktualne')
  await utimes(join(dir, 'data', 'sky.json.br'), new Date(0), new Date(0))
  const server = createAppServer({ distDir: dir, env: {} })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('listen')
  const port = address.port
  try {
    const br = await getBody(port, '/data/catalog.json', { 'Accept-Encoding': 'gzip, br' })
    expect(br.headers['content-encoding']).toBe('br')
    expect(br.headers.vary).toBe('Accept-Encoding')
    expect(brotliDecompressSync(br.body).toString()).toBe(json)
    expect(br.body.length).toBeLessThan(json.length / 3)
    const gz = await getBody(port, '/data/catalog.json', { 'Accept-Encoding': 'gzip' })
    expect(gz.headers['content-encoding']).toBe('gzip')
    expect(gunzipSync(gz.body).toString()).toBe(json)
    const plain = await getBody(port, '/data/catalog.json')
    expect(plain.headers['content-encoding']).toBeUndefined()
    expect(plain.body.toString()).toBe(json)
    const etag = String(plain.headers.etag)
    expect(etag).toMatch(/^W\/"/)
    const notModified = await getBody(port, '/data/catalog.json', { 'If-None-Match': etag })
    expect(notModified.status).toBe(304)
    expect(notModified.body.length).toBe(0)
    const stale = await getBody(port, '/data/sky.json', { 'Accept-Encoding': 'br' })
    expect(stale.headers['content-encoding']).toBeUndefined()
    expect(stale.body.toString()).toBe('{"stale":true}')
  } finally {
    await new Promise<void>((r, reject) => server.close((e) => e ? reject(e) : r()))
    await rm(dir, { recursive: true, force: true })
  }
})

/** Surowa treść bez automatycznej dekompresji, którą robi fetch. */
function getBody(port: number, path: string, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }>((resolve, reject) => {
    request({ host: '127.0.0.1', port, path, headers }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c)).on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }))
    }).on('error', reject).end()
  })
}

/** fetch nie pozwala ustawić nagłówka Host, więc żądanie idzie przez node:http. */
function get(port: number, path: string, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; headers: Record<string, string | string[] | undefined> }>((resolve, reject) => {
    request({ host: '127.0.0.1', port, path, headers }, (res) => { res.resume(); resolve({ status: res.statusCode ?? 0, headers: res.headers }) }).on('error', reject).end()
  })
}

it('odrzuca obce nazwy w nagłówku Host (DNS rebinding) i ustawia nagłówki statyków', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tracker-hosts-'))
  await writeFile(join(dir, 'index.html'), '<html>Tracker</html>')
  await mkdir(join(dir, 'assets'))
  await writeFile(join(dir, 'assets', 'index-abc123.js'), 'export {}')
  const server = createAppServer({ distDir: dir, env: { ALLOWED_HOSTS: 'tracker.konuzastro.pl, other.test' } })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('listen')
  const port = address.port
  try {
    const evil = { Host: `evil.test:${port}`, Origin: `http://evil.test:${port}` }
    expect((await get(port, '/api/photo/status', evil)).status).toBe(403)
    expect((await get(port, '/api/astrobin-photo?subject=M51', evil)).status).toBe(403)
    expect((await get(port, '/', evil)).status).toBe(403)
    for (const host of [`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`, 'app.localhost', 'tracker.konuzastro.pl', 'OTHER.test:443', '192.168.1.20:4173']) {
      expect((await get(port, '/', { Host: host })).status, host).toBe(200)
    }
    const page = await get(port, '/')
    expect(page.headers['x-content-type-options']).toBe('nosniff')
    expect(page.headers['cache-control']).toBe('no-cache')
    const asset = await get(port, '/assets/index-abc123.js')
    expect(asset.headers['cache-control']).toBe('public, max-age=31536000, immutable')
    expect(asset.headers['x-content-type-options']).toBe('nosniff')
  } finally {
    await new Promise<void>((r, reject) => server.close((e) => e ? reject(e) : r()))
    await rm(dir, { recursive: true, force: true })
  }
})
