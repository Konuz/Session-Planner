import { createServer } from 'node:http'
import { expect, it, vi } from 'vitest'
import { astrobinPhoto } from '../../server/astrobin.ts'

const env = { ASTROBIN_API_KEY: 'k', ASTROBIN_API_SECRET: 's' }

async function withServer(fetchImpl: typeof fetch, run: (get: (subject: string) => Promise<number>) => Promise<void>) {
  const server = createServer((req, res) => { void astrobinPhoto(req, res, env, fetchImpl) })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('listen')
  try {
    await run(async (subject) => (await fetch(`http://127.0.0.1:${address.port}/api/astrobin-photo?subject=${encodeURIComponent(subject)}`)).status)
  } finally { await new Promise<void>((r) => server.close(() => r())) }
}

it('zapamiętuje zdjęcie i brak zdjęcia, a równoczesne pytania łączy w jedno (audyt C11)', async () => {
  const photo = { objects: [{ url_regular: 'https://cdn.astrobin.com/a.jpg', url_gallery: 'https://www.astrobin.com/a/', title: 'NGC 7000' }] }
  const upstream = vi.fn(async (input: string | URL | Request) => {
    await new Promise((r) => setTimeout(r, 30))
    const subjectHit = new URL(String(input)).searchParams.get('subjects') === 'NGC 7000'
    return new Response(JSON.stringify(subjectHit ? photo : { objects: [] }))
  })
  await withServer(upstream as typeof fetch, async (get) => {
    expect(await Promise.all([get('NGC 7000'), get('NGC 7000'), get('NGC 7000')])).toEqual([200, 200, 200])
    expect(upstream).toHaveBeenCalledTimes(1)
    expect(await get('NGC 7000')).toBe(200)
    expect(upstream).toHaveBeenCalledTimes(1)
    // Obiekt bez zdjęcia: 3 zapytania (subjects, subjects bez spacji, tytuł), potem z pamięci.
    expect(await get('LDN 1 Brak')).toBe(204)
    expect(upstream).toHaveBeenCalledTimes(4)
    expect(await get('LDN 1 Brak')).toBe(204)
    expect(upstream).toHaveBeenCalledTimes(4)
  })
})

it('awarii AstroBin nie zapamiętuje', async () => {
  const upstream = vi.fn(async () => new Response('', { status: 503 }))
  await withServer(upstream as unknown as typeof fetch, async (get) => {
    expect(await get('M 1 awaria')).toBe(502)
    expect(await get('M 1 awaria')).toBe(502)
    expect(upstream).toHaveBeenCalledTimes(2)
  })
})
