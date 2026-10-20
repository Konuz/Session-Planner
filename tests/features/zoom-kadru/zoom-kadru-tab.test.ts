// Testy zakładki Kadr dla „zoom-kadru” (spec: .autoloop/features/zoom-kadru/spec.md): przyciski, odczyt pola,
// kółko (nasłuch niepasywny), szczypanie, przerwa 300 ms, nowe pobrania i reset zoomu.
//
// Jak testowane: zakładka działa w rendererze haków (hookRenderer.ts, bez DOM): stan Reacta zostaje między renderami,
// efekty się wykonują, a zdarzenia wywołują prawdziwe obsługi. Podmienione są tylko: lista obiektów
// (`useFeaturedObjects`, „Klasyki”) i pobieranie zdjęć (`createSkyImageLoader` → `FakeLoader`, liczy pobrania).
// Prawdziwe są sklep, `FramingTab`, `FramingView`, `useSkyImage` i warstwa zdjęcia, więc liczba pobrań nie zależy od
// tego, jak zakładka przekazuje pole widoku do haka. Zegary są podmienione (`vi.useFakeTimers`).
//
// Zakładka startuje z M 42 (środek kadru = M 42), profilem „Mój zestaw”, PA 0°, mozaiką 1×1. Przeciąganie i szczypanie
// to zdarzenia wskaźnika (dotyk) na svg widoku; widok ma na ekranie 1000 px szerokości (1 px = 1 jednostka).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cutoutToSky } from '../../../src/services/framing'
import { skyImageCacheKey } from '../../../src/services/skyImage/sources'
import {
  ESPRIT_ID,
  FIT_1x1,
  FIT_2x1,
  M42_CENTER,
  expectCorners,
  expectFov,
  expectNear,
  expectedCorners,
  framing,
  image,
  minFov,
  mySet,
  type FakeLoader,
} from './helpers'
import {
  M31,
  advance,
  ancestorsOf,
  center,
  click,
  descendantsOf,
  fakeClock,
  isDisabled,
  panelCorners,
  photoRectOf,
  pointer,
  readout,
  readoutText,
  startTab,
  viewSvg,
  wheel,
  wheelHosts,
  zoomButton,
  type Tab,
} from './tabHarness'
import { textOf, type HostElement } from './hookRenderer'

const mocks = vi.hoisted(() => ({ loaders: [] as FakeLoader[] }))

vi.mock('../../../src/features/night/useFeaturedObjects', async () => {
  const { KLASYKI } = await import('./tabHarness')
  return { useFeaturedObjects: () => ({ featured: { status: 'ready', objects: [...KLASYKI], catalog: KLASYKI }, retry: () => undefined }) }
})

vi.mock('../../../src/services/skyImage/loader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/skyImage/loader')>()
  const { FakeLoader: Loader } = await import('./helpers')
  return {
    ...actual,
    createSkyImageLoader: () => {
      const loader = new Loader()
      mocks.loaders.push(loader)
      return loader
    },
  }
})

const TIMEOUT = 60_000
const MIN = minFov(mySet())
const PLUS1 = FIT_1x1 / 1.5
const MINUS1 = FIT_1x1 * 1.5

beforeEach(() => {
  fakeClock()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const tabWith = (options: Parameters<typeof startTab>[1] = {}) => startTab(mocks.loaders, options)

/** Pierwsze pobranie zakończone obrazem alasky (stare zdjęcie na widoku). */
async function withPhoto(tab: Tab): Promise<void> {
  await tab.loader.finish(image('alasky'))
  tab.r.flush()
}

const lastFov = (tab: Tab) => tab.loader.lastCall.request.fovDeg

function choose(tab: Tab, host: HostElement, value: string): void {
  const onChange = host.props.onChange
  if (typeof onChange !== 'function') throw new Error('Pole nie ma obsługi zmiany (onChange)')
  const target = { value, valueAsNumber: Number(value) }
  tab.r.act(() => (onChange as (event: unknown) => void)({ target, currentTarget: target, preventDefault: () => undefined }))
}

function optionLabels(select: HostElement): string[] {
  return descendantsOf(select)
    .filter((host) => host.tag === 'option')
    .map((option) => textOf(option))
}

function optionValues(select: HostElement): string[] {
  return descendantsOf(select)
    .filter((host) => host.tag === 'option')
    .map((option) => String(option.props.value))
}

function layerSelect(tab: Tab): HostElement {
  const found = tab.r.hosts().filter((host) => host.tag === 'select' && optionLabels(host).includes('DSS2 czerwony'))
  if (found.length !== 1) throw new Error(`Oczekiwano jednej listy warstw, jest ${found.length}`)
  return found[0]
}

/** Szczypanie: dwa palce w (500 ∓ d0/2; 500), potem rozsunięte do odległości d1; bez oderwania. */
function pinch(tab: Tab, d0: number, d1: number): void {
  pointer(tab, 'down', { id: 1, x: 500 - d0 / 2, y: 500 })
  pointer(tab, 'down', { id: 2, x: 500 + d0 / 2, y: 500 })
  pointer(tab, 'move', { id: 1, x: 500 - d1 / 2, y: 500 })
  pointer(tab, 'move', { id: 2, x: 500 + d1 / 2, y: 500 })
}

function release(tab: Tab, d1: number): void {
  pointer(tab, 'up', { id: 2, x: 500 + d1 / 2, y: 500 })
  pointer(tab, 'up', { id: 1, x: 500 - d1 / 2, y: 500 })
}

function expectCenter(tab: Tab, expected: { raDeg: number; decDeg: number }, what = 'środek kadru'): void {
  expectNear(center(tab).raDeg, expected.raDeg, 1e-6, `${what} RA`)
  expectNear(center(tab).decDeg, expected.decDeg, 1e-6, `${what} Dec`)
}

// =====================================================================================================

describe('Przyciski i granice', () => {
  it(
    'test_p1_tab_start: odczyt „Pole widoku: 3,05°”, trzy przyciski, ramka i pobranie jak dotąd',
    async () => {
      const tab = await tabWith()
      expect(readoutText(tab.r)).toBe('Pole widoku: 3,05°')
      expect(isDisabled(zoomButton(tab.r, '+'))).toBe(false)
      expect(isDisabled(zoomButton(tab.r, '−'))).toBe(false)
      expect(zoomButton(tab.r, 'Dopasuj')).toBeDefined()
      expectCorners(panelCorners(tab.r), expectedCorners(mySet(), framing(M42_CENTER), FIT_1x1))
      expect(tab.loader.calls).toHaveLength(1)
      expect(lastFov(tab)).toBe(FIT_1x1)
    },
    TIMEOUT,
  )

  it(
    'test_p2_tab_plus: „+” → „2,03°”, drugie „+” → ok. 1,833° („1,83°”) i „+” nieaktywny',
    async () => {
      const tab = await tabWith()
      click(tab.r, '+')
      expect(readoutText(tab.r)).toBe('Pole widoku: 2,03°')
      expect(isDisabled(zoomButton(tab.r, '+'))).toBe(false)
      click(tab.r, '+')
      expect(readoutText(tab.r)).toBe('Pole widoku: 1,83°')
      expect(isDisabled(zoomButton(tab.r, '+')), '„+” przy granicy').toBe(true)
      expect(isDisabled(zoomButton(tab.r, '−'))).toBe(false)
      expectNear(lastFov(tab), MIN, 1e-4, 'pobranie przy granicy')
    },
    TIMEOUT,
  )

  it(
    'test_p3_tab_minus: siedem „−” → „52,11°”; ósme → 60° i „−” nieaktywny',
    async () => {
      const tab = await tabWith()
      for (let i = 0; i < 7; i += 1) click(tab.r, '−')
      expect(readoutText(tab.r)).toBe('Pole widoku: 52,11°')
      expect(isDisabled(zoomButton(tab.r, '−'))).toBe(false)
      click(tab.r, '−')
      expectNear(readout(tab.r), 60, 1e-9, 'odczyt')
      expect(isDisabled(zoomButton(tab.r, '−')), '„−” przy 60°').toBe(true)
      expect(isDisabled(zoomButton(tab.r, '+'))).toBe(false)
      expectNear(lastFov(tab), 60, 1e-6, 'pobranie przy 60°')
    },
    TIMEOUT,
  )

  it(
    'test_p4_tab_fit: po serii „+”/„−” „Dopasuj” → 3,05°; przy 2×1 → 4,45°',
    async () => {
      const tab = await tabWith()
      click(tab.r, '+')
      click(tab.r, '−')
      click(tab.r, '−')
      click(tab.r, '−')
      expect(readout(tab.r)).not.toBe(3.05)
      click(tab.r, 'Dopasuj')
      expect(readoutText(tab.r)).toBe('Pole widoku: 3,05°')
      const mosaic = await tabWith({ frame: framing(M42_CENTER, 2, 1) })
      expect(readoutText(mosaic.r)).toBe('Pole widoku: 4,45°')
      click(mosaic.r, '+')
      click(mosaic.r, '+')
      expect(readoutText(mosaic.r)).toBe('Pole widoku: 1,98°')
      click(mosaic.r, 'Dopasuj')
      expect(readoutText(mosaic.r)).toBe('Pole widoku: 4,45°')
    },
    TIMEOUT,
  )

  it(
    'test_p5_tab_center_fixed: środek, PA i mozaika bez zmian po „+”, „−”, „Dopasuj”, kółku w rogu i szczypaniu',
    async () => {
      const tab = await tabWith({ frame: framing(M42_CENTER, 2, 1, 30) })
      const before = structuredClone(tab.store.getState().framing)
      click(tab.r, '+')
      click(tab.r, '−')
      click(tab.r, '−')
      click(tab.r, 'Dopasuj')
      wheel(tab, -100, 0, { x: 0, y: 0 })
      wheel(tab, 100, 0, { x: 999, y: 999 })
      advance(tab, 400)
      pinch(tab, 200, 300)
      release(tab, 300)
      const after = tab.store.getState().framing
      expectNear(after!.centerRaDeg, before!.centerRaDeg, 1e-9, 'RA')
      expectNear(after!.centerDecDeg, before!.centerDecDeg, 1e-9, 'Dec')
      expect(after!.paDeg).toBe(30)
      expect(after!.mosaic).toEqual(before!.mosaic)
      expect(readout(tab.r)).not.toBe(FIT_2x1)
    },
    TIMEOUT,
  )
})

describe('Kółko myszy i szczypanie', () => {
  it(
    'test_p6_tab_wheel: −100 px → 2,03°; +100 px → 4,575°; −3 linie = −100 px; −50 px → 2,49°',
    async () => {
      const tab = await tabWith()
      wheel(tab, -100)
      expect(readoutText(tab.r)).toBe('Pole widoku: 2,03°')
      click(tab.r, 'Dopasuj')
      wheel(tab, 100)
      expectCorners(panelCorners(tab.r), expectedCorners(mySet(), framing(M42_CENTER), MINUS1), 1, 'ramka przy 4,575°')
      advance(tab, 400)
      expectNear(lastFov(tab), MINUS1, 1e-4, 'pobranie po kółku')
      click(tab.r, 'Dopasuj')
      wheel(tab, -3, 1)
      expect(readoutText(tab.r)).toBe('Pole widoku: 2,03°')
      click(tab.r, 'Dopasuj')
      wheel(tab, -50)
      expect(readoutText(tab.r)).toBe('Pole widoku: 2,49°')
    },
    TIMEOUT,
  )

  it(
    'test_p7_tab_wheel_listener: nasłuch `wheel` niepasywny na widoku; kółko nad widokiem wywołuje preventDefault',
    async () => {
      const tab = await tabWith()
      const hosts = wheelHosts(tab.r)
      expect(hosts.length, 'element z nasłuchem wheel').toBeGreaterThanOrEqual(1)
      const svg = viewSvg(tab.r)
      for (const host of hosts) {
        expect(host === svg || ancestorsOf(svg).includes(host), 'nasłuch na svg widoku albo jego przodku').toBe(true)
        expect(descendantsOf(host).some((child) => child.tag === 'select'), 'nasłuch nie obejmuje list zakładki').toBe(false)
        for (const listener of host.node.listeners.filter((entry) => entry.type === 'wheel')) {
          expect((listener.options as { passive?: unknown } | undefined)?.passive, 'addEventListener(…, { passive: false })').toBe(false)
        }
      }
      const event = wheel(tab, -100)
      expect(event.defaultPrevented, 'preventDefault: strona się nie przewija').toBe(true)
    },
    TIMEOUT,
  )

  it(
    'test_p8_tab_pinch: 200 → 300 px → 2,03°, po oderwaniu 1 pobranie 2,0333°; 200 → 100 px → 6,1°',
    async () => {
      const tab = await tabWith()
      pinch(tab, 200, 300)
      expect(readoutText(tab.r)).toBe('Pole widoku: 2,03°')
      expect(tab.loader.calls, 'w trakcie szczypania').toHaveLength(1)
      release(tab, 300)
      expect(tab.loader.calls).toHaveLength(2)
      expectNear(lastFov(tab), PLUS1, 1e-4, 'pobranie po szczypaniu')
      click(tab.r, 'Dopasuj')
      pinch(tab, 200, 100)
      expectFov(readout(tab.r), 6.1, 'zsunięcie')
      release(tab, 100)
      expectNear(lastFov(tab), 6.1, 1e-4, 'pobranie po zsunięciu')
      click(tab.r, 'Dopasuj')
      pinch(tab, 100, 400)
      expect(readoutText(tab.r), 'przycięte do granicy').toBe('Pole widoku: 1,83°')
      release(tab, 400)
    },
    TIMEOUT,
  )

  it(
    'test_p9_tab_second_finger: drugi palec w trakcie przeciągania → przesuwanie ustaje, zmienia się tylko pole',
    async () => {
      const tab = await tabWith()
      pointer(tab, 'down', { id: 1, x: 500, y: 500 })
      pointer(tab, 'move', { id: 1, x: 600, y: 500 })
      const touched = center(tab)
      expect(touched.raDeg, 'przeciąganie jednym palcem działa').toBeGreaterThan(M42_CENTER.raDeg + 0.1)
      pointer(tab, 'down', { id: 2, x: 400, y: 500 })
      pointer(tab, 'move', { id: 1, x: 650, y: 500 })
      pointer(tab, 'move', { id: 2, x: 350, y: 500 })
      expectCenter(tab, touched, 'środek z chwili dotknięcia drugim palcem')
      expect(readoutText(tab.r), 'szczypanie 200 → 300 px').toBe('Pole widoku: 2,03°')
      pointer(tab, 'up', { id: 2, x: 350, y: 500 })
      pointer(tab, 'up', { id: 1, x: 650, y: 500 })
      pointer(tab, 'move', { id: 1, x: 900, y: 700 })
      pointer(tab, 'move', { id: 2, x: 100, y: 300 })
      expectCenter(tab, touched, 'po oderwaniu palców')
    },
    TIMEOUT,
  )
})

describe('Przeciąganie przy zmienionym polu', () => {
  it(
    'test_p10_tab_drag: pole 4,575°, 100 jednostek w prawo → niebo pod pikselem (400; 500) widoku 4,575°',
    async () => {
      const tab = await tabWith()
      click(tab.r, '−')
      pointer(tab, 'down', { id: 1, x: 300, y: 300 })
      pointer(tab, 'move', { id: 1, x: 400, y: 300 })
      pointer(tab, 'up', { id: 1, x: 400, y: 300 })
      const expected = cutoutToSky({ center: M42_CENTER, fovDeg: MINUS1, widthPx: 1000, heightPx: 1000 }, { x: 400, y: 500 })
      expectNear(center(tab).raDeg, expected.raDeg, 1e-4, 'RA')
      expectNear(center(tab).decDeg, expected.decDeg, 1e-4, 'Dec')
      expectNear(center(tab).raDeg, 84.28, 0.005, 'RA ok. 84,28°')
    },
    TIMEOUT,
  )

  it(
    'test_p11_tab_frame: „+” → ramka w skali widoku 2,0333° (rzut ±1), ok. 1,5 raza większa niż przy „Dopasuj”',
    async () => {
      const tab = await tabWith()
      const fit = panelCorners(tab.r)
      click(tab.r, '+')
      const zoomed = panelCorners(tab.r)
      expectCorners(zoomed, expectedCorners(mySet(), framing(M42_CENTER), PLUS1))
      const span = (points: { x: number }[]) => Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x))
      expectNear(span(zoomed) / span(fit), 1.5, 0.01, 'stosunek')
    },
    TIMEOUT,
  )
})

describe('Nowy wycinek po zoomie', () => {
  it(
    'test_p12_tab: „+” → 1 pobranie 2,0333°, stare zdjęcie rośnie do ok. −250…1250; drugie „+” → pobranie ok. 1,833°',
    async () => {
      const tab = await tabWith()
      await withPhoto(tab)
      expect(photoRectOf(tab.r)).not.toBeNull()
      click(tab.r, '+')
      expect(tab.loader.calls).toHaveLength(2)
      expectNear(lastFov(tab), PLUS1, 1e-4, 'pole')
      const rect = photoRectOf(tab.r)!
      expectNear(rect.x, -250, 1, 'x min')
      expectNear(rect.x + rect.width, 1250, 1, 'x max')
      expectNear(rect.y, -250, 1, 'y min')
      expectNear(rect.y + rect.height, 1250, 1, 'y max')
      click(tab.r, '+')
      expect(tab.loader.calls).toHaveLength(3)
      expectNear(lastFov(tab), MIN, 1e-4, 'pole przy granicy')
    },
    TIMEOUT,
  )

  it(
    'test_p13_tab: „+” przy minimum, „Dopasuj” przy 3,05° i szczypanie kończące się na tym samym polu → 0 pobrań',
    async () => {
      const tab = await tabWith()
      click(tab.r, 'Dopasuj')
      expect(tab.loader.calls).toHaveLength(1)
      pointer(tab, 'down', { id: 1, x: 400, y: 500 })
      pointer(tab, 'down', { id: 2, x: 600, y: 500 })
      pointer(tab, 'move', { id: 2, x: 700, y: 500 })
      pointer(tab, 'move', { id: 2, x: 600, y: 500 })
      pointer(tab, 'up', { id: 2, x: 600, y: 500 })
      pointer(tab, 'up', { id: 1, x: 400, y: 500 })
      expect(readoutText(tab.r)).toBe('Pole widoku: 3,05°')
      expect(tab.loader.calls, 'szczypanie z powrotem do 3,05°').toHaveLength(1)
      click(tab.r, '+')
      click(tab.r, '+')
      const count = tab.loader.calls.length
      click(tab.r, '+')
      expect(tab.loader.calls, '„+” przy minimum').toHaveLength(count)
    },
    TIMEOUT,
  )

  it(
    'test_p14_tab: „−” → pobranie 4,575°; „+” → pobranie 3,05° z kluczem ze startu; „Dopasuj” → 0',
    async () => {
      const tab = await tabWith()
      await withPhoto(tab)
      click(tab.r, '−')
      expect(tab.loader.calls).toHaveLength(2)
      expectNear(lastFov(tab), MINUS1, 1e-4, '„−”')
      click(tab.r, '+')
      expect(tab.loader.calls).toHaveLength(3)
      expect(skyImageCacheKey('alaskybis', tab.loader.lastCall.request)).toBe(skyImageCacheKey('alaskybis', tab.loader.calls[0].request))
      click(tab.r, 'Dopasuj')
      expect(tab.loader.calls).toHaveLength(3)
    },
    TIMEOUT,
  )

  it(
    'test_p15_tab: trzy ząbki co 100 ms → 0 pobrań w trakcie; po 300 ms ciszy 1 pobranie ok. 1,833°',
    async () => {
      const tab = await tabWith()
      wheel(tab, -100)
      advance(tab, 100)
      wheel(tab, -100)
      advance(tab, 100)
      wheel(tab, -100)
      expect(readoutText(tab.r)).toBe('Pole widoku: 1,83°')
      advance(tab, 250)
      expect(tab.loader.calls, 'przed 300 ms ciszy').toHaveLength(1)
      advance(tab, 100)
      expect(tab.loader.calls, 'po 300 ms ciszy').toHaveLength(2)
      expectNear(lastFov(tab), MIN, 1e-4, 'pole')
      advance(tab, 1000)
      expect(tab.loader.calls).toHaveLength(2)
    },
    TIMEOUT,
  )

  it(
    'test_p16_tab: lista warstw zależy od pola widoku; Hα, potem „+” → „DSS2 kolor” i 1 pobranie 2,0333° w tej warstwie',
    async () => {
      const tab = await tabWith()
      click(tab.r, '−')
      expect(optionValues(layerSelect(tab)), 'Hα przy 4,575°').toContain('halpha')
      click(tab.r, 'Dopasuj')
      choose(tab, layerSelect(tab), 'halpha')
      expect(tab.loader.lastCall.request.layerId).toBe('halpha')
      const count = tab.loader.calls.length
      click(tab.r, '+')
      expect(optionValues(layerSelect(tab)), 'bez Hα przy 2,0333°').not.toContain('halpha')
      expect(String(layerSelect(tab).props.value ?? layerSelect(tab).props.defaultValue)).toBe('dss2-color')
      expect(tab.loader.calls).toHaveLength(count + 1)
      expect(tab.loader.lastCall.request.layerId).toBe('dss2-color')
      expectNear(lastFov(tab), PLUS1, 1e-4, 'pole')
    },
    TIMEOUT,
  )

  it(
    'test_p17_tab: 2×1, „+” dwa razy → wycinek 1,9778°; nowe pobranie dopiero po przesunięciu o więcej niż ok. 0,494°',
    async () => {
      const tab = await tabWith({ frame: framing(M42_CENTER, 2, 1) })
      click(tab.r, '+')
      click(tab.r, '+')
      expect(tab.loader.calls).toHaveLength(3)
      expectFov(lastFov(tab), 1.9778, 'wycinek')
      // Przy polu 1,9778° 240 jednostek ≈ 0,475°, a 240 + 60 jednostek ≈ 0,593° od środka wycinka.
      pointer(tab, 'down', { id: 1, x: 500, y: 300 })
      pointer(tab, 'move', { id: 1, x: 500, y: 540 })
      expect(tab.loader.calls, 'w trakcie przeciągania').toHaveLength(3)
      pointer(tab, 'up', { id: 1, x: 500, y: 540 })
      expect(tab.loader.calls, 'puszczenie po ok. 0,475°').toHaveLength(3)
      pointer(tab, 'down', { id: 1, x: 500, y: 300 })
      pointer(tab, 'move', { id: 1, x: 500, y: 360 })
      pointer(tab, 'up', { id: 1, x: 500, y: 360 })
      expect(tab.loader.calls, 'puszczenie po ok. 0,593°').toHaveLength(4)
      expectFov(lastFov(tab), 1.9778, 'pole bez zmian')
    },
    TIMEOUT,
  )
})

describe('Co zeruje zoom', () => {
  it(
    'test_p19_tab_reset: PA, „Wyśrodkuj” i zmiana obiektu nie zmieniają pola; mozaika 2×1 → 4,45°; profil → jego „Dopasuj”',
    async () => {
      const tab = await tabWith()
      click(tab.r, '+')
      expect(readoutText(tab.r)).toBe('Pole widoku: 2,03°')
      const range = tab.r.hosts().find((host) => host.tag === 'input' && host.props.type === 'range')!
      choose(tab, range, '45')
      expect(tab.store.getState().framing?.paDeg).toBe(45)
      expect(readoutText(tab.r), 'po zmianie PA').toBe('Pole widoku: 2,03°')
      const centerButton = tab.r.hosts().find((host) => host.tag === 'button' && textOf(host).includes('Wyśrodkuj na obiekcie'))
      tab.r.fireReact(centerButton!, 'onClick', { type: 'click' })
      expect(readoutText(tab.r), 'po „Wyśrodkuj na obiekcie”').toBe('Pole widoku: 2,03°')
      const objectSelect = tab.r.hosts().find((host) => host.tag === 'select' && optionValues(host).includes(M31.uid))!
      choose(tab, objectSelect, M31.uid)
      expectNear(center(tab).raDeg, M31.raDeg, 1e-6, 'nowy obiekt')
      expect(readoutText(tab.r), 'po zmianie obiektu').toBe('Pole widoku: 2,03°')
      const cols = tab.r.hosts().filter((host) => host.tag === 'select' && optionValues(host).join(',') === '1,2,3,4,5')[0]
      choose(tab, cols, '2')
      expect(tab.store.getState().framing?.mosaic.cols).toBe(2)
      expect(readoutText(tab.r), 'mozaika 1×1 → 2×1').toBe('Pole widoku: 4,45°')
      click(tab.r, '+')
      expect(readoutText(tab.r)).toBe('Pole widoku: 2,97°')
      tab.r.act(() => tab.store.getState().selectProfile(ESPRIT_ID))
      expect(readoutText(tab.r), 'zmiana profilu → „Dopasuj” Esprit 2×1').toBe('Pole widoku: 14,39°')
    },
    TIMEOUT,
  )

  it(
    'test_p20_tab_tokens: przyciski zoomu bez kolorów wpisanych na sztywno (także w Red Mode)',
    async () => {
      const tab = await tabWith({ redMode: true })
      const HARD = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(?:text|bg|border|fill|stroke|ring)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b/i
      for (const name of ['+', '−', 'Dopasuj'] as const) {
        const button = zoomButton(tab.r, name)
        for (const host of [button, ...descendantsOf(button)]) {
          const values = [host.props.className, host.props.fill, host.props.stroke, host.props.color, JSON.stringify(host.props.style ?? '')]
          for (const value of values) {
            if (typeof value !== 'string') continue
            expect(HARD.test(value), `${name}: <${host.tag}> ${value}`).toBe(false)
          }
        }
      }
    },
    TIMEOUT,
  )
})
