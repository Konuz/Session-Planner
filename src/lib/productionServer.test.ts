import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
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
