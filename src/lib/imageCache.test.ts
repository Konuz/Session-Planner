import { afterEach, expect, it, vi } from 'vitest'
import { imageCache } from './imageCache'

afterEach(() => vi.unstubAllGlobals())

it('równoległe zapisy przycinają magazyn i odzyskują miejsce po quota', async () => {
  const entries = new Map<string, Response>()
  let quota = false
  vi.stubGlobal('caches', { open: async () => ({
    match: async (key: string) => entries.get(key)?.clone(),
    keys: async () => [...entries.keys()],
    delete: async (key: string) => entries.delete(key),
    put: async (key: string, value: Response) => {
      if (quota) { quota = false; throw new DOMException('full', 'QuotaExceededError') }
      await Promise.resolve()
      entries.set(key, value)
    },
  }) })
  const cache = imageCache('test', 3)
  const otherInstance = imageCache('test', 3)
  await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 ? cache : otherInstance).put(`/${i}`, new Blob(['image']))))
  expect(entries.size).toBe(3)
  quota = true
  await cache.put('/new', new Blob(['new']))
  expect(entries.size).toBeLessThanOrEqual(3)
  expect(await (await cache.get('/new'))?.text()).toBe('new')
})

it('bez blokad między kartami cache jest tylko do odczytu', async () => {
  vi.stubGlobal('navigator', {})
  const put = vi.fn()
  vi.stubGlobal('caches', { open: async () => ({ keys: async () => [], put, match: async () => new Response('cached') }) })
  const cache = imageCache('without-locks', 3)
  await cache.put('/new', new Blob(['image']))
  expect(put).not.toHaveBeenCalled()
  expect(await (await cache.get('/old'))?.text()).toBe('cached')
})
