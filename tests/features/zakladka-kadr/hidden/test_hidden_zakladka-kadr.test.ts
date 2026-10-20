// Ukryte testy funkcji „zakladka-kadr”: te same reguły co w testach jawnych, sprawdzone innymi wartościami.
// Wartości oczekiwane spoza P1…P25 pochodzą z reguł spec i wcześniejszych funkcji (podane przy testach):
// T1/T2 (FOV, skala, próbkowanie), `geometria-kadru` (rzut i odwrotny rzut wycinka, narożniki paneli, OAG P16),
// `zrodla-zdjec` (pole wycinka), format odczytu środka z P3 (4 miejsca po przecinku).
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dragFraming, readOverlapInput, readPaInput } from '../../../../src/features/framing/framingModel'
import { FramingView } from '../../../../src/features/framing/FramingView'
import { cutoutToSky, mosaicSizeDeg } from '../../../../src/services/framing'
import { DEFAULT_PLANNING_SETTINGS } from '../../../../src/services/planningSettings'
import type { EquipmentProfile, Framing } from '../../../../src/types'
import {
  ESPRIT_ID,
  M13,
  M31,
  M42,
  NEWTON200_ID,
  P23_OAG,
  REDCAT_ID,
  box,
  choose,
  drawing,
  expectBox,
  expectCenter,
  expectCorners,
  expectFinite,
  expectPoint,
  expectedPanels,
  fieldNumber,
  framing,
  isObjectSelect,
  isRange,
  mosaicSelect,
  mySet,
  readyHook,
  redcat,
  startApp,
  tabFields,
  tabFovDeg,
  topEdgeMid,
  viewCutout,
  visibleText,
  withOag,
  type App,
  type FeaturedHookResult,
} from '../helpers'

const hook = vi.hoisted(() => ({ result: null as FeaturedHookResult | null }))

vi.mock('../../../../src/features/night/useFeaturedObjects', () => ({
  useFeaturedObjects: () => {
    if (!hook.result) throw new Error('Brak wyniku atrapy haka useFeaturedObjects')
    return hook.result
  },
}))

beforeEach(() => {
  hook.result = readyHook()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function kadr(uid: string | null = null): Promise<App> {
  const app = await startApp()
  if (uid !== null) app.store.getState().selectObject(uid)
  app.store.getState().setTab('framing')
  return app
}

function expectTabPanels(markup: string, profile: EquipmentProfile, frame: Framing): void {
  const view = drawing(markup)
  const expected = expectedPanels(profile, frame, tabFovDeg(profile, frame))
  expect(view.panels, 'liczba paneli').toHaveLength(expected.length)
  view.panels.forEach((panel, i) => expectCorners(panel.corners, expected[i], `panel ${i + 1}`))
}

function renderView(fovDeg: number, profile: EquipmentProfile, frame: Framing) {
  return drawing(renderToStaticMarkup(createElement(FramingView, { fovDeg, profile, framing: frame, mapObjects: [] })))
}

const f3 = (value: number) => value.toFixed(3).replace('.', ',')

describe('hidden: przesuwanie tła (model)', () => {
  it('hidden P8/P9: M 31, pole 3,05°, ekran 2000 px, 200 px w prawo i 120 px w górę → punkt pod (450; 530) widoku', () => {
    // 200 px na ekranie 2000 px = 100 jednostek; 120 px = 60 jednostek. Wynik z `cutoutToSky` (geometria-kadru P17).
    const start = framing({ ra: M31.raDeg, dec: M31.decDeg, pa: 123.5, cols: 3, rows: 2, overlap: 15 })
    const result = dragFraming({ framing: start, pointer: { x: 1000, y: 700 } }, { x: 1200, y: 580 }, 3.05, 2000)
    const expected = cutoutToSky(viewCutout(start, 3.05), { x: 400, y: 560 })
    expectCenter(result, expected.raDeg, expected.decDeg)
    expect(result.centerRaDeg).toBeGreaterThan(M31.raDeg)
    expect(result.centerDecDeg).toBeLessThan(M31.decDeg)
    expect(result.paDeg).toBe(123.5)
    expect(result.mosaic).toEqual(start.mosaic)
  })

  it('hidden P11: przeciąganie liczone od punktu startu wskaźnika, nie od (0; 0)', () => {
    const start = framing({ ra: 200, dec: 30 })
    const a = dragFraming({ framing: start, pointer: { x: 700, y: 100 } }, { x: 640, y: 180 }, 2, 1000)
    const expected = cutoutToSky(viewCutout(start, 2), { x: 560, y: 420 })
    expectCenter(a, expected.raDeg, expected.decDeg)
  })

  it('hidden P13: RA przechodzi przez 0° → wynik w [0, 360)', () => {
    const start = framing({ ra: 0.05, dec: 10 })
    const result = dragFraming({ framing: start, pointer: { x: 0, y: 0 } }, { x: -100, y: 0 }, 2, 1000)
    expectFinite(result)
    expect(result.centerRaDeg).toBeGreaterThan(359)
    expect(result.centerRaDeg).toBeLessThan(360)
  })

  it('hidden P13: biegun południowy, Dec −89,95°, 400 jednostek w górę → Dec ≥ −90°, bez NaN, PA bez zmian', () => {
    const start = framing({ ra: 100, dec: -89.95, pa: 210 })
    const result = dragFraming({ framing: start, pointer: { x: 500, y: 500 } }, { x: 500, y: 100 }, 2, 1000)
    expectFinite(result)
    expect(result.centerDecDeg).toBeGreaterThanOrEqual(-90)
    expect(result.centerRaDeg).toBeGreaterThanOrEqual(0)
    expect(result.centerRaDeg).toBeLessThan(360)
    expect(result.paDeg).toBe(210)
  })
})

describe('hidden: pola PA i zakładki (model)', () => {
  it.each([
    ['45.75', 45.75],
    ['12,5', 12.5],
    ['-90', 270],
    ['720', 0],
    [' 7 ', 7],
  ])('hidden P15: „%s” → PA %s°', (text, expected) => {
    const result = readPaInput(text, 123)
    expect(result.error).toBeNull()
    expect(result.paDeg).toBeCloseTo(expected, 9)
  })

  it.each([['   '], ['3x'], ['1,2,3']])('hidden P15: „%s” → błąd, PA zostaje 123°', (text) => {
    expect(readPaInput(text, 123)).toEqual({ paDeg: 123, error: 'PA: wpisz liczbę' })
  })

  it.each([
    ['12,5', 12.5],
    ['100', 30],
    ['0', 10],
    ['30', 30],
    ['10', 10],
  ])('hidden P16: „%s” → zakładka %s proc.', (text, expected) => {
    const result = readOverlapInput(text, 25)
    expect(result.error).toBeNull()
    expect(result.overlapPct).toBeCloseTo(expected, 9)
  })

  it.each([[''], ['dwadzieścia']])('hidden P16: „%s” → błąd, zakładka zostaje 25 proc.', (text) => {
    expect(readOverlapInput(text, 25)).toEqual({ overlapPct: 25, error: 'Zakładka: wpisz liczbę' })
  })
})

describe('hidden: dane kadru dla innych profili i seeingu', () => {
  it('hidden P17: seeing 3,0″ → „Mój zestaw” ma próbkowanie „idealne” (T2: idealnie przy 2,59–3,87″)', async () => {
    const app = await kadr()
    app.store.setState({ planningSettings: { ...DEFAULT_PLANNING_SETTINGS, seeingArcsec: 3 } })
    const text = visibleText(app.render(app.framingTab()))
    expect(text).toContain('idealne')
    expect(text).not.toContain('podpróbkowanie')
  })

  it('hidden P17: Esprit + ASI6200MM (mono) → „3,750° × 2,502°”, „1,410″/px”, podpróbkowanie, bez uwagi OSC (T1, T2)', async () => {
    const app = await kadr()
    app.store.getState().selectProfile(ESPRIT_ID)
    const text = visibleText(app.render(app.framingTab()))
    expect(text).toContain('3,750° × 2,502°')
    expect(text).toContain('1,410″/px')
    expect(text).toContain('podpróbkowanie')
    expect(text).not.toContain('OSC')
  })

  it('hidden P17: Newton 200 + ASI533MM → „0,648° × 0,648° (38,9′ × 38,9′)”, „0,776″/px”, nadpróbkowanie (T1, T2)', async () => {
    const app = await kadr()
    app.store.getState().selectProfile(NEWTON200_ID)
    const text = visibleText(app.render(app.framingTab()))
    expect(text).toContain('0,648° × 0,648° (38,9′ × 38,9′)')
    expect(text).toContain('0,776″/px')
    expect(text).toContain('nadpróbkowanie')
  })

  it('hidden P17: RedCat 1×3, zakładka 25% → wiersz „Mozaika:” z wymiarem z `mosaicSizeDeg` (3 miejsca)', async () => {
    const app = await kadr(M42.uid)
    app.store.getState().selectProfile(REDCAT_ID)
    const frame = framing({ ra: M42.raDeg, dec: M42.decDeg, rows: 3, overlap: 25 })
    app.store.getState().updateFraming(M42.uid, frame)
    const size = mosaicSizeDeg(redcat(), frame)
    expect(visibleText(app.render(app.framingTab()))).toContain(`Mozaika: ${f3(size.widthDeg)}° × ${f3(size.heightDeg)}°`)
  })
})

describe('hidden: odczyt środka i zakładka', () => {
  it('hidden P3: wybór M 13 → „RA 250,4235°, Dec 36,4613°”', async () => {
    const app = await kadr()
    choose(app.capture(app.framingTab(), isObjectSelect).props, M13.uid)
    expect(app.store.getState().objectUid).toBe(M13.uid)
    expect(visibleText(app.render(app.framingTab()))).toContain('RA 250,4235°, Dec 36,4613°')
  })

  it('hidden P15: suwak na 45,5 → ramka obrócona jak przy PA 45,5°', async () => {
    const app = await kadr(M13.uid)
    choose(app.capture(app.framingTab(), isRange).props, '45.5')
    const markup = app.render(app.framingTab())
    expect(fieldNumber(tabFields(markup).range.value)).toBe(45.5)
    expectTabPanels(markup, mySet(), framing({ ra: M13.raDeg, dec: M13.decDeg, pa: 45.5 }))
  })

  it('hidden P16: wiersze 3 → trzy panele w zakładce, pole widoku z mozaiki 1×3', async () => {
    const app = await kadr(M13.uid)
    choose(app.capture(app.framingTab(), mosaicSelect(1)).props, '3')
    const markup = app.render(app.framingTab())
    expect([tabFields(markup).cols, tabFields(markup).rows]).toEqual(['1', '3'])
    expectTabPanels(markup, mySet(), framing({ ra: M13.raDeg, dec: M13.decDeg, rows: 3 }))
  })

  it('hidden P4: zmiana obiektu z M 13 na M 42 zachowuje PA 200° i mozaikę 3×2 z zakładką 15%', async () => {
    const app = await kadr(M13.uid)
    const kept = framing({ ra: 251, dec: 37, pa: 200, cols: 3, rows: 2, overlap: 15 })
    app.store.getState().updateFraming(M13.uid, kept)
    choose(app.capture(app.framingTab(), isObjectSelect).props, M42.uid)
    const markup = app.render(app.framingTab())
    expect(visibleText(markup)).toContain('RA 83,8187°, Dec −5,3897°')
    const fields = tabFields(markup)
    expect(fieldNumber(fields.range.value)).toBe(200)
    expect([fields.cols, fields.rows]).toEqual(['3', '2'])
    expect(fieldNumber(fields.overlapField.value)).toBe(15)
    expectTabPanels(markup, mySet(), { ...kept, centerRaDeg: M42.raDeg, centerDecDeg: M42.decDeg })
  })
})

describe('hidden: rysunek w widoku 2°', () => {
  it.each([
    { pa: 180, x: 500, y: 770 },
    { pa: 270, x: 770, y: 500 },
  ])('hidden P21: PA $pa° → środek górnej krawędzi w ($x; $y)', ({ pa, x, y }) => {
    const view = renderView(2, mySet(), framing({ pa }))
    expectPoint(topEdgeMid(view.panels[0].corners), x, y, 'środek górnej krawędzi')
  })

  it('hidden P22: mozaika 1×2 → panele „1” (górny) i „2” (dolny) zgodnie z `mosaicPanels`', () => {
    const frame = framing({ rows: 2 })
    const view = renderView(2, mySet(), frame)
    const expected = expectedPanels(mySet(), frame, 2)
    expect(view.panels.map((panel) => panel.number)).toEqual(['1', '2'])
    view.panels.forEach((panel, i) => expectCorners(panel.corners, expected[i], `panel ${i + 1}`))
    expect(box(view.panels[0].corners).yMin).toBeLessThan(box(view.panels[1].corners).yMin)
  })

  it('hidden P23: mozaika 2×1 z OAG → dwa pryzmaty x 93–475 i 525–907, oba y 22,6–213,5 (geometria-kadru P16)', () => {
    const view = renderView(2, withOag(mySet(), P23_OAG), framing({ cols: 2 }))
    expect(view.oag).toHaveLength(2)
    const boxes = view.oag.map(box).sort((a, b) => a.xMin - b.xMin)
    expectBox(boxes[0], [93.0, 475.0], [22.6, 213.5], 'pryzmat panelu 1')
    expectBox(boxes[1], [525.0, 907.0], [22.6, 213.5], 'pryzmat panelu 2')
  })

  it('hidden P23: OAG pod kątem 90° → pryzmat na prawo od matrycy: x 786,5–977,4, y 309–691 (geometria-kadru P15)', () => {
    const view = renderView(2, withOag(mySet(), { ...P23_OAG, angleDeg: 90 }), framing())
    expect(view.oag).toHaveLength(1)
    expectBox(box(view.oag[0]), [786.5, 977.4], [309.0, 691.0], 'pryzmat')
  })

  it('hidden P20: pole widoku 4° → ramka „Mojego zestawu” o połowę mniejsza (rzut TAN z `geometria-kadru`)', () => {
    const frame = framing({ ra: 300, dec: 45 })
    const view = renderView(4, mySet(), frame)
    expectCorners(view.panels[0].corners, expectedPanels(mySet(), frame, 4)[0])
    expectBox(box(view.panels[0].corners), [364.9, 635.1], [364.9, 635.1], 'ramka w polu 4°')
  })
})

describe('hidden: Red Mode w samej zakładce', () => {
  it('hidden P25: przełączenie Red Mode w sklepie włącza i wyłącza filtr na kontenerze widoku', async () => {
    const app = await kadr(M13.uid)
    const hasFilter = (markup: string) => /filter:\s*url\(#red-only\)/.test(markup)
    expect(hasFilter(app.render(app.framingTab()))).toBe(false)
    app.store.getState().toggleRedMode()
    expect(hasFilter(app.render(app.framingTab()))).toBe(true)
    app.store.getState().toggleRedMode()
    expect(hasFilter(app.render(app.framingTab()))).toBe(false)
  })
})
