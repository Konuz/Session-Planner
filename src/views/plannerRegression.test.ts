import { beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
import { parseCatalog } from '../lib/catalog'
import { nightPhases } from '../lib/night'
import { fmtDec, fmtRa } from '../lib/format'
import { useStore } from '../state/store'
import { download } from '../lib/nina'
import PlannerView from './PlannerView'

const fixture = vi.hoisted(() => ({ catalog: [] as ReturnType<typeof parseCatalog> }))
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useMemo: (fn: () => unknown) => fn(),
  useCallback: (fn: unknown) => fn,
  useState: (value: unknown) => [value, () => {}],
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
  useDebugValue: () => {},
}))
vi.mock('zustand/react/shallow', () => ({ useShallow: (select: unknown) => select }))
vi.mock('../state/data', () => ({
  useCatalog: () => ({ catalog: fixture.catalog, error: null }),
  useSite: () => ({ latDeg: 51.09, lonDeg: 17.29, elevationM: 130 }),
  useNight: () => nightPhases('2026-10-22', { latDeg: 51.09, lonDeg: 17.29, elevationM: 130 }, 'Europe/Warsaw'),
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
