import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SURVEYS } from './hips'

const M = SURVEYS.dss2.mirrors
const image = (bytes = 500) => new Response(new Blob([new Uint8Array(bytes)]), { headers: { 'Content-Type': 'image/jpeg' } })
type Behavior = 'hang' | (() => Response)

/** Atrapa fetch: zachowanie zależy od lustra; 'hang' kończy dopiero przerwanie. */
function stubFetch(behavior: (mirror: number) => Behavior) {
  const f = vi.fn((url: string, init?: RequestInit) => {
    const b = behavior(M.findIndex((m) => url.startsWith(m)))
    if (b === 'hang') return new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))
    return Promise.resolve(b())
  })
  vi.stubGlobal('fetch', f)
  return f
}
const mirrorOf = (call: unknown[]) => M.findIndex((m) => String(call[0]).startsWith(m))

describe('kafelki z luster', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('gdy ESA wisi, kafelek przychodzi z MAST po 3 s, a ESA idzie na koniec kolejki', async () => {
    // Tylko setTimeout: Response.blob() w Node potrzebuje prawdziwego setImmediate.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { fetchTile } = await import('./hipsTiles')
    const f = stubFetch((m) => (m === 0 ? 'hang' : image))
    let blob: Blob | null = null
    void fetchTile(SURVEYS.dss2, 7, 1).then((b) => (blob = b))
    await vi.advanceTimersByTimeAsync(2999)
    expect(blob).toBeNull()
    await vi.advanceTimersByTimeAsync(2)
    vi.useRealTimers()
    await vi.waitFor(() => expect(blob).not.toBeNull(), { timeout: 200 })
    expect(f.mock.calls.map(mirrorOf)).toEqual([0, 1])
    f.mockClear()
    await fetchTile(SURVEYS.dss2, 7, 2)
    expect(f.mock.calls.map(mirrorOf)).toEqual([1])
    const g = stubFetch(() => () => new Response('', { status: 500 }))
    await expect(fetchTile(SURVEYS.dss2, 7, 3)).rejects.toThrow('brak kafelka')
    expect(g.mock.calls.map(mirrorOf)).toEqual([1, 2, 3, 4, 0])
  })

  it('wolne ciało odpowiedzi (nagłówki na czas) nie degraduje lustra', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { fetchTile } = await import('./hipsTiles')
    // Nagłówki od razu, treść po 5 s: na słabym łączu to zwykłe pobieranie, nie awaria lustra.
    // Jak prawdziwy fetch: przerwanie sygnału przerywa też czytanie treści.
    const f = vi.fn(async (_url: string, init?: RequestInit) => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'image/jpeg' }),
      blob: () =>
        new Promise<Blob>((resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
          setTimeout(() => resolve(new Blob([new Uint8Array(500)])), 5000)
        }),
    }) as unknown as Response)
    vi.stubGlobal('fetch', f)
    let blob: Blob | null = null
    void fetchTile(SURVEYS.dss2, 7, 1).then((b) => (blob = b))
    await vi.advanceTimersByTimeAsync(5001)
    expect(blob).not.toBeNull()
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('404 przechodzi do kolejnego lustra bez degradacji', async () => {
    const { fetchTile } = await import('./hipsTiles')
    const f = stubFetch((m) => (m === 0 ? () => new Response('', { status: 404 }) : image))
    await fetchTile(SURVEYS.dss2, 7, 1)
    f.mockClear()
    await fetchTile(SURVEYS.dss2, 7, 2)
    expect(mirrorOf(f.mock.calls[0])).toBe(0)
  })

  it('HTML albo puste ciało to porażka lustra', async () => {
    const { fetchTile } = await import('./hipsTiles')
    const f = stubFetch((m) => (m === 0 ? () => new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }) : image))
    expect((await fetchTile(SURVEYS.dss2, 7, 1)).size).toBe(500)
    f.mockClear()
    await fetchTile(SURVEYS.dss2, 7, 2)
    expect(mirrorOf(f.mock.calls[0])).toBe(1)

    vi.resetModules()
    const fresh = await import('./hipsTiles')
    const g = stubFetch((m) => (m === 0 ? () => image(50) : image))
    expect((await fresh.fetchTile(SURVEYS.dss2, 7, 1)).size).toBe(500)
    g.mockClear()
    await fresh.fetchTile(SURVEYS.dss2, 7, 2)
    expect(mirrorOf(g.mock.calls[0])).toBe(1)
  })

  it('wszystkie lustra zawodzą: odrzucenie', async () => {
    const { fetchTile } = await import('./hipsTiles')
    const f = stubFetch(() => () => new Response('', { status: 500 }))
    await expect(fetchTile(SURVEYS.dss2, 7, 1)).rejects.toThrow('brak kafelka')
    expect(f).toHaveBeenCalledTimes(5)
  })

  it('ten sam kafelek naraz: jedno pobranie', async () => {
    const { fetchTile } = await import('./hipsTiles')
    const f = stubFetch(() => image)
    const [a, b] = await Promise.all([fetchTile(SURVEYS.dss2, 7, 1), fetchTile(SURVEYS.dss2, 7, 1)])
    expect(f).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })
})
