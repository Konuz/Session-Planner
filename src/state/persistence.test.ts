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

it('stary zapis bez ownPhotos daje pusty indeks', async () => {
  vi.resetModules()
  const saved = JSON.stringify({ state: { favoriteIds: ['M 31'] }, version: 1 })
  const storage = { getItem: () => saved, setItem: vi.fn() }
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('window', { localStorage: storage })
  const { useStore } = await import('./store')
  await Promise.resolve()
  expect(useStore.getState().ownPhotos).toEqual({})
})

it('ownPhotos przetrwa zapis i odczyt', async () => {
  vi.resetModules()
  let saved: string | null = null
  const storage = { getItem: () => saved, setItem: (_: string, value: string) => { saved = value } }
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('window', { localStorage: storage })
  const first = await import('./store')
  await Promise.resolve()
  first.useStore.getState().setOwnPhoto('M 51', 'abc')
  vi.resetModules()
  const second = await import('./store')
  await Promise.resolve()
  expect(second.useStore.getState().ownPhotos).toEqual({ 'M 51': { photoId: 'abc', shown: true } })
})

it('setOwnPhoto włącza, toggle przełącza, remove usuwa', async () => {
  const { useStore } = await import('./store')
  useStore.setState({ ownPhotos: {} })
  useStore.getState().setOwnPhoto('M 42', 'p1')
  expect(useStore.getState().ownPhotos['M 42']).toEqual({ photoId: 'p1', shown: true })
  useStore.getState().toggleOwnPhotoShown('M 42')
  expect(useStore.getState().ownPhotos['M 42'].shown).toBe(false)
  useStore.getState().setOwnPhoto('M 42', 'p2')
  expect(useStore.getState().ownPhotos['M 42']).toEqual({ photoId: 'p2', shown: true })
  useStore.getState().removeOwnPhoto('M 42')
  expect(useStore.getState().ownPhotos).toEqual({})
})
