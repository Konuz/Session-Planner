// Testy ukryte funkcji „zoom-kadru”: te same reguły co w testach widocznych, ale z innymi wartościami (inne profile,
// mozaiki, ułamki ząbka, odległości palców, progi). Nazwy i narzędzia jak w ../helpers.ts i ../tabHarness.ts.
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  canZoomIn,
  canZoomOut,
  fovReadout,
  pinchZoom,
  wheelZoom,
  zoomBounds,
  zoomIn,
  zoomOut,
} from '../../../../src/features/framing/framingModel'
import { createPhotoLayer, type PhotoFrame } from '../../../../src/features/framing/photoModel'
import { needsNewCutout, planCutout, skyImageUrl } from '../../../../src/services/skyImage/sources'
import {
  ESPRIT_ID,
  FIT_1x1,
  FakeLoader,
  M42_CENTER,
  NEWTON200_ID,
  expectCorners,
  expectFov,
  expectNear,
  expectedCorners,
  framing,
  image,
  minFov,
  mySet,
  profile,
  sizeOf,
} from '../helpers'
import { advance, click, fakeClock, isDisabled, panelCorners, pointer, readoutText, startTab, wheel, zoomButton } from '../tabHarness'

const mocks = vi.hoisted(() => ({ loaders: [] as FakeLoader[] }))

vi.mock('../../../../src/features/night/useFeaturedObjects', async () => {
  const { KLASYKI } = await import('../tabHarness')
  return { useFeaturedObjects: () => ({ featured: { status: 'ready', objects: [...KLASYKI], catalog: KLASYKI }, retry: () => undefined }) }
})

vi.mock('../../../../src/services/skyImage/loader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/services/skyImage/loader')>()
  const { FakeLoader: Loader } = await import('../helpers')
  return {
    ...actual,
    createSkyImageLoader: () => {
      const loader = new Loader()
      mocks.loaders.push(loader)
      return loader
    },
  }
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const TIMEOUT = 60_000

describe('Ukryte: granice dla innych profili i mozaik', () => {
  it('hidden_p4_esprit: Esprit 1×1: „Dopasuj” 9,02°, minimum 1,2 × 4,5075° ≈ 5,409°; „+” → 6,0133°', () => {
    const esprit = profile(ESPRIT_ID)
    const bounds = zoomBounds(esprit, framing(M42_CENTER))
    expectFov(bounds.fitDeg, 9.02, 'Dopasuj')
    expectNear(bounds.minDeg, minFov(esprit), 1e-6, 'minimum')
    expectNear(bounds.minDeg, 5.409, 0.001, 'minimum ok. 5,409°')
    expectFov(zoomIn(9.02, bounds), 6.0133, '„+”')
    expectNear(zoomIn(6.0133, bounds), bounds.minDeg, 1e-6, 'drugi „+” przycięty')
  })

  it('hidden_p17_newton_3x2: Newton 200 3×2: „Dopasuj” 4,1°, minimum z jednego kadru 1,2 × 0,9164° ≈ 1,0997°', () => {
    const newton = profile(NEWTON200_ID)
    const bounds = zoomBounds(newton, framing(M42_CENTER, 3, 2))
    expectFov(bounds.fitDeg, 4.1, 'Dopasuj 3×2')
    expectNear(bounds.minDeg, 1.0997, 0.001, 'minimum')
    expect(bounds.maxDeg).toBe(60)
  })

  it('hidden_p2_bounds_buttons: „+” nieaktywny na minimum, aktywny 0,05° nad nim; „−” nieaktywny przy 60°, aktywny przy 59,5°', () => {
    const bounds = zoomBounds(mySet(), framing(M42_CENTER))
    expect(canZoomIn(bounds.minDeg, bounds)).toBe(false)
    expect(canZoomIn(bounds.minDeg + 0.05, bounds)).toBe(true)
    expect(canZoomOut(60, bounds)).toBe(false)
    expect(canZoomOut(59.5, bounds)).toBe(true)
    expectNear(zoomOut(45, bounds), 60, 1e-9, '45 × 1,5 → 60')
  })

  it('hidden_p1_readout: odczyty 9,15° i 12,35° innych pól', () => {
    expect(fovReadout(9.15)).toBe('Pole widoku: 9,15°')
    expect(fovReadout(12.3456)).toBe('Pole widoku: 12,35°')
  })
})

describe('Ukryte: kółko i szczypanie', () => {
  it('hidden_p6_wheel_values: +50 px → ×√1,5; −6 linii → 2 kroki (przycięte); +6 linii → ×2,25; +150 px → ×1,5^1,5', () => {
    const bounds = zoomBounds(mySet(), framing(M42_CENTER))
    expectFov(wheelZoom(FIT_1x1, 50, 0, bounds), FIT_1x1 * Math.sqrt(1.5), '+50 px')
    expectNear(wheelZoom(FIT_1x1, -6, 1, bounds), bounds.minDeg, 1e-6, '−6 linii')
    expectFov(wheelZoom(FIT_1x1, 6, 1, bounds), 6.8625, '+6 linii')
    expectFov(wheelZoom(10, 150, 0, bounds), 10 * 1.5 ** 1.5, '+150 px od 10°')
    expectNear(wheelZoom(50, 300, 0, bounds), 60, 1e-9, 'przycięte do 60°')
  })

  it('hidden_p8_pinch_values: 150 → 100 px → 4,575°; 200 → 400 px przycięte; 300 → 240 px z 10° → 12,5°', () => {
    const bounds = zoomBounds(mySet(), framing(M42_CENTER))
    expectFov(pinchZoom(FIT_1x1, 150, 100, bounds), 4.575, '150 → 100')
    expectNear(pinchZoom(FIT_1x1, 200, 400, bounds), bounds.minDeg, 1e-6, '200 → 400')
    expectFov(pinchZoom(10, 300, 240, bounds), 12.5, '300 → 240')
  })
})

describe('Ukryte: pole planowane i warstwa zdjęcia', () => {
  const size = () => sizeOf(mySet())
  const at = (fovDeg: number, center = M42_CENTER): PhotoFrame => ({ center: { ...center }, size: size(), fovDeg })

  it('hidden_p12_plan_cutout_values: pole planowane 1,23456° bez zaokrąglania, w adresie 1.2346', () => {
    const request = planCutout(M42_CENTER, size(), 'dss2-red', 1.23456)
    expect(request.fovDeg).toBe(1.23456)
    expect(request.layerId).toBe('dss2-red')
    expect(skyImageUrl('alasky', request)).toContain('fov=1.2346&')
  })

  it('hidden_p17_needs_new_cutout_values: wycinek 2,0333° (¼ ≈ 0,508°): 0,50° → nie, 0,52° → tak', () => {
    const planned = FIT_1x1 / 1.5
    const cutout = { center: { raDeg: 120, decDeg: 10 }, fovDeg: planned }
    const frame = (decDeg: number) => ({ center: { raDeg: 120, decDeg }, size: size() })
    expect(needsNewCutout(cutout, frame(10.5), planned)).toBe(false)
    expect(needsNewCutout(cutout, frame(10.52), planned)).toBe(true)
    expect(needsNewCutout(cutout, frame(10), 2.5)).toBe(true)
  })

  it('hidden_p14_layer_threshold: pole różne o 5e-7° → 0 pobrań; o 1e-5° → 1 pobranie; „−” z 6,1° → 9,15°', async () => {
    const loader = new FakeLoader()
    const layer = createPhotoLayer(loader)
    layer.setFrame(at(6.1), false)
    expect(loader.calls).toHaveLength(1)
    expectNear(loader.lastCall.request.fovDeg, 6.1, 1e-9, 'start')
    await loader.finish(image('alaskybis'))
    layer.setFrame(at(6.1 + 5e-7), false)
    expect(loader.calls).toHaveLength(1)
    layer.setFrame(at(6.1 + 1e-5), false)
    expect(loader.calls).toHaveLength(2)
    layer.setFrame(at(9.15), false)
    expect(loader.calls).toHaveLength(3)
    expectNear(loader.lastCall.request.fovDeg, 9.15, 1e-9, '9,15°')
  })

  it('hidden_p15_layer_gesture: przy innym obiekcie (RA 200°, Dec 40°) gest bez pobrań, po nim 1 pobranie 2,0333°', async () => {
    const other = { raDeg: 200, decDeg: 40 }
    const loader = new FakeLoader()
    const layer = createPhotoLayer(loader)
    layer.setFrame(at(FIT_1x1, other), false)
    await loader.finish(image('alasky'))
    layer.setFrame(at(2.5, other), true)
    layer.setFrame(at(FIT_1x1 / 1.5, other), true)
    expect(loader.calls).toHaveLength(1)
    layer.setFrame(at(FIT_1x1 / 1.5, other), false)
    expect(loader.calls).toHaveLength(2)
    expect(loader.lastCall.request.center).toEqual({ raDeg: 200, decDeg: 40 })
    expectNear(loader.lastCall.request.fovDeg, FIT_1x1 / 1.5, 1e-6, 'pole')
  })
})

describe('Ukryte: zakładka', () => {
  it(
    'hidden_p2_tab_esprit: Esprit: start 9,02°, „+” → 6,01°, drugi „+” → granica i „+” nieaktywny; ramka w skali',
    async () => {
      fakeClock()
      const tab = await startTab(mocks.loaders, { profileId: ESPRIT_ID })
      expect(readoutText(tab.r)).toBe('Pole widoku: 9,02°')
      click(tab.r, '+')
      expect(readoutText(tab.r)).toBe('Pole widoku: 6,01°')
      expectCorners(panelCorners(tab.r), expectedCorners(profile(ESPRIT_ID), framing(M42_CENTER), 9.02 / 1.5))
      click(tab.r, '+')
      expect(readoutText(tab.r)).toBe('Pole widoku: 5,41°')
      expect(isDisabled(zoomButton(tab.r, '+'))).toBe(true)
    },
    TIMEOUT,
  )

  it(
    'hidden_p15_tab_wheel_out: dwa ząbki +100 px w odstępie 200 ms → po 300 ms ciszy 1 pobranie 6,8625°',
    async () => {
      fakeClock()
      const tab = await startTab(mocks.loaders)
      wheel(tab, 100)
      advance(tab, 200)
      wheel(tab, 100)
      advance(tab, 200)
      expect(tab.loader.calls).toHaveLength(1)
      advance(tab, 200)
      expect(tab.loader.calls).toHaveLength(2)
      expectNear(tab.loader.lastCall.request.fovDeg, 6.8625, 1e-4, 'pole')
    },
    TIMEOUT,
  )

  it(
    'hidden_p8_tab_pinch_values: szczypanie 160 → 200 px → 2,44°; po oderwaniu 1 pobranie 2,44°',
    async () => {
      fakeClock()
      const tab = await startTab(mocks.loaders)
      pointer(tab, 'down', { id: 1, x: 420, y: 400 })
      pointer(tab, 'down', { id: 2, x: 580, y: 400 })
      pointer(tab, 'move', { id: 2, x: 620, y: 400 })
      expect(readoutText(tab.r)).toBe('Pole widoku: 2,44°')
      expect(tab.loader.calls).toHaveLength(1)
      pointer(tab, 'up', { id: 1, x: 420, y: 400 })
      pointer(tab, 'up', { id: 2, x: 620, y: 400 })
      expect(tab.loader.calls).toHaveLength(2)
      expectNear(tab.loader.lastCall.request.fovDeg, 2.44, 1e-4, 'pole')
    },
    TIMEOUT,
  )
})
