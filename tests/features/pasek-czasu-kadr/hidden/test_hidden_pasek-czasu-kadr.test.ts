// Testy ukryte funkcji „pasek-czasu-kadr”: te same zachowania co w testach widocznych, z innymi wartościami
// (inna godzina kursora, inna noc, inny profil, Red Mode włączony na starcie, „Teraz” włączone przed zmianą nocy).
import { describe, expect, it, vi } from 'vitest'

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

import { activeLocationOf, activeProfileOf, type Tab } from '../../../../src/state/plannerStore'
import {
  NEWTON_ID,
  SECOND_LOCATION,
  change,
  click,
  cursorRow,
  local,
  outputText,
  renderBar,
  resetState,
  setTab,
  state,
} from '../helpers'

describe('ukryte: brak kursora w Kadrze przy innych wartościach', () => {
  it('hidden_p1_other_cursor_red_mode: kursor 03:45 na nocy 2026-11-03, Red Mode włączony → w Kadrze brak wiersza kursora', () => {
    const cursor = local('2026-11-04T03:45')
    resetState({ tab: 'framing', nightDate: '2026-11-03', cursorMs: cursor, redMode: true })
    const bar = renderBar()
    expect(bar.ranges).toHaveLength(0)
    expect(bar.outputs).toHaveLength(0)
    expect(bar.nowButtons).toHaveLength(0)
    expect(bar.markup).not.toContain('03:45')
    expect(bar.markup).not.toContain('Teraz')
    expect(bar.markup).not.toContain('Kursor czasu')
    expect(bar.dateInputs[0].props.value).toBe('2026-11-03')
    expect(bar.markup).toContain('3/4.11.2026')
    expect(bar.redModeButtons[0].props['aria-pressed']).toBe(true)
    expect(bar.profileSelects).toHaveLength(1)
    expect(bar.locationSelects).toHaveLength(1)
  })

  it('hidden_p1_follow_now_on: tryb „Teraz” włączony → w Kadrze nadal brak przycisku „Teraz” i suwaka', () => {
    resetState({ tab: 'framing' })
    state().goNow(local('2026-10-20T21:05'))
    const bar = renderBar()
    expect(bar.ranges).toHaveLength(0)
    expect(bar.nowButtons).toHaveLength(0)
    expect(bar.markup).not.toContain('21:05')
  })
})

describe('ukryte: inne zakładki przy innych wartościach', () => {
  for (const tab of ['catalog', 'night', 'settings'] as const satisfies readonly Tab[]) {
    it(`hidden_p3_${tab}_cursor_0315: kursor 03:15 na nocy 2026-11-03 → suwak, godzina i „Teraz”`, () => {
      const cursor = local('2026-11-04T03:15')
      resetState({ tab, nightDate: '2026-11-03', cursorMs: cursor })
      const row = cursorRow(renderBar())
      expect(row.range.props.value).toBe(cursor)
      expect(outputText(row.output)).toContain('03:15')
      expect(row.now.props['aria-pressed']).toBe(false)
    })
  }
})

describe('ukryte: zestaw, lokalizacja i Red Mode w Kadrze', () => {
  it('hidden_p4_newton_profile: Kadr, aktywny RedCat → wybór Newton 200/1000 zmienia aktywny profil', () => {
    resetState({ tab: 'framing', activeProfileId: 'demo-redcat51-asi2600mc' })
    change(renderBar().profileSelects[0], NEWTON_ID)
    expect(activeProfileOf(state()).id).toBe(NEWTON_ID)
    expect(renderBar().profileSelects[0].props.value).toBe(NEWTON_ID)
  })

  it('hidden_p4_location_back: Kadr, aktywna druga lokalizacja → wybór domyślnej wraca do niej', () => {
    resetState({ tab: 'framing', activeLocationId: SECOND_LOCATION.id })
    expect(activeLocationOf(state()).id).toBe(SECOND_LOCATION.id)
    change(renderBar().locationSelects[0], 'chrzastawa-wielka')
    expect(activeLocationOf(state()).id).toBe('chrzastawa-wielka')
  })

  it('hidden_p5_red_mode_from_on: Red Mode włączony → klik w Kadrze wyłącza, drugi włącza', () => {
    resetState({ tab: 'framing', redMode: true })
    click(renderBar().redModeButtons[0])
    expect(state().redMode).toBe(false)
    expect(renderBar().redModeButtons[0].props['aria-pressed']).toBe(false)
    click(renderBar().redModeButtons[0])
    expect(state().redMode).toBe(true)
    expect(renderBar().redModeButtons[0].props['aria-pressed']).toBe(true)
  })
})

describe('ukryte: zmiana nocy w Kadrze', () => {
  it('hidden_p6_november_night_from_follow_now: „Teraz” włączone, w Kadrze noc 2026-11-12 → „Teraz” wyłączone, kursor jak w Ustawieniach', () => {
    const now = local('2026-10-20T20:40')
    resetState({ tab: 'settings' })
    state().goNow(now)
    change(renderBar().dateInputs[0], '2026-11-12')
    const expectedCursor = state().cursorMs

    resetState({ tab: 'framing' })
    state().goNow(now)
    expect(state().followNow).toBe(true)
    change(renderBar().dateInputs[0], '2026-11-12')
    expect(state().nightDate).toBe('2026-11-12')
    expect(state().followNow).toBe(false)
    expect(state().cursorMs).toBe(expectedCursor)
    expect(renderBar().markup).toContain('12/13.11.2026')

    setTab('catalog')
    const row = cursorRow(renderBar())
    expect(row.range.props.value).toBe(expectedCursor)
    expect(row.now.props['aria-pressed']).toBe(false)
  })
})

describe('ukryte: kursor po Kadrze', () => {
  it('hidden_p7_cursor_2140_via_settings: Ustawienia, kursor 21:40 → Kadr → Ustawienia: kursor 21:40', () => {
    resetState({ tab: 'settings' })
    const target = local('2026-10-20T21:40')
    change(cursorRow(renderBar()).range, String(target))
    setTab('framing')
    renderBar()
    setTab('settings')
    const row = cursorRow(renderBar())
    expect(state().cursorMs).toBe(target)
    expect(state().followNow).toBe(false)
    expect(row.range.props.value).toBe(target)
    expect(outputText(row.output)).toContain('21:40')
  })

  it('hidden_p8_two_ticks_in_framing: „Teraz” w Kadrze przez dwa odświeżenia → w Katalogu „Teraz” wciśnięty, godzina 00:07', () => {
    const now = local('2026-10-21T00:05')
    resetState({ tab: 'catalog' })
    state().goNow(now)
    setTab('framing')
    state().goNow(now + 60_000)
    state().goNow(now + 120_000)
    expect(state().followNow).toBe(true)
    setTab('catalog')
    const row = cursorRow(renderBar())
    expect(row.now.props['aria-pressed']).toBe(true)
    expect(row.range.props.value).toBe(now + 120_000)
    expect(outputText(row.output)).toContain('00:07')
  })

  it('hidden_p9_framing_to_night_and_settings: Kadr → Noc i Kadr → Ustawienia pokazują wiersz kursora od razu', () => {
    const cursor = local('2026-10-21T02:20')
    for (const tab of ['night', 'settings'] as const) {
      resetState({ tab: 'framing', cursorMs: cursor })
      expect(renderBar().ranges).toHaveLength(0)
      setTab(tab)
      const row = cursorRow(renderBar())
      expect(row.range.props.value).toBe(cursor)
      expect(outputText(row.output)).toContain('02:20')
    }
  })
})
