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

it('warstwa moich zdjęć: domyślnie włączona, krycie 100%, przycinane do 10–100%', async () => {
  vi.resetModules()
  const storage = { getItem: () => null, setItem: vi.fn() }
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('window', { localStorage: storage })
  const { useStore } = await import('./store')
  await Promise.resolve()
  expect(useStore.getState().showOwnPhotos).toBe(true)
  expect(useStore.getState().ownPhotosOpacity).toBe(1)
  useStore.getState().toggle('showOwnPhotos')
  expect(useStore.getState().showOwnPhotos).toBe(false)
  useStore.getState().setOwnPhotosOpacity(0.02)
  expect(useStore.getState().ownPhotosOpacity).toBe(0.1)
  useStore.getState().setOwnPhotosOpacity(1.7)
  expect(useStore.getState().ownPhotosOpacity).toBe(1)
  useStore.getState().setOwnPhotosOpacity(0.45)
  expect(useStore.getState().ownPhotosOpacity).toBe(0.45)
})

it('warstwa moich zdjęć trafia do zapisu, a stary zapis bez niej dostaje wartości domyślne', async () => {
  vi.resetModules()
  let saved: string | null = JSON.stringify({ state: { favoriteIds: ['M 31'], showOutlines: false }, version: 1 })
  const storage = { getItem: () => saved, setItem: (_: string, value: string) => { saved = value } }
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('window', { localStorage: storage })
  const first = await import('./store')
  await Promise.resolve()
  expect(first.useStore.getState().showOwnPhotos).toBe(true)
  expect(first.useStore.getState().ownPhotosOpacity).toBe(1)
  first.useStore.getState().toggle('showOwnPhotos')
  first.useStore.getState().setOwnPhotosOpacity(0.4)
  expect(saved).toContain('"showOwnPhotos":false')
  expect(saved).toContain('"ownPhotosOpacity":0.4')
  vi.resetModules()
  const second = await import('./store')
  await Promise.resolve()
  expect(second.useStore.getState().showOwnPhotos).toBe(false)
  expect(second.useStore.getState().ownPhotosOpacity).toBe(0.4)
})

it('krycie konturów: domyślnie 100%, przycinane do 10–100%, trafia do zapisu', async () => {
  vi.resetModules()
  let saved: string | null = JSON.stringify({ state: { showOutlines: true }, version: 1 })
  const storage = { getItem: () => saved, setItem: (_: string, value: string) => { saved = value } }
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('window', { localStorage: storage })
  const first = await import('./store')
  await Promise.resolve()
  expect(first.useStore.getState().outlinesOpacity).toBe(1)
  first.useStore.getState().setOutlinesOpacity(0)
  expect(first.useStore.getState().outlinesOpacity).toBe(0.1)
  first.useStore.getState().setOutlinesOpacity(3)
  expect(first.useStore.getState().outlinesOpacity).toBe(1)
  first.useStore.getState().setOutlinesOpacity(0.35)
  expect(saved).toContain('"outlinesOpacity":0.35')
  vi.resetModules()
  const second = await import('./store')
  await Promise.resolve()
  expect(second.useStore.getState().outlinesOpacity).toBe(0.35)
})
