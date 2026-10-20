// Testy funkcji „pobieranie-zdjec” (spec: .autoloop/features/pobieranie-zdjec/spec.md).
// Nazwy API wybrał test-author (spec ich nie podaje) – opis w src/services/skyImage/loader.ts.
// Domyślnie jak w spec: wycinek M 42 (DSS2 kolor, pole 1°, 800 px), tryb „automatycznie”, brak zapamiętanego
// źródła, pusta pamięć. Sieć, ładowanie obrazu, pamięć, `localStorage` i zegar to atrapy z ./helpers.ts.
// Każde źródło fetch zwraca inną treść (`<id>-bytes`), więc wynik jest powiązany ze źródłem, które go dało.
import { describe, expect, it } from 'vitest'
import type { SkyImageShown } from '../../../src/services/skyImage/loader'
import { skyImageUrl, type SkyImageRequest } from '../../../src/services/skyImage/sources'
import { FakeCaches, fillCache, harness, settle, STORAGE_KEY, track } from './helpers'

const M42: SkyImageRequest = {
  center: { raDeg: 83.8221, decDeg: -5.3911 },
  fovDeg: 1,
  sizePx: 800,
  layerId: 'dss2-color',
}
/** Klucze z P14 i P15 w `zrodla-zdjec` dla wycinka M 42. */
const HIPS_KEY = '/sky-image-cache/hips2fits/CDS%2FP%2FDSS2%2Fcolor/83.8221/-5.3911/1/800'
const STSCI_KEY = '/sky-image-cache/stsci/dss/83.8221/-5.3911/1/0'

const ALL_FAIL = {
  alaskybis: { status: 503 },
  alasky: { status: 503 },
  skyview: 'error',
  stsci: { status: 503 },
} as const

function asImage(result: unknown): SkyImageShown {
  expect(result).toMatchObject({ kind: 'image' })
  return result as SkyImageShown
}

async function blobText(data: unknown): Promise<string> {
  expect(data).toBeInstanceOf(Blob)
  return await (data as Blob).text()
}

describe('kolejność prób [T22] (P1–P4)', () => {
  it('test_p1: alaskybis milczy, alasky 503, SkyView działa → obraz „NASA SkyView”, bez zapisu, zapamiętane SkyView', async () => {
    const { loader, net, caches, storage, clock } = harness({
      net: { alaskybis: 'silent', alasky: { status: 503 }, skyview: 'ok' },
    })
    const image = asImage(await settle(clock, loader.load(M42), 10_000))
    expect(image.sourceId).toBe('skyview')
    expect(image.sourceName).toBe('NASA SkyView')
    expect(image.data).toEqual({ skyview: skyImageUrl('skyview', M42) })
    expect(image.fromCache).toBe(false)
    expect(image.saved).toBe(false)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    expect(net.calls[2].kind).toBe('image')
    expect(caches?.keys()).toEqual([])
    expect(storage.getItem(STORAGE_KEY)).toBe('skyview')
  })

  it('test_p1_adresy: zapytania idą pod adresy z sources.ts', async () => {
    const { loader, net, clock } = harness({ net: { alaskybis: 'silent', alasky: { status: 503 } } })
    await settle(clock, loader.load(M42), 10_000)
    expect(net.calls.map((call) => call.url)).toEqual([
      skyImageUrl('alaskybis', M42),
      skyImageUrl('alasky', M42),
      skyImageUrl('skyview', M42),
    ])
  })

  it('test_p2: wszystkie cztery źródła zawodzą → „brak zdjęcia” z listą prób i powodów', async () => {
    const { loader, net, storage, clock } = harness({
      net: { alaskybis: 'silent', alasky: { status: 503 }, skyview: 'error', stsci: 'network' },
    })
    const result = await settle(clock, loader.load(M42), 10_000)
    expect(result).toEqual({
      kind: 'none',
      attempts: [
        { sourceId: 'alaskybis', reason: 'limit czasu' },
        { sourceId: 'alasky', reason: 'błąd 503' },
        { sourceId: 'skyview', reason: 'błąd obrazu' },
        { sourceId: 'stsci', reason: 'błąd sieci' },
      ],
    })
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
    expect(loader.current()).toEqual(result)
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('test_p3: po P2 „Spróbuj ponownie” i działa alasky → obraz „CDS hips2fits (alasky)”', async () => {
    const { loader, net, clock } = harness({
      net: { alaskybis: 'silent', alasky: { status: 503 }, skyview: 'error', stsci: 'network' },
    })
    await settle(clock, loader.load(M42), 10_000)
    net.set({ alasky: 'ok' })
    const before = net.calls.length
    const image = asImage(await settle(clock, loader.load(M42), 10_000))
    expect(image.sourceId).toBe('alasky')
    expect(image.sourceName).toBe('CDS hips2fits (alasky)')
    expect(await blobText(image.data)).toBe('alasky-bytes')
    expect(net.sources(before)).toEqual(['alaskybis', 'alasky'])
    expect(loader.current()).toBe(image)
  })

  it('test_p3_pamiec: ponowna próba zaczyna od pamięci (wycinek STScI dopisany po porażce → bez zapytań)', async () => {
    const caches = new FakeCaches()
    const { loader, net, clock } = harness({ caches, net: ALL_FAIL })
    expect(await settle(clock, loader.load(M42))).toMatchObject({ kind: 'none' })
    await fillCache(caches, 'stsci', M42)
    const before = net.calls.length
    const image = asImage(await settle(clock, loader.load(M42)))
    expect(image.sourceId).toBe('stsci')
    expect(image.fromCache).toBe(true)
    expect(net.calls.length).toBe(before)
  })

  it('test_p4_404: odpowiedź 404 → następne źródło', async () => {
    const { loader, net, clock } = harness({ net: { alaskybis: { status: 404 } } })
    const image = asImage(await settle(clock, loader.load(M42)))
    expect(image.sourceId).toBe('alasky')
    expect(await blobText(image.data)).toBe('alasky-bytes')
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
  })

  it('test_p4_503: odpowiedź 503 → następne źródło', async () => {
    const { loader, net, clock } = harness({ net: { alaskybis: { status: 503 } } })
    expect(asImage(await settle(clock, loader.load(M42))).sourceId).toBe('alasky')
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
  })

  it('test_p4_siec: odrzucone zapytanie (brak sieci) → następne źródło', async () => {
    const { loader, net, clock } = harness({ net: { alaskybis: 'network' } })
    expect(asImage(await settle(clock, loader.load(M42))).sourceId).toBe('alasky')
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
  })

  it('test_p4_html: odpowiedź 200 z text/html → następne źródło, strona HTML nie trafia do pamięci', async () => {
    const { loader, net, caches, clock } = harness({
      net: { alaskybis: { status: 200, contentType: 'text/html' } },
    })
    const image = asImage(await settle(clock, loader.load(M42)))
    expect(image.sourceId).toBe('alasky')
    expect(await blobText(image.data)).toBe('alasky-bytes')
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
    expect(await caches?.text(HIPS_KEY)).toBe('alasky-bytes')
  })

  it('test_p4_granica_299: odpowiedź 299 z image/jpeg mieści się w 200–299 → obraz z alaskybis', async () => {
    const { loader, net, clock } = harness({ net: { alaskybis: { status: 299, contentType: 'image/jpeg' } } })
    const image = asImage(await settle(clock, loader.load(M42)))
    expect(image.sourceId).toBe('alaskybis')
    expect(await blobText(image.data)).toBe('alaskybis-response')
    expect(net.sources()).toEqual(['alaskybis'])
  })

  it('test_p4_granica_300: odpowiedź 300 z image/jpeg jest spoza 200–299 → następne źródło', async () => {
    const { loader, net, clock } = harness({ net: { alaskybis: { status: 300, contentType: 'image/jpeg' } } })
    const image = asImage(await settle(clock, loader.load(M42)))
    expect(image.sourceId).toBe('alasky')
    expect(await blobText(image.data)).toBe('alasky-bytes')
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
  })

  it('test_p4_obraz: zdarzenie error obrazu SkyView → następne źródło (STScI)', async () => {
    const { loader, net, clock } = harness({
      net: { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'error' },
    })
    const image = asImage(await settle(clock, loader.load(M42)))
    expect(image.sourceId).toBe('stsci')
    expect(image.sourceName).toBe('STScI DSS')
    expect(await blobText(image.data)).toBe('stsci-bytes')
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
  })

  it('test_p4_kolejnosc_z28: działa pierwsze źródło → tylko jedno zapytanie (alaskybis)', async () => {
    const { loader, net, storage, clock } = harness()
    const image = asImage(await settle(clock, loader.load(M42)))
    expect(image.sourceId).toBe('alaskybis')
    expect(image.sourceName).toBe('CDS hips2fits (alaskybis)')
    expect(image.saved).toBe(true)
    expect(net.sources()).toEqual(['alaskybis'])
    expect(storage.getItem(STORAGE_KEY)).toBe('alaskybis')
  })
})

describe('limit 10 s (P5–P7)', () => {
  it('test_p5: po 9,999 s czekamy, po 10 s przerwanie alaskybis i start alasky', async () => {
    const { loader, net, clock } = harness({ net: { alaskybis: 'silent' } })
    const pending = track(loader.load(M42))
    await clock.advance(9_999)
    expect(net.sources()).toEqual(['alaskybis'])
    expect(net.calls[0].signal.aborted).toBe(false)
    expect(pending.settled()).toBe(false)
    await clock.advance(1)
    expect(net.calls[0].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('alasky')
  })

  it('test_p6: SkyView milczy → po 10 s sygnał przerwania ładowania obrazu i start STScI', async () => {
    const { loader, net, clock } = harness({
      net: { alaskybis: { status: 503 }, alasky: 'network', skyview: 'silent' },
    })
    const pending = track(loader.load(M42))
    await clock.advance(0)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    expect(net.calls[2].kind).toBe('image')
    await clock.advance(9_999)
    expect(net.calls[2].signal.aborted).toBe(false)
    expect(net.calls.length).toBe(3)
    await clock.advance(1)
    expect(net.calls[2].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
    expect(asImage(await pending.promise).sourceId).toBe('stsci')
  })

  it('test_p7: wszystkie źródła milczą → „brak zdjęcia” po 40 s, nie wcześniej', async () => {
    const { loader, net, clock } = harness({
      net: { alaskybis: 'silent', alasky: 'silent', skyview: 'silent', stsci: 'silent' },
    })
    const pending = track(loader.load(M42))
    await clock.advance(39_999)
    expect(pending.settled()).toBe(false)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
    await clock.advance(1)
    expect(pending.settled()).toBe(true)
    expect(await pending.promise).toEqual({
      kind: 'none',
      attempts: [
        { sourceId: 'alaskybis', reason: 'limit czasu' },
        { sourceId: 'alasky', reason: 'limit czasu' },
        { sourceId: 'skyview', reason: 'limit czasu' },
        { sourceId: 'stsci', reason: 'limit czasu' },
      ],
    })
    expect(net.calls.every((call) => call.signal.aborted)).toBe(true)
  })

  it('test_p7_limit_od_startu_zrodla: każde źródło ma własne 10 s (alasky startuje w 10 s, przerwane w 20 s)', async () => {
    const { loader, net, clock } = harness({ net: { alaskybis: 'silent', alasky: 'silent' } })
    const pending = track(loader.load(M42))
    await clock.advance(19_999)
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
    expect(net.calls[1].signal.aborted).toBe(false)
    await clock.advance(1)
    expect(net.calls[1].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    expect(asImage(await pending.promise).sourceId).toBe('skyview')
  })
})

describe('pamięć podręczna (P8–P11)', () => {
  it('test_p8: alasky działa → obraz w pamięci pod kluczem z P14; ponowne otwarcie bez zapytań', async () => {
    const { loader, net, caches, clock } = harness({ net: { alaskybis: 'silent' } })
    const first = asImage(await settle(clock, loader.load(M42), 10_000))
    expect(first.sourceId).toBe('alasky')
    expect(first.saved).toBe(true)
    expect(caches?.keys()).toEqual([HIPS_KEY])
    expect(await caches?.text(HIPS_KEY)).toBe('alasky-bytes')
    const before = net.calls.length
    const second = asImage(await settle(clock, loader.load(M42)))
    expect(net.calls.length).toBe(before)
    expect(second.fromCache).toBe(true)
    expect(await blobText(second.data)).toBe('alasky-bytes')
  })

  it('test_p9: obraz z pamięci ma podpis „CDS hips2fits (alasky)” i „z pamięci” (nowy obiekt, wspólny klucz)', async () => {
    const caches = new FakeCaches()
    const first = harness({ caches, net: { alaskybis: 'silent' } })
    await settle(first.clock, first.loader.load(M42), 10_000)
    const { loader, net, clock } = harness({ caches, net: ALL_FAIL })
    const image = asImage(await settle(clock, loader.load(M42)))
    expect(net.calls).toEqual([])
    expect(image.sourceId).toBe('alasky')
    expect(image.sourceName).toBe('CDS hips2fits (alasky)')
    expect(image.fromCache).toBe(true)
    expect(image.saved).toBe(true)
    expect(caches.keys()).toEqual([HIPS_KEY])
  })

  it('test_p10: w pamięci tylko wycinek STScI → pokazany bez żadnego zapytania', async () => {
    const caches = new FakeCaches()
    await fillCache(caches, 'stsci', M42)
    expect(caches.keys()).toEqual([STSCI_KEY])
    const { loader, net, clock } = harness({ caches })
    const image = asImage(await settle(clock, loader.load(M42)))
    expect(net.calls).toEqual([])
    expect(image.sourceId).toBe('stsci')
    expect(image.sourceName).toBe('STScI DSS')
    expect(image.fromCache).toBe(true)
    expect(await blobText(image.data)).toBe('stsci-bytes')
  })

  it('test_p10_limit: odczyt z pamięci nie podlega limitowi 10 s', async () => {
    const caches = new FakeCaches()
    await fillCache(caches, 'alasky', M42)
    const { loader, net, clock } = harness({ caches })
    caches.holdMatches()
    const pending = track(loader.load(M42))
    await clock.advance(15_000)
    caches.releaseMatches()
    await clock.advance(0)
    const image = asImage(await pending.promise)
    expect(image.fromCache).toBe(true)
    expect(image.sourceId).toBe('alasky')
    expect(net.calls).toEqual([])
  })

  it('test_p11_brak_cache: przeglądarka bez Cache Storage → obraz z sieci, niezapisany', async () => {
    const { loader, net, clock } = harness({ caches: null, net: { alaskybis: { status: 503 } } })
    const image = asImage(await settle(clock, loader.load(M42)))
    expect(image.sourceId).toBe('alasky')
    expect(await blobText(image.data)).toBe('alasky-bytes')
    expect(image.saved).toBe(false)
    expect(image.fromCache).toBe(false)
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
  })

  it('test_p11_brak_miejsca: zapis do pamięci kończy się błędem → obraz i tak się pokazuje', async () => {
    const caches = new FakeCaches()
    caches.putFails = true
    const { loader, clock } = harness({ caches })
    const image = asImage(await settle(clock, loader.load(M42)))
    expect(image.sourceId).toBe('alaskybis')
    expect(await blobText(image.data)).toBe('alaskybis-bytes')
    expect(image.saved).toBe(false)
    expect(loader.current()).toBe(image)
  })
})

describe('ostatnie działające źródło (P12–P14)', () => {
  it('test_p12_stsci: zapamiętane STScI → STScI, alaskybis, alasky, SkyView', async () => {
    const { loader, net, clock } = harness({ remembered: 'stsci', net: ALL_FAIL })
    const result = await settle(clock, loader.load(M42))
    expect(net.sources()).toEqual(['stsci', 'alaskybis', 'alasky', 'skyview'])
    expect(result).toMatchObject({ kind: 'none' })
  })

  it('test_p12_alasky: zapamiętane alasky → alasky, alaskybis, SkyView, STScI', async () => {
    const { loader, net, clock } = harness({ remembered: 'alasky', net: ALL_FAIL })
    const result = await settle(clock, loader.load(M42))
    expect(net.sources()).toEqual(['alasky', 'alaskybis', 'skyview', 'stsci'])
    expect(result).toEqual({
      kind: 'none',
      attempts: [
        { sourceId: 'alasky', reason: 'błąd 503' },
        { sourceId: 'alaskybis', reason: 'błąd 503' },
        { sourceId: 'skyview', reason: 'błąd obrazu' },
        { sourceId: 'stsci', reason: 'błąd 503' },
      ],
    })
  })

  it('test_p12_dziala: zapamiętane STScI i działa → jedno zapytanie, obraz STScI', async () => {
    const { loader, net, clock } = harness({ remembered: 'stsci' })
    const image = asImage(await settle(clock, loader.load(M42)))
    expect(image.sourceId).toBe('stsci')
    expect(net.sources()).toEqual(['stsci'])
  })

  it('test_p13_nieznane: zapamiętane „eso” → kolejność Z28', async () => {
    const { loader, net, clock } = harness({ remembered: 'eso', net: ALL_FAIL })
    await settle(clock, loader.load(M42))
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
  })

  it('test_p13_puste: zapamiętana pusta wartość → kolejność Z28', async () => {
    const { loader, net, clock } = harness({ remembered: '', net: ALL_FAIL })
    await settle(clock, loader.load(M42))
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
  })

  it('test_p14_siec: udane pobranie z sieci zmienia zapamiętane źródło', async () => {
    const { loader, storage, clock } = harness({ remembered: 'stsci', net: { stsci: { status: 503 }, alaskybis: 'network' } })
    expect(asImage(await settle(clock, loader.load(M42))).sourceId).toBe('alasky')
    expect(storage.getItem(STORAGE_KEY)).toBe('alasky')
  })

  it('test_p14_pamiec: obraz z pamięci nie zmienia zapamiętanego źródła', async () => {
    const caches = new FakeCaches()
    await fillCache(caches, 'alasky', M42)
    const { loader, net, storage, clock } = harness({ caches, remembered: 'skyview' })
    const image = asImage(await settle(clock, loader.load(M42)))
    expect(image.fromCache).toBe(true)
    expect(net.calls).toEqual([])
    expect(storage.getItem(STORAGE_KEY)).toBe('skyview')
  })

  it('test_p14_porazka: „brak zdjęcia” nie zmienia zapamiętanego źródła', async () => {
    const { loader, storage, clock } = harness({ remembered: 'alasky', net: ALL_FAIL })
    await settle(clock, loader.load(M42))
    expect(storage.getItem(STORAGE_KEY)).toBe('alasky')
  })

  it('test_p14_reczny: udane pobranie w trybie ręcznym też zmienia zapamiętane źródło', async () => {
    const { loader, net, storage, clock } = harness({ remembered: 'alaskybis' })
    const image = asImage(await settle(clock, loader.load(M42, { sourceId: 'skyview' })))
    expect(image.sourceId).toBe('skyview')
    expect(net.sources()).toEqual(['skyview'])
    expect(storage.getItem(STORAGE_KEY)).toBe('skyview')
  })
})

describe('ręczny wybór źródła (P15–P18)', () => {
  it('test_p15: wybrano SkyView, w pamięci hips2fits, sieć działa → obraz z SkyView', async () => {
    const caches = new FakeCaches()
    await fillCache(caches, 'alasky', M42)
    const { loader, net, clock } = harness({ caches })
    const image = asImage(await settle(clock, loader.load(M42, { sourceId: 'skyview' })))
    expect(image.sourceId).toBe('skyview')
    expect(image.sourceName).toBe('NASA SkyView')
    expect(image.fromCache).toBe(false)
    expect(net.sources()).toEqual(['skyview'])
  })

  it('test_p16: wybrano SkyView, brak sieci, w pamięci hips2fits → SkyView zawodzi, potem obraz z pamięci', async () => {
    const caches = new FakeCaches()
    await fillCache(caches, 'alasky', M42)
    const { loader, net, clock } = harness({
      caches,
      net: { alaskybis: 'network', alasky: 'network', skyview: 'error', stsci: 'network' },
    })
    const image = asImage(await settle(clock, loader.load(M42, { sourceId: 'skyview' })))
    expect(net.sources()).toEqual(['skyview'])
    expect(image.sourceId).toBe('alasky')
    expect(image.sourceName).toBe('CDS hips2fits (alasky)')
    expect(image.fromCache).toBe(true)
    expect(await blobText(image.data)).toBe('alasky-bytes')
  })

  it('test_p16_siec: po porażce wybranego źródła i pustej pamięci → sieć w kolejności automatycznej', async () => {
    const { loader, net, clock } = harness({ net: { alaskybis: { status: 503 }, skyview: 'error' } })
    const image = asImage(await settle(clock, loader.load(M42, { sourceId: 'skyview' })))
    expect(net.sources()).toEqual(['skyview', 'alaskybis', 'alasky'])
    expect(image.sourceId).toBe('alasky')
  })

  it('test_p17: wybrano alaskybis, w pamięci wycinek z alasky → z pamięci bez zapytań, podpis alasky', async () => {
    const caches = new FakeCaches()
    await fillCache(caches, 'alasky', M42)
    const { loader, net, clock } = harness({ caches })
    const image = asImage(await settle(clock, loader.load(M42, { sourceId: 'alaskybis' })))
    expect(net.calls).toEqual([])
    expect(image.sourceId).toBe('alasky')
    expect(image.sourceName).toBe('CDS hips2fits (alasky)')
    expect(image.fromCache).toBe(true)
  })

  it('test_p18: wybrano STScI i wszystko zawodzi → STScI, alaskybis, alasky, SkyView, „brak zdjęcia”', async () => {
    const { loader, net, clock } = harness({ net: ALL_FAIL })
    const result = await settle(clock, loader.load(M42, { sourceId: 'stsci' }))
    expect(net.sources()).toEqual(['stsci', 'alaskybis', 'alasky', 'skyview'])
    expect(result).toEqual({
      kind: 'none',
      attempts: [
        { sourceId: 'stsci', reason: 'błąd 503' },
        { sourceId: 'alaskybis', reason: 'błąd 503' },
        { sourceId: 'alasky', reason: 'błąd 503' },
        { sourceId: 'skyview', reason: 'błąd obrazu' },
      ],
    })
  })

  it('test_p18_dalej: wybrano STScI, zawodzi, alaskybis 503, alasky działa → obraz alasky', async () => {
    const { loader, net, clock } = harness({ net: { stsci: 'network', alaskybis: { status: 503 } } })
    const image = asImage(await settle(clock, loader.load(M42, { sourceId: 'stsci' })))
    expect(net.sources()).toEqual(['stsci', 'alaskybis', 'alasky'])
    expect(image.sourceId).toBe('alasky')
  })

  it('test_p18_zapamietane: wybrane SkyView, zapamiętane STScI → reszta jak w automatycznym: STScI, alaskybis, alasky', async () => {
    const { loader, net, clock } = harness({ remembered: 'stsci', net: ALL_FAIL })
    await settle(clock, loader.load(M42, { sourceId: 'skyview' }))
    expect(net.sources()).toEqual(['skyview', 'stsci', 'alaskybis', 'alasky'])
  })
})

describe('nowe pobranie przerywa poprzednie (P19)', () => {
  it('test_p19: pobieranie B przerywa A; spóźniony wynik A jest ignorowany', async () => {
    const { loader, net, clock } = harness({ net: { alaskybis: 'hold' } })
    const B: SkyImageRequest = { ...M42, center: { raDeg: 84.1, decDeg: -5.3911 } }
    const pendingA = track(loader.load(M42))
    await clock.advance(0)
    expect(net.sources()).toEqual(['alaskybis'])
    net.set({ alaskybis: 'ok' })
    const pendingB = track(loader.load(B))
    await clock.advance(0)
    expect(net.calls[0].signal.aborted).toBe(true)
    const imageB = asImage(await pendingB.promise)
    expect(imageB.sourceId).toBe('alaskybis')
    expect(net.calls[1].url).toBe(skyImageUrl('alaskybis', B))
    net.held[0].resolve(new Response('late-A', { status: 200, headers: { 'content-type': 'image/jpeg' } }))
    await clock.advance(0)
    expect(await pendingA.promise).toEqual({ kind: 'superseded' })
    expect(loader.current()).toBe(imageB)
    expect(await blobText(imageB.data)).toBe('alaskybis-bytes')
    expect(net.calls.length).toBe(2)
  })
})

describe('„Zapisz podgląd do pracy offline” (P20–P22)', () => {
  it('test_p20_alasky: obraz z alasky → „zapisano” bez zapytań', async () => {
    const { loader, net, clock } = harness({ net: { alaskybis: { status: 503 } } })
    const image = asImage(await settle(clock, loader.load(M42)))
    const before = net.calls.length
    expect(await settle(clock, loader.saveOffline())).toBe('saved')
    expect(net.calls.length).toBe(before)
    expect(loader.current()).toBe(image)
  })

  it('test_p20_pamiec: obraz z pamięci → „zapisano” bez zapytań', async () => {
    const caches = new FakeCaches()
    await fillCache(caches, 'stsci', M42)
    const { loader, net, clock } = harness({ caches })
    asImage(await settle(clock, loader.load(M42)))
    expect(await settle(clock, loader.saveOffline())).toBe('saved')
    expect(net.calls).toEqual([])
  })

  it('test_p21: obraz z SkyView → próby alaskybis, alasky, STScI po 10 s; działa STScI → zapis, widok i zapamiętane STScI', async () => {
    const { loader, net, caches, storage, clock } = harness({
      net: { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'ok' },
    })
    expect(asImage(await settle(clock, loader.load(M42))).sourceId).toBe('skyview')
    expect(caches?.keys()).toEqual([])
    net.set({ alaskybis: 'silent', alasky: { status: 503 }, stsci: 'ok' })
    const before = net.calls.length
    const saving = track(loader.saveOffline())
    await clock.advance(9_999)
    expect(net.sources(before)).toEqual(['alaskybis'])
    expect(saving.settled()).toBe(false)
    await clock.advance(1)
    expect(net.calls[before].signal.aborted).toBe(true)
    expect(await saving.promise).toBe('saved')
    expect(net.sources(before)).toEqual(['alaskybis', 'alasky', 'stsci'])
    expect(net.calls.slice(before).map((call) => call.url)).toEqual([
      skyImageUrl('alaskybis', M42),
      skyImageUrl('alasky', M42),
      skyImageUrl('stsci', M42),
    ])
    expect(caches?.keys()).toEqual([STSCI_KEY])
    const shown = asImage(loader.current())
    expect(shown.sourceId).toBe('stsci')
    expect(shown.sourceName).toBe('STScI DSS')
    expect(shown.saved).toBe(true)
    expect(await blobText(shown.data)).toBe('stsci-bytes')
    expect(storage.getItem(STORAGE_KEY)).toBe('stsci')
  })

  it('test_p22: alaskybis, alasky i STScI zawodzą → „nie udało się zapisać”, widok dalej SkyView', async () => {
    const { loader, net, caches, storage, clock } = harness({
      net: { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'ok' },
    })
    const skyview = asImage(await settle(clock, loader.load(M42)))
    net.set({ alaskybis: 'network', alasky: { status: 404 }, stsci: 'silent' })
    const before = net.calls.length
    expect(await settle(clock, loader.saveOffline(), 10_000)).toBe('failed')
    expect(net.sources(before)).toEqual(['alaskybis', 'alasky', 'stsci'])
    expect(loader.current()).toBe(skyview)
    expect(caches?.keys()).toEqual([])
    expect(storage.getItem(STORAGE_KEY)).toBe('skyview')
  })

  it('test_p22_brak_cache: brak Cache Storage → od razu „nie udało się zapisać”, bez zapytań', async () => {
    const { loader, net, clock } = harness({
      caches: null,
      net: { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'ok' },
    })
    const skyview = asImage(await settle(clock, loader.load(M42)))
    net.set({ alaskybis: 'ok', alasky: 'ok', stsci: 'ok' })
    const before = net.calls.length
    expect(await settle(clock, loader.saveOffline())).toBe('failed')
    expect(net.calls.length).toBe(before)
    expect(loader.current()).toBe(skyview)
  })
})
