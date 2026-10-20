// Ukryte testy funkcji „warstwy-skyview”: te same reguły co w testach widocznych, ale z innymi wartościami
// (inny wycinek, inna warstwa, inne czasy, inne zapamiętane źródło). Nazwy API jak w ../warstwy-skyview.test.ts.
import { describe, expect, it } from 'vitest'
import type { SkyImageLoadOptions } from '../../../../src/services/skyImage/loader'
import { skyImageUrl, skyviewLayerUrl, type SkyImageRequest } from '../../../../src/services/skyImage/sources'
import { licenseLines, photoCaption } from '../../../../src/features/framing/photoModel'
import {
  ALL_FAIL,
  ALL_SILENT,
  asImage,
  FakeCaches,
  fillCache,
  GROUP_FAIL,
  HA,
  layerHarness,
  OUTLINES_LICENSE,
  P6_EVENTS,
  photoOf,
  RED,
  SKYVIEW_HA_LICENSE,
  STORAGE_KEY,
  STSCI_LICENSE,
  track,
} from '../helpers'

const LAYER_FIRST: SkyImageLoadOptions = { layerFirst: true }
/** M 31: RA 10,6848°, Dec 41,2691°, wycinek 8°, 800 px. */
const M31_HA: SkyImageRequest = { center: { raDeg: 10.6848, decDeg: 41.2691 }, fovDeg: 8, sizePx: 800, layerId: 'halpha' }
const M31_RED: SkyImageRequest = { ...M31_HA, layerId: 'dss2-red' }

describe('adres SkyView w warstwie – inne wycinki', () => {
  it('hidden_p1_adres_halpha_m31', () => {
    expect(skyviewLayerUrl(M31_HA)).toBe(
      'https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?Survey=H-Alpha%20Comp&Position=10.6848,41.2691&Size=8&Pixels=800&Return=JPG',
    )
  })

  it('hidden_p2_adres_czerwony_m31_jak_dzis', () => {
    expect(skyviewLayerUrl(M31_RED)).toBe(skyImageUrl('skyview', M31_RED))
    expect(skyviewLayerUrl(M31_RED)).toContain('Survey=dss2r&')
  })
})

describe('kolejność i czasy – inne wartości', () => {
  it('hidden_p4_czerwony_alasky_milczy_skyview_po_5s_obraz_po_35s', async () => {
    const { loader, clock, net } = layerHarness({ net: { alaskybis: { status: 503 }, alasky: 'silent' }, skyviewAfterMs: 5_000 })
    const pending = track(loader.load(M31_RED, LAYER_FIRST))
    await clock.advance(34_999)
    expect(pending.settled()).toBe(false)
    await clock.advance(1)
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('skyview')
    expect(image.layerRole).toBe('layer')
    expect(net.calls[2].url).toBe(skyImageUrl('skyview', M31_RED))
    expect(photoCaption(photoOf(image, M31_RED))).toBe('Zdjęcie: NASA SkyView, DSS2 czerwony')
  })

  it('hidden_p4_licencja_skyview_halpha_m31', async () => {
    const { loader, clock, net } = layerHarness({ net: { alaskybis: 'network', alasky: { status: 500 }, skyview: 'ok' } })
    const pending = track(loader.load(M31_HA, LAYER_FIRST))
    await clock.advance(0)
    const image = asImage(await pending.promise)
    expect(net.calls[2].url).toBe(skyviewLayerUrl(M31_HA))
    expect(licenseLines(photoOf(image, M31_HA))).toEqual([OUTLINES_LICENSE, SKYVIEW_HA_LICENSE])
  })

  it('hidden_p6_pamiec_warstwy_pierwsza_bez_sieci', async () => {
    const caches = new FakeCaches()
    await fillCache(caches, 'alasky', M31_HA)
    await fillCache(caches, 'stsci', M31_HA)
    const { loader, clock, events, net } = layerHarness({ caches, net: ALL_FAIL, remembered: 'stsci' })
    const pending = track(loader.load(M31_HA, LAYER_FIRST))
    await clock.advance(0)
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('alasky')
    expect(image.fromCache).toBe(true)
    expect(image.layerRole).toBe('layer')
    expect(events).toEqual(['cache:layer'])
    expect(net.calls).toEqual([])
    expect(photoCaption(photoOf(image, M31_HA))).toBe('Zdjęcie: CDS hips2fits (alasky), Hα (Finkbeiner), z pamięci')
  })

  it('hidden_p6_kolejnosc_przy_zapamietanym_skyview', async () => {
    const { loader, clock, events } = layerHarness({ net: ALL_FAIL, remembered: 'skyview' })
    const pending = track(loader.load(M31_RED, LAYER_FIRST))
    await clock.advance(0)
    await pending.promise
    expect(events).toEqual(P6_EVENTS)
  })

  it('hidden_p7_czerwony_najgorszy_przypadek_100s', async () => {
    const { loader, clock, net } = layerHarness({ net: ALL_SILENT })
    const pending = track(loader.load(RED, LAYER_FIRST))
    await clock.advance(89_999)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    await clock.advance(1)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
    await clock.advance(9_999)
    expect(pending.settled()).toBe(false)
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
  })

  it('hidden_p18_czerwony_skyview_30s', async () => {
    const { loader, net, clock } = layerHarness({ net: { alaskybis: 'network', alasky: { status: 502 }, skyview: 'silent' } })
    const pending = track(loader.load(M31_RED, LAYER_FIRST))
    await clock.advance(29_999)
    expect(net.calls[2].signal.aborted).toBe(false)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    await clock.advance(1)
    expect(net.calls[2].signal.aborted).toBe(true)
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('stsci')
    expect(image.layerRole).toBe('fallback')
  })
})

describe('niedostępna i ręczny wybór – inne wartości', () => {
  it('hidden_p9_czerwony_stsci_z_pamieci', async () => {
    const caches = new FakeCaches()
    await fillCache(caches, 'stsci', M31_RED)
    const { loader, clock } = layerHarness({ caches, net: GROUP_FAIL })
    const pending = track(loader.load(M31_RED, LAYER_FIRST))
    await clock.advance(0)
    const image = asImage(await pending.promise)
    expect(image.fromCache).toBe(true)
    const photo = photoOf(image, M31_RED)
    expect(photoCaption(photo)).toBe('Warstwa DSS2 czerwony niedostępna — pokazuję STScI DSS, z pamięci')
    expect(licenseLines(photo)).toEqual([OUTLINES_LICENSE, STSCI_LICENSE])
  })

  it('hidden_p11_recznie_stsci_z_sieci_bez_niedostepna', async () => {
    const { loader, clock, net } = layerHarness({ net: ALL_FAIL })
    net.set({ stsci: 'ok' })
    const pending = track(loader.load(M31_RED, { sourceId: 'stsci', layerFirst: true }))
    await clock.advance(0)
    const image = asImage(await pending.promise)
    expect(net.sources()).toEqual(['stsci'])
    expect(image.layerRole).toBeUndefined()
    expect(photoCaption(photoOf(image, M31_RED))).toBe('Zdjęcie: STScI DSS')
  })

  it('hidden_p13_recznie_alaskybis_halpha', async () => {
    const { loader, clock, events } = layerHarness({ net: ALL_FAIL, remembered: 'alasky' })
    const pending = track(loader.load(M31_HA, { sourceId: 'alaskybis', layerFirst: true }))
    await clock.advance(0)
    await pending.promise
    expect(events).toEqual(P6_EVENTS)
  })

  it('hidden_p12_recznie_skyview_czerwony_dziala', async () => {
    const { loader, clock, events } = layerHarness({ net: { skyview: 'ok' } })
    const pending = track(loader.load(M31_RED, { sourceId: 'skyview', layerFirst: true }))
    await clock.advance(0)
    const image = asImage(await pending.promise)
    expect(events).toEqual(['net:skyview'])
    expect(image.layerRole).toBe('layer')
  })
})

describe('zapamiętane źródło – inne wartości', () => {
  it('hidden_p20_alasky_w_warstwie_nie_zmienia_zapamietanego_skyview', async () => {
    const { loader, clock, storage } = layerHarness({ net: { alaskybis: { status: 503 }, alasky: 'ok' }, remembered: 'skyview' })
    const pending = track(loader.load(HA, LAYER_FIRST))
    await clock.advance(0)
    expect(asImage(await pending.promise).sourceId).toBe('alasky')
    expect(storage.getItem(STORAGE_KEY)).toBe('skyview')
  })

  it('hidden_p20_stsci_zastepstwo_nie_zmienia_zapamietanego_alaskybis', async () => {
    const { loader, clock, storage, net } = layerHarness({ net: GROUP_FAIL, remembered: 'alaskybis' })
    const pending = track(loader.load(M31_RED, LAYER_FIRST))
    await clock.advance(0)
    expect(asImage(await pending.promise).sourceId).toBe('stsci')
    expect(storage.getItem(STORAGE_KEY)).toBe('alaskybis')
    // Następne pobranie bez opcji (DSS2 kolor, inny środek, więc bez trafienia w zapisany wycinek STScI) zaczyna od
    // zapamiętanego alaskybis.
    net.set(ALL_FAIL)
    const from = net.calls.length
    const next = track(loader.load({ ...M31_RED, center: { raDeg: 20, decDeg: 41.2691 }, layerId: 'dss2-color' }))
    await clock.advance(0)
    await next.promise
    expect(net.sources(from)).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
  })
})
