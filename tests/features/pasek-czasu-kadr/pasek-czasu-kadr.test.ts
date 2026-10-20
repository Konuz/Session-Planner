// Testy funkcji „pasek-czasu-kadr” (spec: .autoloop/features/pasek-czasu-kadr/spec.md).
// Jak testowane: górny pasek renderowany statycznie dla stanu `usePlannerStore` (sonda w helpers.ts).
// - „Przejście do zakładki” to akcja sklepu `setTab` (to samo robi NavBar); `TopBar` czyta `tab` ze wspólnego stanu.
// - Zegar nie jest czytany: tryb „Teraz” ustawia `goNow(stała chwila)`, a odświeżenie co 60 s z App.tsx (P8) jest
//   symulowane wywołaniem `goNow(chwila + 60 s)` w zakładce Kadr. Sam interwał App w Node bez DOM się nie uruchamia
//   (luka opisana w raporcie; App.tsx spec zostawia bez zmian).
// - P4: „ramka w Kadrze też” wynika z aktywnego profilu i jest sprawdzana w `zakladka-kadr` P18; tu sprawdzamy, że
//   lista na pasku w Kadrze zmienia aktywny profil.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  const items = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => {
        items.set(key, String(value))
      },
      removeItem: (key: string) => {
        items.delete(key)
      },
      clear: () => items.clear(),
      key: (index: number) => [...items.keys()][index] ?? null,
      get length() {
        return items.size
      },
    },
  })
})

import { activeLocationOf, activeProfileOf, type Tab } from '../../../src/state/plannerStore'
import { nightRange } from '../../../src/services/visibility'
import { startApp, warmUp, WARM_UP_MS } from '../profile-zestawow/helpers'
import { topBarProfile } from '../zakladka-sprzet/helpers'
import {
  CURSOR_2300,
  ESPRIT_ID,
  MOJ_ID,
  NIGHT,
  REDCAT_ID,
  SECOND_LOCATION,
  ZONE,
  change,
  click,
  cursorRow,
  indexOf,
  local,
  outputText,
  renderBar,
  resetState,
  setTab,
  state,
} from './helpers'

beforeAll(async () => {
  await warmUp()
}, WARM_UP_MS)

afterEach(() => {
  vi.unstubAllGlobals()
})

/** W Kadrze nie ma żadnego elementu wiersza kursora (ani ukrytego, ani wyłączonego). */
function expectNoCursorRow(markup: string, bar: ReturnType<typeof renderBar>, time: string): void {
  expect(bar.ranges, 'suwak „Kursor czasu”').toHaveLength(0)
  expect(bar.outputs, 'pole z godziną').toHaveLength(0)
  expect(bar.nowButtons, 'przycisk „Teraz”').toHaveLength(0)
  expect(markup).not.toContain('type="range"')
  expect(markup).not.toContain('Kursor czasu')
  expect(markup).not.toContain('<output')
  expect(markup).not.toContain('Teraz')
  expect(markup).not.toContain(time)
}

describe('P1 w Kadrze nie ma kursora czasu', () => {
  it('test_p1_no_cursor_row_in_framing: zakładka Kadr → brak suwaka, pola „23:00” i przycisku „Teraz”', () => {
    resetState({ tab: 'framing' })
    const bar = renderBar()
    expectNoCursorRow(bar.markup, bar, '23:00')
  })

  it('test_p1_state_unchanged_by_render: render paska w Kadrze nie zmienia kursora ani trybu „Teraz”', () => {
    resetState({ tab: 'framing' })
    renderBar()
    expect(state().cursorMs).toBe(CURSOR_2300)
    expect(state().followNow).toBe(false)
  })
})

describe('P2 reszta paska zostaje w Kadrze', () => {
  it('test_p2_rest_of_bar_in_order: Lokalizacja, Noc 2026-10-20, Zestaw, Red Mode w tej kolejności', () => {
    resetState({ tab: 'framing' })
    const bar = renderBar()
    expect(bar.locationSelects, 'lista „Lokalizacja”').toHaveLength(1)
    expect(bar.dateInputs, 'pole „Noc”').toHaveLength(1)
    expect(bar.profileSelects, 'lista „Zestaw”').toHaveLength(1)
    expect(bar.redModeButtons, 'przycisk „Red Mode”').toHaveLength(1)
    expect(bar.dateInputs[0].props.value).toBe('2026-10-20')
    expect(bar.markup).toContain('value="2026-10-20"')
    expect(bar.markup).toContain('Lokalizacja')
    expect(bar.markup).toContain('Noc 20/21.10.2026')
    expect(bar.markup).toContain('Zestaw')
    expect(bar.markup).toContain('Red Mode')
    const order = [bar.locationSelects[0], bar.dateInputs[0], bar.profileSelects[0], bar.redModeButtons[0]].map((host) =>
      indexOf(bar, host),
    )
    expect(order).toEqual([...order].sort((a, b) => a - b))
    const markupOrder = ['Lokalizacja', 'Noc 20/21.10.2026', 'Zestaw', 'Red Mode'].map((text) => bar.markup.indexOf(text))
    expect(markupOrder).toEqual([...markupOrder].sort((a, b) => a - b))
  })

  it('test_p2_same_order_as_other_tabs: kolejność pól w Kadrze taka sama jak w zakładce Katalog', () => {
    resetState({ tab: 'catalog' })
    const before = renderBar()
    resetState({ tab: 'framing' })
    const after = renderBar()
    const sequence = (bar: ReturnType<typeof renderBar>) =>
      bar.hosts
        .filter((host) => ['select', 'input', 'button'].includes(host.tag))
        .filter((host) => host.props.type !== 'range')
        .filter((host) => !bar.nowButtons.includes(host))
        .map((host) => `${host.tag}:${typeof host.props.type === 'string' ? host.props.type : ''}`)
    expect(sequence(after)).toEqual(sequence(before))
    expect(sequence(after)).toEqual(['select:', 'input:date', 'select:', 'button:button'])
  })

  it('test_p2_selected_values: w Kadrze lista „Zestaw” wskazuje aktywny profil, a „Lokalizacja” aktywną lokalizację', () => {
    resetState({ tab: 'framing', activeProfileId: REDCAT_ID })
    const bar = renderBar()
    expect(bar.profileSelects[0].props.value).toBe(REDCAT_ID)
    expect(bar.locationSelects[0].props.value).toBe(activeLocationOf(state()).id)
  })
})

describe('P3 inne zakładki bez zmian', () => {
  for (const tab of ['catalog', 'night', 'settings'] as const satisfies readonly Tab[]) {
    it(`test_p3_cursor_row_in_${tab}: suwak z wartością 23:00, pole „23:00” i „Teraz”`, () => {
      resetState({ tab })
      const bar = renderBar()
      const row = cursorRow(bar)
      expect(row.range.props['aria-label']).toBe('Kursor czasu')
      expect(row.range.props.value).toBe(CURSOR_2300)
      expect(String(row.range.props['aria-valuetext'])).toContain('23:00')
      expect(outputText(row.output)).toContain('23:00')
      expect(row.now.props['aria-pressed']).toBe(false)
      expect(bar.markup).toContain('Kursor czasu')
      expect(bar.profileSelects).toHaveLength(1)
      expect(bar.redModeButtons).toHaveLength(1)
    })
  }

  it('test_p3_slider_still_moves_cursor: w Noc suwak nadal ustawia kursor (01:30) i wyłącza „Teraz”', () => {
    resetState({ tab: 'night', followNow: true })
    const target = local('2026-10-21T01:30')
    change(cursorRow(renderBar()).range, String(target))
    expect(state().cursorMs).toBe(target)
    expect(state().followNow).toBe(false)
  })
})

describe('P4 zestaw i lokalizacja z paska w Kadrze', () => {
  it('test_p4_profile_change_in_framing: wybór „Esprit 100ED + ASI6200MM Pro” w Kadrze zmienia aktywny profil', () => {
    resetState({ tab: 'framing' })
    expect(activeProfileOf(state()).id).toBe(MOJ_ID)
    change(renderBar().profileSelects[0], ESPRIT_ID)
    expect(activeProfileOf(state()).id).toBe(ESPRIT_ID)
    expect(renderBar().profileSelects[0].props.value).toBe(ESPRIT_ID)
    expect(state().tab).toBe('framing')
  })

  it('test_p4_location_change_in_framing: wybór innej lokalizacji w Kadrze zmienia aktywną lokalizację', () => {
    resetState({ tab: 'framing' })
    change(renderBar().locationSelects[0], SECOND_LOCATION.id)
    expect(activeLocationOf(state()).id).toBe(SECOND_LOCATION.id)
    expect(renderBar().locationSelects[0].props.value).toBe(SECOND_LOCATION.id)
    expect(state().tab).toBe('framing')
  })

  it('test_p4_sprzet_helper_in_framing: pomocnik `topBarProfile` z zakladka-sprzet znajduje listę „Zestaw” w Kadrze', () => {
    resetState({ tab: 'framing' })
    const list = topBarProfile()
    expect(list.selected).toBe('Mój zestaw')
    list.choose(REDCAT_ID)
    expect(activeProfileOf(state()).id).toBe(REDCAT_ID)
  })
})

describe('P5 Red Mode w Kadrze', () => {
  it('test_p5_red_mode_toggle_in_framing: klik → aria-pressed="true", drugi klik → wyłączony', () => {
    resetState({ tab: 'framing' })
    const first = renderBar()
    expect(first.redModeButtons[0].props['aria-pressed']).toBe(false)
    click(first.redModeButtons[0])
    expect(state().redMode).toBe(true)
    const second = renderBar()
    expect(second.redModeButtons[0].props['aria-pressed']).toBe(true)
    expect(second.markup).toContain('aria-pressed="true"')
    click(second.redModeButtons[0])
    expect(state().redMode).toBe(false)
    expect(renderBar().redModeButtons[0].props['aria-pressed']).toBe(false)
  })
})

describe('P6 zmiana nocy w Kadrze', () => {
  it('test_p6_night_change_in_framing: noc 2026-10-25 → noc 25/26.10.2026, kursor jak przy zmianie w Noc, „Teraz” wyłączone', () => {
    // Odniesienie: ta sama zmiana nocy z paska w zakładce Noc (zasada „jak w innych zakładkach”).
    resetState({ tab: 'night' })
    change(renderBar().dateInputs[0], '2026-10-25')
    const expectedCursor = state().cursorMs
    expect(state().nightDate).toBe('2026-10-25')

    resetState({ tab: 'framing' })
    change(renderBar().dateInputs[0], '2026-10-25')
    expect(state().nightDate).toBe('2026-10-25')
    expect(state().followNow).toBe(false)
    expect(state().cursorMs).toBe(expectedCursor)
    const night = nightRange('2026-10-25', ZONE)
    expect(state().cursorMs).toBeGreaterThanOrEqual(night.startMs)
    expect(state().cursorMs).toBeLessThanOrEqual(night.endMs)

    const inFraming = renderBar()
    expect(inFraming.markup).toContain('25/26.10.2026')
    expect(inFraming.dateInputs[0].props.value).toBe('2026-10-25')
    expect(inFraming.ranges).toHaveLength(0)

    setTab('night')
    const row = cursorRow(renderBar())
    expect(row.range.props.value).toBe(expectedCursor)
    expect(row.now.props['aria-pressed']).toBe(false)
  })
})

describe('P7 wejście do Kadru nie zmienia kursora', () => {
  it('test_p7_cursor_0130_survives_framing: Noc 01:30 → Kadr → Noc: kursor 01:30, „Teraz” wyłączone', () => {
    resetState({ tab: 'night' })
    const target = local('2026-10-21T01:30')
    change(cursorRow(renderBar()).range, String(target))
    expect(state().cursorMs).toBe(target)

    setTab('framing')
    const inFraming = renderBar()
    expect(inFraming.ranges).toHaveLength(0)
    expect(state().cursorMs).toBe(target)
    expect(state().followNow).toBe(false)

    setTab('night')
    const row = cursorRow(renderBar())
    expect(state().cursorMs).toBe(target)
    expect(state().followNow).toBe(false)
    expect(state().nightDate).toBe(NIGHT)
    expect(row.range.props.value).toBe(target)
    expect(outputText(row.output)).toContain('01:30')
    expect(row.now.props['aria-pressed']).toBe(false)
  })
})

describe('P8 tryb „Teraz” w tle w Kadrze', () => {
  it('test_p8_follow_now_stays_on: „Teraz” włączone → Kadr → zostaje włączone, odświeżenie kursora działa, w Noc „Teraz” wciśnięty', () => {
    const now = local('2026-10-20T22:17')
    resetState({ tab: 'night' })
    state().goNow(now)
    expect(state().followNow).toBe(true)

    setTab('framing')
    expect(renderBar().nowButtons).toHaveLength(0)
    expect(state().followNow).toBe(true)
    expect(state().cursorMs).toBe(now)

    // Odświeżenie co 60 s z App.tsx (`goNow(Date.now())`) symulowane stałą chwilą.
    const tick = now + 60_000
    state().goNow(tick)
    expect(state().cursorMs).toBe(tick)
    expect(state().followNow).toBe(true)

    setTab('night')
    const row = cursorRow(renderBar())
    expect(row.now.props['aria-pressed']).toBe(true)
    expect(row.range.props.value).toBe(tick)
    expect(outputText(row.output)).toContain('22:18')
  })
})

describe('P9 powrót z Kadru', () => {
  it('test_p9_cursor_row_returns_in_catalog: Kadr → Katalog → suwak, godzina i „Teraz” od razu', () => {
    resetState({ tab: 'framing' })
    expect(renderBar().ranges).toHaveLength(0)
    setTab('catalog')
    const row = cursorRow(renderBar())
    expect(row.range.props.value).toBe(CURSOR_2300)
    expect(outputText(row.output)).toContain('23:00')
    expect(row.now.props['aria-pressed']).toBe(false)
  })
})

describe('P10 pasek bez ustawionej zakładki', () => {
  it(
    'test_p10_fresh_app_catalog_tab: świeży start (zakładka Katalog) → lista „Zestaw” z pomocnika profile-zestawow i kursor czasu',
    async () => {
      const app = await startApp()
      expect(app.state().tab).toBe('catalog')
      const list = app.topBar()
      expect(list.options).toEqual([
        'Mój zestaw',
        'RedCat 51 + ASI2600MC Pro',
        'Newton 200/1000 + ASI533MM Pro',
        'Esprit 100ED + ASI6200MM Pro',
      ])
      expect(list.value).toBe(MOJ_ID)
      expect(list.markup).toContain('type="range"')
      expect(list.markup).toContain('Kursor czasu')
      expect(list.markup).toContain('Teraz')
      expect(list.markup).toContain('<output')
    },
    WARM_UP_MS,
  )

  it('test_p10_sprzet_helper_default_tab: pomocnik `topBarProfile` z zakladka-sprzet znajduje listę „Zestaw” w Katalogu', () => {
    resetState({ tab: 'catalog' })
    const list = topBarProfile()
    expect(list.selected).toBe('Mój zestaw')
    expect(list.options).toHaveLength(4)
    expect(cursorRow(renderBar()).range.props.value).toBe(CURSOR_2300)
  })
})
