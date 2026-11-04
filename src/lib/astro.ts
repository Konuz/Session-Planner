// Rdzeń astronomiczny. Jedyny moduł importujący astronomy-engine.
// Konwencje: kąty w stopniach, RA w [0, 360), azymut od N przez E, czas w ms UTC, wysokości bez refrakcji
// (z wyjątkiem wschodów i zachodów Słońca i Księżyca, które liczy astronomy-engine wg standardowej definicji).
import {
  Body,
  Constellation,
  Equator,
  Horizon,
  Illumination,
  MoonPhase,
  Observer,
  Rotation_EQJ_EQD,
  SearchAltitude,
  SearchMoonPhase,
  SearchRiseSet,
  SiderealTime,
} from 'astronomy-engine'

export const DEG = Math.PI / 180
export const HOUR_MS = 3_600_000
export const DAY_MS = 86_400_000

export interface Site {
  latDeg: number
  lonDeg: number // E dodatnia
  elevationM: number
}

export interface Equatorial {
  raDeg: number
  decDeg: number
}

export interface Horizontal {
  altDeg: number
  azDeg: number
}

export type Vec3 = [number, number, number]
/** Macierz 3×3 w kolejności wierszy. */
export type Mat3 = [number, number, number, number, number, number, number, number, number]

export const normDeg = (a: number) => ((a % 360) + 360) % 360

export function unitVector(raDeg: number, decDeg: number): Vec3 {
  const ra = raDeg * DEG
  const dec = decDeg * DEG
  return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)]
}

export function mulMat(a: Mat3, b: Mat3): Mat3 {
  const out = new Array(9) as Mat3
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) out[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]
  return out
}

export function mulVec(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ]
}

export function transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]
}

/** Lokalny prawdziwy czas gwiazdowy [°]. */
export function lstDeg(timeMs: number, lonDeg: number): number {
  return normDeg(SiderealTime(new Date(timeMs)) * 15 + lonDeg)
}

/** Precesja i nutacja J2000 → równik daty jako macierz działająca na wektor kolumnowy. */
export function precessionMatrix(timeMs: number): Mat3 {
  const { rot } = Rotation_EQJ_EQD(new Date(timeMs))
  // astronomy-engine: wynik[j] = Σᵢ rot[i][j]·v[i], więc macierz wierszowa to transpozycja.
  return [rot[0][0], rot[1][0], rot[2][0], rot[0][1], rot[1][1], rot[2][1], rot[0][2], rot[1][2], rot[2][2]]
}

/**
 * Macierz J2000 → układ horyzontalny (N, E, Zenit) w chwili timeMs.
 * Wektor wynikowy: [cos h·cos A, cos h·sin A, sin h], A od N przez E.
 */
export function horizontalMatrix(timeMs: number, site: Site): Mat3 {
  const theta = lstDeg(timeMs, site.lonDeg) * DEG
  const phi = site.latDeg * DEG
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  // Rz(−θ): wektor równikowy daty → układ związany z południkiem (x ku południkowi, y ku W... z ku biegunowi).
  const rz: Mat3 = [c, s, 0, -s, c, 0, 0, 0, 1]
  const sp = Math.sin(phi)
  const cp = Math.cos(phi)
  // Wiersze: N = cosφ·z − sinφ·x, E = y, Zenit = sinφ·z + cosφ·x (y obrócone ma znak −sin H, czyli E).
  const tilt: Mat3 = [-sp, 0, cp, 0, 1, 0, cp, 0, sp]
  return mulMat(mulMat(tilt, rz), precessionMatrix(timeMs))
}

export function vecToHorizontal(v: Vec3): Horizontal {
  return { altDeg: Math.asin(Math.max(-1, Math.min(1, v[2]))) / DEG, azDeg: normDeg(Math.atan2(v[1], v[0]) / DEG) }
}

export function horizontalToVec(h: Horizontal): Vec3 {
  const alt = h.altDeg * DEG
  const az = h.azDeg * DEG
  return [Math.cos(alt) * Math.cos(az), Math.cos(alt) * Math.sin(az), Math.sin(alt)]
}

export function vecToEquatorial(v: Vec3): Equatorial {
  return { raDeg: normDeg(Math.atan2(v[1], v[0]) / DEG), decDeg: Math.asin(Math.max(-1, Math.min(1, v[2]))) / DEG }
}

/** Wysokość i azymut obiektu J2000. */
export function altAz(eq: Equatorial, timeMs: number, site: Site): Horizontal {
  return vecToHorizontal(mulVec(horizontalMatrix(timeMs, site), unitVector(eq.raDeg, eq.decDeg)))
}

/** Kąt godzinny [°] w (−180, 180]; 0 = górowanie (przejście przez południk). */
export function hourAngleDeg(eq: Equatorial, timeMs: number, site: Site): number {
  const ofDate = vecToEquatorial(mulVec(precessionMatrix(timeMs), unitVector(eq.raDeg, eq.decDeg)))
  const ha = normDeg(lstDeg(timeMs, site.lonDeg) - ofDate.raDeg)
  return ha > 180 ? ha - 360 : ha
}

/** Najbliższe górne górowanie po chwili startMs (z dokładnością do sekund). */
export function nextTransitMs(eq: Equatorial, startMs: number, site: Site): number {
  // Doba gwiazdowa = 23 h 56 min 4 s; HA rośnie 15,041°/h.
  const rate = 360 / 86_164_090.5
  const ha0 = normDeg(hourAngleDeg(eq, startMs, site))
  let t = startMs + ((360 - ha0) % 360) / rate
  // Doprecyzowanie: poprawka ze znakiem, żeby drobne przestrzelenie nie dodało całej doby.
  for (let i = 0; i < 4; i++) t -= hourAngleDeg(eq, t, site) / rate
  if (t < startMs) {
    t += 360 / rate
    for (let i = 0; i < 4; i++) t -= hourAngleDeg(eq, t, site) / rate
  }
  return t
}

export function constellationOf(eq: Equatorial): string {
  return Constellation(eq.raDeg / 15, eq.decDeg).symbol
}

export function angularDistanceDeg(a: Equatorial, b: Equatorial): number {
  const va = unitVector(a.raDeg, a.decDeg)
  const vb = unitVector(b.raDeg, b.decDeg)
  const dot = va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]
  return Math.acos(Math.max(-1, Math.min(1, dot))) / DEG
}

// ---------- Słońce i Księżyc ----------

const observer = (site: Site) => new Observer(site.latDeg, site.lonDeg, site.elevationM)

export function bodyAltAz(body: 'sun' | 'moon', timeMs: number, site: Site): Horizontal & Equatorial {
  const date = new Date(timeMs)
  const obs = observer(site)
  const eq = Equator(body === 'sun' ? Body.Sun : Body.Moon, date, obs, true, true)
  const hor = Horizon(date, obs, eq.ra, eq.dec)
  return { altDeg: hor.altitude, azDeg: hor.azimuth, raDeg: eq.ra * 15, decDeg: eq.dec }
}

/** Pozycja J2000 Księżyca (topocentryczna), do odległości kątowej od obiektów katalogu. */
export function moonJ2000(timeMs: number, site: Site): Equatorial {
  const eq = Equator(Body.Moon, new Date(timeMs), observer(site), false, true)
  return { raDeg: eq.ra * 15, decDeg: eq.dec }
}

export function sunCrossingMs(site: Site, direction: 1 | -1, altitudeDeg: number, startMs: number, limitDays: number): number | null {
  const t = SearchAltitude(Body.Sun, observer(site), direction, new Date(startMs), limitDays, altitudeDeg)
  return t ? t.date.getTime() : null
}

export function riseSetMs(body: 'sun' | 'moon', site: Site, direction: 1 | -1, startMs: number, limitDays: number): number | null {
  const t = SearchRiseSet(body === 'sun' ? Body.Sun : Body.Moon, observer(site), direction, new Date(startMs), limitDays)
  return t ? t.date.getTime() : null
}

export interface MoonInfo {
  /** Oświetlona część tarczy 0–1. */
  illumination: number
  /** Kąt fazy 0 = nów, 90 = I kwadra, 180 = pełnia, 270 = III kwadra. */
  phaseDeg: number
  waxing: boolean
  name: string
  nextNewMs: number
  nextFullMs: number
}

export function moonPhaseName(phaseDeg: number): string {
  const names = ['nów', 'przybywający sierp', 'I kwadra', 'przybywający garb', 'pełnia', 'ubywający garb', 'III kwadra', 'ubywający sierp']
  return names[Math.round(normDeg(phaseDeg) / 45) % 8]
}

let moonCache: { key: number; info: MoonInfo } | null = null

/** Faza Księżyca z dokładnością do 10 min (wyszukiwanie nowiu i pełni jest kosztowne, a kopuła odtwarza noc klatka po klatce). */
export function moonInfo(timeMs: number): MoonInfo {
  const key = Math.round(timeMs / 600_000)
  if (moonCache?.key === key) return moonCache.info
  const info = computeMoonInfo(key * 600_000)
  moonCache = { key, info }
  return info
}

function computeMoonInfo(timeMs: number): MoonInfo {
  const date = new Date(timeMs)
  const phaseDeg = MoonPhase(date)
  return {
    illumination: Illumination(Body.Moon, date).phase_fraction,
    phaseDeg,
    waxing: phaseDeg < 180,
    name: moonPhaseName(phaseDeg),
    nextNewMs: SearchMoonPhase(0, date, 40)!.date.getTime(),
    nextFullMs: SearchMoonPhase(180, date, 40)!.date.getTime(),
  }
}

// ---------- Optyka ----------

export interface OpticsInput {
  apertureMm: number
  focalLengthMm: number
  reducer: number
  widthPx: number
  heightPx: number
  pixelUm: number
  binning: number
}

export interface Optics {
  focalMm: number
  fRatio: number
  sensorWmm: number
  sensorHmm: number
  fovWdeg: number
  fovHdeg: number
  scaleArcsecPx: number
}

const fov = (sensorMm: number, focalMm: number) => (2 * Math.atan(sensorMm / (2 * focalMm))) / DEG

export function computeOptics(i: OpticsInput): Optics {
  const focalMm = i.focalLengthMm * i.reducer
  const sensorWmm = (i.widthPx * i.pixelUm) / 1000
  const sensorHmm = (i.heightPx * i.pixelUm) / 1000
  return {
    focalMm,
    fRatio: focalMm / i.apertureMm,
    sensorWmm,
    sensorHmm,
    fovWdeg: fov(sensorWmm, focalMm),
    fovHdeg: fov(sensorHmm, focalMm),
    scaleArcsecPx: ((i.pixelUm * i.binning) / focalMm) * 206.265,
  }
}

export type Sampling = 'nadpróbkowanie' | 'optymalne' | 'podpróbkowanie'

export function sampling(scaleArcsecPx: number, seeingArcsec: number): Sampling {
  if (scaleArcsecPx < seeingArcsec / 3) return 'nadpróbkowanie'
  if (scaleArcsecPx > seeingArcsec / 1.5) return 'podpróbkowanie'
  return 'optymalne'
}

// ---------- Współrzędne galaktyczne (do widoku 3D) ----------

/** J2000 → galaktyczne (IAU 1958, wg Hipparcos Vol. 1 §1.5.3). */
const EQ_TO_GAL: Mat3 = [
  -0.0548755604, -0.8734370902, -0.4838350155,
  0.4941094279, -0.44482963, 0.7469822445,
  -0.867666149, -0.1980763734, 0.4559837762,
]

export function galacticVector(eq: Equatorial): Vec3 {
  return mulVec(EQ_TO_GAL, unitVector(eq.raDeg, eq.decDeg))
}

export function galactic(eq: Equatorial): { lDeg: number; bDeg: number } {
  const v = galacticVector(eq)
  return { lDeg: normDeg(Math.atan2(v[1], v[0]) / DEG), bDeg: Math.asin(Math.max(-1, Math.min(1, v[2]))) / DEG }
}
