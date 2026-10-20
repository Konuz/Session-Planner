// Testy funkcji „zoom-kadru” (spec: .autoloop/features/zoom-kadru/spec.md): czyste funkcje zoomu, pole planowane
// wycinka, warstwa zdjęcia z polem widoku i rysunek ramki. Zakładka (przyciski, kółko, szczypanie, przerwa 300 ms)
// jest w zoom-kadru-tab.test.ts.
// Nazwy funkcji wybrał test-author (spec ich nie podaje) – opis w helpers.ts i w zaślepkach.
//
// Wartości z reguł wcześniejszych funkcji (podane w komentarzach testów):
// - pole „Dopasuj” = `cutoutFovDeg(mosaicSizeDeg(...))` (`zrodla-zdjec`), 3,05° przy 1×1 i 4,45° przy 2×1;
// - przekątna jednego kadru = hypot(`mosaicSizeDeg` 1×1) = 1,52735°, więc najmniejsze pole 1,83282°;
// - punkt nieba pod pikselem widoku = `cutoutToSky` (`geometria-kadru`), przeciąganie = `dragFraming` (`zakladka-kadr`);
// - prostokąt zdjęcia = `photoRect` (`zdjecie-w-kadrze`), klucz pamięci = `skyImageCacheKey` (`zrodla-zdjec`).
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FramingView } from '../../../src/features/framing/FramingView'
import {
  MAX_VIEW_FOV_DEG,
  ZOOM_STEP,
  canZoomIn,
  canZoomOut,
  dragFraming,
  fovReadout,
  pinchZoom,
  wheelZoom,
  zoomBounds,
  zoomIn,
  zoomOut,
} from '../../../src/features/framing/framingModel'
import { createPhotoLayer, nextPhotoRequest, photoRect, type PhotoFrame } from '../../../src/features/framing/photoModel'
import { cutoutToSky } from '../../../src/services/framing'
import { needsNewCutout, planCutout, skyImageCacheKey, skyImageUrl } from '../../../src/services/skyImage/sources'
import {
  DRAG_CENTER,
  FIT_1x1,
  FIT_2x1,
  FakeLoader,
  M42_CENTER,
  expectCorners,
  expectFov,
  expectNear,
  expectedCorners,
  framing,
  image,
  minFov,
  mySet,
  parsePoints,
  sizeOf,
  width,
} from './helpers'

const b1 = () => zoomBounds(mySet(), framing(M42_CENTER))
const b2 = () => zoomBounds(mySet(), framing(M42_CENTER, 2, 1))
const MIN = minFov(mySet())
const PLUS1 = FIT_1x1 / 1.5 // 2,0333°
const MINUS1 = FIT_1x1 * 1.5 // 4,575°

// =====================================================================================================
// Czyste funkcje zoomu
// =====================================================================================================

describe('Granice i krok (framingModel)', () => {
  it('test_p1_fit_and_readout: „Dopasuj” = 3,05° przy 1×1, odczyt „Pole widoku: 3,05°”', () => {
    expect(ZOOM_STEP).toBe(1.5)
    expectFov(b1().fitDeg, FIT_1x1, 'Dopasuj 1×1')
    expect(fovReadout(FIT_1x1)).toBe('Pole widoku: 3,05°')
  })

  it('test_p2_min_bound: najmniejsze pole = 1,2 × przekątna jednego kadru ≈ 1,833°', () => {
    expectNear(MIN, 1.833, 0.001, '1,2 × 1,5274°')
    expectNear(b1().minDeg, MIN, 1e-6, 'minDeg')
  })

  it('test_p2_plus_twice: „+” → 2,0333° („2,03°”), drugie „+” przycięte do ok. 1,833° i „+” nieaktywny', () => {
    const bounds = b1()
    const once = zoomIn(FIT_1x1, bounds)
    expectFov(once, 2.0333, 'pierwszy „+”')
    expect(fovReadout(once)).toBe('Pole widoku: 2,03°')
    expect(canZoomIn(once, bounds)).toBe(true)
    const twice = zoomIn(once, bounds)
    expectNear(twice, MIN, 1e-6, 'drugi „+” = granica')
    expect(fovReadout(twice)).toBe('Pole widoku: 1,83°')
    expect(canZoomIn(twice, bounds), '„+” przy granicy').toBe(false)
    expect(canZoomOut(twice, bounds), '„−” przy dolnej granicy').toBe(true)
    expect(canZoomIn(MIN + 0.01, bounds), '0,01° nad granicą „+” aktywny').toBe(true)
    expectNear(zoomIn(twice, bounds), MIN, 1e-6, '„+” przy granicy nic nie zmienia')
  })

  it('test_p3_minus_to_60: siedem razy „−” → 52,112°, ósme (78,17°) → 60° i „−” nieaktywny', () => {
    const bounds = b1()
    expect(MAX_VIEW_FOV_DEG).toBe(60)
    expect(bounds.maxDeg).toBe(60)
    let fov = FIT_1x1
    for (let i = 0; i < 7; i += 1) fov = zoomOut(fov, bounds)
    expectFov(fov, 52.112, 'siedem „−”')
    expect(fovReadout(fov)).toBe('Pole widoku: 52,11°')
    expect(canZoomOut(fov, bounds)).toBe(true)
    fov = zoomOut(fov, bounds)
    expectNear(fov, 60, 1e-9, 'ósme „−”')
    expect(canZoomOut(fov, bounds), '„−” przy 60°').toBe(false)
    expect(canZoomIn(fov, bounds)).toBe(true)
    expect(canZoomOut(59.9, bounds), '0,1° pod 60° „−” aktywny').toBe(true)
  })

  it('test_p4_fit_mosaic: „Dopasuj” przy 2×1 = 4,45°; dolna granica nadal z jednego kadru', () => {
    expectFov(b2().fitDeg, FIT_2x1, 'Dopasuj 2×1')
    expectNear(b2().minDeg, MIN, 1e-6, 'minDeg przy 2×1')
    expect(b2().maxDeg).toBe(60)
  })

  it('test_p17_mosaic_plus_twice: 2×1, „+” dwa razy: 4,45° → 1,9778° (powyżej granicy 1,833°); trzeci „+” → granica', () => {
    const bounds = b2()
    const twice = zoomIn(zoomIn(bounds.fitDeg, bounds), bounds)
    expectFov(twice, 1.9778, 'dwa „+” przy 2×1')
    expectNear(zoomIn(twice, bounds), MIN, 1e-6, 'trzeci „+” = 1,2 × przekątna jednego kadru, nie mozaiki')
  })
})

describe('Kółko myszy i szczypanie (framingModel)', () => {
  it('test_p6_wheel: −100 px przybliża (2,0333°), +100 px oddala (4,575°), −3 linie = −100 px, −50 px = pół kroku', () => {
    const bounds = b1()
    expectFov(wheelZoom(FIT_1x1, -100, 0, bounds), PLUS1, '−100 px')
    expectFov(wheelZoom(FIT_1x1, 100, 0, bounds), MINUS1, '+100 px')
    expectFov(wheelZoom(FIT_1x1, -3, 1, bounds), PLUS1, '−3 linie (Firefox)')
    expectFov(wheelZoom(FIT_1x1, -50, 0, bounds), 2.4903, 'gładzik −50 px: 3,05 / √1,5')
  })

  it('test_p15_wheel_three_ticks: trzy ząbki (3,05° → 0,9037°) są przycięte do ok. 1,833°', () => {
    const bounds = b1()
    let fov = FIT_1x1
    for (let i = 0; i < 3; i += 1) fov = wheelZoom(fov, -100, 0, bounds)
    expectNear(fov, MIN, 1e-6, 'trzy ząbki')
  })

  it('test_p8_pinch: 200 → 300 px → 2,0333°; 200 → 100 px → 6,1°; poza granicami przycięte', () => {
    const bounds = b1()
    expectFov(pinchZoom(FIT_1x1, 200, 300, bounds), PLUS1, 'rozsunięcie')
    expectFov(pinchZoom(FIT_1x1, 200, 100, bounds), 6.1, 'zsunięcie')
    expectNear(pinchZoom(FIT_1x1, 200, 600, bounds), MIN, 1e-6, 'przycięcie do dolnej granicy')
    expectNear(pinchZoom(40, 100, 50, bounds), 60, 1e-9, 'przycięcie do 60°')
  })
})

describe('Przeciąganie i ramka przy zmienionym polu', () => {
  it('test_p10_drag_at_4575: 100 jednostek w prawo przy 4,575° → niebo pod pikselem (400; 500), ok. RA 84,28°, Dec −5,391°', () => {
    const start = { framing: framing(DRAG_CENTER), pointer: { x: 0, y: 0 } }
    const moved = dragFraming(start, { x: 100, y: 0 }, MINUS1, 1000)
    const expected = cutoutToSky({ center: DRAG_CENTER, fovDeg: MINUS1, widthPx: 1000, heightPx: 1000 }, { x: 400, y: 500 })
    expectNear(moved.centerRaDeg, expected.raDeg, 1e-6, 'RA')
    expectNear(moved.centerDecDeg, expected.decDeg, 1e-6, 'Dec')
    expectNear(moved.centerRaDeg, 84.28, 0.005, 'RA ok. 84,28°')
    expectNear(moved.centerDecDeg, -5.391, 0.001, 'Dec ok. −5,391°')
    const at305 = dragFraming(start, { x: 100, y: 0 }, FIT_1x1, 1000)
    expect(at305.centerRaDeg - DRAG_CENTER.raDeg, 'przy 3,05° środek przesuwa się mniej').toBeLessThan(moved.centerRaDeg - DRAG_CENTER.raDeg)
  })

  it('test_p11_frame_scale: ramka przy polu 2,0333° = rzut z `geometria-kadru` (±1), ok. 1,5 raza większa niż przy 3,05°', () => {
    const frame = framing(M42_CENTER)
    const corners = (fovDeg: number) => {
      const markup = renderToStaticMarkup(createElement(FramingView, { fovDeg, profile: mySet(), framing: frame, mapObjects: [] }))
      const match = /<g[^>]*data-panel="1"[^>]*>\s*<polygon[^>]*points="([^"]*)"/.exec(markup)
      return parsePoints(match?.[1] ?? '')
    }
    const zoomed = corners(PLUS1)
    expectCorners(zoomed, expectedCorners(mySet(), frame, PLUS1))
    expectNear(width(zoomed) / width(corners(FIT_1x1)), 1.5, 0.01, 'stosunek szerokości ramki')
  })
})

// =====================================================================================================
// Pole planowane wycinka (sources.ts)
// =====================================================================================================

describe('Pole planowane wycinka (sources)', () => {
  it('test_p12_plan_cutout: pole wycinka po zoomie = pole widoku bez zaokrąglania do 0,01°; w adresie 4 miejsca', () => {
    const size = sizeOf(mySet())
    const request = planCutout(M42_CENTER, size, 'dss2-color', PLUS1)
    expectNear(request.fovDeg, PLUS1, 1e-9, 'pole bez zaokrąglania (2,03333…, nie 2,03)')
    expect(request.sizePx).toBe(1000)
    expect(request.center).toEqual(planCutout(M42_CENTER, size, 'dss2-color').center)
    expect(skyImageUrl('alaskybis', request)).toContain('fov=2.0333&')
    expect(planCutout(M42_CENTER, size, 'dss2-color').fovDeg, 'bez pola planowanego jak dotąd').toBe(FIT_1x1)
  })

  it('test_p17_needs_new_cutout: wycinek 1,9778° (2×1 po dwóch „+”): przesunięcie 0,49° → nie; 0,50° → tak (¼ pola ≈ 0,494°)', () => {
    const size = sizeOf(mySet(), 2, 1)
    const planned = FIT_2x1 / 2.25
    const cutout = { center: { raDeg: 83.8221, decDeg: 0 }, fovDeg: planned }
    const at = (decDeg: number) => ({ center: { raDeg: 83.8221, decDeg }, size })
    expect(needsNewCutout(cutout, at(0), planned), 'bez przesunięcia').toBe(false)
    expect(needsNewCutout(cutout, at(0.49), planned), '0,49°').toBe(false)
    expect(needsNewCutout(cutout, at(0.5), planned), '0,50°').toBe(true)
  })

  it('test_p14_needs_new_cutout_larger: pole planowane 4,575° > wycinek 3,05° → nowy wycinek bez przesunięcia', () => {
    const size = sizeOf(mySet())
    const cutout = { center: M42_CENTER, fovDeg: FIT_1x1 }
    expect(needsNewCutout(cutout, { center: M42_CENTER, size }, MINUS1)).toBe(true)
    expect(needsNewCutout(cutout, { center: M42_CENTER, size }), 'bez pola planowanego jak dotąd').toBe(false)
  })
})

// =====================================================================================================
// Warstwa zdjęcia z polem widoku (photoModel)
// =====================================================================================================

const size1 = () => sizeOf(mySet())
const at = (fovDeg: number | undefined, center = M42_CENTER, size = size1()): PhotoFrame =>
  fovDeg === undefined ? { center: { ...center }, size: { ...size } } : { center: { ...center }, size: { ...size }, fovDeg }

/** Warstwa z atrapą pobierania; start przy polu 3,05° i pierwsze pobranie zakończone obrazem alasky. */
async function startedLayer(fovDeg = FIT_1x1, size = size1()) {
  const loader = new FakeLoader()
  const layer = createPhotoLayer(loader)
  layer.setFrame(at(fovDeg, M42_CENTER, size), false)
  expect(loader.calls, 'pobranie na starcie').toHaveLength(1)
  await loader.finish(image('alasky'))
  return { loader, layer }
}

describe('Nowy wycinek po zoomie (warstwa zdjęcia)', () => {
  it('test_p12_layer: „+” → 1 pobranie o polu 2,0333° wokół środka; stare zdjęcie zostaje i rośnie do ok. −250…1250', async () => {
    const { loader, layer } = await startedLayer()
    expectFov(loader.calls[0].request.fovDeg, FIT_1x1, 'start')
    layer.setFrame(at(PLUS1), false)
    expect(loader.calls).toHaveLength(2)
    expectNear(loader.lastCall.request.fovDeg, PLUS1, 1e-6, 'pole nowego wycinka')
    expect(loader.lastCall.request.center).toEqual(loader.calls[0].request.center)
    const view = layer.view()
    expect(view.photo, 'stary wycinek zostaje do nadejścia nowego').not.toBeNull()
    expect(view.photo?.request.fovDeg).toBe(FIT_1x1)
    expect(view.loadingText).toBe('Pobieram zdjęcie…')
    const rect = photoRect(view.photo!, M42_CENTER, PLUS1)
    expectNear(rect.x, -250, 1, 'x min')
    expectNear(rect.x + rect.width, 1250, 1, 'x max')
    expectNear(rect.y, -250, 1, 'y min')
    expectNear(rect.y + rect.height, 1250, 1, 'y max')
    layer.setFrame(at(MIN), false)
    expect(loader.calls, 'drugi „+” → kolejne pobranie').toHaveLength(3)
    expectNear(loader.lastCall.request.fovDeg, MIN, 1e-6, 'pole przy granicy')
  })

  it('test_p13_layer: to samo pole drugi raz i szczypanie kończące się na tym samym polu → 0 pobrań', async () => {
    const { loader, layer } = await startedLayer()
    layer.setFrame(at(FIT_1x1), false)
    layer.setFrame(at(2.5), true)
    layer.setFrame(at(PLUS1), true)
    layer.setFrame(at(FIT_1x1), true)
    layer.setFrame(at(FIT_1x1), false)
    expect(loader.calls).toHaveLength(1)
  })

  it('test_p14_layer: „−” → 1 pobranie 4,575°; „+” → 1 pobranie 3,05° z kluczem jak na starcie; „Dopasuj” (3,05°) → 0', async () => {
    const { loader, layer } = await startedLayer()
    layer.setFrame(at(MINUS1), false)
    expect(loader.calls).toHaveLength(2)
    expectNear(loader.lastCall.request.fovDeg, MINUS1, 1e-6, '„−”')
    await loader.finish(image('alasky'))
    layer.setFrame(at(MINUS1 / 1.5), false)
    expect(loader.calls).toHaveLength(3)
    expectFov(loader.lastCall.request.fovDeg, FIT_1x1, '„+”')
    expect(skyImageCacheKey('alaskybis', loader.lastCall.request), 'ten sam klucz co na starcie').toBe(
      skyImageCacheKey('alaskybis', loader.calls[0].request),
    )
    await loader.finish(image('alasky', true))
    layer.setFrame(at(FIT_1x1), false)
    expect(loader.calls, '„Dopasuj” przy 3,05°').toHaveLength(3)
  })

  it('test_p4_layer: „Dopasuj” po „−” (wycinek 4,575°) → 1 pobranie o polu 3,05°', async () => {
    const { loader, layer } = await startedLayer()
    layer.setFrame(at(MINUS1), false)
    await loader.finish(image('alasky'))
    layer.setFrame(at(FIT_1x1), false)
    expect(loader.calls).toHaveLength(3)
    expectFov(loader.lastCall.request.fovDeg, FIT_1x1, 'Dopasuj')
  })

  it('test_p15_layer: w trakcie gestu (dragging) → 0 pobrań; po zakończeniu 1 pobranie o polu ok. 1,833°', async () => {
    const { loader, layer } = await startedLayer()
    layer.setFrame(at(PLUS1), true)
    layer.setFrame(at(1.3556), true)
    layer.setFrame(at(MIN), true)
    expect(loader.calls).toHaveLength(1)
    layer.setFrame(at(MIN), false)
    expect(loader.calls).toHaveLength(2)
    expectNear(loader.lastCall.request.fovDeg, MIN, 1e-6, 'pole po 300 ms ciszy')
  })

  it('test_p16_layer: lista warstw zależy od pola widoku; Hα, potem „+” poniżej 3° → „DSS2 kolor” i 1 pobranie w tej warstwie', async () => {
    const { loader, layer } = await startedLayer()
    const ids = () => layer.view().layerOptions.map((option) => option.value)
    layer.setFrame(at(MINUS1), true)
    expect(ids(), 'przy 4,575° jest Hα').toContain('halpha')
    layer.setFrame(at(PLUS1), true)
    expect(ids(), 'przy 2,0333° nie ma Hα, choć „Dopasuj” = 3,05°').not.toContain('halpha')
    layer.setFrame(at(FIT_1x1), false)
    expect(loader.calls).toHaveLength(1)
    layer.chooseLayer('halpha')
    expect(loader.calls).toHaveLength(2)
    expect(loader.lastCall.request.layerId).toBe('halpha')
    await loader.finish(image('alasky'))
    layer.setFrame(at(PLUS1), false)
    expect(layer.view().layer).toBe('dss2-color')
    expect(loader.calls).toHaveLength(3)
    expect(loader.lastCall.request.layerId).toBe('dss2-color')
    expectNear(loader.lastCall.request.fovDeg, PLUS1, 1e-6, 'pole')
  })

  it('test_p16_reload_uses_view_fov: wybór warstwy i źródła pobiera wycinek o polu widoku', async () => {
    const { loader, layer } = await startedLayer()
    layer.setFrame(at(MINUS1), false)
    layer.chooseLayer('halpha')
    expect(loader.calls).toHaveLength(3)
    expect(loader.lastCall.request.layerId).toBe('halpha')
    expectNear(loader.lastCall.request.fovDeg, MINUS1, 1e-6, 'Hα przy 4,575°')
    layer.chooseSource('stsci')
    expect(loader.calls).toHaveLength(4)
    expectNear(loader.lastCall.request.fovDeg, MINUS1, 1e-6, 'STScI przy 4,575°')
  })

  it('test_p17_layer: 2×1 po dwóch „+” wycinek 1,9778°; puszczenie po 0,49° → 0, po 0,50° → 1 pobranie', async () => {
    const size = sizeOf(mySet(), 2, 1)
    const base = { raDeg: 83.8221, decDeg: 0 }
    const loader = new FakeLoader()
    const layer = createPhotoLayer(loader)
    layer.setFrame(at(FIT_2x1, base, size), false)
    await loader.finish(image('alasky'))
    const planned = FIT_2x1 / 2.25
    layer.setFrame(at(FIT_2x1 / 1.5, base, size), false)
    layer.setFrame(at(planned, base, size), false)
    expect(loader.calls).toHaveLength(3)
    expectFov(loader.lastCall.request.fovDeg, 1.9778, 'wycinek po dwóch „+”')
    await loader.finish(image('alasky'))
    layer.setFrame(at(planned, { raDeg: 83.8221, decDeg: 0.3 }, size), true)
    layer.setFrame(at(planned, { raDeg: 83.8221, decDeg: 0.49 }, size), false)
    expect(loader.calls, 'puszczenie po 0,49°').toHaveLength(3)
    layer.setFrame(at(planned, { raDeg: 83.8221, decDeg: 0.5 }, size), false)
    expect(loader.calls, 'puszczenie po 0,50°').toHaveLength(4)
    expectNear(loader.lastCall.request.fovDeg, planned, 1e-6, 'pole bez zmian')
    expect(loader.lastCall.request.center.decDeg).toBe(0.5)
  })

  it('test_p18_layer: przy „Dopasuj” (pole widoku = pole wycinka kadru) decyzje jak dotąd: Dec 1,25° → 0, 1,26° → 1', async () => {
    const size = { widthDeg: 2, heightDeg: 1.5 }
    const base = (decDeg: number) => ({ raDeg: 83.8221, decDeg })
    for (const fovDeg of [5, undefined]) {
      const loader = new FakeLoader()
      const layer = createPhotoLayer(loader)
      layer.setFrame(at(fovDeg, base(0), size), false)
      expect(loader.lastCall.request.fovDeg).toBe(5)
      await loader.finish(image('alasky'))
      layer.setFrame(at(fovDeg, base(1.25), size), false)
      expect(loader.calls, `Dec 1,25° (fovDeg ${fovDeg})`).toHaveLength(1)
      layer.setFrame(at(fovDeg, base(1.26), size), false)
      expect(loader.calls, `Dec 1,26° (fovDeg ${fovDeg})`).toHaveLength(2)
    }
  })

  it('test_p14_next_request: nextPhotoRequest z polem widoku 4,575° → wycinek 4,575°; w trakcie gestu null', () => {
    const previous = planCutout(M42_CENTER, size1(), 'dss2-color')
    const request = nextPhotoRequest(previous, at(MINUS1), 'dss2-color', false)
    expect(request).not.toBeNull()
    expectNear(request!.fovDeg, MINUS1, 1e-6, 'pole')
    expect(request!.center).toEqual(previous.center)
    expect(nextPhotoRequest(previous, at(MINUS1), 'dss2-color', true)).toBeNull()
    expect(nextPhotoRequest(previous, at(FIT_1x1), 'dss2-color', false), 'to samo pole').toBeNull()
  })
})
