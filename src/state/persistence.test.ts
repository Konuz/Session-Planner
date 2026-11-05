import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('ulotne akcje nie serializują ani nie zapisują stanu; awaria zapisu nie przerywa akcji', async () => {
  vi.resetModules()
  const setItem = vi.fn()
  const storage = { getItem: () => null, setItem }
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('window', { localStorage: storage })
  const { useStore } = await import('./store')
  await Promise.resolve()
  useStore.getState().setMinAlt(26)
  setItem.mockClear()
  const stringify = vi.spyOn(JSON, 'stringify')
  for (let i = 0; i < 60; i++) {
    useStore.getState().setTime(i)
    useStore.getState().setFraming({ paDeg: i })
  }
  expect(setItem).not.toHaveBeenCalled()
  expect(stringify).not.toHaveBeenCalled()
  setItem.mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
  expect(() => useStore.getState().setMinAlt(30)).not.toThrow()
  expect(useStore.getState().minAltDeg).toBe(30)
})

it('duplikaty planu rozpoznaje po ID mimo zmiany indeksu', async () => {
  const { useStore } = await import('./store')
  useStore.setState({ plan: [] })
  useStore.getState().addToPlan(0, 'M 51')
  useStore.getState().addToPlan(1, 'M 51')
  useStore.getState().addToPlan(0, 'M 42')
  expect(useStore.getState().plan.map((p) => p.objectId)).toEqual(['M 51', 'M 42'])
})

it('domyślnie wyłącza etykiety obiektów w widoku 3D niezależnie od kopuły 2D', async () => {
  const { useStore } = await import('./store')
  expect(useStore.getState().showAnnotations).toBe(true)
  expect(useStore.getState().show3DAnnotations).toBe(false)
  useStore.getState().toggle('show3DAnnotations')
  expect(useStore.getState().show3DAnnotations).toBe(true)
  expect(useStore.getState().showAnnotations).toBe(true)
})

it('zapis ze starszej wersji persist nie przepada (B17)', async () => {
  vi.resetModules()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const saved = JSON.stringify({ state: { favoriteIds: ['M 31'], minAltDeg: 33 }, version: 0 })
  const storage = { getItem: () => saved, setItem: vi.fn() }
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('window', { localStorage: storage })
  const { useStore } = await import('./store')
  await Promise.resolve()
  expect(useStore.getState().favoriteIds).toEqual(['M 31'])
  expect(useStore.getState().minAltDeg).toBe(33)
})
