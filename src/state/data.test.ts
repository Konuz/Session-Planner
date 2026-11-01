import { afterEach, expect, it, vi } from 'vitest'

const hooks = vi.hoisted(() => ({ subscribe: null as unknown as (l: () => void) => () => void, snapshot: null as unknown as () => { catalog: unknown; error: string | null } }))
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useEffect: (effect: () => void) => effect(),
  useSyncExternalStore: (subscribe: typeof hooks.subscribe, snapshot: typeof hooks.snapshot) => {
    hooks.subscribe = subscribe
    hooks.snapshot = snapshot
    return snapshot()
  },
}))
afterEach(() => vi.unstubAllGlobals())

it('błąd katalogu zmienia stabilną migawkę od razu po powiadomieniu', async () => {
  vi.stubGlobal('fetch', async () => new Response('', { status: 503 }))
  const { useCatalog } = await import('./data')
  useCatalog()
  const subscribe = hooks.subscribe
  const before = hooks.snapshot()
  expect(hooks.snapshot()).toBe(before)
  const changed = vi.fn()
  const unsubscribe = subscribe(changed)
  await vi.waitFor(() => expect(changed).toHaveBeenCalled())
  expect(hooks.snapshot()).not.toBe(before)
  expect(hooks.snapshot().error).toContain('503')
  expect(hooks.snapshot()).toBe(hooks.snapshot())
  useCatalog()
  expect(hooks.subscribe).toBe(subscribe)
  unsubscribe()
})
