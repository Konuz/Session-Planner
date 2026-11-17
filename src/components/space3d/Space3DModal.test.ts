import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { NO_DISTANCE } from '../../lib/distance'
import type { PhotoProject } from '../../lib/photo'
import type { PhotoSession } from './photoSession'

const sessionState = vi.hoisted(() => ({
  restoring: true,
  project: null as PhotoProject | null,
}))

vi.stubGlobal('document', { body: {} })
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom')
  return { ...actual, createPortal: (node: unknown) => node }
})
vi.mock('../../state/data', () => ({
  useSelected: () => ({ i: 1, id: 'M 81', namePl: 'Galaktyka Bodego', type: 'G', distLy: 12e6, raDeg: 148.888, decDeg: 69.065, con: 'UMa' }),
  useCatalog: () => ({ catalog: null, error: null }),
}))
vi.mock('../Space3D', () => ({ default: () => null }))
vi.mock('./photoSession', () => ({
  usePhotoSession: () => ({
    project: sessionState.project,
    restoring: sessionState.restoring,
    busy: false,
    editing: false,
    error: '',
    saveError: '',
    ready: true,
    activeId: null,
    change: vi.fn(),
    getCurrentProject: () => sessionState.project,
    updateCut: vi.fn(),
    retryCatalogObjects: vi.fn(),
    catalogSearch: null,
    upload: vi.fn(),
    cancelUpload: vi.fn(),
    clearError: vi.fn(),
    retrySave: vi.fn(),
    setEditing: vi.fn(),
    setActiveId: vi.fn(),
  } satisfies PhotoSession),
  useGaiaStars: () => ({ stars: { status: 'idle' as const }, retry: vi.fn() }),
  useCutDistances: () => {},
  useRegressor: () => new Map(),
}))

import Space3DModal, { scaleChoiceAction, shouldSkipDive } from './Space3DModal'
import { PhotoCutEditor, PhotoFlatView, PhotoImport } from './PhotoEditing'

it('nie pokazuje okna z tymczasową skalą, dopóki sesja nie odczyta zapisanego zdjęcia', () => {
  sessionState.restoring = true
  sessionState.project = null
  expect(renderToString(createElement(Space3DModal))).toBe('')
})

it('we Wszechświecie lokalnym używa tego samego paska przycisków co w Drodze Mlecznej, bez osobnej „Osi odległości”', () => {
  sessionState.restoring = false
  sessionState.project = {
    version: 3, id: 'galaxies', name: 'Galaktyki', image: 'galaxies.jpg', width: 1600, height: 900, createdAt: 0, stars: null,
    cuts: [
      { ...NO_DISTANCE, id: 'M 81', type: 'G', raDeg: 148.888, decDeg: 69.065, x: 400, y: 300, radius: 70, enabled: true, distLy: 12e6, distanceOrigin: 'user' },
    ],
    astrometry: { raDeg: 149, decDeg: 69, rmsPx: 1, matches: 20, edgeMatches: 5, edgeRmsPx: 1, totalMs: 1, wcs: null },
  }
  const html = renderToString(createElement(Space3DModal))
  expect(html).toContain('Wszechświat lokalny · odległości w skali logarytmicznej')
  expect(html).not.toContain('M 81 · Galaktyka Bodego')
  expect(html).toContain('Galaktyki')
  expect(html).not.toContain('Oś odległości')
  expect(html).toContain('Rozłóż zdjęcie 3D')
  expect(html).toContain('Edytuj wycinki')
  expect(html).toContain('Zmień zdjęcie')
  expect(html).toContain('Usuń')
  // Przycisk „Zmień zdjęcie” występuje wyłącznie w dolnym pasku zdjęcia (nie w lewym górnym rogu).
  expect(html.match(/Zmień zdjęcie/g)).toHaveLength(1)
})

it('w Drodze Mlecznej również pokazuje okno obiektów zdjęcia (OBIEKTY ZDJĘCIA)', () => {
  sessionState.restoring = false
  sessionState.project = {
    version: 3, id: 'milkyway', name: 'Droga Mleczna - test', image: 'mw.jpg', width: 1600, height: 900, createdAt: 0, stars: null,
    cuts: [
      { ...NO_DISTANCE, id: 'vdB 155', type: 'RN', raDeg: 344.2, decDeg: 62.1, x: 400, y: 300, radius: 70, enabled: true, distLy: 2602, distanceOrigin: 'user' },
    ],
    astrometry: { raDeg: 344.2, decDeg: 62.1, rmsPx: 1, matches: 20, edgeMatches: 5, edgeRmsPx: 1, totalMs: 1, wcs: null },
  }
  const plain = renderToString(createElement(Space3DModal)).replace(/<!-- -->/g, '')
  expect(plain).toContain('Droga Mleczna · skala liniowa, 1 j. = 1000 lś')
  expect(plain).toContain('Droga Mleczna - test')
  expect(plain).not.toContain('M 81 · Galaktyka Bodego')
  expect(plain).not.toContain('Odległość ≈')
  expect(plain).toContain('aria-label="Obiekty zdjęcia w przestrzeni"')
  expect(plain).toContain('OBIEKTY ZDJĘCIA')
  expect(plain).toContain('1 obiekt w przestrzeni')
  expect(plain).toContain('2602 lś')
})

it('bez załadowanego zdjęcia pokazuje w nagłówku wybrany obiekt i jego odległość', () => {
  sessionState.restoring = false
  sessionState.project = null
  const plain = renderToString(createElement(Space3DModal)).replace(/<!-- -->/g, '')
  expect(plain).toContain('M 81 · Galaktyka Bodego')
  expect(plain).toContain('Odległość ≈ 12 mln lś')
})

it('w edytorze pokazuje powód zakończenia próby przy wybranym wycinku', () => {
  const cut = { ...NO_DISTANCE, id: 'LBN 522', type: 'EN' as const, raDeg: 341.7, decDeg: 62.3, x: 10, y: 20, radius: 40, enabled: true }
  const project: PhotoProject = {
    version: 3, id: 'test-regresora', name: 'Test regresora', image: 'test.png', width: 100, height: 100, createdAt: 0,
    stars: null, cuts: [cut], astrometry: { raDeg: 341.7, decDeg: 62.3, rmsPx: 1, matches: 20, edgeMatches: 5, edgeRmsPx: 1, totalMs: 1, wcs: null },
  }
  const session = { project, activeId: cut.id } as PhotoSession
  const results = new Map([[cut.id, { key: 'test', status: 'done' as const, result: { status: 'abstain' as const, reason: 'FIELD_POPULATION_KINEMATICS' } }]])
  const html = renderToString(createElement(PhotoCutEditor, { session, regressorJobs: results }))
  expect(html).toContain('zbyt duży rozrzut prędkości grupy gwiazd')
})

it('na zdjęciu w edycji zaznacza wszystkie obiekty rozwiązania, także bez odległości; mniejsze okręgi na wierzchu', () => {
  const base = { ...NO_DISTANCE, raDeg: 92.4, decDeg: 20.5, enabled: true }
  const project: PhotoProject = {
    version: 3, id: 'ngc2174', name: 'NGC2174_3.png', image: 'ngc2174.png', width: 1000, height: 1000, createdAt: 0, stars: null,
    cuts: [
      { ...base, id: 'IC 2159', type: 'EN', x: 600, y: 380, radius: 10 },
      { ...base, id: 'NGC 2174', type: 'EN', x: 500, y: 520, radius: 300 },
      { ...base, id: 'NGC 2175', type: 'CN', x: 500, y: 480, radius: 60, distLy: 5500, uncertaintyLy: 300 },
      { ...base, id: 'Sh2-252', type: 'EN', x: 510, y: 470, radius: 400 },
    ],
    astrometry: { raDeg: 92.4, decDeg: 20.5, rmsPx: 1, matches: 20, edgeMatches: 5, edgeRmsPx: 1, totalMs: 1, wcs: null },
  }
  const html = renderToString(createElement(PhotoFlatView, { session: { project, activeId: null } as PhotoSession }))
  const labels = [...html.matchAll(/class="photo-label[^"]*">([^<]+)</g)].map((m) => m[1])
  expect(labels).toEqual(['Sh2-252', 'NGC 2174', 'NGC 2175', 'IC 2159'])
  // Okręgi tylko do zaznaczania (klik w obwódkę): bez przesuwania i uchwytu promienia, także u wybranego obiektu.
  const selected = renderToString(createElement(PhotoFlatView, { session: { project, activeId: 'Sh2-252' } as PhotoSession }))
  for (const markup of [html, selected]) {
    expect(markup).not.toMatch(/photo-draggable|photo-resize/)
    expect(markup.match(/class="photo-circle"/g)).toHaveLength(4)
  }
})

it('po dezaktywacji wczytanego zdjęcia pokazuje w lewym górnym rogu „Rozłóż zdjęcie” i przycisk powrotu do zdjęcia', () => {
  const project: PhotoProject = {
    version: 3, id: 'ngc2174', name: 'NGC2174_3.png', image: 'ngc2174.png', width: 1000, height: 1000, createdAt: 0, stars: null,
    cuts: [], astrometry: { raDeg: 92.4, decDeg: 20.5, rmsPx: 1, matches: 20, edgeMatches: 5, edgeRmsPx: 1, totalMs: 1, wcs: null },
  }
  const hidden = renderToString(createElement(PhotoImport, {
    session: { project, busy: false, ready: true } as PhotoSession,
    inputRef: { current: null },
    showButton: false,
    onActivate: vi.fn(),
  }))
  expect(hidden).not.toContain('Rozłóż zdjęcie')
  expect(hidden).not.toContain('Pokaż zdjęcie:')

  const deactivated = renderToString(createElement(PhotoImport, {
    session: { project, busy: false, ready: true } as PhotoSession,
    inputRef: { current: null },
    showButton: true,
    onActivate: vi.fn(),
  })).replace(/<!-- -->/g, '')
  expect(deactivated).toContain('Rozłóż zdjęcie')
  expect(deactivated).toContain('Pokaż zdjęcie: NGC2174_3.png')
  expect(deactivated).not.toContain('Zmień zdjęcie')
})

it('z rozłożonego zdjęcia nurkuje bezpośrednio do wybranej skali', () => {
  expect(scaleChoiceAction('photo', 'universe', 'galaxy')).toEqual({ type: 'dive-out', scale: 'galaxy' })
  expect(scaleChoiceAction('photo', 'galaxy', 'universe')).toEqual({ type: 'dive-out', scale: 'universe' })
  expect(scaleChoiceAction('photo', 'galaxy', 'galaxy')).toEqual({ type: 'dive-out', scale: 'galaxy' })
})

it('kliknięcie skali podczas trwającego nurkowania zachowuje płynne zawrócenie lub dokończenie powrotu', () => {
  expect(scaleChoiceAction('in', 'galaxy', 'galaxy')).toEqual({ type: 'reverse-or-cancel', then: null })
  expect(scaleChoiceAction('in', 'universe', 'universe')).toEqual({ type: 'reverse-or-cancel', then: null })
  expect(scaleChoiceAction('in', 'galaxy', 'universe')).toEqual({ type: 'reverse-or-cancel', then: 'universe' })
  expect(scaleChoiceAction('in', 'universe', 'galaxy')).toEqual({ type: 'reverse-or-cancel', then: 'galaxy' })
  expect(scaleChoiceAction('out', 'galaxy', 'universe')).toEqual({ type: 'after-return', then: 'universe' })
  expect(scaleChoiceAction('out', 'galaxy', 'galaxy')).toEqual({ type: 'after-return', then: null })
  expect(scaleChoiceAction('scale', 'galaxy', 'universe')).toEqual({ type: 'set-scale', scale: 'universe' })
})

it('przerwanie przejścia (skip) ignoruje kliknięcia w pasek narzędzi, nagłówek, przyciski oraz klawisz Esc', () => {
  const closest = (matched: string) => ({ closest: (sel: string) => sel.includes(matched) ? {} : null })
  expect(shouldSkipDive({ key: 'Escape' })).toBe(false)
  expect(shouldSkipDive({ key: ' ' })).toBe(true)
  expect(shouldSkipDive({ target: closest('.obs-toolbar') })).toBe(false)
  expect(shouldSkipDive({ target: closest('.obs-header') })).toBe(false)
  expect(shouldSkipDive({ target: closest('button') })).toBe(false)
  expect(shouldSkipDive({ target: { closest: () => null } })).toBe(true)
})
