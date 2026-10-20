// Testy funkcji „zdjecie-w-kadrze” (spec: .autoloop/features/zdjecie-w-kadrze/spec.md).
// Nazwy funkcji, komponentów i znaczników wybrał test-author (spec ich nie podaje) – opis w helpers.ts i w zaślepkach
// src/features/framing/{photoModel.ts, PhotoPanel.tsx, useSkyImage.ts} oraz w propie `photo` widoku FramingView.
//
// Jak testowane:
// - Pobieranie to atrapa (`FakeLoader`): liczy wywołania, zapisuje tryb (null = automatyczny, id = ręczny) i zwraca
//   wynik podany w teście. Stan warstwy zdjęcia (`createPhotoLayer`) jest sprawdzany bez Reacta.
// - P13 sprawdza też prawdziwe pobieranie (`createSkyImageLoader` z `pobieranie-zdjec`) z atrapami sieci i pamięci.
// - Zakładka: w Node efekty się nie wykonują, więc hak `useSkyImage` jest podmieniony: test sprawdza, co zakładka
//   mu przekazuje, i jak rysuje oddany stan (zdjęcie w SVG, panel, akcje przycisków i list).
// - Wartości z reguł wcześniejszych funkcji: pole wycinka `cutoutFovDeg` (2,0° × 1,5° → 5°, 1,0° × 0,75° → 2,5°),
//   środek wycinka `planCutout`, decyzja `needsNewCutout` (`zrodla-zdjec` P18: próg ¼ pola), skala TAN widoku
//   (`geometria-kadru` P11).
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_PROFILES } from '../../../src/data/demo'
import { featuredObjects } from '../../../src/data/featuredObjects'
import { FramingView } from '../../../src/features/framing/FramingView'
import { PhotoPanel, type PhotoPanelProps } from '../../../src/features/framing/PhotoPanel'
import {
  attemptLines,
  createPhotoLayer,
  layerChoices,
  licenseLines,
  loadOptions,
  nextPhotoRequest,
  photoCaption,
  photoRect,
  sourceChoices,
  type PhotoLayer,
  type PhotoLayerView,
} from '../../../src/features/framing/photoModel'
import type { SkyImageHookInput, SkyImageHookResult } from '../../../src/features/framing/useSkyImage'
import type { useFeaturedObjects } from '../../../src/features/night/useFeaturedObjects'
import { mosaicSizeDeg } from '../../../src/services/framing'
import { createSkyImageLoader } from '../../../src/services/skyImage/loader'
import {
  cutoutFovDeg,
  planCutout,
  skyImageCacheKey,
  skyImageUrl,
  type SkyImageLayerId,
} from '../../../src/services/skyImage/sources'
import type { DsoObject, EquipmentProfile } from '../../../src/types'
import {
  FakeDeps,
  FakeLoader,
  M31_CENTER,
  M42_CENTER,
  MemoryStorage,
  OUTLINES_LICENSE,
  P6_ATTEMPTS,
  SIZE_2_5,
  SIZE_5,
  ancestors,
  buttons,
  choose,
  click,
  expectNear,
  expectRect,
  flush,
  frameAt,
  image,
  m42Request,
  markupElements,
  missing,
  probeAll,
  recording,
  selectWithOption,
  shown,
  visibleText,
} from './helpers'

// ---------- Atrapy haków zakładki ----------

type FeaturedHookResult = ReturnType<typeof useFeaturedObjects>

const mocks = vi.hoisted(() => ({
  featured: null as FeaturedHookResult | null,
  sky: null as SkyImageHookResult | null,
  skyInputs: [] as SkyImageHookInput[],
}))

vi.mock('../../../src/features/night/useFeaturedObjects', () => ({
  useFeaturedObjects: () => {
    if (!mocks.featured) throw new Error('Brak wyniku atrapy haka useFeaturedObjects')
    return mocks.featured
  },
}))

vi.mock('../../../src/features/framing/useSkyImage', () => ({
  useSkyImage: (input: SkyImageHookInput) => {
    mocks.skyInputs.push(structuredClone(input))
    if (!mocks.sky) throw new Error('Brak wyniku atrapy haka useSkyImage')
    return mocks.sky
  },
}))

const CATALOG = JSON.parse(
  readFileSync(new URL('../../../public/catalog/catalog.v1.json', import.meta.url), 'utf8'),
) as DsoObject[]
const KLASYKI = featuredObjects(CATALOG)
const FULL_CATALOG_TIMEOUT = 60_000

beforeEach(() => {
  mocks.featured = { featured: { status: 'ready', objects: [...KLASYKI], catalog: [...CATALOG] }, retry: () => undefined }
  mocks.sky = null
  mocks.skyInputs = []
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------- Teksty ze spec ----------

const SOURCE_LABELS = ['Automatycznie', 'CDS hips2fits (alaskybis)', 'CDS hips2fits (alasky)', 'NASA SkyView', 'STScI DSS']
const LAYERS_5 = ['DSS2 kolor', 'DSS2 czerwony', 'Hα (Finkbeiner)']
const LAYERS_2_5 = ['DSS2 kolor', 'DSS2 czerwony']
const LOADING = 'Pobieram zdjęcie…'
const MISSING = 'Brak zdjęcia — pokazuję zarysy obiektów'
const RETRY = 'Spróbuj ponownie'
const OFFLINE = 'Zapisz podgląd do pracy offline'
const SAVING = 'Zapisuję…'
const SAVED = 'Zapisano podgląd do pracy offline'
const SAVE_FAILED = 'Nie udało się zapisać podglądu do pracy offline'
const P6_LINES = [
  'CDS hips2fits (alaskybis): limit czasu',
  'CDS hips2fits (alasky): błąd 503',
  'NASA SkyView: błąd obrazu',
  'STScI DSS: błąd sieci',
]
const LICENSE_HIPS = 'Licencja: zdjęcie — CDS Strasbourg (hips2fits), dane DSS © STScI/AURA'
const LICENSE_HIPS_HALPHA = 'Licencja: zdjęcie — CDS Strasbourg (hips2fits), mapa Hα: Finkbeiner (ODbL)'
const LICENSE_SKYVIEW = 'Licencja: zdjęcie — NASA/GSFC SkyView, dane DSS © STScI/AURA'
const LICENSE_STSCI = 'Licencja: zdjęcie — Digitized Sky Survey © STScI/AURA'

const CAPTION_ALASKY = 'Zdjęcie: CDS hips2fits (alasky), DSS2 kolor'

// ---------- Narzędzia ----------

/** Warstwa zdjęcia z atrapą pobierania, kadr M 42 (pole 5°) ustawiony; pierwsze pobieranie trwa. */
function startLayer(): { layer: PhotoLayer; loader: FakeLoader } {
  const loader = new FakeLoader()
  const layer = createPhotoLayer(loader)
  layer.setFrame(frameAt(M42_CENTER), false)
  return { layer, loader }
}

/** Jak `startLayer`, ale pierwsze pobieranie zakończone obrazem `sourceId`. */
async function layerWith(sourceId: 'alasky' | 'skyview' | 'stsci', flags: { fromCache?: boolean } = {}) {
  const started = startLayer()
  await started.loader.finish(image(sourceId, flags))
  return started
}

function panel(view: PhotoLayerView, handlers: Partial<Omit<PhotoPanelProps, 'view'>> = {}) {
  const props: PhotoPanelProps = {
    view,
    onChooseSource: () => undefined,
    onChooseLayer: () => undefined,
    onRetry: () => undefined,
    onSaveOffline: () => undefined,
    ...handlers,
  }
  const probed = probeAll(createElement(PhotoPanel, props))
  return { ...probed, text: visibleText(probed.markup) }
}

const modes = (loader: FakeLoader) => loader.calls.map((call) => call.sourceId)

// =====================================================================================================

describe('Podpis źródła', () => {
  it('P1: obraz z SkyView → „Zdjęcie: NASA SkyView”, bez nazwy warstwy', async () => {
    expect(photoCaption(shown('skyview', m42Request()))).toBe('Zdjęcie: NASA SkyView')
    // Także gdy wycinek był w warstwie DSS2 czerwony albo Hα – SkyView to zawsze DSS2 czerwony.
    expect(photoCaption(shown('skyview', m42Request('dss2-red')))).toBe('Zdjęcie: NASA SkyView')
    const { layer, loader } = await layerWith('skyview')
    expect(loader.calls).toHaveLength(1)
    expect(layer.view().caption).toBe('Zdjęcie: NASA SkyView')
    expect(panel(layer.view()).text).toContain('Zdjęcie: NASA SkyView')
  })

  it('P2: alasky w DSS2 kolor → podpis z warstwą; STScI → „Zdjęcie: STScI DSS”', async () => {
    expect(photoCaption(shown('alasky', m42Request()))).toBe(CAPTION_ALASKY)
    expect(photoCaption(shown('stsci', m42Request()))).toBe('Zdjęcie: STScI DSS')
    const alasky = await layerWith('alasky')
    expect(alasky.layer.view().caption).toBe(CAPTION_ALASKY)
    const stsci = await layerWith('stsci')
    expect(stsci.layer.view().caption).toBe('Zdjęcie: STScI DSS')
  })

  it('P3: alasky z pamięci → „…, DSS2 kolor, z pamięci”', async () => {
    expect(photoCaption(shown('alasky', m42Request(), { fromCache: true }))).toBe(`${CAPTION_ALASKY}, z pamięci`)
    const { layer } = await layerWith('alasky', { fromCache: true })
    expect(layer.view().caption).toBe(`${CAPTION_ALASKY}, z pamięci`)
  })

  it('P4: pierwsze pobieranie → „Pobieram zdjęcie…”, bez zdjęcia i bez przycisku offline', () => {
    const { layer, loader } = startLayer()
    expect(loader.calls).toHaveLength(1)
    expect(loader.lastCall.request).toEqual(m42Request())
    const view = layer.view()
    expect(view.loadingText).toBe(LOADING)
    expect(view.photo).toBeNull()
    expect(view.caption).toBeNull()
    expect(view.offline).toBeNull()
    expect(view.missing).toBeNull()
    const rendered = panel(view)
    expect(rendered.text).toContain(LOADING)
    expect(buttons(rendered.hosts, OFFLINE)).toHaveLength(0)
    expect(buttons(rendered.hosts, SAVING)).toHaveLength(0)
  })

  it('P4: widok bez zdjęcia nie ma warstwy zdjęcia (<image>), mapa i ramka zostają', () => {
    const profile = DEMO_PROFILES[0]
    const frame = { centerRaDeg: M42_CENTER.raDeg, centerDecDeg: M42_CENTER.decDeg, paDeg: 0, mosaic: { cols: 1, rows: 1, overlapPct: 20 } }
    const markup = renderToStaticMarkup(createElement(FramingView, { fovDeg: 5, profile, framing: frame, mapObjects: [], photo: null }))
    expect(markupElements(markup).filter((element) => element.tag === 'image')).toHaveLength(0)
    expect(markup).toContain('data-panel="1"')
  })

  it('P5: ponowne pobieranie przy zdjęciu → stare zdjęcie i podpis zostają, „Pobieram zdjęcie…”, bez przycisku offline', async () => {
    const { layer, loader } = await layerWith('alasky')
    const before = layer.view().photo
    layer.chooseLayer('dss2-red')
    expect(loader.calls).toHaveLength(2)
    const view = layer.view()
    expect(view.photo).toEqual(before)
    // Podpis zależy od pokazanego zdjęcia (DSS2 kolor), a nie od nowo wybranej warstwy.
    expect(view.caption).toBe(CAPTION_ALASKY)
    expect(view.loadingText).toBe(LOADING)
    expect(view.offline).toBeNull()
    const rendered = panel(view)
    expect(rendered.text).toContain(CAPTION_ALASKY)
    expect(rendered.text).toContain(LOADING)
    expect(buttons(rendered.hosts, OFFLINE)).toHaveLength(0)
  })

  it('P5: nowy wycinek po przesunięciu i inne źródło też zostawiają stare zdjęcie w trakcie pobierania', async () => {
    const { layer, loader } = await layerWith('skyview')
    layer.setFrame(frameAt({ raDeg: M42_CENTER.raDeg, decDeg: M42_CENTER.decDeg + 2 }), false)
    expect(loader.calls).toHaveLength(2)
    expect(layer.view().caption).toBe('Zdjęcie: NASA SkyView')
    expect(layer.view().loadingText).toBe(LOADING)
    await loader.finish(image('stsci'))
    layer.chooseSource('alasky')
    expect(loader.calls).toHaveLength(3)
    expect(layer.view().caption).toBe('Zdjęcie: STScI DSS')
    expect(layer.view().loadingText).toBe(LOADING)
    expect(layer.view().offline).toBeNull()
  })
})

describe('Spóźniony wynik poprzedniego pobierania', () => {
  it('P5: wynik „superseded” starszego pobierania nie zmienia widoku – stare zdjęcie, podpis i „Pobieram zdjęcie…” zostają', async () => {
    const { layer, loader } = await layerWith('alasky')
    layer.chooseLayer('dss2-red')
    layer.chooseSource('stsci')
    expect(loader.calls).toHaveLength(3)
    await loader.supersedeOldest()
    const view = layer.view()
    expect(view.photo?.image.sourceId).toBe('alasky')
    expect(view.caption).toBe(CAPTION_ALASKY)
    expect(view.loadingText).toBe(LOADING)
    expect(view.missing).toBeNull()
    expect(view.offline).toBeNull()
  })
})

describe('Brak zdjęcia [T22]', () => {
  it('P6: wszystkie źródła zawodzą → bez zdjęcia (także starego), komunikat, „Spróbuj ponownie” i lista prób', async () => {
    expect(attemptLines(P6_ATTEMPTS)).toEqual(P6_LINES)
    const { layer, loader } = await layerWith('alasky')
    layer.chooseLayer('dss2-red')
    await loader.finish(missing(P6_ATTEMPTS))
    const view = layer.view()
    expect(view.photo).toBeNull()
    expect(view.caption).toBeNull()
    expect(view.loadingText).toBeNull()
    expect(view.offline).toBeNull()
    expect(view.missing).toEqual({ message: MISSING, attempts: P6_LINES })
    const rendered = panel(view)
    expect(rendered.text).toContain(MISSING)
    expect(buttons(rendered.hosts, RETRY)).toHaveLength(1)
    expect(buttons(rendered.hosts, OFFLINE)).toHaveLength(0)
    const positions = P6_LINES.map((line) => rendered.text.indexOf(line))
    expect(positions.every((position) => position >= 0), 'każda próba na liście').toBe(true)
    expect([...positions].sort((a, b) => a - b), 'próby w kolejności').toEqual(positions)
  })

  it('P6: widok przy „Brak zdjęcia” nie ma warstwy zdjęcia', async () => {
    const { layer, loader } = startLayer()
    await loader.finish(missing(P6_ATTEMPTS))
    expect(layer.view().photo).toBeNull()
  })

  it('P7: „Spróbuj ponownie” → drugie wywołanie z tym samym wycinkiem; obraz z alasky → komunikat znika, podpis jak w P2', async () => {
    const { layer, loader } = startLayer()
    await loader.finish(missing(P6_ATTEMPTS))
    const retried: string[] = []
    click(buttons(panel(layer.view(), { onRetry: () => retried.push('retry') }).hosts, RETRY)[0]?.props)
    expect(retried, 'przycisk wywołuje onRetry').toEqual(['retry'])
    layer.retry()
    expect(loader.calls).toHaveLength(2)
    expect(loader.calls[1].request).toEqual(loader.calls[0].request)
    expect(loader.calls[1].sourceId).toBe(loader.calls[0].sourceId)
    await loader.finish(image('alasky'))
    expect(layer.view().missing).toBeNull()
    expect(layer.view().caption).toBe(CAPTION_ALASKY)
    expect(panel(layer.view()).text).not.toContain(MISSING)
  })
})

describe('Ręczny wybór źródła i warstwy', () => {
  it('P8: lista źródeł; na starcie zaznaczone „Automatycznie”', () => {
    expect(sourceChoices().map((choice) => choice.label)).toEqual(SOURCE_LABELS)
    const { layer } = startLayer()
    const view = layer.view()
    expect(view.sourceOptions.map((choice) => choice.label)).toEqual(SOURCE_LABELS)
    expect(view.sourceOptions.find((choice) => choice.value === view.source)?.label).toBe('Automatycznie')
    const select = selectWithOption(panel(view).hosts, 'Automatycznie')
    expect(select.labels).toEqual(SOURCE_LABELS)
    expect(select.selectedLabel).toBe('Automatycznie')
  })

  it('P9: wybór „STScI DSS” → jedno nowe wywołanie w trybie ręcznym ze STScI', async () => {
    const { layer, loader } = await layerWith('alasky')
    const chosen: string[] = []
    const select = selectWithOption(panel(layer.view(), { onChooseSource: (source) => chosen.push(source) }).hosts, 'STScI DSS')
    const stsciValue = select.values[select.labels.indexOf('STScI DSS')]
    choose(select.host.props, stsciValue)
    expect(chosen, 'lista wywołuje onChooseSource z wartością opcji').toEqual([stsciValue])
    layer.chooseSource('stsci')
    expect(loader.calls).toHaveLength(2)
    expect(loader.lastCall.sourceId).toBe('stsci')
    const view = layer.view()
    expect(view.sourceOptions.find((choice) => choice.value === view.source)?.label).toBe('STScI DSS')
  })

  it('P9: po ponownym uruchomieniu znów „Automatycznie” (wybór nie jest zapamiętywany)', async () => {
    const storage = new MemoryStorage()
    vi.stubGlobal('localStorage', storage)
    const { layer } = await layerWith('alasky')
    layer.chooseSource('stsci')
    expect(storage.length, 'nic nie trafia do localStorage').toBe(0)
    const fresh = createPhotoLayer(new FakeLoader())
    expect(fresh.view().source).toBe('auto')
    fresh.setFrame(frameAt(M42_CENTER), false)
    expect(fresh.view().sourceOptions.find((choice) => choice.value === fresh.view().source)?.label).toBe('Automatycznie')
  })

  it('P10: warstwy przy polu 5° i 2,5°; Hα, a pole spada do 2,5° → zaznaczony „DSS2 kolor”', () => {
    expect(layerChoices(5).map((choice) => choice.label)).toEqual(LAYERS_5)
    expect(layerChoices(2.5).map((choice) => choice.label)).toEqual(LAYERS_2_5)
    const { layer } = startLayer()
    expect(layer.view().layerOptions.map((choice) => choice.label)).toEqual(LAYERS_5)
    layer.chooseLayer('halpha')
    expect(layer.view().layer).toBe('halpha')
    layer.setFrame(frameAt(M42_CENTER, SIZE_2_5), false)
    expect(layer.view().layerOptions.map((choice) => choice.label)).toEqual(LAYERS_2_5)
    expect(layer.view().layer).toBe('dss2-color')
    const select = selectWithOption(panel(layer.view()).hosts, 'DSS2 czerwony')
    expect(select.labels).toEqual(LAYERS_2_5)
    expect(select.selectedLabel).toBe('DSS2 kolor')
  })

  it('P11: zmiana warstwy na „DSS2 czerwony” → jedno nowe wywołanie z tą warstwą', async () => {
    const { layer, loader } = await layerWith('alasky')
    const chosen: string[] = []
    const select = selectWithOption(panel(layer.view(), { onChooseLayer: (id) => chosen.push(id) }).hosts, 'DSS2 czerwony')
    choose(select.host.props, 'dss2-red')
    expect(chosen).toEqual(['dss2-red'])
    layer.chooseLayer('dss2-red')
    expect(loader.calls).toHaveLength(2)
    expect(loader.lastCall.request.layerId).toBe('dss2-red')
    expect(loader.lastCall.request).toEqual(m42Request('dss2-red'))
    // inny klucz i adres niż przy DSS2 kolor (`zrodla-zdjec`)
    expect(skyImageCacheKey('alasky', loader.lastCall.request)).not.toBe(skyImageCacheKey('alasky', loader.calls[0].request))
    expect(skyImageUrl('alasky', loader.lastCall.request)).not.toBe(skyImageUrl('alasky', loader.calls[0].request))
  })

  it('P12: tryb wywołania zależy od wyboru źródła i warstwy (model)', () => {
    const mode = (source: Parameters<typeof loadOptions>[0], layerId: SkyImageLayerId) => loadOptions(source, layerId).sourceId ?? null
    expect(mode('auto', 'dss2-color')).toBeNull()
    expect(mode('auto', 'dss2-red')).toBe('alaskybis')
    expect(mode('auto', 'halpha')).toBe('alaskybis')
    for (const layerId of ['dss2-color', 'dss2-red', 'halpha'] as const) {
      expect(mode('stsci', layerId), `STScI + ${layerId}`).toBe('stsci')
    }
  })

  it('P12: tryb kolejnych wywołań pobierania z warstwy zdjęcia', async () => {
    const { layer, loader } = startLayer()
    expect(loader.lastCall.sourceId, '„Automatycznie” + DSS2 kolor').toBeNull()
    await loader.finish(image('alasky'))
    layer.chooseLayer('dss2-red')
    expect(loader.lastCall.sourceId, '„Automatycznie” + DSS2 czerwony').toBe('alaskybis')
    expect(loader.lastCall.request.layerId).toBe('dss2-red')
    await loader.finish(image('alasky'))
    layer.chooseLayer('halpha')
    expect(loader.lastCall.sourceId, '„Automatycznie” + Hα').toBe('alaskybis')
    expect(loader.lastCall.request.layerId).toBe('halpha')
    await loader.finish(image('alasky'))
    layer.chooseSource('stsci')
    expect(loader.lastCall.sourceId, 'STScI + Hα').toBe('stsci')
    await loader.finish(image('stsci'))
    layer.chooseLayer('dss2-color')
    expect(loader.lastCall.sourceId, 'STScI + DSS2 kolor: wybór użytkownika wygrywa').toBe('stsci')
    expect(modes(loader)).toEqual([null, 'alaskybis', 'alaskybis', 'stsci', 'stsci'])
  })

  it('P13: Hα + „Automatycznie” → tryb ręczny z alaskybis; obraz Hα z alasky → podpis z „Hα (Finkbeiner)”', async () => {
    const { layer, loader } = startLayer()
    await loader.finish(image('stsci', { fromCache: true }))
    layer.chooseLayer('halpha')
    expect(loader.calls).toHaveLength(2)
    expect(loader.lastCall.sourceId).toBe('alaskybis')
    expect(loader.lastCall.request).toEqual(m42Request('halpha'))
    await loader.finish(image('alasky'))
    expect(layer.view().caption).toBe('Zdjęcie: CDS hips2fits (alasky), Hα (Finkbeiner)')
  })

  it('P13: z prawdziwym pobieraniem najpierw pamięć hips2fits z kluczem Hα, potem sieć hips2fits', async () => {
    const deps = new FakeDeps()
    deps.store(skyImageCacheKey('stsci', m42Request()) ?? '', 'stsci')
    const loader = recording(createSkyImageLoader(deps.deps()))
    const layer = createPhotoLayer(loader)
    layer.setFrame(frameAt(M42_CENTER), false)
    await flush()
    expect(layer.view().caption, 'tylko wycinek STScI w pamięci').toBe('Zdjęcie: STScI DSS, z pamięci')
    expect(deps.networkCount).toBe(0)
    const matchesBefore = deps.matchKeys.length
    layer.chooseLayer('halpha')
    await flush()
    expect(loader.modes).toEqual([null, 'alaskybis'])
    const halpha = m42Request('halpha')
    expect(deps.matchKeys[matchesBefore], 'pierwszy odczyt pamięci').toBe(skyImageCacheKey('alaskybis', halpha))
    expect(deps.fetchUrls[0], 'pierwsze zapytanie sieciowe').toBe(skyImageUrl('alaskybis', halpha))
    expect(deps.fetchUrls[0]).toContain('CDS%2FP%2FFinkbeiner')
    // alaskybis działa, więc obraz pochodzi z alaskybis (spec podaje alasky – rozbieżność opisana w raporcie).
    expect(layer.view().caption).toBe('Zdjęcie: CDS hips2fits (alaskybis), Hα (Finkbeiner)')
  })

  it('P13: ta sama sytuacja z ręcznie wybranym „STScI DSS” → obraz STScI z pamięci', async () => {
    const deps = new FakeDeps({ alaskybis: 'fail', alasky: 'fail', skyview: 'fail', stsci: 'fail' })
    deps.store(skyImageCacheKey('stsci', m42Request()) ?? '', 'stsci')
    const loader = recording(createSkyImageLoader(deps.deps()))
    const layer = createPhotoLayer(loader)
    layer.setFrame(frameAt(M42_CENTER), false)
    await flush()
    layer.chooseLayer('halpha')
    await flush()
    const networkBefore = deps.networkCount
    layer.chooseSource('stsci')
    await flush()
    expect(loader.modes.at(-1)).toBe('stsci')
    expect(deps.networkCount - networkBefore, 'bez zapytań sieciowych').toBe(0)
    expect(layer.view().caption).toBe('Zdjęcie: STScI DSS, z pamięci')
  })

  it('P14: Hα, obraz z SkyView → „Zdjęcie: NASA SkyView”, licencja SkyView, bez Finkbeinera i ODbL', async () => {
    const photo = shown('skyview', m42Request('halpha'))
    expect(photoCaption(photo)).toBe('Zdjęcie: NASA SkyView')
    const licenses = licenseLines(photo)
    expect(licenses).toHaveLength(2)
    expect(licenses).toContain(LICENSE_SKYVIEW)
    expect(licenses.join('\n')).not.toMatch(/Finkbeiner|ODbL/)
    const { layer, loader } = startLayer()
    layer.chooseLayer('halpha')
    await loader.finish(image('skyview'))
    const view = layer.view()
    expect(view.caption).toBe('Zdjęcie: NASA SkyView')
    expect(view.licenses).toContain(LICENSE_SKYVIEW)
    expect([view.caption, ...view.licenses].join('\n')).not.toMatch(/Finkbeiner|ODbL/)
  })
})

describe('„Zapisz podgląd do pracy offline”', () => {
  it('P15: przycisk przy każdym pokazanym zdjęciu, także zapisanym, gdy nic się nie pobiera', async () => {
    for (const [sourceId, flags] of [
      ['alasky', {}],
      ['alasky', { fromCache: true }],
      ['skyview', {}],
      ['stsci', { fromCache: true }],
    ] as const) {
      const { layer } = await layerWith(sourceId, flags)
      expect(layer.view().offline, `${sourceId} ${JSON.stringify(flags)}`).toEqual({ label: OFFLINE, disabled: false })
      const found = buttons(panel(layer.view()).hosts, OFFLINE)
      expect(found).toHaveLength(1)
      expect(found[0].props.disabled ?? false).toBe(false)
    }
  })

  it('P15: przycisku nie ma przy „Brak zdjęcia” ani w trakcie pobierania', async () => {
    const { layer, loader } = startLayer()
    expect(layer.view().offline, 'pierwsze pobieranie').toBeNull()
    await loader.finish(missing(P6_ATTEMPTS))
    expect(layer.view().offline, 'brak zdjęcia').toBeNull()
    expect(buttons(panel(layer.view()).hosts, OFFLINE)).toHaveLength(0)
    layer.retry()
    await loader.finish(image('alasky'))
    layer.chooseSource('skyview')
    expect(layer.view().offline, 'ponowne pobieranie').toBeNull()
  })

  it('P16: zdjęcie z alasky, klik → „Zapisano podgląd do pracy offline”; zdjęcie i podpis bez zmian', async () => {
    const { layer, loader } = await layerWith('alasky')
    const photo = layer.view().photo
    const clicks: string[] = []
    click(buttons(panel(layer.view(), { onSaveOffline: () => clicks.push('save') }).hosts, OFFLINE)[0]?.props)
    expect(clicks, 'przycisk wywołuje onSaveOffline').toEqual(['save'])
    const saving = layer.saveOffline()
    expect(loader.saveCalls).toBe(1)
    await loader.finishSave('saved')
    await saving
    const view = layer.view()
    expect(view.saveMessage).toBe(SAVED)
    expect(view.photo).toEqual(photo)
    expect(view.caption).toBe(CAPTION_ALASKY)
    expect(loader.calls).toHaveLength(1)
    expect(panel(view).text).toContain(SAVED)
  })

  it('P17: zdjęcie z SkyView → w trakcie „Zapisuję…” (nieaktywny); zapis przez STScI → zdjęcie i podpis STScI', async () => {
    const { layer, loader } = await layerWith('skyview')
    const saving = layer.saveOffline()
    expect(layer.view().offline).toEqual({ label: SAVING, disabled: true })
    const busy = buttons(panel(layer.view()).hosts, SAVING)
    expect(busy).toHaveLength(1)
    expect(busy[0].props.disabled).toBe(true)
    expect(buttons(panel(layer.view()).hosts, OFFLINE)).toHaveLength(0)
    await loader.finishSave('saved', image('stsci', { saved: true }))
    await saving
    const view = layer.view()
    expect(view.photo?.image.sourceId).toBe('stsci')
    expect(view.caption).toBe('Zdjęcie: STScI DSS')
    expect(view.saveMessage).toBe(SAVED)
    expect(view.licenses).toContain(LICENSE_STSCI)
  })

  it('P18: zapis się nie udaje → „Nie udało się zapisać…”; zostaje zdjęcie i podpis SkyView', async () => {
    const { layer, loader } = await layerWith('skyview')
    const saving = layer.saveOffline()
    await loader.finishSave('failed')
    await saving
    const view = layer.view()
    expect(view.saveMessage).toBe(SAVE_FAILED)
    expect(view.photo?.image.sourceId).toBe('skyview')
    expect(view.caption).toBe('Zdjęcie: NASA SkyView')
    expect(panel(view).text).toContain(SAVE_FAILED)
  })
})

describe('Nowy wycinek po przesunięciu (pole 5°, środek RA 83,8221°, Dec 0°, kadr 2,0° × 1,5°)', () => {
  const at = (decDeg: number) => frameAt({ raDeg: 83.8221, decDeg })

  async function shiftedLayer() {
    const loader = new FakeLoader()
    const layer = createPhotoLayer(loader)
    layer.setFrame(at(0), false)
    expect(loader.calls).toHaveLength(1)
    expect(loader.lastCall.request.fovDeg).toBe(5)
    await loader.finish(image('alasky'))
    return { layer, loader }
  }

  it('P19: puszczenie w Dec 1,25° → 0 wywołań; w Dec 1,26° → 1 wywołanie dla wycinka w Dec 1,26°', async () => {
    const { layer, loader } = await shiftedLayer()
    layer.setFrame(at(1.25), false)
    expect(loader.calls).toHaveLength(1)
    layer.setFrame(at(1.26), false)
    expect(loader.calls).toHaveLength(2)
    expect(loader.lastCall.request).toEqual(planCutout({ raDeg: 83.8221, decDeg: 1.26 }, SIZE_5, 'dss2-color'))
    expect(loader.lastCall.request.center.decDeg).toBe(1.26)
  })

  it('P19: decyzja o nowym pobraniu (model)', () => {
    const previous = planCutout({ raDeg: 83.8221, decDeg: 0 }, SIZE_5, 'dss2-color')
    expect(nextPhotoRequest(null, at(0), 'dss2-color', false)).toEqual(previous)
    expect(nextPhotoRequest(previous, at(1.25), 'dss2-color', false)).toBeNull()
    expect(nextPhotoRequest(previous, at(1.26), 'dss2-color', false)).toEqual(
      planCutout({ raDeg: 83.8221, decDeg: 1.26 }, SIZE_5, 'dss2-color'),
    )
  })

  it('P20: w trakcie przeciągania (nawet Dec 3°) → 0 wywołań; sprawdzenie po puszczeniu', async () => {
    const { layer, loader } = await shiftedLayer()
    layer.setFrame(at(1.26), true)
    layer.setFrame(at(3), true)
    expect(loader.calls).toHaveLength(1)
    expect(nextPhotoRequest(loader.calls[0].request, at(3), 'dss2-color', true)).toBeNull()
    layer.setFrame(at(3), false)
    expect(loader.calls).toHaveLength(2)
    expect(loader.lastCall.request.center.decDeg).toBe(3)
  })

  it('P21: zmiana obiektu na M 31 → 1 nowe wywołanie dla wycinka wokół M 31', async () => {
    const { layer, loader } = startLayer()
    await loader.finish(image('alasky'))
    layer.setFrame(frameAt(M31_CENTER), false)
    expect(loader.calls).toHaveLength(2)
    expect(loader.lastCall.request).toEqual(planCutout(M31_CENTER, SIZE_5, 'dss2-color'))
  })
})

describe('Położenie zdjęcia w widoku (jednostki widoku, ±1)', () => {
  const base = { raDeg: 83.8221, decDeg: 0 }
  const request5 = planCutout(base, SIZE_5, 'dss2-color')

  it('P22: środek kadru = środek wycinka, hips2fits lub SkyView → cały widok', () => {
    for (const sourceId of ['alaskybis', 'alasky', 'skyview'] as const) {
      expectRect(photoRect(shown(sourceId, request5), base, 5), [0, 1000], [0, 1000], sourceId)
    }
  })

  it('P23: kadr przesunięty na Dec 1° → zdjęcie przesuwa się w dół: x 0–1000, y ok. 200–1200', () => {
    expectRect(photoRect(shown('alasky', request5), { raDeg: 83.8221, decDeg: 1 }, 5), [0, 1000], [199.9, 1199.9])
  })

  it('P24: STScI 60′ przy polu 5° → ok. x 400–600, y 400–600; przy polu 0,5° → cały widok', () => {
    expectRect(photoRect(shown('stsci', request5), base, 5), [400.1, 599.9], [400.1, 599.9])
    const request05 = planCutout(base, { widthDeg: 0.2, heightDeg: 0.15 }, 'dss2-color')
    expect(request05.fovDeg).toBe(0.5)
    expectRect(photoRect(shown('stsci', request05), base, 0.5), [0, 1000], [0, 1000])
  })

  it('P22: widok rysuje zdjęcie jako <image> w prostokącie, pod mapą i ramką', () => {
    const profile = DEMO_PROFILES[0]
    const frame = { centerRaDeg: 83.8221, centerDecDeg: 1, paDeg: 0, mosaic: { cols: 1, rows: 1, overlapPct: 20 } }
    const rect = { x: 0, y: 199.9, width: 1000, height: 1000 }
    const mapObject = {
      uid: 'test-obiekt',
      kind: 'circle' as const,
      lineStyle: 'solid' as const,
      shapes: [[{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 150, y: 200 }]],
      label: { text: 'Test', position: null },
    }
    const markup = renderToStaticMarkup(
      createElement(FramingView, { fovDeg: 5, profile, framing: frame, mapObjects: [mapObject], photo: { href: 'blob:zdjecie-testowe', rect } }),
    )
    const elements = markupElements(markup)
    const images = elements.filter((element) => element.tag === 'image')
    expect(images).toHaveLength(1)
    const photo = images[0]
    expect(photo.attrs.href ?? photo.attrs['xlink:href']).toBe('blob:zdjecie-testowe')
    expectNear(Number(photo.attrs.x), 0, 1, 'x')
    expectNear(Number(photo.attrs.y), 199.9, 1, 'y')
    expectNear(Number(photo.attrs.width), 1000, 1, 'szerokość')
    expectNear(Number(photo.attrs.height), 1000, 1, 'wysokość')
    expect([photo, ...ancestors(photo)].some((element) => element.attrs.transform), 'bez transform').toBe(false)
    const index = (predicate: (element: (typeof elements)[number]) => boolean) => elements.findIndex(predicate)
    expect(index((element) => element.tag === 'image')).toBeLessThan(index((element) => element.attrs['data-map-uid'] !== undefined))
    expect(index((element) => element.tag === 'image')).toBeLessThan(index((element) => element.attrs['data-panel'] !== undefined))
  })
})

describe('Podpisy licencji', () => {
  it('P25: zawsze, także bez zdjęcia: licencja zarysów Stellarium', async () => {
    expect(licenseLines(null)).toEqual([OUTLINES_LICENSE])
    expect(licenseLines(shown('alasky', m42Request()))).toContain(OUTLINES_LICENSE)
    const { layer, loader } = startLayer()
    expect(layer.view().licenses).toEqual([OUTLINES_LICENSE])
    await loader.finish(missing(P6_ATTEMPTS))
    expect(layer.view().licenses).toEqual([OUTLINES_LICENSE])
    expect(panel(layer.view()).text).toContain(OUTLINES_LICENSE)
  })

  it('P26: przy zdjęciu druga linia zależna od źródła; Hα przy hips2fits → mapa Finkbeinera (ODbL)', async () => {
    const lines = (sourceId: 'alaskybis' | 'alasky' | 'skyview' | 'stsci', layerId: SkyImageLayerId = 'dss2-color') =>
      licenseLines(shown(sourceId, m42Request(layerId)))
    expect(lines('alasky')).toHaveLength(2)
    expect(lines('alasky')).toEqual(expect.arrayContaining([OUTLINES_LICENSE, LICENSE_HIPS]))
    expect(lines('skyview')).toEqual(expect.arrayContaining([OUTLINES_LICENSE, LICENSE_SKYVIEW]))
    expect(lines('stsci')).toEqual(expect.arrayContaining([OUTLINES_LICENSE, LICENSE_STSCI]))
    expect(lines('stsci')).toHaveLength(2)
    expect(lines('alasky', 'halpha')).toEqual(expect.arrayContaining([OUTLINES_LICENSE, LICENSE_HIPS_HALPHA]))
    expect(lines('alasky', 'halpha')).toHaveLength(2)
    const { layer, loader } = await layerWith('alasky')
    const rendered = panel(layer.view())
    expect(rendered.text).toContain(LICENSE_HIPS)
    expect(rendered.text).toContain(OUTLINES_LICENSE)
    layer.chooseLayer('dss2-red')
    await loader.finish(missing(P6_ATTEMPTS))
    expect(layer.view().licenses, 'przy „Brak zdjęcia” bez linii zdjęcia').toEqual([OUTLINES_LICENSE])
  })
})

// ---------- Zakładka Kadr (hak `useSkyImage` podmieniony) ----------

describe('Zakładka Kadr z warstwą zdjęcia', () => {
  const mySet = (): EquipmentProfile => {
    const found = DEMO_PROFILES.find((profile) => profile.id === 'demo-moj-zestaw')
    if (!found) throw new Error('Brak profilu „Mój zestaw”')
    return structuredClone(found)
  }
  const m31Frame = { centerRaDeg: M31_CENTER.raDeg, centerDecDeg: M31_CENTER.decDeg, paDeg: 0, mosaic: { cols: 1, rows: 1, overlapPct: 20 } }
  const tabSize = () => mosaicSizeDeg(mySet(), m31Frame)

  function baseView(over: Partial<PhotoLayerView>): PhotoLayerView {
    const values = ['auto', 'alaskybis', 'alasky', 'skyview', 'stsci'] as const
    return {
      source: 'auto',
      sourceOptions: values.map((value, i) => ({ value, label: SOURCE_LABELS[i] })),
      layer: 'dss2-color',
      layerOptions: (['dss2-color', 'dss2-red', 'halpha'] as const).map((value, i) => ({ value, label: LAYERS_5[i] })),
      photo: null,
      caption: null,
      loadingText: null,
      missing: null,
      offline: null,
      saveMessage: null,
      licenses: [OUTLINES_LICENSE],
      ...over,
    }
  }

  interface LayerSpy {
    layer: PhotoLayer
    actions: string[]
  }

  function spyLayer(view: PhotoLayerView): LayerSpy {
    const actions: string[] = []
    const layer: PhotoLayer = {
      view: () => view,
      subscribe: () => () => undefined,
      setFrame: () => undefined,
      chooseSource: (source) => {
        actions.push(`source:${source}`)
      },
      chooseLayer: (layerId) => {
        actions.push(`layer:${layerId}`)
      },
      retry: () => {
        actions.push('retry')
      },
      saveOffline: () => {
        actions.push('save')
        return Promise.resolve()
      },
    }
    return { layer, actions }
  }

  async function startTab(redMode = false) {
    vi.stubGlobal('localStorage', new MemoryStorage())
    vi.resetModules()
    const { usePlannerStore } = await import('../../../src/state/plannerStore')
    const { FramingTab } = await import('../../../src/features/framing/FramingTab')
    usePlannerStore.setState({ locationsReady: true, redMode })
    usePlannerStore.getState().setTab('framing')
    const sync = () => {
      Object.assign(usePlannerStore.getInitialState(), usePlannerStore.getState())
    }
    sync()
    return () => probeAll(createElement(FramingTab), sync)
  }

  it(
    'P21: nikt nie wybrał obiektu → zakładka przekazuje warstwie zdjęcia kadr M 31 (puszczony)',
    async () => {
      mocks.sky = { view: baseView({ loadingText: LOADING }), photoHref: null, layer: spyLayer(baseView({})).layer }
      const render = await startTab()
      render()
      const input = mocks.skyInputs.at(-1)
      expect(input, 'zakładka woła useSkyImage').toBeDefined()
      expectNear(input?.center.raDeg ?? NaN, M31_CENTER.raDeg, 1e-6, 'RA')
      expectNear(input?.center.decDeg ?? NaN, M31_CENTER.decDeg, 1e-6, 'Dec')
      expectNear(input?.size.widthDeg ?? NaN, tabSize().widthDeg, 1e-9, 'szerokość kadru')
      expectNear(input?.size.heightDeg ?? NaN, tabSize().heightDeg, 1e-9, 'wysokość kadru')
      expect(input?.dragging).toBe(false)
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'P4: zakładka w trakcie pierwszego pobierania → „Pobieram zdjęcie…”, licencja zarysów, bez <image> i przycisku offline',
    async () => {
      mocks.sky = { view: baseView({ loadingText: LOADING }), photoHref: null, layer: spyLayer(baseView({})).layer }
      const render = await startTab()
      const { markup, hosts } = render()
      const text = visibleText(markup)
      expect(text).toContain(LOADING)
      expect(text).toContain(OUTLINES_LICENSE)
      expect(markupElements(markup).filter((element) => element.tag === 'image')).toHaveLength(0)
      expect(buttons(hosts, OFFLINE)).toHaveLength(0)
      expect(selectWithOption(hosts, 'Automatycznie').selectedLabel).toBe('Automatycznie')
      expect(selectWithOption(hosts, 'DSS2 czerwony').selectedLabel).toBe('DSS2 kolor')
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'P23: zakładka rysuje zdjęcie w prostokącie z rzutu środka wycinka na widok, pod mapą i ramką, pod filtrem Red Mode',
    async () => {
      // Wycinek pobrany 0,5° na południe od środka kadru M 31, pole jak pole widoku zakładki (3,05°):
      // środek zdjęcia y = 500 + tan 0,5° / (2·tan 1,525° / 1000) ≈ 663,9, bok 1000.
      const fov = cutoutFovDeg(tabSize())
      expect(fov).toBe(3.05)
      const request = planCutout({ raDeg: M31_CENTER.raDeg, decDeg: M31_CENTER.decDeg - 0.5 }, tabSize(), 'dss2-color')
      const view = baseView({ photo: shown('alasky', request), caption: CAPTION_ALASKY, offline: { label: OFFLINE, disabled: false }, licenses: [OUTLINES_LICENSE, LICENSE_HIPS] })
      const spy = spyLayer(view)
      mocks.sky = { view, photoHref: 'blob:zdjecie-m31', layer: spy.layer }
      const render = await startTab(true)
      const { markup, hosts } = render()
      const elements = markupElements(markup)
      const images = elements.filter((element) => element.tag === 'image')
      expect(images).toHaveLength(1)
      const photo = images[0]
      expect(photo.attrs.href ?? photo.attrs['xlink:href']).toBe('blob:zdjecie-m31')
      const x = Number(photo.attrs.x)
      const y = Number(photo.attrs.y)
      expectRect({ x, y, width: Number(photo.attrs.width), height: Number(photo.attrs.height) }, [0, 1000], [163.9, 1163.9])
      const first = (predicate: (element: (typeof elements)[number]) => boolean) => elements.findIndex(predicate)
      const imageAt = first((element) => element.tag === 'image')
      expect(imageAt).toBeLessThan(first((element) => element.attrs['data-panel'] !== undefined))
      const mapAt = first((element) => element.attrs['data-map-uid'] !== undefined)
      expect(mapAt, 'mapa zastępcza wokół M 31').toBeGreaterThanOrEqual(0)
      expect(imageAt).toBeLessThan(mapAt)
      expect(
        ancestors(photo).some((element) => (element.attrs.style ?? '').replace(/\s/g, '').includes('filter:url(#red-only)')),
        'zdjęcie pod filtrem Red Mode kontenera widoku',
      ).toBe(true)
      const text = visibleText(markup)
      expect(text).toContain(CAPTION_ALASKY)
      expect(text).toContain(LICENSE_HIPS)
      click(buttons(hosts, OFFLINE)[0]?.props)
      expect(spy.actions).toEqual(['save'])
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'P7: zakładka przy „Brak zdjęcia”: komunikat, lista prób, „Spróbuj ponownie” wywołuje ponowną próbę',
    async () => {
      const view = baseView({ missing: { message: MISSING, attempts: P6_LINES } })
      const spy = spyLayer(view)
      mocks.sky = { view, photoHref: null, layer: spy.layer }
      const render = await startTab()
      const { markup, hosts } = render()
      const text = visibleText(markup)
      expect(text).toContain(MISSING)
      for (const line of P6_LINES) expect(text).toContain(line)
      expect(markupElements(markup).filter((element) => element.tag === 'image')).toHaveLength(0)
      click(buttons(hosts, RETRY)[0]?.props)
      expect(spy.actions).toEqual(['retry'])
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'P9: lista źródeł i warstw w zakładce wywołuje wybór warstwy zdjęcia',
    async () => {
      const view = baseView({ photo: shown('alasky', planCutout(M31_CENTER, tabSize(), 'dss2-color')), caption: CAPTION_ALASKY })
      const spy = spyLayer(view)
      mocks.sky = { view, photoHref: 'blob:zdjecie', layer: spy.layer }
      const render = await startTab()
      const { hosts } = render()
      choose(selectWithOption(hosts, 'STScI DSS').host.props, 'stsci')
      choose(selectWithOption(hosts, 'DSS2 czerwony').host.props, 'dss2-red')
      expect(spy.actions).toEqual(['source:stsci', 'layer:dss2-red'])
    },
    FULL_CATALOG_TIMEOUT,
  )
})
