import type { PhotoStar } from '../src/lib/photo.ts'
import { readResponseText } from './readResponseText.ts'

// Gwiazdy Gaia DR3 z odległościami Bailer-Jones et al. 2021 (EDR3) przez GAVO DC (Heidelberg).
// ESA Gaia Archive i CDS bywają nieosiągalne; gaia.dr3lite łączymy z gedr3dist.main po source_id.
const tapUrl = 'https://dc.zah.uni-heidelberg.de/tap/sync'
const maxResponseBytes = 4 * 1024 * 1024
const queryMs = 30_000
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

function csvRows(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  const head = lines.shift()?.split(',') ?? []
  if (!head.includes('source_id') || !head.includes('r_med_geo')) throw new Error('GAVO')
  return lines.map((line) => {
    const cells = line.split(',')
    return Object.fromEntries(head.map((name, i) => [name, cells[i] ?? '']))
  })
}

const num = (value: string | undefined) => value === undefined || value.trim() === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null

async function queryGaia(raDeg: number, decDeg: number, radiusDeg: number, magLimit: number, fetchImpl: typeof fetch, signal: AbortSignal) {
  // LEFT JOIN: gwiazdy bez paralaksy (brak w gedr3dist) zostają na zdjęciu bez odległości.
  const query = `SELECT TOP ${candidates} g.source_id, g.ra, g.dec, g.pmra, g.pmdec, g.phot_g_mean_mag, g.phot_bp_mean_mag, g.phot_rp_mean_mag, g.parallax, g.parallax_error, d.r_med_geo, d.r_lo_geo, d.r_hi_geo FROM gaia.dr3lite AS g LEFT OUTER JOIN gedr3dist.main AS d ON d.source_id = g.source_id WHERE 1 = CONTAINS(POINT('ICRS', g.ra, g.dec), CIRCLE('ICRS', ${raDeg.toFixed(6)}, ${decDeg.toFixed(6)}, ${radiusDeg.toFixed(6)})) AND g.phot_g_mean_mag < ${magLimit} ORDER BY g.phot_g_mean_mag`
  const url = new URL(tapUrl)
  url.search = new URLSearchParams({ REQUEST: 'doQuery', LANG: 'ADQL', FORMAT: 'csv', QUERY: query }).toString()
  const response = await fetchImpl(url, { signal })
  return csvRows(await readResponseText(response, maxResponseBytes))
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
  // Drugie, głębsze zapytanie tylko w rzadkim polu, gdy pierwsze nie wyczerpało limitu kandydatów.
  for (let attempt = 0; ; attempt++) {
    const rows = (await queryGaia(field.raDeg, field.decDeg, field.radiusDeg, magLimit, fetchImpl, timeout)).filter((row) => num(row.ra) !== null && num(row.dec) !== null && num(row.phot_g_mean_mag) !== null)
    const positions = rows.map(propagate)
    const { pixels } = await project(positions)
    stars = rows.flatMap((row, i) => {
      const pixel = pixels[i]
      return pixel && pixel[0] >= 0 && pixel[0] < width && pixel[1] >= 0 && pixel[1] < height ? [photoStar(row, positions[i], pixel)] : []
    }).sort((a, b) => a.gMag - b.gMag).slice(0, STAR_LIMIT)
    if (attempt === 1 || stars.length >= STAR_LIMIT || rows.length >= candidates || magLimit >= 18) break
    magLimit = Math.min(19, magLimit + 2)
  }
  return { stars, magLimit }
}
