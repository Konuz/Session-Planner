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

it('przenosi poprzedni sprzęt do Zestawu 1 i odtwarza oba zestawy po zmianach', async () => {
  vi.resetModules()
  let saved = JSON.stringify({
    state: { equipment: { focalLengthMm: 750, reducer: 0.8, widthPx: 4144, pixelUm: 4.2 } },
    version: 1,
  })
  const storage = { getItem: () => saved, setItem: (_: string, value: string) => { saved = value } }
  vi.stubGlobal('localStorage', storage)
  const { useStore } = await import('./store')
  await Promise.resolve()
  const firstId = useStore.getState().activeEquipmentSetId
  expect(useStore.getState().equipmentSets[0]).toMatchObject({ id: firstId, name: 'Zestaw 1' })
  expect(useStore.getState().equipment).toMatchObject({ focalLengthMm: 750, widthPx: 4144 })

  useStore.getState().addEquipmentSet()
  const secondId = useStore.getState().activeEquipmentSetId
  expect(secondId).not.toBe(firstId)
  expect(useStore.getState().equipmentSets[1].name).toBe('Zestaw 2')
  expect(useStore.getState().equipment).toMatchObject({ focalLengthMm: 750, widthPx: 4144 })
  useStore.getState().renameEquipmentSet('  Szerokie pole  ')
  useStore.getState().setEquipment({ focalLengthMm: 300, widthPx: 3008 })

  vi.resetModules()
  const { useStore: reloaded } = await import('./store')
  await Promise.resolve()
  expect(reloaded.getState().equipmentSets.map((item) => item.name)).toEqual(['Zestaw 1', 'Szerokie pole'])
  expect(reloaded.getState().activeEquipmentSetId).toBe(secondId)
  expect(reloaded.getState().equipment).toMatchObject({ focalLengthMm: 300, widthPx: 3008, reducer: 0.8, pixelUm: 4.2 })
  reloaded.getState().selectEquipmentSet(firstId)
  expect(reloaded.getState().equipment).toMatchObject({ focalLengthMm: 750, widthPx: 4144 })
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

it('krycie warstw z uszkodzonego zapisu wraca do zakresu 10–100%', async () => {
  vi.resetModules()
  const saved = JSON.stringify({ state: { ownPhotosOpacity: 5, outlinesOpacity: 'x' }, version: 1 })
  const storage = { getItem: () => saved, setItem: vi.fn() }
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('window', { localStorage: storage })
  const { useStore } = await import('./store')
  await Promise.resolve()
  expect(useStore.getState().ownPhotosOpacity).toBe(1)
  expect(useStore.getState().outlinesOpacity).toBe(1)
})

it('zagęszczenie obiektów domyślnie wynosi 100%, zapisuje się i mieści w zakresie 0–100%', async () => {
  vi.resetModules()
  let saved: string | null = JSON.stringify({ state: {}, version: 1 })
  const storage = { getItem: () => saved, setItem: (_: string, value: string) => { saved = value } }
  vi.stubGlobal('localStorage', storage)
  const first = await import('./store')
  await Promise.resolve()
  expect(first.useStore.getState().skyObjectDensity).toBe(100)
  first.useStore.getState().setSkyObjectDensity(35)

  vi.resetModules()
  const second = await import('./store')
  await Promise.resolve()
  expect(second.useStore.getState().skyObjectDensity).toBe(35)
  second.useStore.getState().setSkyObjectDensity(-10)
  expect(second.useStore.getState().skyObjectDensity).toBe(0)
  second.useStore.getState().setSkyObjectDensity(110)
  expect(second.useStore.getState().skyObjectDensity).toBe(100)
})

it('wybrany dostawca pogody trafia do zapisu, a nieprawidłowy z zapisu wraca do Open-Meteo', async () => {
  vi.resetModules()
  let saved: string | null = JSON.stringify({ state: { weatherProvider: 'nieznany-dostawca' }, version: 1 })
  const storage = { getItem: () => saved, setItem: (_: string, value: string) => { saved = value } }
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('window', { localStorage: storage })
  const first = await import('./store')
  await Promise.resolve()
  expect(first.useStore.getState().weatherProvider).toBe('openmeteo')

  first.useStore.getState().setWeatherProvider('ecmwf')
  expect(saved).toContain('"weatherProvider":"ecmwf"')

  vi.resetModules()
  const second = await import('./store')
  await Promise.resolve()
  expect(second.useStore.getState().weatherProvider).toBe('ecmwf')
})

it('linie do galaktyk 3D wracają z zapisu, a nieznana wartość daje domyślne włączenie', async () => {
  for (const [saved, expected] of [[false, false], [true, true], ['tak', true]] as const) {
    vi.resetModules()
    const json = JSON.stringify({ state: { showGalaxyLines: saved }, version: 1 })
    const storage = { getItem: () => json, setItem: vi.fn() }
    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('window', { localStorage: storage })
    const { useStore } = await import('./store')
    await Promise.resolve()
    expect(useStore.getState().showGalaxyLines).toBe(expected)
  }
})

it('wygląd nieba i źródło miniatur wracają z zapisu, a nieznane wartości dają domyślne', async () => {
  for (const [look, source, expected] of [['nsns', 'nsns', ['nsns', 'nsns']], ['nsnsRgb', 'nsnsRgb', ['nsnsRgb', 'nsnsRgb']], ['mgła', 'sdss', ['default', 'dss2']]] as const) {
    vi.resetModules()
    const json = JSON.stringify({ state: { skyLook: look, thumbSource: source }, version: 1 })
    const storage = { getItem: () => json, setItem: vi.fn() }
    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('window', { localStorage: storage })
    const { useStore } = await import('./store')
    await Promise.resolve()
    expect([useStore.getState().skyLook, useStore.getState().thumbSource]).toEqual(expected)
  }
})

it('ustawienia kadrowania (framing i framingView) zachowują się po wyjściu z widoku kadrowania', async () => {
  const { useStore } = await import('./store')
  useStore.getState().select(7, false)
  useStore.getState().setCenterMode('framing')
  useStore.getState().setFraming({ raDeg: 83.8, decDeg: -5.4, paDeg: 45, mosaic: { cols: 2, rows: 2, overlapPct: 20 } })
  useStore.getState().setFramingView({
    layer: 'nsns',
    zoom: 1.8,
    comparisonOpen: true,
    comparedSetIds: ['1', '2'],
    candidateId: '2',
    frameVisible: false,
    photoCenter: { objectIndex: 7, raDeg: 84.0, decDeg: -5.2 },
  })

  // Wyjście z kadrowania na kopułę i inną kartę oraz powrót do tego samego obiektu.
  useStore.getState().setCenterMode('dome')
  useStore.getState().setTab('planner')
  useStore.getState().setTab('sky')
  useStore.getState().setCenterMode('framing')
  useStore.getState().select(7, false)

  expect(useStore.getState().framing).toEqual({
    raDeg: 83.8,
    decDeg: -5.4,
    paDeg: 45,
    mosaic: { cols: 2, rows: 2, overlapPct: 20 },
  })
  expect(useStore.getState().framingView).toEqual({
    layer: 'nsns',
    zoom: 1.8,
    comparisonOpen: true,
    comparedSetIds: ['1', '2'],
    candidateId: '2',
    frameVisible: false,
    photoCenter: { objectIndex: 7, raDeg: 84.0, decDeg: -5.2 },
  })
})
