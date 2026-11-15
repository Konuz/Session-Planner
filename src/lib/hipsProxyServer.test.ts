import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHipsProxy, createHipsStore, MIRROR_MARKER, mirrorSet, parseHipsPath } from '../../server/hipsProxy.ts'

describe('parseHipsPath', () => {
  it('przyjmuje kafelki znanych zestawów i Allsky rzędu 3, z prefiksem ścieżki i bez', () => {
    expect(parseHipsPath('/api/hips/nsns-tc8/Norder5/Dir0/Npix1000.jpg')).toEqual({ set: 'nsns-tc8', order: 5, npix: 1000 })
    expect(parseHipsPath('/nsns-rgb8/Norder5/Dir10000/Npix12287.jpg')).toEqual({ set: 'nsns-rgb8', order: 5, npix: 12287 })
    expect(parseHipsPath('/api/hips/nsns-tc8/Norder3/Allsky.jpg')).toEqual({ set: 'nsns-tc8', order: 3, npix: 'allsky' })
  })

  it('odrzuca obce zestawy, rzędy i numery poza HEALPix, zły katalog i Allsky innego rzędu', () => {
    for (const path of [
      '/api/hips/dss2/Norder5/Dir0/Npix1.jpg',
      '/api/hips/nsns-tc8/Norder6/Dir0/Npix1.jpg',
      '/api/hips/nsns-tc8/Norder5/Dir10000/Npix12288.jpg',
      '/api/hips/nsns-tc8/Norder5/Dir0/Npix10000.jpg',
      '/api/hips/nsns-tc8/Norder2/Allsky.jpg',
      '/api/hips/nsns-tc8/Norder5/Dir0/Npix1.png',
      '/api/hips/nsns-tc8/../Norder5/Dir0/Npix1.jpg',
    ]) expect(parseHipsPath(path), path).toBeNull()
  })
})

describe('pośrednik kafelków', () => {
  let dir = ''
  beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'hips-proxy-')) })
  afterEach(async () => { await rm(dir, { recursive: true, force: true }) })

  async function withServer(upstream: typeof fetch, run: (get: (path: string) => Promise<Response>) => Promise<void>) {
    const api = createHipsProxy({ HIPS_CACHE_DIR: dir }, upstream)
    const server = createServer((req, res) => { void api(req, res) })
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('listen')
    try { await run((path) => fetch(`http://127.0.0.1:${address.port}${path}`)) } finally { await new Promise<void>((r) => server.close(() => r())) }
  }

  // PNG 32 × 32: lewa połowa biała, prawa przezroczysta, jak kafelek na skraju pokrycia.
  const png = () => {
    const rgba = Buffer.alloc(32 * 32 * 4)
    for (let p = 0; p < 32 * 32; p++) if (p % 32 < 16) rgba.fill(255, p * 4, p * 4 + 4)
    return sharp(rgba, { raw: { width: 32, height: 32, channels: 4 } }).png().toBuffer()
  }

  it('pobiera PNG raz, oddaje JPEG z czernią zamiast przezroczystości i potem czyta go z dysku', async () => {
    const body = await png()
    const upstream = vi.fn(async (input: string | URL | Request) => {
      expect(String(input)).toBe('https://www.simg.de/nebulae3/dr0_1/tc8/Norder5/Dir0/Npix7.png')
      await new Promise((r) => setTimeout(r, 20))
      return new Response(new Uint8Array(body), { headers: { 'Content-Type': 'image/png' } })
    })
    await withServer(upstream as typeof fetch, async (get) => {
      const replies = await Promise.all([1, 2, 3].map(() => get('/api/hips/nsns-tc8/Norder5/Dir0/Npix7.jpg')))
      expect(replies.map((r) => r.status)).toEqual([200, 200, 200])
      expect(replies[0].headers.get('content-type')).toBe('image/jpeg')
      const { data, info } = await sharp(Buffer.from(await replies[0].arrayBuffer())).raw().toBuffer({ resolveWithObject: true })
      expect(info.channels).toBe(3)
      const at = (x: number, y: number) => data[(y * 32 + x) * 3]
      expect(at(4, 16)).toBeGreaterThan(240)
      expect(at(28, 16)).toBeLessThan(15)
      expect(upstream).toHaveBeenCalledTimes(1)
    })
    // Nowy proces serwera: kafelek z dysku, bez źródła.
    const offline = vi.fn(async () => new Response('', { status: 503 }))
    await withServer(offline as unknown as typeof fetch, async (get) => {
      expect((await get('/api/hips/nsns-tc8/Norder5/Dir0/Npix7.jpg')).status).toBe(200)
      expect(offline).not.toHaveBeenCalled()
    })
  })

  it('pełna kopia: schodzi tylko pod istniejące kafelki, ponawia awarie, a po znaczniku nie pyta źródła', async () => {
    const body = await png()
    // Istnieje Allsky i po jednym kafelku na rząd: npix = 4 · 4^k (pierwsze dziecko ściany 4); kafelek rzędu 2 dwa razy zawodzi.
    let flaky = 2
    const upstream = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/Norder3/Allsky.png')) return new Response(new Uint8Array(body))
      const [, order, npix] = /Norder(\d)\/Dir\d+\/Npix(\d+)\.png$/.exec(url)!.map(Number)
      if (order === 2 && npix === 64 && flaky-- > 0) return new Response('', { status: 503 })
      return npix === 4 * 4 ** order ? new Response(new Uint8Array(body)) : new Response('', { status: 404 })
    })
    const store = createHipsStore({ HIPS_CACHE_DIR: dir }, upstream as typeof fetch)
    const totals = await mirrorSet(store, 'nsns-tc8')
    expect(totals).toEqual({ tiles: 6, missing: 11 + 5 * 3, failed: 0 })
    // Allsky, 12 kafelków rzędu 0, po 4 dzieci na rzędach 1–5 i 2 ponowienia.
    expect(upstream).toHaveBeenCalledTimes(1 + 12 + 5 * 4 + 2)
    expect(JSON.parse(await readFile(join(dir, 'nsns-tc8', MIRROR_MARKER), 'utf8'))).toMatchObject({ tiles: 6, failed: 0 })
    const offline = vi.fn(async () => new Response('', { status: 503 }))
    await withServer(offline as unknown as typeof fetch, async (get) => {
      expect((await get('/api/hips/nsns-tc8/Norder5/Dir0/Npix4096.jpg')).status).toBe(200)
      expect((await get('/api/hips/nsns-tc8/Norder5/Dir0/Npix4097.jpg')).status).toBe(404)
      expect(offline).not.toHaveBeenCalled()
    })
  })

  it('404 źródła zapamiętuje, awarii źródła nie', async () => {
    const upstream = vi.fn(async (input: string | URL | Request) => new Response('', { status: String(input).includes('Npix5.') ? 404 : 503 }))
    await withServer(upstream as unknown as typeof fetch, async (get) => {
      expect((await get('/api/hips/nsns-tc8/Norder5/Dir0/Npix5.jpg')).status).toBe(404)
      expect((await get('/api/hips/nsns-tc8/Norder5/Dir0/Npix5.jpg')).status).toBe(404)
      expect(upstream).toHaveBeenCalledTimes(1)
      expect((await get('/api/hips/nsns-tc8/Norder5/Dir0/Npix6.jpg')).status).toBe(502)
      expect((await get('/api/hips/nsns-tc8/Norder5/Dir0/Npix6.jpg')).status).toBe(502)
      expect(upstream).toHaveBeenCalledTimes(3)
      expect((await get('/api/hips/obcy/Norder5/Dir0/Npix6.jpg')).status).toBe(404)
      expect(upstream).toHaveBeenCalledTimes(3)
    })
  })
})
