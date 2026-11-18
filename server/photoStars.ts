import type { PhotoStar } from '../src/lib/photo.ts'
import { firstCatalogResponse } from './catalogMirrors.ts'
import { readResponseText } from './readResponseText.ts'

const gavoTap = 'https://dc.zah.uni-heidelberg.de/tap/sync'
const esaTap = 'https://gea.esac.esa.int/tap-server/tap/sync'
const starSources = [
  { url: gavoTap, table: 'gaia.dr3lite', timeoutMs: 24_000 },
  { url: 'https://data.xao.ac.cn/tap/sync', table: 'gaia.dr3lite', timeoutMs: 12_000 },
  { url: esaTap, table: 'gaiadr3.gaia_source', timeoutMs: 12_000 },
] as const
type StarSource = typeof starSources[number]
// Te same odległości Bailer-Jones et al. 2021 (EDR3) są dostępne pod różnymi nazwami tabel.
const distanceSources = [
  { url: gavoTap, table: 'gedr3dist.main', timeoutMs: 6_000 },
  { url: esaTap, table: 'external.gaiaedr3_distance', timeoutMs: 8_000 },
  { url: 'https://gaia.ari.uni-heidelberg.de/tap/sync', table: 'gaiaedr3_complements.distances', timeoutMs: 8_000 },
] as const
const starColumns = ['source_id', 'ra', 'dec', 'pmra', 'pmdec', 'phot_g_mean_mag', 'phot_bp_mean_mag', 'phot_rp_mean_mag', 'parallax', 'parallax_error']
const distanceColumns = ['r_med_geo', 'r_lo_geo', 'r_hi_geo']
const maxResponseBytes = 4 * 1024 * 1024
const queryMs = 60_000
const LY_PER_PC = 3.26156
/** Katalog D80 solvera (Gaia DR3) ma epokę 2025,0; dopasowujemy do niej pozycje J2016,0. */
const EPOCH_YEARS = 2025 - 2016
export const STAR_LIMIT = 1000
/** Próg jakości paralaksy (ϖ/σ ≥ 5: błąd względny ≤ 20 %), zatwierdzony przez użytkownika. */
export const MIN_PARALLAX_OVER_ERROR = 5
const candidates = 4000
const maxRadiusDeg = 10

export interface FieldProjection { raDeg: number; decDeg: number; radiusDeg: number; pixels: ([number, number] | null)[] }
/** Rzut przez WCS zdjęcia (most Skyshota); bez gwiazd zwraca tylko środek i promień pola. */
export type ProjectStars = (stars: [number, number][]) => Promise<FieldProjection>

/** Górna granica jasności zapytania: przycina skan stożka, a TOP … ORDER BY i tak daje najjaśniejsze. */
export function magnitudeLimit(radiusDeg: number): number {
  const areaDeg2 = 2 * Math.PI * (1 - Math.cos(radiusDeg * Math.PI / 180)) * (180 / Math.PI) ** 2
  // Około 25 gwiazd G < 12 na stopień kwadratowy z dala od płaszczyzny Galaktyki, ×2,4 na magnitudo.
  const limit = 12 + Math.log10(candidates / (25 * Math.max(areaDeg2, 1e-4))) / Math.log10(2.4)
  return Math.round(Math.min(18, Math.max(10, limit)) * 10) / 10
}

function csvRows(text: string, requiredColumns: readonly string[]): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  const head = lines.shift()?.split(',') ?? []
  if (!requiredColumns.every((column) => head.includes(column))) throw new Error('Nieoczekiwany format danych Gaia.')
  return lines.map((line) => {
    const cells = line.split(',')
    return Object.fromEntries(head.map((name, i) => [name, cells[i] ?? '']))
  })
}

const num = (value: string | undefined) => value === undefined || value.trim() === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null

const tapParams = (query: string) => new URLSearchParams({ REQUEST: 'doQuery', LANG: 'ADQL', FORMAT: 'csv', QUERY: query })

async function queryGaia(field: FieldProjection, magLimit: number, fetchImpl: typeof fetch, signal: AbortSignal, preferred?: StarSource) {
  const { raDeg, decDeg, radiusDeg } = field
  const select = `SELECT TOP ${candidates} ${starColumns.map((column) => `g.${column}`).join(', ')}`
  const region = `WHERE 1 = CONTAINS(POINT('ICRS', g.ra, g.dec), CIRCLE('ICRS', ${raDeg.toFixed(6)}, ${decDeg.toFixed(6)}, ${radiusDeg.toFixed(6)}))`
  const sources = preferred ? [preferred, ...starSources.filter((source) => source !== preferred)] : starSources
  const timedOut: StarSource[] = []
  const queryCone = (archives: readonly StarSource[], limit: number) => firstCatalogResponse(archives, signal, async (source, attempt) => {
    const cone = `${region} AND g.phot_g_mean_mag < ${limit} ORDER BY g.phot_g_mean_mag`
    const from = `FROM ${source.table} AS g`
    // LEFT JOIN pozostawia gwiazdy bez odległości. W archiwach zapasowych osobne zapytania omijają wolne złączenie.
    const joined = source.url === gavoTap
    const query = joined
      ? `${select}, ${distanceColumns.map((column) => `d.${column}`).join(', ')} ${from} LEFT OUTER JOIN ${distanceSources[0].table} AS d ON d.source_id = g.source_id ${cone}`
      : `${select} ${from} ${cone}`
    const text = await fetchImpl(new URL(`${source.url}?${tapParams(query)}`), { signal: attempt })
      .then((response) => readResponseText(response, maxResponseBytes))
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'TimeoutError') timedOut.push(source)
        throw error
      })
    const columns = joined ? [...starColumns, ...distanceColumns] : starColumns
    const rows = csvRows(text, columns)
    if (rows.some((row) => !/^\d{1,19}$/.test(row.source_id))) throw new Error('Niepoprawny identyfikator Gaia DR3.')
    return { rows, source, magLimit: limit }
  })
  const result = await queryCone(sources, magLimit).catch((error) => {
    signal.throwIfAborted()
    // W gęstym polu węższy zakres jasności ogranicza sortowanie w archiwum.
    if (preferred || !timedOut.length || magLimit <= 10) throw error
    const brighterLimit = Math.round(Math.max(10, Math.min(14, magLimit - 3)) * 10) / 10
    return queryCone([...timedOut].reverse(), brighterLimit)
  })
  const { rows, source } = result
  if (source.url === gavoTap || rows.length === 0) return result

  const ids = rows.map((row) => row.source_id)
  const archives = source.url === esaTap ? [distanceSources[1], distanceSources[2], distanceSources[0]] : distanceSources
  const columns = ['source_id', ...distanceColumns]
  const distances = await firstCatalogResponse(archives, signal, async ({ url, table }, attempt) => {
    const body = tapParams(`SELECT TOP ${ids.length} ${columns.join(', ')} FROM ${table} WHERE source_id IN (${ids.join(',')})`)
    const response = await fetchImpl(url, { method: 'POST', signal: attempt, body })
    return csvRows(await readResponseText(response, maxResponseBytes), columns)
  })
  const byId = new Map(distances.map((row) => [row.source_id, row]))
  return { ...result, rows: rows.map((row) => ({ ...row, ...byId.get(row.source_id) })) }
}

function propagate(row: Record<string, string>): [number, number] {
  const ra = num(row.ra)!, dec = num(row.dec)!
  const pmra = num(row.pmra), pmdec = num(row.pmdec)
  if (pmra === null || pmdec === null) return [ra, dec]
  // Ruch własny w mas/rok; pmra zawiera już cos δ. Liniowo wystarcza na dziewięć lat.
  const nextDec = dec + pmdec * EPOCH_YEARS / 3.6e6
  return [((ra + pmra * EPOCH_YEARS / 3.6e6 / Math.cos(dec * Math.PI / 180)) % 360 + 360) % 360, nextDec]
}

export function photoStar(row: Record<string, string>, [raDeg, decDeg]: [number, number], [x, y]: [number, number]): PhotoStar {
  const parallax = num(row.parallax), error = num(row.parallax_error)
  const poe = parallax !== null && error !== null && error > 0 ? parallax / error : null
  const median = num(row.r_med_geo)
  const reliable = poe !== null && poe >= MIN_PARALLAX_OVER_ERROR && median !== null && median > 0
  const bp = num(row.phot_bp_mean_mag), rp = num(row.phot_rp_mean_mag)
  const ly = (pc: number | null) => reliable && pc !== null && pc > 0 ? pc * LY_PER_PC : null
  return {
    id: `Gaia DR3 ${row.source_id}`, x, y, raDeg, decDeg, gMag: num(row.phot_g_mean_mag)!,
    bpRp: bp !== null && rp !== null ? bp - rp : null, parallaxMas: parallax, parallaxOverError: poe,
    distLy: ly(median), distLoLy: ly(num(row.r_lo_geo)), distHiLy: ly(num(row.r_hi_geo)),
  }
}

export async function loadPhotoStars(width: number, height: number, project: ProjectStars, fetchImpl: typeof fetch, signal: AbortSignal): Promise<{ stars: PhotoStar[]; magLimit: number }> {
  const field = await project([])
  if (!(field.radiusDeg > 0) || field.radiusDeg > maxRadiusDeg) throw new RangeError('Pole zdjęcia jest zbyt rozległe dla wyszukiwania gwiazd.')
  const timeout = AbortSignal.any([signal, AbortSignal.timeout(queryMs)])
  let magLimit = magnitudeLimit(field.radiusDeg)
  let stars: PhotoStar[] = []
  let preferred: StarSource | undefined
  // Drugie, głębsze zapytanie tylko w rzadkim polu, gdy pierwsze nie wyczerpało limitu kandydatów.
  for (let attempt = 0; ; attempt++) {
    const nextLimit = attempt === 0 ? magLimit : Math.min(19, magLimit + 2)
    const result = await queryGaia(field, nextLimit, fetchImpl, timeout, preferred).catch((error) => {
      signal.throwIfAborted()
      if (!stars.length) throw error
      return null
    })
    if (!result) break
    preferred = result.source
    magLimit = result.magLimit
    const rows = result.rows.filter((row) => num(row.ra) !== null && num(row.dec) !== null && num(row.phot_g_mean_mag) !== null)
    const positions = rows.map(propagate)
    const { pixels } = await project(positions)
    stars = rows.flatMap((row, i) => {
      const pixel = pixels[i]
      return pixel && pixel[0] >= 0 && pixel[0] < width && pixel[1] >= 0 && pixel[1] < height ? [photoStar(row, positions[i], pixel)] : []
    }).sort((a, b) => a.gMag - b.gMag).slice(0, STAR_LIMIT)
    if (attempt === 1 || stars.length >= STAR_LIMIT || rows.length >= candidates || magLimit >= 18 || magLimit < nextLimit) break
  }
  return { stars, magLimit }
}
