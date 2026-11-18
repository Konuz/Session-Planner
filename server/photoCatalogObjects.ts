import type { DSO } from '../src/lib/catalog.ts'
import { adsUrl, comovingDistanceLy, NO_DISTANCE, redshiftDistance, separationDeg } from '../src/lib/distance.ts'
import type { PhotoCatalogKind, PhotoCatalogResult, PhotoCut, PhotoDistance } from '../src/lib/photo.ts'
import { firstCatalogResponse } from './catalogMirrors.ts'
import type { ProjectStars } from './photoStars.ts'
import { readResponseText } from './readResponseText.ts'

const vizierMirrors = [
  { url: 'https://vizier.cfa.harvard.edu/viz-bin/asu-tsv', timeoutMs: 7_000 },
  { url: 'https://vizier.cds.unistra.fr/viz-bin/asu-tsv', timeoutMs: 5_000 },
  { url: 'https://vizier.idia.ac.za/viz-bin/asu-tsv', timeoutMs: 6_000 },
  { url: 'http://vizier.china-vo.org/viz-bin/asu-tsv', timeoutMs: 12_000 },
]
const limit = 300
const sources = [
  { kind: 'PGC', table: 'VII/237/pgc', column: 'PGC', fields: 'OType,logD25,ANames', label: 'PGC' },
  { kind: 'QSO', table: 'VII/289/dr16q', column: 'SDSS', fields: 'z', label: 'kwazary SDSS' },
  { kind: 'ACO', table: 'VII/110A/table3', column: 'ACO', fields: 'z', label: 'ACO (północ)' },
  { kind: 'ACO', table: 'VII/110A/table4', column: 'ACO', fields: 'z,u_z', label: 'ACO (południe)' },
  { kind: 'ACO', table: 'VII/110A/table5', column: 'ACOS', fields: 'z,u_z', label: 'ACO S' },
] as const

type Source = typeof sources[number]
type LocalObject = Pick<DSO, 'id' | 'type' | 'aliases' | 'raDeg' | 'decDeg' | 'photoPrimaryId'>

function number(value: string | undefined): number | null {
  return value && Number.isFinite(Number(value)) ? Number(value) : null
}

export function photoCatalogType(id: string): 'G' | 'GG' | null {
  if (/^ACO (?:S)?[1-9]\d{0,3}$/.test(id)) return 'GG'
  if (/^PGC [1-9]\d{0,6}$/.test(id) || /^SDSS J\d{6}\.\d{2}[+-]\d{6}\.\d$/.test(id)) return 'G'
  return null
}

async function vizierRows(source: Source, raDeg: number, decDeg: number, radiusDeg: number, fetchImpl: typeof fetch, signal: AbortSignal) {
  const params = new URLSearchParams({
    '-source': source.table, '-c': `${raDeg.toFixed(8)} ${decDeg >= 0 ? '+' : ''}${decDeg.toFixed(8)}`,
    '-c.rd': radiusDeg.toFixed(8), '-out': `${source.column},${source.fields}`,
    '-out.add': '_RAJ,_DEJ', '-oc.form': 'd', '-sort': '_r', '-out.max': String(limit + 1),
  })
  return firstCatalogResponse(vizierMirrors, signal, async ({ url }, attempt) => {
    const response = await fetchImpl(new URL(`${url}?${params}`), { signal: attempt })
    return parseVizierRows(await readResponseText(response, 512 * 1024), source)
  })
}

function parseVizierRows(text: string, source: Source) {
  if (/^#(?:ERROR\b|INFO\s+[^\n]*(?:QUERY_STATUS\s*=\s*ERROR|Error=))/im.test(text)) throw new Error('VizieR')
  const lines = text.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith('#'))
  if (!lines.length && text.includes('VizieR Astronomical Server') && /^#(?:Name:|RESOURCE=)/m.test(text)) return []
  const columns = lines[0]?.split('\t').map((part) => part.trim()) ?? []
  if (![source.column, '_RAJ2000', '_DEJ2000', ...source.fields.split(',')].every((field) => columns.includes(field))) throw new Error('VizieR')
  // Po nagłówku są jednostki (czasem same spacje) i linia kresek.
  const separator = lines.findIndex((line, i) => i > 0 && /^[-\t ]+$/.test(line) && line.includes('-'))
  if (separator < 0) throw new Error('VizieR')
  return lines.slice(separator + 1).map((line) => {
    const cells = line.split('\t')
    return Object.fromEntries(columns.map((column, i) => [column, cells[i]?.trim() ?? '']))
  })
}

function designationKey(id: string): string {
  return id.toUpperCase().replace(/\s/g, '')
    .replace(/^LEDA(?=\d)/, 'PGC')
    .replace(/^(PGC|NGC|IC|M|ESO|UGC|UGCA|ARP)0+(?=\d)/, '$1')
    .replace(/^(ESO\d+-)0+(?=\d)/, '$1')
}

function catalogDistance(kind: PhotoCatalogKind, z: number | null, raDeg: number, decDeg: number): PhotoDistance | undefined {
  if (z === null || z <= 0 || z > 10) return undefined
  const quasar = kind === 'QSO'
  // Północne z w ACO są podane względem Grupy Lokalnej, a południowe pochodzą z różnych źródeł.
  const distLy = quasar ? redshiftDistance(z, raDeg, decDeg)?.distLy : z >= 0.01 ? comovingDistanceLy(z) : undefined
  if (distLy === undefined) return undefined
  const ref = quasar ? '2020ApJS..250....8L' : '1989ApJS...70....1A'
  const redshift = quasar ? 'z' : 'z katalogowe (bez transformacji do CMB)'
  return {
    source: 'Katalog', distLy, uncertaintyLy: null, distanceScope: 'redshift',
    distanceMethod: `Odległość współporuszająca, ${redshift} = ${String(z).replace('.', ',')}, H₀ = 70, Ωₘ = 0,3`,
    distanceSource: quasar ? 'SDSS DR16Q (Lyke i in. 2020)' : 'ACO (Abell, Corwin i Olowin 1989)',
    distanceRef: ref, url: adsUrl(ref),
  }
}

export async function loadPhotoCatalogObjects(
  width: number, height: number, project: ProjectStars, catalog: ReadonlyMap<string, LocalObject>, fetchImpl: typeof fetch, signal: AbortSignal,
): Promise<PhotoCatalogResult> {
  const { raDeg, decDeg, radiusDeg } = await project([])
  if (!Number.isFinite(radiusDeg) || radiusDeg <= 0 || radiusDeg > 10) {
    throw new RangeError('Dodatkowe katalogi obsługują pola o promieniu do 10°.')
  }
  if (!Number.isFinite(raDeg) || !Number.isFinite(decDeg)) throw new RangeError('Niepoprawne współrzędne kadru.')
  const results = await Promise.allSettled(sources.map((source) => vizierRows(source, raDeg, decDeg, radiusDeg, fetchImpl, signal)))
  signal.throwIfAborted()
  const complete = results.every((result) => result.status === 'fulfilled')
  const warnings: string[] = []
  const aliases = new Map<string, LocalObject[]>()
  for (const object of catalog.values()) {
    if (object.type !== 'G') continue
    for (const name of new Set([object.id, ...object.aliases].map(designationKey))) {
      const matches = aliases.get(name)
      if (matches) matches.push(object)
      else aliases.set(name, [object])
    }
  }
  const candidates = results.flatMap((result, i) => {
    const source = sources[i]
    if (result.status === 'rejected') {
      warnings.push(`Nie udało się pobrać katalogu ${source.label}. Spróbuj ponownie.`)
      return []
    }
    if (result.value.length > limit) warnings.push(`Katalog ${source.label} ograniczono do ${limit} wyników najbliższych środka kadru.`)
    return result.value.slice(0, limit).flatMap((row) => {
      const raDeg = number(row._RAJ2000), decDeg = number(row._DEJ2000)
      if (raDeg === null || decDeg === null || raDeg < 0 || raDeg >= 360 || Math.abs(decDeg) > 90) return []
      const value = row[source.column]
      const id = source.kind === 'QSO' ? `SDSS J${value.replace(/^J/, '')}`
        : `${source.kind} ${source.column === 'ACOS' ? 'S' : ''}${value.replace(/^0+/, '')}`
      const type = photoCatalogType(id)
      if (!type || (source.kind === 'PGC' && !['G', 'GM'].includes(row.OType))) return []
      const recorded = source.kind === 'PGC' || row.u_z ? undefined : catalogDistance(source.kind, number(row.z), raDeg, decDeg)
      const logSize = number(row.logD25)
      const diameterArcmin = source.kind === 'PGC' && logSize !== null && logSize < 4 ? 10 ** logSize / 10 : 0
      // Nawiasy oznaczają cały układ, a ? i ! oznaczają sporne lub przeniesione identyfikacje.
      const keys = [id, ...(row.ANames?.split(/\s{2,}/) ?? []).filter((name) => !/[()?!]/.test(name))]
      const matches = source.kind === 'PGC' ? new Set(keys.flatMap((name) => aliases.get(designationKey(name)) ?? [])
        .filter((object) => separationDeg(raDeg, decDeg, object.raDeg, object.decDeg) <= 1 / 60)
        .map((object) => catalog.get(object.photoPrimaryId ?? '') ?? object)) : null
      const local = matches?.size === 1 ? [...matches][0] : undefined
      return [{ id, kind: source.kind, type, raDeg, decDeg, local, recorded, diameterArcmin }]
    })
  })
  if (!candidates.length) return { cuts: [], warnings, complete }
  const { pixels } = await project(candidates.map(({ raDeg, decDeg }) => [raDeg, decDeg]))
  const cuts = candidates.flatMap((candidate, i): PhotoCut[] => {
    const pixel = pixels[i]
    if (!pixel) return []
    const [x, y] = pixel
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x >= width || y < 0 || y >= height) return []
    const { recorded, local } = candidate
    const radius = Math.max(10, Math.min(Math.max(width, height), candidate.diameterArcmin * Math.hypot(width, height) / (240 * radiusDeg)))
    return [{
      id: local?.id ?? candidate.id, type: candidate.type, raDeg: local?.raDeg ?? candidate.raDeg, decDeg: local?.decDeg ?? candidate.decDeg,
      x, y, radius, enabled: true, ...NO_DISTANCE,
      ...(recorded && { distLy: recorded.distLy, distanceScope: recorded.distanceScope, distanceMethod: recorded.distanceMethod,
        distanceSource: recorded.distanceSource, distanceRef: recorded.distanceRef }),
      catalogMatch: { kind: candidate.kind, id: candidate.id, distance: recorded },
    }]
  })
  return { cuts, warnings, complete }
}
