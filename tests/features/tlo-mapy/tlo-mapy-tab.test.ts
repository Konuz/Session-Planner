// Testy zakładki Kadr dla „tlo-mapy” (spec: .autoloop/features/tlo-mapy/spec.md): wczytanie gwiazd w efekcie (P18),
// zakładka bez gwiazd w trakcie wczytywania i po błędzie (P16) oraz Red Mode (P17).
//
// Jak testowane: zakładka działa w rendererze haków z tests/features/zoom-kadru/hookRenderer.ts (efekty się wykonują,
// bez DOM), a render bez efektów to `renderToStaticMarkup`. Podmienione są: lista obiektów (`useFeaturedObjects`,
// „Klasyki”), pobieranie zdjęć (`createSkyImageLoader` → `FakeLoader` z zoom-kadru) i `loadStarCatalog`
// (`src/data/starCatalog.ts`), który zwraca indeks z kilku gwiazd podanych w teście (bez pliku `stars.v1.bin`).
// `starsInField` z `src/services/stars.ts` jest prawdziwe, ale owinięte, żeby test widział środek i promień zapytania.
//
// Promień zapytania: „połowa przekątnej widoku” = pole widoku · √2 / 2. Przy polu ok. 3° rzut TAN daje to samo
// z dokładnością 0,0004°, więc test przyjmuje ±0,01°.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { zoomBounds } from '../../../src/features/framing/framingModel'
import { skyToCutout } from '../../../src/services/framing'
import { buildStarIndex, type Star, type StarIndex } from '../../../src/services/stars'
import type { EquipmentProfile, Framing } from '../../../src/types'
import { DEMO_PROFILES } from '../../../src/data/demo'
import type { FakeLoader } from '../zoom-kadru/helpers'
import { HookRenderer, ancestorsOf, descendantsOf, textOf, type HostElement } from '../zoom-kadru/hookRenderer'
import { M42, MemoryStorage } from '../zoom-kadru/tabHarness'
import { cutout, expectNear, star } from './helpers'

type StarMode = { kind: 'resolve'; index: StarIndex } | { kind: 'reject' } | { kind: 'pending' }

const mocks = vi.hoisted(() => {
  const mode: { kind: string; index?: unknown } = { kind: 'pending' }
  const fieldCalls: { center: { raDeg: number; decDeg: number }; radiusDeg: number }[] = []
  return { loaders: [] as FakeLoader[], mode, loadCalls: 0, fieldCalls }
})

vi.mock('../../../src/features/night/useFeaturedObjects', async () => {
  const { KLASYKI } = await import('../zoom-kadru/tabHarness')
  return { useFeaturedObjects: () => ({ featured: { status: 'ready', objects: [...KLASYKI], catalog: KLASYKI }, retry: () => undefined }) }
})

vi.mock('../../../src/services/skyImage/loader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/skyImage/loader')>()
  const { FakeLoader: Loader } = await import('../zoom-kadru/helpers')
  return {
    ...actual,
    createSkyImageLoader: () => {
      const loader = new Loader()
      mocks.loaders.push(loader)
      return loader
    },
  }
})

vi.mock('../../../src/data/starCatalog', () => ({
  loadStarCatalog: () => {
    mocks.loadCalls += 1
    if (mocks.mode.kind === 'resolve') return Promise.resolve(mocks.mode.index)
    if (mocks.mode.kind === 'reject') return Promise.reject(new Error('Nie udało się wczytać katalogu gwiazd (HTTP 404)'))
    return new Promise(() => undefined)
  },
}))

vi.mock('../../../src/services/stars', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/stars')>()
  return {
    ...actual,
    starsInField: (index: StarIndex, center: { raDeg: number; decDeg: number }, radiusDeg: number) => {
      mocks.fieldCalls.push({ center: { ...center }, radiusDeg })
      return actual.starsInField(index, center, radiusDeg)
    },
  }
})

const TIMEOUT = 60_000

function demoProfile(id: string): EquipmentProfile {
  const found = DEMO_PROFILES.find((profile) => profile.id === id)
  if (!found) throw new Error(`Brak profilu ${id}`)
  return structuredClone(found)
}

const MY_SET_ID = 'demo-moj-zestaw'
const ESPRIT_ID = 'demo-esprit100-asi6200mm'

function frameAt(raDeg: number, decDeg: number): Framing {
  return { centerRaDeg: raDeg, centerDecDeg: decDeg, paDeg: 0, mosaic: { cols: 1, rows: 1, overlapPct: 20 } }
}

const M42_FRAME = frameAt(M42.raDeg, M42.decDeg)

interface TabOptions {
  frame?: Framing
  profileId?: string
  redMode?: boolean
}

async function prepareStore(options: TabOptions) {
  vi.stubGlobal('localStorage', new MemoryStorage())
  vi.resetModules()
  const { usePlannerStore } = await import('../../../src/state/plannerStore')
  const { FramingTab } = await import('../../../src/features/framing/FramingTab')
  usePlannerStore.setState({ locationsReady: true, redMode: options.redMode ?? false, activeProfileId: options.profileId ?? MY_SET_ID })
  usePlannerStore.getState().setTab('framing')
  usePlannerStore.getState().selectObject(M42.uid)
  usePlannerStore.getState().updateFraming(M42.uid, options.frame ?? M42_FRAME)
  return FramingTab
}

async function settle(times = 30): Promise<void> {
  for (let i = 0; i < times; i += 1) await Promise.resolve()
}

/** Zakładka w rendererze haków; po wczytaniu gwiazd (obietnica z atrapy) przerysowana. */
async function mountTab(mode: StarMode, options: TabOptions = {}): Promise<HookRenderer> {
  mocks.mode = mode
  const FramingTab = await prepareStore(options)
  const r = new HookRenderer(() => createElement(FramingTab)).mount()
  await settle()
  r.flush()
  await settle()
  r.flush()
  return r
}

function viewSvg(r: HookRenderer): HostElement {
  const svgs = r.hosts().filter((host) => host.tag === 'svg' && host.props.viewBox === '0 0 1000 1000')
  expect(svgs, 'jeden svg widoku').toHaveLength(1)
  return svgs[0]
}

function group(svg: HostElement, role: string): HostElement | undefined {
  const groups = descendantsOf(svg).filter((host) => host.props['data-role'] === role)
  expect(groups.length, `najwyżej jedna grupa data-role="${role}"`).toBeLessThanOrEqual(1)
  return groups[0]
}

const circles = (svg: HostElement) => descendantsOf(svg).filter((host) => host.tag === 'circle')

const fovOf = (profileId: string, frame: Framing) => zoomBounds(demoProfile(profileId), frame).fitDeg

afterEach(() => {
  mocks.loadCalls = 0
  mocks.fieldCalls = []
  mocks.mode = { kind: 'pending' }
  vi.unstubAllGlobals()
})

describe('tlo-mapy: zakładka Kadr', () => {
  it(
    'test_p18_render_zakladki_nie_pobiera_pliku_gwiazd',
    async () => {
      const fetchSpy = vi.fn(() => new Promise(() => undefined))
      const FramingTab = await prepareStore({})
      vi.stubGlobal('fetch', fetchSpy)
      mocks.mode = { kind: 'resolve', index: buildStarIndex([star(M42.raDeg, M42.decDeg, 5)]) }
      const markup = renderToStaticMarkup(createElement(FramingTab))
      expect(mocks.loadCalls, 'render bez efektów nie woła loadStarCatalog').toBe(0)
      expect(fetchSpy, 'render nie woła fetch').not.toHaveBeenCalled()
      expect(markup, 'siatka już w pierwszym renderze').toContain('data-role="grid"')
      const start = markup.indexOf('viewBox="0 0 1000 1000"')
      expect(start, 'svg widoku').toBeGreaterThanOrEqual(0)
      const view = markup.slice(start, markup.indexOf('</svg>', start))
      expect(view, 'siatka w svg widoku').toContain('data-role="grid"')
      expect(view, 'bez kropek gwiazd przed wczytaniem').not.toMatch(/<circle/)
    },
    TIMEOUT,
  )

  it(
    'test_p18_zakladka_prosi_o_gwiazdy_wokol_srodka_w_promieniu_polowy_przekatnej',
    async () => {
      const index = buildStarIndex([star(M42.raDeg, M42.decDeg, 5)])
      await mountTab({ kind: 'resolve', index })
      expect(mocks.loadCalls, 'wczytanie katalogu gwiazd w efekcie').toBeGreaterThanOrEqual(1)
      const call = mocks.fieldCalls.at(-1)
      expect(call, 'zakładka woła starsInField').toBeTruthy()
      expectNear(call!.center.raDeg, M42.raDeg, 1e-6, 'środek RA')
      expectNear(call!.center.decDeg, M42.decDeg, 1e-6, 'środek Dec')
      const fov = fovOf(MY_SET_ID, M42_FRAME)
      expectNear(call!.radiusDeg, (fov * Math.SQRT2) / 2, 0.01, `promień przy polu ${fov.toFixed(3)}°`)
    },
    TIMEOUT,
  )

  it(
    'test_p18_promien_i_srodek_zaleza_od_kadru_i_profilu',
    async () => {
      const frame = frameAt(84.2, -4.9)
      await mountTab({ kind: 'resolve', index: buildStarIndex([star(84.2, -4.9, 5)]) }, { frame, profileId: ESPRIT_ID })
      const call = mocks.fieldCalls.at(-1)
      expect(call, 'zakładka woła starsInField').toBeTruthy()
      expectNear(call!.center.raDeg, 84.2, 1e-6, 'środek RA')
      expectNear(call!.center.decDeg, -4.9, 1e-6, 'środek Dec')
      const fov = fovOf(ESPRIT_ID, frame)
      expect(Math.abs(fov - fovOf(MY_SET_ID, frame)), 'inny profil = inne pole widoku').toBeGreaterThan(0.05)
      expectNear(call!.radiusDeg, (fov * Math.SQRT2) / 2, 0.01, `promień przy polu ${fov.toFixed(3)}°`)
    },
    TIMEOUT,
  )

  it(
    'test_p18_wczytane_gwiazdy_sa_kropkami_w_widoku',
    async () => {
      const input: Star[] = [
        star(M42.raDeg, M42.decDeg, 5),
        star(M42.raDeg, M42.decDeg + 0.5, 8),
        star(M42.raDeg, M42.decDeg + 1.8, 2), // w promieniu zapytania, ale nad górnym brzegiem widoku
      ]
      const r = await mountTab({ kind: 'resolve', index: buildStarIndex(input) })
      const svg = viewSvg(r)
      const dots = circles(svg)
      expect(dots, 'dwie gwiazdy w widoku').toHaveLength(2)
      const fov = fovOf(MY_SET_ID, M42_FRAME)
      const cut = cutout(M42.raDeg, M42.decDeg, fov)
      const expected = [input[1], input[0]].map((s, i) => ({ ...skyToCutout(cut, s), r: [2.2, 4][i] }))
      expected.forEach((p, i) => {
        expectNear(Number(dots[i].props.cx), p.x, 1, `kropka ${i + 1} cx`)
        expectNear(Number(dots[i].props.cy), p.y, 1, `kropka ${i + 1} cy`)
        expectNear(Number(dots[i].props.r), p.r, 0.02, `kropka ${i + 1} r`)
      })
      const stars = group(svg, 'stars')
      expect(stars, 'grupa gwiazd').toBeTruthy()
      expect(dots.every((dot) => ancestorsOf(dot).includes(stars!)), 'kropki w grupie data-role="stars"').toBe(true)
    },
    TIMEOUT,
  )

  it(
    'test_p16_zakladka_w_trakcie_wczytywania_gwiazd_sama_siatka_bez_komunikatu',
    async () => {
      const r = await mountTab({ kind: 'pending' })
      expect(mocks.loadCalls).toBeGreaterThanOrEqual(1)
      const svg = viewSvg(r)
      expect(group(svg, 'grid'), 'siatka').toBeTruthy()
      expect(descendantsOf(group(svg, 'grid')!).some((host) => host.tag === 'text'), 'opisy siatki').toBe(true)
      expect(circles(svg), 'bez kropek').toHaveLength(0)
      expect(textOf(r.root), 'bez komunikatu').not.toMatch(/gwiazd/i)
      expect(descendantsOf(svg).some((host) => host.props['data-panel'] !== undefined), 'ramka zostaje').toBe(true)
    },
    TIMEOUT,
  )

  it(
    'test_p16_zakladka_po_bledzie_wczytania_gwiazd_sama_siatka_bez_komunikatu',
    async () => {
      const r = await mountTab({ kind: 'reject' })
      expect(mocks.loadCalls).toBeGreaterThanOrEqual(1)
      const svg = viewSvg(r)
      expect(group(svg, 'grid'), 'siatka').toBeTruthy()
      expect(circles(svg), 'bez kropek').toHaveLength(0)
      expect(textOf(r.root), 'bez komunikatu').not.toMatch(/gwiazd|HTTP 404/i)
      expect(descendantsOf(svg).some((host) => host.props['data-panel'] !== undefined), 'ramka zostaje').toBe(true)
      expect(textOf(r.root), 'reszta zakładki działa').toContain('Pole widoku')
    },
    TIMEOUT,
  )

  it(
    'test_p17_red_mode_tlo_pod_filtrem_red_only',
    async () => {
      const r = await mountTab({ kind: 'resolve', index: buildStarIndex([star(M42.raDeg, M42.decDeg, 5)]) }, { redMode: true })
      const svg = viewSvg(r)
      const filtered = (host: HostElement) =>
        [host, ...ancestorsOf(host)].some((element) => {
          const style = element.props.style
          if (typeof style === 'string') return style.replace(/\s/g, '').includes('filter:url(#red-only)')
          return typeof style === 'object' && style !== null && String((style as Record<string, unknown>).filter).replace(/\s/g, '') === 'url(#red-only)'
        })
      const grid = group(svg, 'grid')
      const stars = group(svg, 'stars')
      expect(grid && stars, 'siatka i gwiazdy').toBeTruthy()
      expect(filtered(grid!), 'siatka pod filtrem red-only').toBe(true)
      expect(filtered(stars!), 'gwiazdy pod filtrem red-only').toBe(true)
      expect(circles(svg), 'kropka gwiazdy').toHaveLength(1)
    },
    TIMEOUT,
  )
})
