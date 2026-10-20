// Testy funkcji „zakladka-kadr” (spec: .autoloop/features/zakladka-kadr/spec.md).
// Nazwy funkcji, akcji i znaczników wybrał test-author (spec ich nie podaje) – opis w helpers.ts i w zaślepkach
// src/features/framing/{framingModel.ts, FramingView.tsx, FramingTab.tsx}.
//
// Jak testowane:
// - Hak `useFeaturedObjects` jest podmieniony (w Node efekty się nie wykonują): domyślnie „gotowe” z „Klasykami”
//   i całym katalogiem, w P7 „wczytywanie” i „błąd”.
// - Przeciąganie (P8–P13) liczy czysty model `dragFraming`; render statyczny nie przenosi stanu wskaźnika między
//   renderami, więc obsługa zdarzeń wskaźnika w samej zakładce nie jest sprawdzana (luka opisana w raporcie).
//   Zakładka czyta i zapisuje kadr w sklepie (`framing`, `framingObjectUid`, `updateFraming`), więc skutki przesunięcia
//   widać w zakładce po zapisie kadru akcją sklepu.
// - Odczyt pól PA i zakładki (P15, P16) sprawdza model (`readPaInput`, `readOverlapInput`); kiedy pole zatwierdza
//   wpis i gdzie pokazuje komunikat, spec nie określa (luka opisana w raporcie). Suwak i listy mozaiki są sprawdzane
//   w zakładce przez sondę (`onChange`).
// - Wartości oczekiwane z reguł wcześniejszych funkcji: narożniki ramki w widoku zakładki = rzut narożników
//   `mosaicPanels` (`geometria-kadru`) na wycinek o polu `cutoutFovDeg(mosaicSizeDeg(...))` (`zrodla-zdjec`, P19);
//   „Mój zestaw” 1×1 → pole 3,05°, 2×1 → 4,45°.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nightObjectOptions } from '../../../src/data/featuredObjects'
import { profilePreview, profileToForm } from '../../../src/features/equipment/profileForm'
import { fallbackMap } from '../../../src/features/framing/fallbackMap'
import { dragFraming, readOverlapInput, readPaInput } from '../../../src/features/framing/framingModel'
import { FramingView } from '../../../src/features/framing/FramingView'
import { formatDesignation } from '../../../src/services/catalog/records'
import type { EquipmentProfile, Framing } from '../../../src/types'
import {
  CATALOG,
  DRAG_CENTER,
  FULL_CATALOG_TIMEOUT,
  KLASYKI,
  M13,
  M31,
  M42,
  MY_SET_ID,
  MemoryStorage,
  P23_OAG,
  POLYGONS,
  REDCAT_ID,
  ancestors,
  box,
  buttonWithText,
  catalogObject,
  choose,
  click,
  drawing,
  elementsOf,
  expectBox,
  expectCenter,
  expectCorners,
  expectFinite,
  expectPoint,
  expectedPanels,
  fieldNumber,
  framing,
  isDashed,
  isObjectSelect,
  isRange,
  mosaicSelect,
  mySet,
  objectSelect,
  parseMarkup,
  readyHook,
  redcat,
  savedEntry,
  savedPreferences,
  shapePoints,
  startApp,
  tabFields,
  tabFovDeg,
  textOf,
  topEdgeMid,
  uids,
  viewCutout,
  viewSvg,
  visibleText,
  withOag,
  type App,
  type FeaturedHookResult,
} from './helpers'

const hook = vi.hoisted(() => ({ result: null as FeaturedHookResult | null }))

vi.mock('../../../src/features/night/useFeaturedObjects', () => ({
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

/** Teksty P17 dla „Mojego zestawu” (T1, T2). */
const MY_SET_FOV = '1,080° × 1,080° (64,8′ × 64,8′)'
const MY_SET_SCALE = '1,293″/px'
/** Uwaga OSC z `formularz-profilu` P14 (ten sam tekst co w podglądzie profilu). */
const OSC_NOTE = profilePreview(profileToForm(redcat()), 2.5).oscNote ?? 'brak uwagi OSC'

/** Odczyt środka z P3: „RA 83,8187°, Dec −5,3897°” (4 miejsca, przecinek, znak minus U+2212). */
const M42_READOUT = 'RA 83,8187°, Dec −5,3897°'
const M31_READOUT = 'RA 10,6848°, Dec 41,2691°'

/** Kadr M 42 przesunięty (P4, P5, P14): środek RA 84°, Dec −5°, PA 30°, mozaika 2×1. */
const SHIFTED = framing({ ra: 84, dec: -5, pa: 30, cols: 2 })
const SHIFTED_READOUT = 'RA 84,0000°, Dec −5,0000°'

/** Kadr z środkiem w obiekcie i ustawieniami `rest` (PA, mozaika) – oczekiwany po przejściu na obiekt. */
function onObject(object: { raDeg: number; decDeg: number }, rest: Framing): Framing {
  return { ...rest, centerRaDeg: object.raDeg, centerDecDeg: object.decDeg }
}

/** Aplikacja na zakładce Kadr; `uid` = wybrany obiekt (null = nikt nie wybrał). */
async function kadr(uid: string | null = null, storage: MemoryStorage = new MemoryStorage()): Promise<App> {
  const app = await startApp(storage)
  if (uid !== null) app.store.getState().selectObject(uid)
  app.store.getState().setTab('framing')
  return app
}

/** Kadr M 42 przesunięty (SHIFTED), zapisany w sklepie przy M 42. */
async function shiftedOnM42(): Promise<App> {
  const app = await kadr(M42.uid)
  app.store.getState().updateFraming(M42.uid, SHIFTED)
  return app
}

function renderView(props: { fovDeg: number; profile: EquipmentProfile; framing: Framing; mapObjects?: ReturnType<typeof fallbackMap> }) {
  return drawing(renderToStaticMarkup(createElement(FramingView, { mapObjects: [], ...props })))
}

const VIEW_2 = 2

/** Narożniki ramki z P20 / T24 (widok 2°, „Mój zestaw”, PA 0°). */
const T24_CORNERS = [
  { x: 230, y: 230 },
  { x: 770, y: 230 },
  { x: 770, y: 770 },
  { x: 230, y: 770 },
]

/** Sprawdzenie, że zakładka rysuje panele kadru `frame` dla profilu `profile` w polu wycinka z `zrodla-zdjec`. */
function expectTabPanels(markup: string, profile: EquipmentProfile, frame: Framing): void {
  const view = drawing(markup)
  const expected = expectedPanels(profile, frame, tabFovDeg(profile, frame))
  expect(view.panels, 'liczba paneli').toHaveLength(expected.length)
  view.panels.forEach((panel, i) => expectCorners(panel.corners, expected[i], `panel ${i + 1}`))
}

// ---------- Nawigacja i obiekt ----------

describe('P1 nawigacja', () => {
  it('test_p1_navigation_order: zakładki w kolejności Katalog, Noc, Kadr, Ustawienia', async () => {
    const app = await startApp()
    const buttons = elementsOf(parseMarkup(app.render(app.navBar()))).filter((element) => element.tag === 'button')
    expect(buttons.map((button) => textOf(button))).toEqual(['Katalog', 'Noc', 'Kadr', 'Ustawienia'])
  })

  it('test_p1_click_kadr: kliknięcie „Kadr” → zakładka Kadr (aria-current) i App pokazuje Kadr, bez Noc i Ustawień', async () => {
    const app = await startApp()
    click(app.capture(app.navBar(), buttonWithText('Kadr')).props)
    expect(app.store.getState().tab).toBe('framing')
    const current = elementsOf(parseMarkup(app.render(app.navBar())))
      .filter((element) => element.tag === 'button' && element.attrs['aria-current'] === 'page')
      .map((button) => textOf(button))
    expect(current).toEqual(['Kadr'])
    const text = visibleText(app.render(app.app()))
    expect(text).toContain(MY_SET_FOV)
    expect(text).toContain(M31_READOUT)
    expect(text).not.toContain('Podsumowanie nocy')
    expect(text).not.toContain('Wybrana lokalizacja jest aktywna w całej aplikacji')
  })

  it('test_p1_remembered: zakładka Kadr zostaje po ponownym uruchomieniu', async () => {
    const storage = new MemoryStorage()
    const first = await startApp(storage)
    first.store.getState().setTab('framing')
    const second = await startApp(storage)
    expect(second.store.getState().tab).toBe('framing')
    const text = visibleText(second.render(second.app()))
    expect(text).toContain(M31_READOUT)
    expect(text).not.toContain('Wybrana lokalizacja jest aktywna w całej aplikacji')
  })

  it('test_p1_saved_tab: zapis z zakładką „framing” i M 42 (wersja 1) → start na zakładce Kadr z M 42', async () => {
    const app = await startApp(savedPreferences(M42.uid, 'framing'))
    expect(app.store.getState().tab).toBe('framing')
    expect(visibleText(app.render(app.app()))).toContain(M42_READOUT)
  })
})

describe('P2 obiekt domyślny i lista obiektów', () => {
  it('test_p2_default_m31: nikt nie wybrał obiektu → środek M 31, zaznaczony M 31, lista = „Klasyki”', async () => {
    const app = await kadr()
    const markup = app.render(app.framingTab())
    expect(visibleText(markup)).toContain(M31_READOUT)
    const select = objectSelect(markup)
    expect(select.values).toEqual(uids(KLASYKI))
    expect(select.selected).toEqual(['M 31 (Andromeda Galaxy)'])
  })

  it('test_p2_same_list_as_night: obiekt spoza „Klasyki” (M 13) → ta sama lista co w Noc: M 13 i „Klasyki”', async () => {
    const app = await kadr(M13.uid)
    const kadrSelect = objectSelect(app.render(app.framingTab()))
    const nightSelect = objectSelect(app.render(app.nightTab()))
    expect(kadrSelect.values).toEqual(uids(nightObjectOptions(KLASYKI, M13)))
    expect(kadrSelect.values).toEqual(nightSelect.values)
    expect(kadrSelect.labels).toEqual(nightSelect.labels)
    expect(kadrSelect.selected).toEqual(['M 13 (Hercules Globular Cluster)'])
  })
})

describe('P3 wybór obiektu jest wspólny z Noc', () => {
  it('test_p3_choose_m42: wybór M 42 w Kadrze → środek „RA 83,8187°, Dec −5,3897°”, a Noc pokazuje M 42', async () => {
    const app = await kadr()
    choose(app.capture(app.framingTab(), isObjectSelect).props, M42.uid)
    expect(app.store.getState().objectUid).toBe(M42.uid)
    const markup = app.render(app.framingTab())
    expect(visibleText(markup)).toContain(M42_READOUT)
    expect(objectSelect(markup).selected).toEqual(['M 42 (Great Orion Nebula)'])
    app.store.getState().setTab('night')
    expect(objectSelect(app.render(app.nightTab())).selected).toEqual(['M 42 (Great Orion Nebula)'])
  })
})

describe('P4 zmiana obiektu w Kadrze', () => {
  it('test_p4_center_moves_pa_mosaic_stay: przesunięty kadr M 42 (PA 30°, 2×1), wybór M 31 → środek M 31, PA 30° i 2×1 zostają', async () => {
    const app = await shiftedOnM42()
    expect(visibleText(app.render(app.framingTab())), 'przesunięty środek przed zmianą obiektu').toContain(SHIFTED_READOUT)
    choose(app.capture(app.framingTab(), isObjectSelect).props, M31.uid)
    const markup = app.render(app.framingTab())
    expect(visibleText(markup)).toContain(M31_READOUT)
    const fields = tabFields(markup)
    expect(fieldNumber(fields.range.value)).toBe(30)
    expect([fields.cols, fields.rows]).toEqual(['2', '1'])
    expectTabPanels(markup, mySet(), onObject(M31, SHIFTED))
  })
})

describe('P5 zmiana obiektu w Noc', () => {
  it('test_p5_changed_in_night: przesunięty kadr M 42, w Noc wybór M 31, powrót → środek M 31 (PA i mozaika zostają)', async () => {
    const app = await shiftedOnM42()
    app.store.getState().setTab('night')
    choose(app.capture(app.nightTab(), isObjectSelect).props, M31.uid)
    app.store.getState().setTab('framing')
    const markup = app.render(app.framingTab())
    expect(visibleText(markup)).toContain(M31_READOUT)
    expect(visibleText(markup)).not.toContain(SHIFTED_READOUT)
    expect(fieldNumber(tabFields(markup).range.value)).toBe(30)
    expectTabPanels(markup, mySet(), onObject(M31, SHIFTED))
  })

  it('test_p5_unchanged_in_night: w Noc obiekt bez zmian → po powrocie środek, PA i mozaika jak zostawiono', async () => {
    const app = await shiftedOnM42()
    app.store.getState().setTab('night')
    expect(objectSelect(app.render(app.nightTab())).selected).toEqual(['M 42 (Great Orion Nebula)'])
    app.store.getState().setTab('framing')
    const markup = app.render(app.framingTab())
    expect(visibleText(markup)).toContain(SHIFTED_READOUT)
    const fields = tabFields(markup)
    expect(fieldNumber(fields.range.value)).toBe(30)
    expect([fields.cols, fields.rows]).toEqual(['2', '1'])
    expectTabPanels(markup, mySet(), SHIFTED)
  })
})

describe('P6 ponowne uruchomienie', () => {
  it('test_p6_restart_defaults: po restarcie środek obiektu, PA 0°, 1×1, zakładka 20%; zapisany tylko obiekt i zakładka', async () => {
    const storage = new MemoryStorage()
    const first = await kadr(M42.uid, storage)
    first.store.getState().updateFraming(M42.uid, framing({ ra: 84, dec: -5, pa: 30, cols: 2, rows: 2, overlap: 25 }))
    const saved = savedEntry(storage)
    expect(saved.version).toBe(1)
    expect(Object.keys(saved.state).sort()).toEqual(['activeLocationId', 'activeProfileId', 'objectUid', 'redMode', 'tab'])
    expect(saved.state.tab).toBe('framing')
    expect(saved.state.objectUid).toBe(M42.uid)

    const second = await startApp(storage)
    expect(second.store.getState().tab).toBe('framing')
    const markup = second.render(second.framingTab())
    expect(visibleText(markup)).toContain(M42_READOUT)
    const fields = tabFields(markup)
    expect(fieldNumber(fields.range.value)).toBe(0)
    expect(fieldNumber(fields.paField.value)).toBe(0)
    expect([fields.cols, fields.rows]).toEqual(['1', '1'])
    expect(fieldNumber(fields.overlapField.value)).toBe(20)
    expectTabPanels(markup, mySet(), framing({ ra: M42.raDeg, dec: M42.decDeg }))
  })
})

describe('P7 katalog się wczytuje albo nie wczytał', () => {
  it('test_p7_loading: „Wczytywanie katalogu…” i dane kadru z P17', async () => {
    hook.result = { featured: { status: 'loading' }, retry: () => undefined }
    const app = await kadr()
    const text = visibleText(app.render(app.framingTab()))
    expect(text).toContain('Wczytywanie katalogu…')
    expect(text).toContain(MY_SET_FOV)
    expect(text).toContain(MY_SET_SCALE)
    expect(text).toContain('podpróbkowanie')
  })

  it('test_p7_error: komunikat błędu, „Spróbuj ponownie” ponawia wczytanie, dane kadru widoczne', async () => {
    const retry = vi.fn()
    hook.result = { featured: { status: 'error', message: 'Nie udało się wczytać katalogu (HTTP 503)' }, retry }
    const app = await kadr()
    const probed = app.capture(app.framingTab(), buttonWithText('Spróbuj ponownie'))
    const text = visibleText(probed.markup)
    expect(text).toContain('HTTP 503')
    expect(text).toContain(MY_SET_FOV)
    expect(text).toContain(MY_SET_SCALE)
    click(probed.props)
    expect(retry).toHaveBeenCalledTimes(1)
  })
})

// ---------- Przesuwanie tła (model) ----------

/** Przeciągnięcie tła z P8–P13: widok 2°, ekran 1000 px (1 px = 1 jednostka), wskaźnik od (300; 300). */
function drag(dx: number, dy: number, start: Framing = framing({ ra: DRAG_CENTER.ra, dec: DRAG_CENTER.dec }), widthPx = 1000): Framing {
  return dragFraming({ framing: start, pointer: { x: 300, y: 300 } }, { x: 300 + dx, y: 300 + dy }, VIEW_2, widthPx)
}

describe('P8–P9 kierunki przesuwania [Z11]', () => {
  it('test_p8_drag_right_east: 100 jednostek w prawo → RA 84,023°, Dec −5,391°', () => {
    expectCenter(drag(100, 0), 84.023, -5.391)
  })

  it('test_p8_drag_left_west: 100 jednostek w lewo → RA 83,621°, Dec −5,391°', () => {
    expectCenter(drag(-100, 0), 83.621, -5.391)
  })

  it('test_p9_drag_down_north: 100 jednostek w dół → RA 83,822°, Dec −5,191°', () => {
    expectCenter(drag(0, 100), 83.822, -5.191)
  })

  it('test_p9_drag_up_south: 100 jednostek w górę → RA 83,822°, Dec −5,591°', () => {
    expectCenter(drag(0, -100), 83.822, -5.591)
  })
})

describe('P10 ramka stoi w miejscu', () => {
  it('test_p10_view_corners_same: widok 2° przed i po przeciągnięciu ma te same narożniki ramki', () => {
    const before = framing({ ra: DRAG_CENTER.ra, dec: DRAG_CENTER.dec })
    const after = drag(100, 0, before)
    for (const frame of [before, after]) {
      const view = renderView({ fovDeg: VIEW_2, profile: mySet(), framing: frame })
      expect(view.panels).toHaveLength(1)
      expectCorners(view.panels[0].corners, T24_CORNERS)
    }
  })

  it('test_p10_tab_readout_changes: w zakładce po zapisaniu przesuniętego środka zmienia się tylko odczyt środka', async () => {
    const app = await kadr(M42.uid)
    const before = framing({ ra: M42.raDeg, dec: M42.decDeg })
    app.store.getState().updateFraming(M42.uid, before)
    const first = app.render(app.framingTab())
    const fov = tabFovDeg(mySet(), before)
    const after = dragFraming({ framing: before, pointer: { x: 0, y: 0 } }, { x: 100, y: 0 }, fov, 1000)
    app.store.getState().updateFraming(M42.uid, after)
    const second = app.render(app.framingTab())
    expect(visibleText(first)).toContain(M42_READOUT)
    expect(visibleText(second)).not.toContain(M42_READOUT)
    expectCorners(drawing(second).panels[0].corners, drawing(first).panels[0].corners)
    expect(after.centerRaDeg).toBeGreaterThan(before.centerRaDeg)
  })
})

describe('P11 przesunięcie liczone od początku przeciągania', () => {
  it('test_p11_from_drag_start: 60, potem kolejne 40 jednostek bez puszczania → środek jak w P8', () => {
    const start = { framing: framing({ ra: DRAG_CENTER.ra, dec: DRAG_CENTER.dec }), pointer: { x: 0, y: 0 } }
    const middle = dragFraming(start, { x: 60, y: 0 }, VIEW_2, 1000)
    expectCenter(middle, 83.9426, -5.391, 'po 60 jednostkach (cutoutToSky dla x = 440)')
    expectCenter(dragFraming(start, { x: 100, y: 0 }, VIEW_2, 1000), 84.023, -5.391, 'po 60 + 40 jednostkach')
  })
})

describe('P12 piksele ekranu → jednostki widoku', () => {
  it('test_p12_half_width_screen: widok 500 px szerokości, 50 px w prawo → 100 jednostek, wynik z P8', () => {
    expectCenter(drag(50, 0, undefined, 500), 84.023, -5.391)
  })
})

describe('P13 przez biegun', () => {
  it('test_p13_over_pole: Dec 89,9°, 300 jednostek w dół → Dec ≤ 90°, RA w [0, 360), PA i mozaika bez zmian, bez NaN', () => {
    const start = framing({ ra: DRAG_CENTER.ra, dec: 89.9, pa: 30, cols: 2 })
    const result = drag(0, 300, start)
    expectFinite(result)
    expect(result.centerDecDeg).toBeLessThanOrEqual(90)
    expect(result.centerDecDeg).toBeGreaterThanOrEqual(-90)
    expect(result.centerRaDeg).toBeGreaterThanOrEqual(0)
    expect(result.centerRaDeg).toBeLessThan(360)
    expect(result.paDeg).toBe(30)
    expect(result.mosaic).toEqual(start.mosaic)
  })
})

describe('P14 „Wyśrodkuj na obiekcie”', () => {
  it('test_p14_center_on_object: po przesunięciu środek wraca na M 42, PA 30° i mozaika 2×1 zostają', async () => {
    const app = await shiftedOnM42()
    click(app.capture(app.framingTab(), buttonWithText('Wyśrodkuj na obiekcie')).props)
    const markup = app.render(app.framingTab())
    expect(visibleText(markup)).toContain(M42_READOUT)
    const fields = tabFields(markup)
    expect(fieldNumber(fields.range.value)).toBe(30)
    expect([fields.cols, fields.rows]).toEqual(['2', '1'])
    expectTabPanels(markup, mySet(), onObject(M42, SHIFTED))
  })
})

// ---------- PA, mozaika, dane kadru ----------

describe('P15 PA', () => {
  it('test_p15_slider: suwak 0–360°, krok 0,5°', async () => {
    const app = await kadr()
    const { range } = tabFields(app.render(app.framingTab()))
    expect(fieldNumber(range.min)).toBe(0)
    expect(fieldNumber(range.max)).toBe(360)
    expect(fieldNumber(range.step)).toBe(0.5)
  })

  it('test_p15_slider_sets_pa: suwak na 30 → ramka obrócona jak przy PA 30°', async () => {
    const app = await kadr(M42.uid)
    choose(app.capture(app.framingTab(), isRange).props, '30')
    const markup = app.render(app.framingTab())
    expect(fieldNumber(tabFields(markup).range.value)).toBe(30)
    expectTabPanels(markup, mySet(), framing({ ra: M42.raDeg, dec: M42.decDeg, pa: 30 }))
  })

  it.each([
    ['30,5', 30.5],
    ['30.5', 30.5],
    ['30,25', 30.25],
    ['-30', 330],
    ['360', 0],
  ])('test_p15_field: „%s” → PA %s°', (text, expected) => {
    const result = readPaInput(text, 45)
    expect(result.error).toBeNull()
    expect(result.paDeg).toBeCloseTo(expected, 9)
  })

  it.each([['abc'], ['']])('test_p15_field_error: „%s” → „PA: wpisz liczbę”, PA bez zmian', (text) => {
    expect(readPaInput(text, 45)).toEqual({ paDeg: 45, error: 'PA: wpisz liczbę' })
  })
})

describe('P16 mozaika', () => {
  it('test_p16_lists_and_default_overlap: kolumny i wiersze 1…5, zakładka startuje od 20%', async () => {
    const app = await kadr()
    const fields = tabFields(app.render(app.framingTab()))
    expect(fields.colsOptions).toEqual(['1', '2', '3', '4', '5'])
    expect(fields.rowsOptions).toEqual(['1', '2', '3', '4', '5'])
    expect([fields.cols, fields.rows]).toEqual(['1', '1'])
    expect(fieldNumber(fields.overlapField.value)).toBe(20)
  })

  it('test_p16_columns_select: wybór 2 kolumn → dwa panele i wiersz „Mozaika:”', async () => {
    const app = await kadr(M42.uid)
    choose(app.capture(app.framingTab(), mosaicSelect(0)).props, '2')
    const markup = app.render(app.framingTab())
    expect([tabFields(markup).cols, tabFields(markup).rows]).toEqual(['2', '1'])
    expect(visibleText(markup)).toContain('Mozaika:')
    expectTabPanels(markup, mySet(), framing({ ra: M42.raDeg, dec: M42.decDeg, cols: 2 }))
  })

  it.each([
    ['25,5', 25.5],
    ['25.5', 25.5],
    ['35', 30],
    ['5', 10],
  ])('test_p16_overlap: „%s” → zakładka %s proc.', (text, expected) => {
    const result = readOverlapInput(text, 15)
    expect(result.error).toBeNull()
    expect(result.overlapPct).toBeCloseTo(expected, 9)
  })

  it('test_p16_overlap_error: „abc” → „Zakładka: wpisz liczbę”, zakładka bez zmian', () => {
    expect(readOverlapInput('abc', 15)).toEqual({ overlapPct: 15, error: 'Zakładka: wpisz liczbę' })
  })
})

describe('P17 dane kadru', () => {
  it('test_p17_my_set: „1,080° × 1,080° (64,8′ × 64,8′)”, „1,293″/px”, podpróbkowanie, bez uwagi OSC i bez „Mozaika:”', async () => {
    const app = await kadr()
    const text = visibleText(app.render(app.framingTab()))
    expect(text).toContain(MY_SET_FOV)
    expect(text).toContain(MY_SET_SCALE)
    expect(text).toContain('podpróbkowanie')
    expect(text).not.toContain(OSC_NOTE)
    expect(text).not.toContain('Mozaika:')
  })

  it('test_p17_redcat: „5,380° × 3,597°”, „3,102″/px”, podpróbkowanie i uwaga OSC; przy 1×1 bez „Mozaika:”', async () => {
    const app = await kadr()
    app.store.getState().selectProfile(REDCAT_ID)
    const text = visibleText(app.render(app.framingTab()))
    expect(text).toContain('5,380° × 3,597°')
    expect(text).toContain('3,102″/px')
    expect(text).toContain('podpróbkowanie')
    expect(OSC_NOTE).toMatch(/OSC/)
    expect(text).toContain(OSC_NOTE)
    expect(text).not.toContain('Mozaika:')
  })

  it('test_p17_redcat_mosaic: RedCat 2×1, zakładka 20% → dodatkowo „Mozaika: 9,668° × 3,597°”', async () => {
    const app = await kadr(M31.uid)
    app.store.getState().selectProfile(REDCAT_ID)
    app.store.getState().updateFraming(M31.uid, framing({ ra: M31.raDeg, dec: M31.decDeg, cols: 2 }))
    const text = visibleText(app.render(app.framingTab()))
    expect(text).toContain('Mozaika: 9,668° × 3,597°')
    expect(text).toContain('5,380° × 3,597°')
  })
})

describe('P18 zmiana aktywnego profilu', () => {
  it('test_p18_profile_change: RedCat zamiast „Mojego zestawu” → nowa ramka i dane; środek, PA i mozaika zostają', async () => {
    const app = await shiftedOnM42()
    const before = app.render(app.framingTab())
    expect(visibleText(before)).toContain(MY_SET_FOV)
    app.store.getState().selectProfile(REDCAT_ID)
    const markup = app.render(app.framingTab())
    const text = visibleText(markup)
    expect(text).toContain('5,380° × 3,597°')
    expect(text).not.toContain(MY_SET_FOV)
    expect(text).toContain(SHIFTED_READOUT)
    expect(fieldNumber(tabFields(markup).range.value)).toBe(30)
    expectTabPanels(markup, redcat(), SHIFTED)
    app.store.getState().selectProfile(MY_SET_ID)
    expectTabPanels(app.render(app.framingTab()), mySet(), SHIFTED)
  })
})

describe('P19 pole widoku z `zrodla-zdjec`', () => {
  it('test_p19_view_fov: 1×1 → pole 3,05°, po zmianie na 2×1 → 4,45° (większe), ramka zgodna z nowym polem', async () => {
    const app = await kadr(M42.uid)
    const single = framing({ ra: M42.raDeg, dec: M42.decDeg })
    const double = framing({ ra: M42.raDeg, dec: M42.decDeg, cols: 2 })
    expect(tabFovDeg(mySet(), single)).toBeCloseTo(3.05, 9)
    expect(tabFovDeg(mySet(), double)).toBeCloseTo(4.45, 9)
    const first = app.render(app.framingTab())
    expectTabPanels(first, mySet(), single)
    choose(app.capture(app.framingTab(), mosaicSelect(0)).props, '2')
    const second = app.render(app.framingTab())
    expectTabPanels(second, mySet(), double)
    // Większe pole widoku → ten sam kadr zajmuje w widoku mniej jednostek.
    const width = (corners: { x: number; y: number }[]) => box(corners).xMax - box(corners).xMin
    expect(width(drawing(second).panels[0].corners)).toBeLessThan(width(drawing(first).panels[0].corners))
  })
})

// ---------- Rysunek (widok 2°) ----------

describe('P20–P23 ramka, obrót, mozaika i OAG w SVG', () => {
  it('test_p20_T24_frame: ramka „Mojego zestawu” w widoku 2° → (230; 230), (770; 230), (770; 770), (230; 770)', () => {
    const view = renderView({ fovDeg: VIEW_2, profile: mySet(), framing: framing() })
    expect(view.panels).toHaveLength(1)
    expectCorners(view.panels[0].corners, T24_CORNERS)
  })

  it.each([
    { pa: 30, x: 365.0, y: 266.2 },
    { pa: 330, x: 635.0, y: 266.2 },
    { pa: 90, x: 230, y: 500 },
  ])('test_p21_rotation: PA $pa° → środek górnej krawędzi w ($x; $y)', ({ pa, x, y }) => {
    const view = renderView({ fovDeg: VIEW_2, profile: mySet(), framing: framing({ pa }) })
    expect(view.panels).toHaveLength(1)
    expectPoint(topEdgeMid(view.panels[0].corners), x, y, 'środek górnej krawędzi')
  })

  it('test_p22_mosaic_panels: 2×1 → panele „1” (x 14–554) i „2” (x 446–986), oba y 230–770', () => {
    const view = renderView({ fovDeg: VIEW_2, profile: mySet(), framing: framing({ cols: 2 }) })
    expect(view.panels.map((panel) => panel.number)).toEqual(['1', '2'])
    expect(view.panels[0].texts).toContain('1')
    expect(view.panels[1].texts).toContain('2')
    expectBox(box(view.panels[0].corners), [14.0, 554.0], [230, 770], 'panel 1 (wschodni)')
    expectBox(box(view.panels[1].corners), [446.0, 986.0], [230, 770], 'panel 2')
  })

  it('test_p23_oag: OAG {8 × 4 mm, 8 mm, 0°} → pryzmat x 309–691, y 22,6–213,5; przy PA 90° x 22,6–213,5, y 309–691', () => {
    const profile = withOag(mySet(), P23_OAG)
    const upright = renderView({ fovDeg: VIEW_2, profile, framing: framing() })
    expect(upright.oag).toHaveLength(1)
    expectBox(box(upright.oag[0]), [309.0, 691.0], [22.6, 213.5], 'pryzmat, PA 0°')
    const rotated = renderView({ fovDeg: VIEW_2, profile, framing: framing({ pa: 90 }) })
    expect(rotated.oag).toHaveLength(1)
    expectBox(box(rotated.oag[0]), [22.6, 213.5], [309.0, 691.0], 'pryzmat, PA 90°')
  })

  it('test_p23_no_oag: profil z `oag: null` → brak prostokąta pryzmatu', () => {
    const view = renderView({ fovDeg: VIEW_2, profile: withOag(mySet(), null), framing: framing() })
    expect(view.oag).toEqual([])
    expect(view.panels).toHaveLength(1)
  })
})

describe('P24 mapa zastępcza pod ramką [T24]', () => {
  const center = framing({ ra: 83.8221, dec: -5.3911 })
  const mapObjects = fallbackMap(CATALOG, POLYGONS, viewCutout(center, VIEW_2))
  const solid = ['M 42', 'M 43', 'NGC 1977']
  const dashed = ['NGC 1973', 'NGC 1975', 'NGC 1980']

  it('test_p24_T24_shapes: M 42, M 43, NGC 1977 linią ciągłą; NGC 1973, 1975, 1980 przerywaną; każdy z etykietą', () => {
    const view = renderView({ fovDeg: VIEW_2, profile: mySet(), framing: center, mapObjects })
    for (const designation of [...solid, ...dashed]) {
      const object = catalogObject(designation)
      const group = view.map.find((entry) => entry.uid === object.uid)
      expect(group, `${designation} na mapie`).toBeDefined()
      expect(group!.shapes.length, `${designation}: kształty`).toBeGreaterThan(0)
      expect(group!.texts.join(' '), `${designation}: etykieta`).toContain(formatDesignation(object.primary))
      const dashes = group!.shapes.map((shape) => isDashed(shape, group!.element))
      if (solid.includes(designation)) expect(dashes, `${designation}: linia ciągła`).toEqual(dashes.map(() => false))
      else expect(dashes, `${designation}: linia przerywana`).toEqual(dashes.map(() => true))
    }
  })

  it('test_p24_draws_model: widok rysuje dokładnie obiekty z modelu mapy, w jego pikselach, pod ramką', () => {
    const view = renderView({ fovDeg: VIEW_2, profile: mySet(), framing: center, mapObjects })
    expect(view.map.map((entry) => entry.uid).sort()).toEqual(mapObjects.map((object) => object.uid).sort())
    const m42 = mapObjects.find((object) => object.uid === M42.uid)
    const drawn = view.map.find((entry) => entry.uid === M42.uid)
    expect(m42?.kind).toBe('polygon')
    const first = drawn!.shapes.filter((shape) => ['polygon', 'polyline', 'path'].includes(shape.tag))[0]
    expectPoint(shapePoints(first)[0], m42!.shapes[0][0].x, m42!.shapes[0][0].y, 'pierwszy punkt zarysu M 42')
    const order = elementsOf(view.svg)
    const lastMap = Math.max(...view.map.map((entry) => order.indexOf(entry.element)))
    const firstPanel = order.findIndex((element) => element.tag === 'g' && element.attrs['data-panel'] !== undefined)
    expect(firstPanel, 'panel w widoku').toBeGreaterThanOrEqual(0)
    expect(lastMap, 'mapa przed ramką (pod nią)').toBeLessThan(firstPanel)
  })

  it(
    'test_p24_tab_passes_map: zakładka z M 42 rysuje obiekty mapy z całego katalogu dla swojego pola widoku',
    async () => {
      const app = await kadr(M42.uid)
      const frame = framing({ ra: M42.raDeg, dec: M42.decDeg })
      const expected = fallbackMap(CATALOG, POLYGONS, viewCutout(frame, tabFovDeg(mySet(), frame)))
      const view = drawing(app.render(app.framingTab()))
      expect(view.map.map((entry) => entry.uid).sort()).toEqual(expected.map((object) => object.uid).sort())
      for (const designation of solid) expect(view.map.some((entry) => entry.uid === catalogObject(designation).uid)).toBe(true)
    },
    FULL_CATALOG_TIMEOUT,
  )
})

// ---------- Red Mode ----------

const RED_MATRIX = '0.2126 0.7152 0.0722 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0'
const HARD_COLOR = /#[0-9a-f]{3,8}\b|rgba?\(/i

/** Kolory wpisane na sztywno w `fill`, `stroke` i `style` poddrzewa (po usunięciu odwołań `url(#…)`). */
function hardColors(root: ReturnType<typeof parseMarkup>): string[] {
  return [root, ...elementsOf(root)].flatMap((element) =>
    ['fill', 'stroke', 'style']
      .map((name) => element.attrs[name])
      .filter((value): value is string => value !== undefined)
      .map((value) => value.replace(/url\(\s*#[^)]*\)/g, ''))
      .filter((value) => HARD_COLOR.test(value))
      .map((value) => `<${element.tag}> ${value}`),
  )
}

const hasRedFilter = (element: ReturnType<typeof parseMarkup>) =>
  (element.attrs.style ?? '').replace(/\s+/g, '').includes('filter:url(#red-only)')

/** Kadr z mozaiką 2×1, OAG i mapą wokół M 42 (żeby sprawdzić kolory wszystkich warstw). */
async function fullKadr(redMode: boolean): Promise<App> {
  const app = await kadr(M42.uid)
  app.store.setState({
    profiles: app.store.getState().profiles.map((profile) => (profile.id === MY_SET_ID ? withOag(profile, P23_OAG) : profile)),
    activeProfileId: MY_SET_ID,
    redMode,
  })
  app.store.getState().updateFraming(M42.uid, framing({ ra: M42.raDeg, dec: M42.decDeg, pa: 30, cols: 2 }))
  return app
}

describe('P25 Red Mode', () => {
  it(
    'test_p25_red_on: kontener widoku ma `filter: url(#red-only)`, na stronie filtr `red-only` z macierzą z sekcji 8',
    async () => {
      const app = await fullKadr(true)
      const root = parseMarkup(app.render(app.app()))
      const filters = elementsOf(root).filter((element) => element.tag === 'filter' && element.attrs.id === 'red-only')
      expect(filters.length).toBeGreaterThanOrEqual(1)
      const matrix = elementsOf(filters[0]).find((element) => element.tag === 'fecolormatrix')
      expect(matrix?.attrs.type).toBe('matrix')
      expect((matrix?.attrs.values ?? '').trim().split(/\s+/).join(' ')).toBe(RED_MATRIX)
      const svg = viewSvg(root)
      expect(ancestors(svg).some(hasRedFilter), 'przodek widoku z filtrem red-only').toBe(true)
      expect(hardColors(svg)).toEqual([])
    },
    FULL_CATALOG_TIMEOUT,
  )

  it(
    'test_p25_red_off: bez Red Mode kontener nie ma filtra, a widok nie ma kolorów wpisanych na sztywno',
    async () => {
      const app = await fullKadr(false)
      const root = parseMarkup(app.render(app.app()))
      const svg = viewSvg(root)
      expect(drawing(app.render(app.framingTab())).oag.length, 'pryzmaty OAG w widoku').toBe(2)
      expect([svg, ...ancestors(svg)].some(hasRedFilter)).toBe(false)
      expect(hardColors(svg)).toEqual([])
    },
    FULL_CATALOG_TIMEOUT,
  )

  it('test_p25_view_colors: sam widok (mozaika, OAG, mapa) – żaden fill, stroke ani style bez tokenów', () => {
    const center = framing({ ra: 83.8221, dec: -5.3911, pa: 30, cols: 2 })
    const view = renderView({
      fovDeg: VIEW_2,
      profile: withOag(mySet(), P23_OAG),
      framing: center,
      mapObjects: fallbackMap(CATALOG, POLYGONS, viewCutout(center, VIEW_2)),
    })
    expect(view.map.length).toBeGreaterThan(0)
    expect(view.oag).toHaveLength(2)
    expect(hardColors(view.svg)).toEqual([])
  })
})
