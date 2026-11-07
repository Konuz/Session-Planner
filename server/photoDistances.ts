import { XMLParser } from 'fast-xml-parser'
import type { DSO } from '../src/lib/catalog.ts'
import { adsUrl, catalogDistance, isStarOtype, redshiftDistance, simbadId } from '../src/lib/distance.ts'
import type { PhotoDistance, PhotoDistances } from '../src/lib/photo.ts'
import { readResponseText } from './readResponseText.ts'

const maxResponseBytes = 8 * 1024 * 1024
const lyPerUnit: Record<string, number> = { pc: 3.26156, kpc: 3261.56, Mpc: 3.26156e6 }
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
function number(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

interface SimbadResult { measurements: PhotoDistance[]; z: { value: number; bibcode: string; raDeg: number; decDeg: number } | null }

/** Pomiary odległości SIMBAD i dane obiektu (typ, przesunięcie ku czerwieni) w jednym zapytaniu. Gdy identyfikator
 *  należy w SIMBAD do gwiazdy (np. vdB 20–23, vdB 57), wartość dotyczy gwiazdy oświetlającej, nie mgławicy. */
async function simbadDistances(id: string, fetchImpl: typeof fetch, signal: AbortSignal): Promise<SimbadResult> {
  const query = `SELECT b.main_id, b.otype, b.ra, b.dec, b.rvz_redshift, b.rvz_qual, b.rvz_bibcode, d.dist, d.unit, d.minus_err, d.plus_err, d.method, d.bibcode, d.qual FROM ident AS i JOIN basic AS b ON b.oid = i.oidref LEFT OUTER JOIN mesDistance AS d ON d.oidref = b.oid WHERE i.id = '${id.replace(/'/g, "''")}'`
  // Oficjalna kopia SIMBAD; format i zawartość odpowiadają usłudze CDS.
  const url = new URL('https://simbad.idia.ac.za/simbad/sim-tap/sync')
  url.search = new URLSearchParams({ request: 'doQuery', lang: 'adql', format: 'json', query }).toString()
  const response = await fetchImpl(url, { signal })
  const body = JSON.parse(await readResponseText(response, maxResponseBytes)) as { metadata?: { name: string }[]; data?: unknown[][] }
  if (!Array.isArray(body.metadata) || !Array.isArray(body.data)) throw new Error('SIMBAD')
  const names = body.metadata.map((m) => m.name)
  if (!['main_id', 'otype', 'dist', 'unit', 'bibcode', 'qual'].every((name) => names.includes(name))) throw new Error('SIMBAD')
  const field = (row: unknown[], name: string) => row[names.indexOf(name)]
  const first = body.data[0]
  const mainId = first ? text(field(first, 'main_id')).replace(/\s+/g, ' ') : ''
  const star = first ? isStarOtype(text(field(first, 'otype'))) : false
  const zValue = first ? number(field(first, 'rvz_redshift')) : null
  const ra = first ? number(field(first, 'ra')) : null, dec = first ? number(field(first, 'dec')) : null
  // Jakość E: wartość niepewna.
  const z = zValue !== null && ra !== null && dec !== null && !star && text(field(first!, 'rvz_qual')) !== 'E'
    ? { value: zValue, bibcode: text(field(first!, 'rvz_bibcode')), raDeg: ra, decDeg: dec } : null
  const measurements = body.data.flatMap((row) => {
    const get = (name: string) => field(row, name)
    const dist = number(get('dist'))
    const factor = lyPerUnit[text(get('unit'))]
    if (dist === null || dist <= 0 || !factor || !Number.isFinite(dist * factor) || text(get('qual'))) return []
    const minus = number(get('minus_err')), plus = number(get('plus_err'))
    const symmetric = minus !== null && plus !== null && Math.abs(minus) === Math.abs(plus)
    const bibcode = text(get('bibcode')), method = text(get('method'))
    const errors = !symmetric && (minus !== null || plus !== null) ? `błąd −${minus === null ? '?' : Math.abs(minus)}/+${plus === null ? '?' : Math.abs(plus)} ${text(get('unit'))}` : ''
    return [{
      source: 'SIMBAD' as const, distLy: dist * factor, uncertaintyLy: symmetric ? Math.abs(plus) * factor : null, distanceScope: star ? 'illuminator' as const : 'object' as const,
      distanceMethod: [method || 'metoda niepodana', star ? `gwiazda ${mainId}` : '', errors].filter(Boolean).join(' · '),
      distanceSource: `SIMBAD — ${bibcode || 'publikacja niepodana'}`, distanceRef: bibcode, url: adsUrl(bibcode),
    }]
  })
  return { measurements, z }
}

/** Przesunięcie ku czerwieni z NED (ObjectLookup): NED zna też galaktyki bez wpisu w SIMBAD (np. IC 4282). */
async function nedRedshift(id: string, fetchImpl: typeof fetch, signal: AbortSignal): Promise<SimbadResult['z']> {
  const url = new URL('https://ned.ipac.caltech.edu/srs/ObjectLookup')
  url.search = new URLSearchParams({ name: id }).toString()
  const response = await fetchImpl(url, { signal })
  const body = JSON.parse(await readResponseText(response, maxResponseBytes)) as { ResultCode?: unknown; Preferred?: { Position?: { RA?: unknown; Dec?: unknown }; Redshift?: { Value?: unknown; RefCode?: unknown } } }
  if (typeof body.ResultCode !== 'number') throw new Error('NED')
  const value = number(body.Preferred?.Redshift?.Value)
  const ra = number(body.Preferred?.Position?.RA), dec = number(body.Preferred?.Position?.Dec)
  return value !== null && ra !== null && dec !== null ? { value, bibcode: text(body.Preferred?.Redshift?.RefCode), raDeg: ra, decDeg: dec } : null
}

function redshiftMeasurement(source: 'SIMBAD' | 'NED', z: NonNullable<SimbadResult['z']>): PhotoDistance[] {
  const d = redshiftDistance(z.value, z.raDeg, z.decDeg)
  if (!d) return []
  return [{
    source, distLy: d.distLy, uncertaintyLy: d.uncertaintyLy, distanceScope: 'redshift',
    distanceMethod: `z = ${z.value.toFixed(5).replace('.', ',')}, cz_CMB = ${Math.round(d.czCmb)} km/s, H₀ = 70 (oszacowanie pośrednie)`,
    distanceSource: `${source} — ${z.bibcode || 'publikacja niepodana'}`, distanceRef: z.bibcode, url: adsUrl(z.bibcode),
  }]
}

type XmlParam = { '@_name': string; '@_value': string }
interface NedTable {
  '@_ID': string
  GROUP?: { PARAM?: XmlParam[] }[]
  FIELD?: { '@_ID': string; '@_unit'?: string }[]
  DATA?: { TABLEDATA?: { TR?: { TD: string[] }[] } }
}
async function nedDistances(id: string, fetchImpl: typeof fetch, signal: AbortSignal): Promise<PhotoDistances> {
  const url = new URL('https://ned.ipac.caltech.edu/NED::API/DistancesOfObject')
  url.search = new URLSearchParams({ TARGET: id, MAXREC: '1000' }).toString()
  const response = await fetchImpl(url, { signal })
  const xml = await readResponseText(response, maxResponseBytes)
  // NED używa TABLEDATA, nie binarnej serializacji VOTable. Odrzucamy deklaracje encji.
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('NED')
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, isArray: (name) => ['RESOURCE', 'TABLE', 'GROUP', 'PARAM', 'FIELD', 'TR', 'TD', 'INFO'].includes(name) })
  const body = parser.parse(xml) as { VOTABLE?: { RESOURCE?: { TABLE?: NedTable[]; INFO?: XmlParam[] }[] } }
  const resources = body.VOTABLE?.RESOURCE ?? []
  if (resources.some((r) => r.INFO?.some((i) => i['@_name'] === 'QUERY_STATUS' && i['@_value'] === 'ERROR'))) throw new Error('NED')
  const table = resources.flatMap((r) => r.TABLE ?? []).find((t) => t['@_ID'] === 'distances')
  if (!table?.FIELD || !table.DATA || !('TABLEDATA' in table.DATA)) throw new Error('NED')
  const fields = table.FIELD
  if (!fields.some((f) => f['@_ID'] === 'distance' && f['@_unit'] === 'Mpc')) throw new Error('NED')
  const params = table.GROUP?.flatMap((g) => g.PARAM ?? []) ?? []
  const param = (name: string) => params.find((p) => p['@_name'] === name)?.['@_value']
  if (param('QUERY_STATUS') === 'ERROR') throw new Error('NED')
  const measurements = (table.DATA.TABLEDATA?.TR ?? []).flatMap((row) => {
    const get = (id: string) => row.TD[fields.findIndex((f) => f['@_ID'] === id)]
    const distance = number(get('distance'))
    if (distance === null || distance <= 0 || !Number.isFinite(distance * lyPerUnit.Mpc)) return []
    const bibcode = text(get('refcode')), method = text(get('method'))
    const error = number(get('dist_mod_err'))
    const notes = text(get('notes'))
    return [{
      source: 'NED' as const, distLy: distance * lyPerUnit.Mpc, uncertaintyLy: null, distanceScope: 'object' as const,
      distanceMethod: [method || 'metoda niepodana', error !== null ? `błąd modułu ${error} mag` : '', notes].filter(Boolean).join(' · '),
      distanceSource: `NED — ${bibcode || 'publikacja niepodana'}`, distanceRef: bibcode, url: adsUrl(bibcode),
    }]
  })
  const truncated = Number(param('RECORDS_AVAILABLE')) > Number(param('RECORDS_RETURNED'))
  return { measurements, warnings: truncated ? ['NED: lista pomiarów jest niepełna (limit usługi).'] : [] }
}

export async function loadPhotoDistances(object: DSO, fetchImpl: typeof fetch = fetch, signal: AbortSignal = AbortSignal.timeout(15_000)): Promise<PhotoDistances> {
  const timeout = AbortSignal.any([signal, AbortSignal.timeout(15_000)])
  const galaxy = object.type === 'G' || object.type === 'GG'
  const sid = simbadId(object.id)
  const none: SimbadResult = { measurements: [], z: null }
  const [simbad, ned, nedZ] = await Promise.allSettled([
    sid ? simbadDistances(sid, fetchImpl, timeout) : Promise.resolve(none),
    galaxy ? nedDistances(object.id, fetchImpl, timeout) : Promise.resolve<PhotoDistances>({ measurements: [], warnings: [] }),
    galaxy ? nedRedshift(object.id, fetchImpl, timeout) : Promise.resolve(null),
  ])
  const result: PhotoDistances = { measurements: [], warnings: [] }
  if (simbad.status === 'fulfilled') result.measurements.push(...simbad.value.measurements)
  else result.warnings.push('SIMBAD: nie udało się pobrać pomiarów. Spróbuj ponownie.')
  if (ned.status === 'fulfilled') { result.measurements.push(...ned.value.measurements); result.warnings.push(...ned.value.warnings) }
  else result.warnings.push('NED: nie udało się pobrać pomiarów. Spróbuj ponownie.')
  // Galaktyka bez pomiaru niezależnego od z: odległość z przesunięcia ku czerwieni jako oszacowanie pośrednie.
  if (galaxy && !result.measurements.length) {
    if (simbad.status === 'fulfilled' && simbad.value.z) result.measurements.push(...redshiftMeasurement('SIMBAD', simbad.value.z))
    if (nedZ.status === 'fulfilled' && nedZ.value) result.measurements.push(...redshiftMeasurement('NED', nedZ.value))
    else if (nedZ.status === 'rejected') result.warnings.push('NED: nie udało się pobrać przesunięcia ku czerwieni. Spróbuj ponownie.')
  }
  const unique = new Map(result.measurements.map((m) => [JSON.stringify([m.distanceSource, m.distanceMethod, m.distLy, m.uncertaintyLy]), m]))
  const year = (m: PhotoDistance) => Number(m.distanceRef.match(/^(\d{4})/)?.[1] ?? 0)
  result.measurements = [...unique.values()].sort((a, b) => year(b) - year(a))
  const catalog = catalogDistance(object)
  if (catalog.distLy !== null) result.measurements.unshift({ source: 'Katalog', distLy: catalog.distLy, uncertaintyLy: catalog.uncertaintyLy, distanceScope: catalog.distanceScope, distanceMethod: catalog.distanceMethod, distanceSource: catalog.distanceSource, distanceRef: catalog.distanceRef, url: adsUrl(catalog.distanceRef) })
  return result
}
