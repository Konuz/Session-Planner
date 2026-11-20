import { beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
import { parseCatalog } from '../lib/catalog'
import { nightPhases } from '../lib/night'
import { fmtDec, fmtRa } from '../lib/format'
import { useStore } from '../state/store'
import { download, exposureCsv, schedulerCsv } from '../lib/nina'
import { readSavedPlan } from '../lib/planImport'
import PlannerView from './PlannerView'

const fixture = vi.hoisted(() => ({ catalog: [] as ReturnType<typeof parseCatalog>, night: null as ReturnType<typeof nightPhases> | null }))
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useMemo: (fn: () => unknown) => fn(),
  useCallback: (fn: unknown) => fn,
  useEffect: () => {},
  useRef: (value: unknown) => ({ current: value }),
  useState: (value: unknown) => [value, () => {}],
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
  useDebugValue: () => {},
}))
vi.mock('zustand/react/shallow', () => ({ useShallow: (select: unknown) => select }))
vi.mock('../state/data', () => ({
  useCatalog: () => ({ catalog: fixture.catalog, error: null }),
  useSite: () => ({ latDeg: 51.09, lonDeg: 17.29, elevationM: 130 }),
  useNight: () => fixture.night ?? nightPhases('2026-10-22', { latDeg: 51.09, lonDeg: 17.29, elevationM: 130 }, 'Europe/Warsaw'),
}))
vi.mock('../lib/nina', async (original) => ({ ...await original<typeof import('../lib/nina')>(), download: vi.fn() }))
vi.mock('../state/store', async (original) => {
  const actual = await original<typeof import('../state/store')>()
  return { ...actual, useStore: Object.assign((select: (s: ReturnType<typeof actual.useStore.getState>) => unknown) => select(actual.useStore.getState()), actual.useStore) }
})

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const el = node as ReactElement<Record<string, unknown>>
  return [el, ...elements(el.props.children as ReactNode)]
}

beforeEach(() => {
  vi.mocked(download).mockClear()
  fixture.night = null
  const rows: Parameters<typeof parseCatalog>[0] = [
    ['M 51', '', 'Wir', '', 'G', 202.47, 47.2, 10, 8, 0, 8, 20, 'CVn', 0, '', ''],
    ['M 42', '', 'Orion', '', 'EN', 83.82, -5.39, 60, 50, 0, 4, 20, 'Ori', 0, '', ''],
  ]
  fixture.catalog = parseCatalog(rows)
  useStore.setState({ plan: [], selectedIndex: null })
  useStore.getState().addToPlan(0, 'M 51')
  useStore.getState().addToPlan(1, 'M 42')
  const first = useStore.getState().plan[0]
  useStore.getState().updatePlan(first.key, { framing: { raDeg: 200, decDeg: 48, paDeg: 20, mosaic: { cols: 2, rows: 1, overlapPct: 15 } } })
})

it('TXT celu po mozaice zachowuje nazwę i środek własnego celu mimo permutacji katalogu', () => {
  fixture.catalog = fixture.catalog.toReversed().map((o, i) => ({ ...o, i }))
  const tree = elements(PlannerView())
  const button = tree.find((el) => el.type === 'button' && JSON.stringify(el.props.children).includes('Plan nocy TXT'))!
  ;(button.props.onClick as () => void)()
  const text = vi.mocked(download).mock.calls[0][1]
  expect(text).toContain('1. M 51 Wir')
  expect(text).toContain(`Środek: RA ${fmtRa(200)}, Dec ${fmtDec(48)}, PA 20°`)
  expect(text).toContain('2. M 42 Orion')
  expect(text).toContain(`Środek: RA ${fmtRa(83.82)}, Dec ${fmtDec(-5.39)}, PA 0°`)
  expect(text).not.toContain('Panel 2')

  const csvButton = tree.find((el) => el.type === 'button' && JSON.stringify(el.props.children).includes('Pobierz CSV'))!
  ;(csvButton.props.onClick as () => void)()
  const csv = vi.mocked(download).mock.calls[1][1]
  expect(csv).toContain('M 51 Wir Panel 1,')
  expect(csv).toContain('M 51 Wir Panel 2,')
  expect(csv).toContain('M 42 Orion,')
})

it('brakujące ID i stary zapis bez ID nie są zastępowane obiektem o dawnym indeksie', () => {
  fixture.catalog = fixture.catalog.filter((o) => o.id !== 'M 51')
  const missing = useStore.getState().plan[0]
  useStore.getState().updatePlan(missing.key, { objectId: '' })
  const tree = elements(PlannerView())
  expect(tree.filter((el) => el.type === 'section' && String(el.props['aria-label']).startsWith('Cel '))).toHaveLength(1)
  expect(tree.some((el) => el.props.role === 'alert')).toBe(true)
})

it('wczytuje wcześniejsze pliki TXT i NINA z planera, dopisując cele do aktualnego planu', async () => {
  const before = useStore.getState().plan
  const startMs = Date.UTC(2026, 9, 22, 22, 30)
  const endMs = Date.UTC(2026, 9, 22, 23, 30)
  useStore.getState().updatePlan(before[0].key, { startMs, endMs, note: 'Mgławica po północy', exposures: [{ filter: 'L', count: 12, seconds: 90 }] })
  fixture.catalog = fixture.catalog.toReversed().map((o, i) => ({ ...o, i }))
  const tree = elements(PlannerView())
  const button = tree.find((el) => el.type === 'button' && el.props.children === 'Plan nocy TXT')!
  ;(button.props.onClick as () => void)()
  const csvButton = tree.find((el) => el.type === 'button' && el.props.children === 'Pobierz CSV')!
  ;(csvButton.props.onClick as () => void)()
  const [text, csv] = vi.mocked(download).mock.calls.map((call) => call[1])
  const txtTargets = readSavedPlan(text, fixture.catalog, 'OSC')
  expect(txtTargets[0]).toMatchObject({
    objectId: 'M 51', objectIndex: 1, note: 'Mgławica po północy', framing: { decDeg: 48, paDeg: 20 },
    exposures: [{ filter: 'L', count: 12, seconds: 90 }],
  })
  expect(txtTargets[0].framing.raDeg).toBeCloseTo(200, 2)
  expect(txtTargets[0]).toMatchObject({ startMs, endMs })
  expect(readSavedPlan(csv, fixture.catalog, 'OSC').map((target) => target.objectId)).toEqual(['M 51', 'M 51', 'M 42'])

  const input = tree.find((el) => el.type === 'input' && el.props.type === 'file')!
  const upload = (content: string) =>
    (input.props.onChange as (event: unknown) => Promise<void>)({
      currentTarget: { files: [new File([content], 'plan.txt')], value: 'plan.txt' },
    })
  await upload(text)
  expect(useStore.getState().plan.slice(2)).toMatchObject(txtTargets)
  const imported = useStore.getState().plan
  expect(imported.slice(0, 2).map((item) => item.key)).toEqual(before.map((item) => item.key))
  await upload('uszkodzony plik')
  expect(useStore.getState().plan).toBe(imported)
})

it('odtwarza kadry z Target Scheduler, a z wykazu ekspozycji grupuje filtry i przywraca czas UTC', () => {
  const target = {
    name: 'M 42 Orion, "Wielki"', type: 'Mgławica', raDeg: 84, decDeg: -5.5, paDeg: 60,
    exposures: [{ filter: 'Ha', count: 12, seconds: 240 }, { filter: 'OIII', count: 8, seconds: 180 }],
    startMs: Date.UTC(2026, 9, 22, 23, 0), endMs: Date.UTC(2026, 9, 23, 1, 0),
    note: '="wysoka chmura",\r\nsprawdź ponownie',
  }
  const framing = { raDeg: 84, decDeg: -5.5, paDeg: 60 }
  expect(readSavedPlan(schedulerCsv([target]), fixture.catalog, 'OSC')).toEqual([
    expect.objectContaining({ objectId: 'M 42', framing, filters: 'OSC' }),
  ])
  expect(readSavedPlan(exposureCsv([{ ...target, name: 'M 42 Orion' }], 'Europe/Warsaw'), fixture.catalog, 'OSC')).toEqual([
    expect.objectContaining({
      objectId: 'M 42', framing, exposures: target.exposures, note: target.note, startMs: target.startMs, endMs: target.endMs,
    }),
  ])
  expect(() => readSavedPlan(schedulerCsv([{ ...target, name: 'M 99' }]), fixture.catalog, 'OSC')).toThrow('Brak celu')
})

it('dzień polarny: planer pokazuje brak ciemnej nocy zamiast fikcyjnego okna 18:00–06:00 (B05)', () => {
  fixture.night = nightPhases('2026-06-21', { latDeg: 69.65, lonDeg: 18.96, elevationM: 0 }, 'Europe/Oslo')
  const tree = elements(PlannerView())
  expect(tree.some((el) => el.type === 'small' && el.props.children === 'dzień polarny')).toBe(true)
  expect(tree.some((el) => el.props.role === 'status' && JSON.stringify(el.props.children).includes('Brak dostępnego okna obserwacji.'))).toBe(true)
  const button = tree.find((el) => el.type === 'button' && JSON.stringify(el.props.children).includes('Plan nocy TXT'))!
  ;(button.props.onClick as () => void)()
  expect(vi.mocked(download).mock.calls[0][1]).toContain('Ciemne okno: brak (dzień polarny)')
})
