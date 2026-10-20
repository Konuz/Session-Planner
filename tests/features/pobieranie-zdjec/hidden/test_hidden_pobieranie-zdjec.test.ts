// Ukryte przypadki „pobieranie-zdjec”: te same reguły co w testach widocznych, inne wartości
// (wycinek M 31, DSS2 czerwony, pole 2,47°, 600 px; inne kody HTTP i typy odpowiedzi; inne zapamiętane źródła
// i inne mieszanki porażek). Klucze pamięci z reguł `zrodla-zdjec` (liczby do 4 miejsc, STScI najwyżej 1°).
import { describe, expect, it } from 'vitest'
import type { SkyImageShown } from '../../../../src/services/skyImage/loader'
import { skyImageUrl, type SkyImageRequest } from '../../../../src/services/skyImage/sources'
import { FakeCaches, fillCache, harness, settle, STORAGE_KEY, track } from '../helpers'

const M31: SkyImageRequest = {
  center: { raDeg: 10.68470833, decDeg: 41.269167 },
  fovDeg: 2.47,
  sizePx: 600,
  layerId: 'dss2-red',
}
const M31_HIPS_KEY = '/sky-image-cache/hips2fits/CDS%2FP%2FDSS2%2Fred/10.6847/41.2692/2.47/600'
const M31_STSCI_KEY = '/sky-image-cache/stsci/dss/10.6847/41.2692/1/0'
const M42: SkyImageRequest = {
  center: { raDeg: 83.8221, decDeg: -5.3911 },
  fovDeg: 1,
  sizePx: 800,
  layerId: 'dss2-color',
}

const ALL_FAIL = {
  alaskybis: 'network',
  alasky: { status: 500 },
  skyview: 'error',
  stsci: { status: 404 },
} as const

function asImage(result: unknown): SkyImageShown {
  expect(result).toMatchObject({ kind: 'image' })
  return result as SkyImageShown
}

async function blobText(data: unknown): Promise<string> {
  expect(data).toBeInstanceOf(Blob)
  return await (data as Blob).text()
}

describe('ukryte: kolejność prób i błędy', () => {
  it('M 31: alaskybis brak sieci, alasky 500, SkyView działa → SkyView pod adresem M 31, bez zapisu', async () => {
    const { loader, net, caches, storage, clock } = harness({
      net: { alaskybis: 'network', alasky: { status: 500 } },
    })
    const image = asImage(await settle(clock, loader.load(M31)))
    expect(image.sourceId).toBe('skyview')
    expect(image.data).toEqual({ skyview: skyImageUrl('skyview', M31) })
    expect(image.saved).toBe(false)
    expect(net.calls.map((call) => call.url)).toEqual([
      skyImageUrl('alaskybis', M31),
      skyImageUrl('alasky', M31),
      skyImageUrl('skyview', M31),
    ])
    expect(caches?.keys()).toEqual([])
    expect(storage.getItem(STORAGE_KEY)).toBe('skyview')
  })

  it('wszystko zawodzi inaczej niż w P2 → powody w kolejności Z28', async () => {
    const { loader, clock } = harness({
      net: { alaskybis: { status: 503 }, alasky: 'silent', skyview: 'silent', stsci: 'network' },
    })
    const pending = track(loader.load(M31))
    await clock.advance(19_999)
    expect(pending.settled()).toBe(false)
    await clock.advance(1)
    expect(await pending.promise).toEqual({
      kind: 'none',
      attempts: [
        { sourceId: 'alaskybis', reason: 'błąd 503' },
        { sourceId: 'alasky', reason: 'limit czasu' },
        { sourceId: 'skyview', reason: 'limit czasu' },
        { sourceId: 'stsci', reason: 'błąd sieci' },
      ],
    })
  })

  it('200 z application/json → następne źródło; 200 z image/png → obraz', async () => {
    const { loader, net, clock } = harness({
      net: { alaskybis: { status: 200, contentType: 'application/json' }, alasky: { status: 200, contentType: 'image/png' } },
    })
    const image = asImage(await settle(clock, loader.load(M31)))
    expect(image.sourceId).toBe('alasky')
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
  })

  it('granice 200–299: 302 z obrazem → dalej; 201 z obrazem → obraz alasky', async () => {
    const { loader, net, clock } = harness({
      net: { alaskybis: { status: 302, contentType: 'image/jpeg' }, alasky: { status: 201, contentType: 'image/gif' } },
    })
    const image = asImage(await settle(clock, loader.load(M31)))
    expect(image.sourceId).toBe('alasky')
    expect(await blobText(image.data)).toBe('alasky-response')
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
  })

  it('500 i 404 na alaskybis/alasky, SkyView error → STScI', async () => {
    const { loader, net, clock } = harness({
      net: { alaskybis: { status: 500 }, alasky: { status: 404 }, skyview: 'error' },
    })
    const image = asImage(await settle(clock, loader.load(M31)))
    expect(image.sourceId).toBe('stsci')
    expect(await blobText(image.data)).toBe('stsci-bytes')
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
  })
})

describe('ukryte: limit 10 s', () => {
  it('alasky milczy: 9,999 s po jego starcie bez przerwania, po 10 s przerwane i start SkyView', async () => {
    const { loader, net, clock } = harness({ net: { alaskybis: { status: 503 }, alasky: 'silent' } })
    const pending = track(loader.load(M31))
    await clock.advance(9_999)
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
    expect(net.calls[1].signal.aborted).toBe(false)
    await clock.advance(1)
    expect(net.calls[1].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    expect(asImage(await pending.promise).sourceId).toBe('skyview')
  })

  it('STScI milczy jako jedyne (zapamiętane) → po 10 s alaskybis', async () => {
    const { loader, net, clock } = harness({ remembered: 'stsci', net: { stsci: 'silent' } })
    const pending = track(loader.load(M31))
    await clock.advance(9_999)
    expect(net.sources()).toEqual(['stsci'])
    await clock.advance(1)
    expect(net.calls[0].signal.aborted).toBe(true)
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('alaskybis')
    expect(net.sources()).toEqual(['stsci', 'alaskybis'])
  })
})

describe('ukryte: pamięć podręczna', () => {
  it('M 31 z alaskybis → klucz hips2fits M 31; z pamięci podpis „CDS hips2fits (alaskybis)”', async () => {
    const caches = new FakeCaches()
    const first = harness({ caches })
    await settle(first.clock, first.loader.load(M31))
    expect(caches.keys()).toEqual([M31_HIPS_KEY])
    const { loader, net, clock } = harness({ caches, net: ALL_FAIL })
    const image = asImage(await settle(clock, loader.load(M31, { sourceId: 'alasky' })))
    expect(net.calls).toEqual([])
    expect(image.sourceId).toBe('alaskybis')
    expect(image.sourceName).toBe('CDS hips2fits (alaskybis)')
    expect(image.fromCache).toBe(true)
    expect(await blobText(image.data)).toBe('alaskybis-bytes')
  })

  it('M 31 z STScI → klucz STScI z polem 1; potem z pamięci bez zapytań', async () => {
    const caches = new FakeCaches()
    await fillCache(caches, 'stsci', M31)
    expect(caches.keys()).toEqual([M31_STSCI_KEY])
    const { loader, net, clock } = harness({ caches, remembered: 'alasky' })
    const image = asImage(await settle(clock, loader.load(M31)))
    expect(net.calls).toEqual([])
    expect(image.sourceName).toBe('STScI DSS')
    expect(image.fromCache).toBe(true)
  })

  it('pamięć jest dla wycinka: wycinek M 42 w pamięci nie wystarcza dla M 31', async () => {
    const caches = new FakeCaches()
    await fillCache(caches, 'alasky', M42)
    const { loader, net, clock } = harness({ caches })
    const image = asImage(await settle(clock, loader.load(M31)))
    expect(image.fromCache).toBe(false)
    expect(net.sources()).toEqual(['alaskybis'])
    expect(caches.keys().sort()).toEqual(
      ['/sky-image-cache/hips2fits/CDS%2FP%2FDSS2%2Fcolor/83.8221/-5.3911/1/800', M31_HIPS_KEY].sort(),
    )
  })

  it('brak miejsca przy obrazie STScI → obraz pokazany, niezapisany', async () => {
    const caches = new FakeCaches()
    caches.putFails = true
    const { loader, clock } = harness({ caches, net: { alaskybis: { status: 503 }, alasky: 'network', skyview: 'error' } })
    const image = asImage(await settle(clock, loader.load(M31)))
    expect(image.sourceId).toBe('stsci')
    expect(image.saved).toBe(false)
  })
})

describe('ukryte: zapamiętane źródło i ręczny wybór', () => {
  it('zapamiętane SkyView → SkyView, alaskybis, alasky, STScI', async () => {
    const { loader, net, clock } = harness({ remembered: 'skyview', net: ALL_FAIL })
    await settle(clock, loader.load(M31))
    expect(net.sources()).toEqual(['skyview', 'alaskybis', 'alasky', 'stsci'])
  })

  it('zapamiętane alaskybis → kolejność Z28', async () => {
    const { loader, net, clock } = harness({ remembered: 'alaskybis', net: ALL_FAIL })
    await settle(clock, loader.load(M31))
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
  })

  it('zapamiętane „ALASKY” (wielkie litery, nieznane) → kolejność Z28', async () => {
    const { loader, net, clock } = harness({ remembered: 'ALASKY', net: ALL_FAIL })
    await settle(clock, loader.load(M31))
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
  })

  it('ręcznie alasky, zapamiętane STScI, wszystko zawodzi → alasky, STScI, alaskybis, SkyView', async () => {
    const { loader, net, storage, clock } = harness({ remembered: 'stsci', net: ALL_FAIL })
    const result = await settle(clock, loader.load(M31, { sourceId: 'alasky' }))
    expect(net.sources()).toEqual(['alasky', 'stsci', 'alaskybis', 'skyview'])
    expect(result).toMatchObject({ kind: 'none' })
    expect(storage.getItem(STORAGE_KEY)).toBe('stsci')
  })

  it('ręcznie STScI przy pamięci hips2fits: STScI zawodzi → obraz hips2fits z pamięci', async () => {
    const caches = new FakeCaches()
    await fillCache(caches, 'alaskybis', M31)
    const { loader, net, clock } = harness({ caches, net: ALL_FAIL })
    const image = asImage(await settle(clock, loader.load(M31, { sourceId: 'stsci' })))
    expect(net.sources()).toEqual(['stsci'])
    expect(image.sourceId).toBe('alaskybis')
    expect(image.fromCache).toBe(true)
  })

  it('ręcznie alasky, sieć działa, w pamięci STScI → obraz z sieci alasky, zapamiętane alasky', async () => {
    const caches = new FakeCaches()
    await fillCache(caches, 'stsci', M31)
    const { loader, net, storage, clock } = harness({ caches })
    const image = asImage(await settle(clock, loader.load(M31, { sourceId: 'alasky' })))
    expect(net.sources()).toEqual(['alasky'])
    expect(image.sourceId).toBe('alasky')
    expect(image.fromCache).toBe(false)
    expect(storage.getItem(STORAGE_KEY)).toBe('alasky')
  })
})

describe('ukryte: przerywanie i zapis offline', () => {
  it('trzy pobrania pod rząd: tylko ostatnie zmienia widok', async () => {
    const { loader, net, clock } = harness({ net: { alaskybis: 'hold' } })
    const first = track(loader.load(M31))
    await clock.advance(0)
    const second = track(loader.load(M42))
    await clock.advance(0)
    net.set({ alaskybis: 'ok' })
    const third = track(loader.load({ ...M31, fovDeg: 3 }))
    await clock.advance(0)
    expect(net.calls[0].signal.aborted).toBe(true)
    expect(net.calls[1].signal.aborted).toBe(true)
    const image = asImage(await third.promise)
    net.held.forEach((held) => held.resolve(new Response('late', { status: 200, headers: { 'content-type': 'image/jpeg' } })))
    await clock.advance(0)
    expect(await first.promise).toEqual({ kind: 'superseded' })
    expect(await second.promise).toEqual({ kind: 'superseded' })
    expect(loader.current()).toBe(image)
  })

  it('zapis offline po SkyView: alaskybis działa → widok alaskybis, klucz hips2fits, zapamiętane alaskybis', async () => {
    const { loader, net, caches, storage, clock } = harness({
      net: { alaskybis: 'network', alasky: { status: 500 } },
    })
    expect(asImage(await settle(clock, loader.load(M31))).sourceId).toBe('skyview')
    net.set({ alaskybis: 'ok' })
    const before = net.calls.length
    expect(await settle(clock, loader.saveOffline())).toBe('saved')
    expect(net.sources(before)).toEqual(['alaskybis'])
    expect(caches?.keys()).toEqual([M31_HIPS_KEY])
    const shown = asImage(loader.current())
    expect(shown.sourceName).toBe('CDS hips2fits (alaskybis)')
    expect(await blobText(shown.data)).toBe('alaskybis-bytes')
    expect(storage.getItem(STORAGE_KEY)).toBe('alaskybis')
  })

  it('zapis offline po SkyView: alaskybis milczy, alasky działa → po 10 s alasky', async () => {
    const { loader, net, clock } = harness({
      net: { alaskybis: { status: 503 }, alasky: { status: 503 } },
    })
    asImage(await settle(clock, loader.load(M31)))
    net.set({ alaskybis: 'silent', alasky: 'ok' })
    const before = net.calls.length
    const saving = track(loader.saveOffline())
    await clock.advance(9_999)
    expect(saving.settled()).toBe(false)
    await clock.advance(1)
    expect(await saving.promise).toBe('saved')
    expect(net.sources(before)).toEqual(['alaskybis', 'alasky'])
    expect(asImage(loader.current()).sourceId).toBe('alasky')
  })

  it('zapis offline nieudany z innymi błędami → „nie udało się zapisać”, SkyView nie jest ponawiany', async () => {
    const { loader, net, clock } = harness({ net: { alaskybis: { status: 500 }, alasky: 'network' } })
    const skyview = asImage(await settle(clock, loader.load(M31)))
    net.set({ stsci: { status: 200, contentType: 'text/html' } })
    const before = net.calls.length
    expect(await settle(clock, loader.saveOffline())).toBe('failed')
    expect(net.sources(before)).toEqual(['alaskybis', 'alasky', 'stsci'])
    expect(loader.current()).toBe(skyview)
  })
})
