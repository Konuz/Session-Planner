import { describe, expect, it, vi } from 'vitest'
import { loadPhotoCatalogObjects } from '../../server/photoCatalogObjects'
import type { ProjectStars } from '../../server/photoStars'
import { mergePhotoCatalogCuts, type PhotoCut } from './photo'

const tsv = (columns: string, ...rows: string[]) => new Response([
  '#RESOURCE=fixture', columns, '\t'.repeat(columns.split('\t').length - 1),
  columns.split('\t').map(() => '-----').join('\t'), ...rows,
].join('\n'))

const coordinates = '_RAJ2000\t_DEJ2000'
const project: ProjectStars = async (points) => ({
  raDeg: 195, decDeg: 28, radiusDeg: 1,
  pixels: points.map(([ra]) => ra === 195.5 ? [101, 50] : [50, 50]),
})
const fetchCatalogs = vi.fn<typeof fetch>(async (input) => {
  const source = new URL(String(input)).searchParams.get('-source')
  if (source === 'VII/237/pgc') return tsv(`PGC\tOType\tlogD25\tANames\t${coordinates}`,
    '123\tG\t1\tNGC 1234\t195.1\t28', '124\tG\t1\t\t195.5\t28', '125\tM\t1\t\t195.2\t28')
  if (source === 'VII/289/dr16q') return tsv(`SDSS\tz\t${coordinates}`,
    '130000.00+280000.0\t2.1\t195\t28')
  if (source === 'VII/110A/table3') return tsv(`ACO\tz\t${coordinates}`, '1656\t0.0231\t195\t28')
  if (source === 'VII/110A/table4') return tsv(`ACO\tz\tu_z\t${coordinates}`, '3000\t0.1\t)\t195\t28', '3001\t0.1\t\t195\t28')
  if (source === 'VII/110A/table5') return tsv(`ACOS\tz\tu_z\t${coordinates}`, '1\t\t\t195\t28')
  return new Response(null, { status: 404 })
})

describe('dodatkowe katalogi zdjęcia', () => {
  it('rzutuje obiekty, pomija środki poza kadrem i zachowuje pochodzenie pomiaru', async () => {
    const primary = { id: 'NGC 1234', type: 'G' as const, aliases: ['IC 123'], raDeg: 195.1, decDeg: 28 }
    const alias = { ...primary, id: 'IC 123', aliases: ['PGC 123'], photoPrimaryId: primary.id }
    const catalog = new Map([[primary.id, primary], [alias.id, alias]])
    const { cuts, warnings, complete } = await loadPhotoCatalogObjects(100, 100, project, catalog, fetchCatalogs, new AbortController().signal)
    expect(complete).toBe(true)
    expect(warnings).toEqual([])
    expect(cuts.map((cut) => cut.id)).toEqual(['NGC 1234', 'SDSS J130000.00+280000.0', 'ACO 1656', 'ACO 3000', 'ACO 3001', 'ACO S1'])
    expect(cuts[0].catalogMatch).toMatchObject({ kind: 'PGC', id: 'PGC 123' })
    expect(cuts[1].distLy).toBeCloseTo(17.36e9, -8)
    expect(cuts[1].catalogMatch?.distance).toMatchObject({ distanceScope: 'redshift', distanceRef: '2020ApJS..250....8L' })
    expect(cuts[2].distLy).toBeCloseTo(320985811, -3)
    expect(cuts[2].distanceMethod).toContain('z katalogowe')
    expect(cuts[3].distLy).toBeNull()
    expect(cuts[4].catalogMatch?.distance?.distanceRef).toBe('1989ApJS...70....1A')
    expect(cuts[5].distLy).toBeNull()
  })

  it('zwraca dostępne wyniki mimo awarii jednego katalogu', async () => {
    const fetchPartial: typeof fetch = (input, init) => String(input).includes('VII%2F289')
      ? Promise.resolve(new Response('awaria', { status: 503 })) : fetchCatalogs(input, init)
    const result = await loadPhotoCatalogObjects(100, 100, project, new Map(), fetchPartial, new AbortController().signal)
    expect(result.cuts.some(({ id }) => id === 'PGC 123')).toBe(true)
    expect(result.complete).toBe(false)
    expect(result.warnings.join(' ')).toContain('kwazar')
  })

  it('po błędzie bazy w odpowiedzi HTTP 200 pobiera brakujący katalog z kolejnego lustra', async () => {
    const fetchWithMirrors = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input))
      if (url.searchParams.get('-source') !== 'VII/237/pgc' || url.hostname === 'vizier.china-vo.org') return fetchCatalogs(input, init)
      if (url.hostname === 'vizier.cfa.harvard.edu') return new Response('#INFO\tError=Postgres connect error\t')
      return new Response('Niedostępny', { status: 503 })
    })
    const result = await loadPhotoCatalogObjects(100, 100, project, new Map(), fetchWithMirrors, new AbortController().signal)
    expect(result.complete).toBe(true)
    expect(result.warnings).toEqual([])
    expect(result.cuts.map(({ id }) => id)).toContain('PGC 123')
    const retries = fetchWithMirrors.mock.calls.slice(5).map(([url]) => new URL(String(url)))
    expect(retries.at(-1)?.hostname).toBe('vizier.china-vo.org')
    expect(retries.every((url) => url.search === new URL(String(fetchWithMirrors.mock.calls[0][0])).search)).toBe(true)
  })

  it('scala PGC po potwierdzonym oznaczeniu ESO i odrzuca sporny alias', async () => {
    const catalog = new Map([
      ['ESO 121-006', { id: 'ESO 121-006', type: 'G' as const, aliases: [], raDeg: 195.1, decDeg: 28 }],
      ['UGC 7', { id: 'UGC 7', type: 'G' as const, aliases: [], raDeg: 195.2, decDeg: 28 }],
    ])
    const fetchAliases: typeof fetch = (input, init) => String(input).includes('VII%2F237')
      ? Promise.resolve(tsv(`PGC\tOType\tlogD25\tANames\t${coordinates}`,
        '18437\tG\t1\tESO121-6\t195.1\t28', '42\tG\t1\tUGC00007?\t195.2\t28'))
      : fetchCatalogs(input, init)
    const { cuts } = await loadPhotoCatalogObjects(100, 100, project, catalog, fetchAliases, new AbortController().signal)
    expect(cuts.filter((cut) => cut.catalogMatch?.kind === 'PGC').map((cut) => cut.id)).toEqual(['ESO 121-006', 'PGC 42'])
  })

  it('przy ponowieniu zachowuje wybraną odległość, geometrię i widoczność', () => {
    const existing = { id: 'M 31', enabled: false, radius: 80, distLy: 123, distanceOrigin: 'user' } as PhotoCut
    const candidate = { id: 'M 31', enabled: true, radius: 10, distLy: null, catalogMatch: { kind: 'PGC', id: 'PGC 2557' } } as PhotoCut
    const merged = mergePhotoCatalogCuts([existing], [candidate, candidate])
    expect(merged).toEqual([{ ...existing, catalogMatch: candidate.catalogMatch }])
    expect(mergePhotoCatalogCuts(merged, [candidate])).toBe(merged)
  })
})
