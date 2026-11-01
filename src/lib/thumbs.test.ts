import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSkyImage } from './thumbs'

describe('miniatury', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('gdy serwery CDS nie odpowiadają, po limicie czasu przechodzi do SkyView', async () => {
    vi.useFakeTimers()
    // Zawieszone połączenie: odpowiedź nie przychodzi, zapytanie kończy dopiero przerwanie.
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(init.signal!.reason)))))
    let result: string | null = null
    void getSkyImage(10.6847, 41.269, 3, 800).then((url) => (result = url))
    await vi.advanceTimersByTimeAsync(15_000)
    expect(result).toMatch(/^https:\/\/skyview\.gsfc\.nasa\.gov\//)
  })

  it('drugi odbiorca dostaje obraz, gdy pierwszy przerwał wspólne zapytanie (podwójny efekt w StrictMode)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob([new Uint8Array(500)]))))
    const first = new AbortController()
    const a = getSkyImage(83.82, -5.39, 1, 100, first.signal)
    first.abort()
    const b = getSkyImage(83.82, -5.39, 1, 100, new AbortController().signal)
    await expect(a).rejects.toThrow()
    await expect(b).resolves.toMatch(/^blob:/)
  })
})
