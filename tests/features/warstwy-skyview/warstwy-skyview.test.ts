// Testy funkcji „warstwy-skyview” (spec: .autoloop/features/warstwy-skyview/spec.md): warstwa DSS2 czerwony albo Hα
// najpierw z alaskybis, alasky i SkyView, a dopiero potem zastępstwo STScI z komunikatem „niedostępna”.
// Nazwy, których spec nie podaje (wybrał test-author, opis w zaślepkach):
// - `skyviewLayerUrl(request)` w sources.ts – adres SkyView w grupie warstwy;
// - opcja `layerFirst: true` w `loader.load(request, { sourceId, layerFirst })` – „warstwa ma pierwszeństwo”;
// - pole `layerRole` obrazu: 'layer' („w warstwie”), 'fallback' („zastępstwo”), brak = bez tej informacji.
// Domyślnie jak w nagłówku przykładów: M 42 (83,8221°, −5,3911°), 5°, 1000 px, limity aplikacji, atrapy sieci,
// pamięci i zegara. Kolejność prób sprawdza oś zdarzeń z helpers.ts ('cache:layer', 'cache:stsci', 'net:<id>').
import { describe, expect, it } from 'vitest'
import {
  SKY_IMAGE_APP_TIMEOUTS_MS,
  type SkyImageLoadOptions,
  type SkyImageLoadResult,
} from '../../../src/services/skyImage/loader'
import { planCutout, skyImageUrl, skyviewLayerUrl, type SkyImageRequest } from '../../../src/services/skyImage/sources'
import {
  createPhotoLayer,
  licenseLines,
  loadOptions,
  photoCaption,
  type PhotoLoaderPort,
} from '../../../src/features/framing/photoModel'
import {
  ALL_FAIL,
  ALL_SILENT,
  asImage,
  COLOR,
  FakeCaches,
  fillCache,
  GROUP_FAIL,
  HA,
  imageOf,
  layerHarness,
  MISSING_TEXT,
  OUTLINES_LICENSE,
  P1_URL,
  P6_EVENTS,
  photoOf,
  RED,
  SKYVIEW_HA_LICENSE,
  SKYVIEW_LICENSE,
  STORAGE_KEY,
  STSCI_LICENSE,
  track,
} from './helpers'

const LAYER_FIRST: SkyImageLoadOptions = { layerFirst: true }
const TIMEOUT = 'limit czasu'
/** Kadr 2,0° × 1,5° → pole wycinka 5° (`cutoutFovDeg`). */
const SIZE_5 = { widthDeg: 2, heightDeg: 1.5 }
/** Kadr 1,0° × 0,75° → pole wycinka 2,5° (Hα niedostępne, `zrodla-zdjec` P8). */
const SIZE_2_5 = { widthDeg: 1, heightDeg: 0.75 }
/** M 31 (`zdjecie-w-kadrze`): wycinek 5° w warstwie DSS2 czerwony. */
const M31_RED = planCutout({ raDeg: 10.684791666666666, decDeg: 41.26905555555555 }, SIZE_5, 'dss2-red')

async function cachesWith(request: SkyImageRequest, ...sources: Array<'alasky' | 'stsci'>): Promise<FakeCaches> {
  const caches = new FakeCaches()
  for (const source of sources) await fillCache(caches, source, request)
  return caches
}

/** Pobieranie z rejestrem pełnych opcji (bez sieci). */
function optionsRecorder(): PhotoLoaderPort & { calls: Array<{ request: SkyImageRequest; options: SkyImageLoadOptions | undefined }> } {
  const calls: Array<{ request: SkyImageRequest; options: SkyImageLoadOptions | undefined }> = []
  return {
    calls,
    load: (request, options) => {
      calls.push({ request: structuredClone(request), options: options === undefined ? undefined : { ...options } })
      return new Promise<SkyImageLoadResult>(() => undefined)
    },
    saveOffline: () => Promise.resolve('failed'),
    current: () => null,
  }
}

describe('adres SkyView w warstwie (P1, P2)', () => {
  it('test_p1_adres_skyview_halpha', () => {
    expect(skyviewLayerUrl(HA)).toBe(P1_URL)
  })

  it('test_p2_adres_skyview_dss2_czerwony_jak_dzis', () => {
    const expected = 'https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?Survey=dss2r&Position=83.8221,-5.3911&Size=5&Pixels=1000&Return=JPG'
    expect(skyviewLayerUrl(RED)).toBe(expected)
    expect(skyImageUrl('skyview', RED)).toBe(expected)
  })

  it('test_p2_dotychczasowy_adres_skyview_bez_zmian_dla_halpha', () => {
    expect(skyImageUrl('skyview', HA)).toBe(
      'https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?Survey=dss2r&Position=83.8221,-5.3911&Size=5&Pixels=1000&Return=JPG',
    )
  })
})

describe('kolejność prób (P3–P7)', () => {
  it('test_p3_halpha_alasky_po_30s_bez_czytania_pamieci_stsci', async () => {
    const caches = await cachesWith(HA, 'stsci')
    const { loader, net, clock, events, storage } = layerHarness({ caches, net: { alaskybis: 'silent', alasky: 'ok' } })
    const pending = track(loader.load(HA, LAYER_FIRST))
    await clock.advance(29_999)
    expect(pending.settled()).toBe(false)
    expect(net.sources()).toEqual(['alaskybis'])
    await clock.advance(1)
    expect(pending.settled()).toBe(true)
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('alasky')
    expect(image.fromCache).toBe(false)
    expect(image.layerRole).toBe('layer')
    expect(events).toEqual(['cache:layer', 'net:alaskybis', 'net:alasky'])
    expect(photoCaption(photoOf(image, HA))).toBe('Zdjęcie: CDS hips2fits (alasky), Hα (Finkbeiner)')
    // P20: pobranie z opcją nie zmienia zapamiętanego źródła (także obraz z alasky w P3).
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('test_p4_halpha_skyview_po_62s', async () => {
    const caches = await cachesWith(HA, 'stsci')
    const { loader, net, clock, events } = layerHarness({ caches, net: { alaskybis: 'silent', alasky: 'silent' }, skyviewAfterMs: 2_000 })
    const pending = track(loader.load(HA, LAYER_FIRST))
    await clock.advance(61_999)
    expect(pending.settled()).toBe(false)
    await clock.advance(1)
    expect(pending.settled()).toBe(true)
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('skyview')
    expect(image.layerRole).toBe('layer')
    expect(events).toEqual(['cache:layer', 'net:alaskybis', 'net:alasky', 'net:skyview'])
    expect(net.calls[2].url).toBe(P1_URL)
    const photo = photoOf(image, HA)
    expect(photoCaption(photo)).toBe('Zdjęcie: NASA SkyView, Hα (Finkbeiner)')
    expect(licenseLines(photo)).toEqual([OUTLINES_LICENSE, SKYVIEW_HA_LICENSE])
  })

  it('test_p4_alasky_503_obraz_po_32s', async () => {
    const caches = await cachesWith(HA, 'stsci')
    const { loader, clock } = layerHarness({ caches, net: { alaskybis: 'silent', alasky: { status: 503 } }, skyviewAfterMs: 2_000 })
    const pending = track(loader.load(HA, LAYER_FIRST))
    await clock.advance(31_999)
    expect(pending.settled()).toBe(false)
    await clock.advance(1)
    expect(pending.settled()).toBe(true)
    expect(asImage(await pending.promise).sourceId).toBe('skyview')
  })

  it('test_p5_dss2_czerwony_z_skyview_w_grupie', async () => {
    const { loader, net, clock } = layerHarness({ net: { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'ok' } })
    const pending = track(loader.load(RED, LAYER_FIRST))
    await clock.advance(0)
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('skyview')
    expect(image.layerRole).toBe('layer')
    expect(net.calls[2].url).toBe(skyImageUrl('skyview', RED))
    const photo = photoOf(image, RED)
    expect(photoCaption(photo)).toBe('Zdjęcie: NASA SkyView, DSS2 czerwony')
    expect(licenseLines(photo)).toEqual([OUTLINES_LICENSE, SKYVIEW_LICENSE])
  })

  for (const [name, request] of [
    ['halpha', HA],
    ['dss2_czerwony', RED],
  ] as const) {
    it(`test_p6_pelna_kolejnosc_${name}_mimo_zapamietanego_stsci`, async () => {
      const { loader, clock, events } = layerHarness({ net: ALL_FAIL, remembered: 'stsci' })
      const pending = track(loader.load(request, LAYER_FIRST))
      await clock.advance(0)
      expect(await pending.promise).toEqual({
        kind: 'none',
        attempts: [
          { sourceId: 'alaskybis', reason: 'błąd 503' },
          { sourceId: 'alasky', reason: 'błąd 503' },
          { sourceId: 'skyview', reason: 'błąd obrazu' },
          { sourceId: 'stsci', reason: 'błąd 503' },
        ],
      })
      // Dokładna oś: bez drugiego SkyView (dss2r) po porażce i bez ponownego odczytu pamięci (Pytania: zastępstwo = tylko STScI).
      expect(events).toEqual(P6_EVENTS)
    })
  }

  it('test_p7_cala_grupa_milczy_stsci_po_90s', async () => {
    const { loader, net, clock } = layerHarness({ net: ALL_SILENT })
    const pending = track(loader.load(HA, LAYER_FIRST))
    await clock.advance(89_999)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    expect(net.calls[2].signal.aborted).toBe(false)
    await clock.advance(1)
    expect(net.calls[2].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
    expect(pending.settled()).toBe(false)
  })
})

describe('warstwa niedostępna (P8–P10)', () => {
  it('test_p8_halpha_grupa_zawodzi_stsci_z_sieci', async () => {
    const { loader, clock, storage, events } = layerHarness({ net: GROUP_FAIL })
    const pending = track(loader.load(HA, LAYER_FIRST))
    await clock.advance(0)
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('stsci')
    expect(image.fromCache).toBe(false)
    expect(image.layerRole).toBe('fallback')
    expect(events).toEqual(P6_EVENTS)
    const photo = photoOf(image, HA)
    expect(photoCaption(photo)).toBe('Warstwa Hα (Finkbeiner) niedostępna — pokazuję STScI DSS')
    expect(licenseLines(photo)).toEqual([OUTLINES_LICENSE, STSCI_LICENSE])
    // P20: STScI w P8 nie zmienia zapamiętanego źródła.
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('test_p8_podpis_w_warstwie_zdjecia', async () => {
    const { loader, clock } = layerHarness({ net: GROUP_FAIL })
    const layer = createPhotoLayer(loader)
    layer.chooseLayer('halpha')
    layer.setFrame({ center: HA.center, size: SIZE_5 }, false)
    await clock.advance(0)
    const view = layer.view()
    expect(view.caption).toBe('Warstwa Hα (Finkbeiner) niedostępna — pokazuję STScI DSS')
    expect(view.licenses).toEqual([OUTLINES_LICENSE, STSCI_LICENSE])
  })

  it('test_p9_halpha_stsci_z_pamieci', async () => {
    const caches = await cachesWith(HA, 'stsci')
    const { loader, clock, events, net } = layerHarness({ caches, net: GROUP_FAIL })
    const pending = track(loader.load(HA, LAYER_FIRST))
    await clock.advance(0)
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('stsci')
    expect(image.fromCache).toBe(true)
    expect(image.layerRole).toBe('fallback')
    expect(events).toEqual(['cache:layer', 'net:alaskybis', 'net:alasky', 'net:skyview', 'cache:stsci'])
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    expect(photoCaption(photoOf(image, HA))).toBe('Warstwa Hα (Finkbeiner) niedostępna — pokazuję STScI DSS, z pamięci')
  })

  it('test_p9_dss2_czerwony_podpis_niedostepna', () => {
    const photo = photoOf(imageOf('stsci', 'STScI DSS', { layerRole: 'fallback' }), RED)
    expect(photoCaption(photo)).toBe('Warstwa DSS2 czerwony niedostępna — pokazuję STScI DSS')
    expect(licenseLines(photo)).toEqual([OUTLINES_LICENSE, STSCI_LICENSE])
  })

  it('test_p10_wszystko_zawodzi_brak_zdjecia_z_lista_prob', async () => {
    const { loader, clock } = layerHarness({ net: ALL_FAIL })
    const layer = createPhotoLayer(loader)
    layer.chooseLayer('halpha')
    layer.setFrame({ center: HA.center, size: SIZE_5 }, false)
    await clock.advance(0)
    const view = layer.view()
    expect(view.photo).toBeNull()
    expect(view.missing).toEqual({
      message: MISSING_TEXT,
      attempts: [
        'CDS hips2fits (alaskybis): błąd 503',
        'CDS hips2fits (alasky): błąd 503',
        'NASA SkyView: błąd obrazu',
        'STScI DSS: błąd 503',
      ],
    })
  })
})

describe('ręczny wybór źródła wygrywa (P11–P13)', () => {
  it('test_p11_recznie_stsci_z_pamieci_bez_zapytan', async () => {
    const caches = await cachesWith(HA, 'stsci')
    const { loader, clock, events, net } = layerHarness({ caches, net: ALL_FAIL })
    const pending = track(loader.load(HA, { sourceId: 'stsci', layerFirst: true }))
    await clock.advance(0)
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('stsci')
    expect(image.fromCache).toBe(true)
    expect(image.layerRole).toBeUndefined()
    expect(net.calls).toEqual([])
    expect(events).toEqual(['cache:stsci'])
    expect(photoCaption(photoOf(image, HA))).toBe('Zdjęcie: STScI DSS, z pamięci')
  })

  it('test_p11_recznie_stsci_zawodzi_potem_grupa_warstwy', async () => {
    const { loader, clock, events, net } = layerHarness({ net: ALL_FAIL })
    const pending = track(loader.load(HA, { sourceId: 'stsci', layerFirst: true }))
    await clock.advance(0)
    // SkyView w grupie warstwy dostaje adres warstwy (P1).
    expect(net.calls.find((call) => call.sourceId === 'skyview')?.url).toBe(P1_URL)
    expect(await pending.promise).toEqual({
      kind: 'none',
      attempts: [
        { sourceId: 'stsci', reason: 'błąd 503' },
        { sourceId: 'alaskybis', reason: 'błąd 503' },
        { sourceId: 'alasky', reason: 'błąd 503' },
        { sourceId: 'skyview', reason: 'błąd obrazu' },
      ],
    })
    expect(events).toEqual(['cache:stsci', 'net:stsci', 'cache:layer', 'net:alaskybis', 'net:alasky', 'net:skyview'])
  })

  it('test_p12_recznie_skyview_halpha', async () => {
    const { loader, clock, events, net } = layerHarness({ net: ALL_FAIL })
    const pending = track(loader.load(HA, { sourceId: 'skyview', layerFirst: true }))
    await clock.advance(0)
    expect(net.calls[0].url).toBe(P1_URL)
    expect(events).toEqual(['net:skyview', 'cache:layer', 'net:alaskybis', 'net:alasky', 'cache:stsci', 'net:stsci'])
    expect(await pending.promise).toMatchObject({ kind: 'none' })
  })

  it('test_p13_recznie_alasky_dss2_czerwony_stsci_na_koncu_niedostepna', async () => {
    const { loader, clock, events } = layerHarness({ net: GROUP_FAIL })
    const pending = track(loader.load(RED, { sourceId: 'alasky', layerFirst: true }))
    await clock.advance(0)
    expect(events).toEqual(['cache:layer', 'net:alasky', 'net:alaskybis', 'net:skyview', 'cache:stsci', 'net:stsci'])
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('stsci')
    expect(image.layerRole).toBe('fallback')
    expect(photoCaption(photoOf(image, RED))).toBe('Warstwa DSS2 czerwony niedostępna — pokazuję STScI DSS')
  })
})

describe('bez zmian (P14–P17)', () => {
  it('test_p14_dss2_kolor_tryb_pobierania_jak_dotad', () => {
    expect(loadOptions('auto', 'dss2-color')).toEqual({ sourceId: null })
    expect(loadOptions('stsci', 'dss2-color')).toEqual({ sourceId: 'stsci' })
    expect(loadOptions('alasky', 'dss2-color')).toEqual({ sourceId: 'alasky' })
  })

  it('test_p14_dss2_kolor_w_warstwie_zdjecia_bez_opcji', () => {
    const port = optionsRecorder()
    const layer = createPhotoLayer(port)
    layer.setFrame({ center: HA.center, size: SIZE_5 }, false)
    expect(port.calls).toHaveLength(1)
    expect(port.calls[0].options).toEqual({ sourceId: null })
    layer.chooseSource('skyview')
    expect(port.calls[1].options).toEqual({ sourceId: 'skyview' })
  })

  it('test_p14_obraz_bez_nowej_informacji_ma_stary_podpis', () => {
    const skyview = photoOf(imageOf('skyview', 'NASA SkyView'), HA)
    expect(photoCaption(skyview)).toBe('Zdjęcie: NASA SkyView')
    expect(licenseLines(skyview)).toEqual([OUTLINES_LICENSE, SKYVIEW_LICENSE])
    const stsci = photoOf(imageOf('stsci', 'STScI DSS'), HA)
    expect(photoCaption(stsci)).toBe('Zdjęcie: STScI DSS')
    expect(licenseLines(stsci)).toEqual([OUTLINES_LICENSE, STSCI_LICENSE])
  })

  it('test_p14_warstwa_wlacza_opcje_dla_halpha_i_czerwonego', () => {
    for (const layerId of ['halpha', 'dss2-red'] as const) {
      const auto = loadOptions('auto', layerId)
      expect(auto.layerFirst).toBe(true)
      expect([null, 'alaskybis']).toContain(auto.sourceId ?? null)
      expect(loadOptions('alasky', layerId)).toEqual({ sourceId: 'alasky', layerFirst: true })
      expect(loadOptions('stsci', layerId)).toEqual({ sourceId: 'stsci', layerFirst: true })
    }
  })

  it('test_p15_halpha_przy_polu_2_5_jak_dss2_kolor', async () => {
    const port = optionsRecorder()
    const layer = createPhotoLayer(port)
    layer.chooseLayer('halpha')
    layer.setFrame({ center: HA.center, size: SIZE_2_5 }, false)
    expect(port.calls).toHaveLength(1)
    expect(port.calls[0].request.layerId).toBe('dss2-color')
    expect(port.calls[0].options).toEqual({ sourceId: null })

    const { loader, clock, net } = layerHarness({ net: { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'ok' } })
    const real = createPhotoLayer(loader)
    real.chooseLayer('halpha')
    real.setFrame({ center: HA.center, size: SIZE_2_5 }, false)
    await clock.advance(0)
    const skyview = net.calls.find((call) => call.sourceId === 'skyview')
    expect(skyview?.url).toContain('Survey=dss2r')
    expect(real.view().caption).toBe('Zdjęcie: NASA SkyView')
  })

  it('test_p16_m31_czerwony_bez_opcji_kolejnosc_jak_dzis', async () => {
    const { loader, clock, net } = layerHarness({ net: ALL_FAIL, remembered: 'stsci' })
    const pending = track(loader.load(M31_RED, { sourceId: 'alasky' }))
    await clock.advance(0)
    await pending.promise
    expect(net.sources()).toEqual(['alasky', 'stsci', 'alaskybis', 'skyview'])
  })

  it('test_p16_m31_czerwony_z_opcja', async () => {
    const { loader, clock, net } = layerHarness({ net: ALL_FAIL, remembered: 'stsci' })
    const pending = track(loader.load(M31_RED, { sourceId: 'alasky', layerFirst: true }))
    await clock.advance(0)
    await pending.promise
    expect(net.sources()).toEqual(['alasky', 'alaskybis', 'skyview', 'stsci'])
  })

  it('test_p17_sprobuj_ponownie_i_przesuniecie_kadru_ta_sama_kolejnosc', async () => {
    const { loader, clock, events } = layerHarness({ net: ALL_FAIL })
    const layer = createPhotoLayer(loader)
    layer.chooseLayer('halpha')
    layer.setFrame({ center: HA.center, size: SIZE_5 }, false)
    await clock.advance(0)
    expect(events).toEqual(P6_EVENTS)
    expect(layer.view().missing?.message).toBe(MISSING_TEXT)

    events.length = 0
    layer.retry()
    await clock.advance(0)
    expect(events).toEqual(P6_EVENTS)

    events.length = 0
    layer.setFrame({ center: { raDeg: 86.8221, decDeg: -5.3911 }, size: SIZE_5 }, false)
    await clock.advance(0)
    expect(events).toEqual(P6_EVENTS)
  })
})

describe('limit SkyView w grupie warstwy (P18, P19)', () => {
  it('test_p18_skyview_w_grupie_ma_30s', async () => {
    const { loader, net, clock } = layerHarness({ net: { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'silent', stsci: { status: 503 } } })
    const pending = track(loader.load(HA, LAYER_FIRST))
    await clock.advance(29_999)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    expect(net.calls[2].signal.aborted).toBe(false)
    await clock.advance(1)
    expect(net.calls[2].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
    expect(await pending.promise).toEqual({
      kind: 'none',
      attempts: [
        { sourceId: 'alaskybis', reason: 'błąd 503' },
        { sourceId: 'alasky', reason: 'błąd 503' },
        { sourceId: 'skyview', reason: TIMEOUT },
        { sourceId: 'stsci', reason: 'błąd 503' },
      ],
    })
  })

  for (const [name, request] of [
    ['dss2_kolor', COLOR],
    ['dss2_czerwony_bez_opcji', RED],
  ] as const) {
    it(`test_p19_skyview_poza_grupa_10s_${name}`, async () => {
      const { loader, net, clock } = layerHarness({ net: { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'silent' } })
      const pending = track(loader.load(request))
      await clock.advance(9_999)
      expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
      expect(net.calls[2].signal.aborted).toBe(false)
      await clock.advance(1)
      expect(net.calls[2].signal.aborted).toBe(true)
      expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
      const image = asImage(await pending.promise)
      expect(image.sourceId).toBe('stsci')
      // Bez opcji obraz nie dostaje nowej informacji (Styk z resztą).
      expect(image.layerRole).toBeUndefined()
    })
  }

  it('test_p19_tabela_limitow_aplikacji_bez_zmian', () => {
    expect(SKY_IMAGE_APP_TIMEOUTS_MS).toEqual({ alaskybis: 30_000, alasky: 30_000, skyview: 10_000, stsci: 10_000 })
  })
})

describe('zapamiętane źródło (P20)', () => {
  it('test_p20_skyview_w_warstwie_nie_zmienia_zapamietanego_alasky', async () => {
    const { loader, clock, net, storage } = layerHarness({
      net: { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'ok' },
      remembered: 'alasky',
    })
    const first = track(loader.load(HA, LAYER_FIRST))
    await clock.advance(0)
    expect(asImage(await first.promise).sourceId).toBe('skyview')
    expect(storage.getItem(STORAGE_KEY)).toBe('alasky')

    net.set(ALL_FAIL)
    const from = net.calls.length
    const second = track(loader.load(COLOR))
    await clock.advance(0)
    await second.promise
    expect(net.sources(from)).toEqual(['alasky', 'alaskybis', 'skyview', 'stsci'])
  })

  it('test_p20_pobranie_bez_opcji_zmienia_zapamietane_jak_dzis', async () => {
    const { loader, clock, storage } = layerHarness({ net: { alaskybis: { status: 503 }, alasky: 'ok', stsci: { status: 503 } }, remembered: 'stsci' })
    const pending = track(loader.load(HA, { sourceId: 'alaskybis' }))
    await clock.advance(0)
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('alasky')
    expect(image.layerRole).toBeUndefined()
    expect(storage.getItem(STORAGE_KEY)).toBe('alasky')
  })
})
