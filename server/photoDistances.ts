import { XMLParser } from 'fast-xml-parser'
import type { DSO } from '../src/lib/catalog.ts'
import type { PhotoDistance, PhotoDistances } from '../src/lib/photo.ts'

const lyPerUnit: Record<string, number> = { pc: 3.26156, kpc: 3261.56, Mpc: 3.26156e6 }
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
function number(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
const publication = (bibcode: string) => bibcode ? `https://ui.adsabs.harvard.edu/abs/${encodeURIComponent(bibcode)}/abstract` : ''

async function simbadDistances(id: string, fetchImpl: typeof fetch, signal: AbortSignal): Promise<PhotoDistance[]> {
  const query = `SELECT d.dist, d.unit, d.minus_err, d.plus_err, d.method, d.bibcode, d.qual FROM mesDistance AS d JOIN ident AS i ON d.oidref = i.oidref WHERE i.id = '${id.replace(/'/g, "''")}' ORDER BY bibcode DESC`
  // Oficjalna kopia SIMBAD; format i zawartość odpowiadają usłudze CDS.
  const url = new URL('https://simbad.idia.ac.za/simbad/sim-tap/sync')
  url.search = new URLSearchParams({ request: 'doQuery', lang: 'adql', format: 'json', query }).toString()
  const response = await fetchImpl(url, { signal })
  if (!response.ok) throw new Error('SIMBAD')
  const body = await response.json() as { metadata?: { name: string }[]; data?: unknown[][] }
  if (!Array.isArray(body.metadata) || !Array.isArray(body.data)) throw new Error('SIMBAD')
  const names = body.metadata.map((m) => m.name)
  if (!['dist', 'unit', 'bibcode', 'qual'].every((name) => names.includes(name))) throw new Error('SIMBAD')
  return body.data.flatMap((row) => {
    const get = (name: string) => row[names.indexOf(name)]
    const dist = number(get('dist'))
    const factor = lyPerUnit[text(get('unit'))]
    if (dist === null || dist <= 0 || !factor || !Number.isFinite(dist * factor) || text(get('qual'))) return []
    const minus = number(get('minus_err')), plus = number(get('plus_err'))
    const symmetric = minus !== null && plus !== null && Math.abs(minus) === Math.abs(plus)
    const bibcode = text(get('bibcode')), method = text(get('method'))
    const errors = !symmetric && (minus !== null || plus !== null) ? `; błąd −${minus === null ? '?' : Math.abs(minus)}/+${plus === null ? '?' : Math.abs(plus)} ${text(get('unit'))}` : ''
    return [{ source: 'SIMBAD' as const, distLy: dist * factor, uncertaintyLy: symmetric ? Math.abs(plus) * factor : null, distanceSource: `SIMBAD — ${bibcode || 'publikacja niepodana'}${method ? ` — ${method}` : ''}${errors}`, url: publication(bibcode) }]
  })
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
  if (!response.ok) throw new Error('NED')
  const xml = await response.text()
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
    return [{ source: 'NED' as const, distLy: distance * lyPerUnit.Mpc, uncertaintyLy: null, distanceSource: `NED — ${bibcode || 'publikacja niepodana'}${method ? ` — ${method}` : ''}${error !== null ? `; błąd modułu ${error} mag` : ''}${notes ? ` — ${notes}` : ''}`, url: publication(bibcode) }]
  })
  const truncated = Number(param('RECORDS_AVAILABLE')) > Number(param('RECORDS_RETURNED'))
  return { measurements, warnings: truncated ? ['NED: lista pomiarów jest niepełna (limit usługi).'] : [] }
}

export async function loadPhotoDistances(object: DSO, fetchImpl: typeof fetch = fetch, signal: AbortSignal = AbortSignal.timeout(15_000)): Promise<PhotoDistances> {
  const timeout = AbortSignal.any([signal, AbortSignal.timeout(15_000)])
  const jobs: [PhotoDistance['source'], Promise<PhotoDistances>][] = [
    ['SIMBAD', simbadDistances(object.id, fetchImpl, timeout).then((measurements) => ({ measurements, warnings: [] }))],
  ]
  if (object.type === 'G' || object.type === 'GG') jobs.push(['NED', nedDistances(object.id, fetchImpl, timeout)])
  const result: PhotoDistances = { measurements: object.distLy ? [{ source: 'Wikidata', distLy: object.distLy, uncertaintyLy: null, distanceSource: 'Wikidata — katalog aplikacji', url: '' }] : [], warnings: [] }
  const results = await Promise.allSettled(jobs.map(([, job]) => job))
  results.forEach((item, i) => {
    if (item.status === 'fulfilled') { result.measurements.push(...item.value.measurements); result.warnings.push(...item.value.warnings) }
    else result.warnings.push(`${jobs[i][0]}: nie udało się pobrać pomiarów. Spróbuj ponownie.`)
  })
  const unique = new Map(result.measurements.map((m) => [JSON.stringify([m.distanceSource, m.distLy, m.uncertaintyLy]), m]))
  result.measurements = [...unique.values()].sort((a, b) => {
    const year = (m: PhotoDistance) => Number(m.distanceSource.match(/\b(\d{4})[A-Za-z]/)?.[1] ?? 0)
    return year(b) - year(a)
  })
  return result
}
