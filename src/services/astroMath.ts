// Jedyne miejsce wzorów astronomicznych i jedyny moduł importujący astronomy-engine (sekcja 11).
// Konwencje z sekcji 4: kąty w stopniach, RA w [0, 360), azymut od N przez E, czas jako UTC [ms],
// wysokości geometryczne (bez refrakcji).
import {
  Body,
  Equator,
  Horizon,
  Illumination,
  Observer,
  Rotation_EQJ_EQD,
  SearchAltitude,
  SearchHourAngle,
  SearchRiseSet,
  SiderealTime,
  type RotationMatrix,
} from 'astronomy-engine'
import type { HorizonPoint, ObserverLocation } from '../types'

const DEG = Math.PI / 180
const DAY_MS = 86_400_000

export interface EquatorialDeg {
  raDeg: number
  decDeg: number
}

export interface HorizontalDeg {
  altDeg: number
  azDeg: number
}

export type GeoPosition = Pick<ObserverLocation, 'latDeg' | 'lonDegEast' | 'elevationM'>

/** Macierz J2000 → prawdziwy równik i równonoc daty (precesja i nutacja). */
export type PrecessionMatrix = RotationMatrix

/** Kąt sprowadzony do [0, 360). */
export function normalizeDeg(angleDeg: number): number {
  return ((angleDeg % 360) + 360) % 360
}

/** Lokalny prawdziwy czas gwiazdowy [°]: SiderealTime · 15 + długość geograficzna (E dodatnia). */
export function localSiderealTimeDeg(timeMs: number, lonDegEast: number): number {
  return normalizeDeg(SiderealTime(new Date(timeMs)) * 15 + lonDegEast)
}

/** Kąt godzinny [°] w [0, 360), rosnący na zachód od południka. */
export function hourAngleDeg(lstDeg: number, raDeg: number): number {
  return normalizeDeg(lstDeg - raDeg)
}

/** Macierz precesji i nutacji dla chwili timeMs; wystarczy liczyć ją raz na noc. */
export function precessionMatrix(timeMs: number): PrecessionMatrix {
  return Rotation_EQJ_EQD(new Date(timeMs))
}

/** Współrzędne J2000 przeniesione na równik i równonoc daty. */
export function toEquatorOfDate(j2000: EquatorialDeg, matrix: PrecessionMatrix): EquatorialDeg {
  const ra = j2000.raDeg * DEG
  const dec = j2000.decDeg * DEG
  const v = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)]
  // Konwencja RotateVector z astronomy-engine: wynik[j] = Σᵢ rot[i][j] · v[i].
  const [x, y, z] = [0, 1, 2].map((j) => matrix.rot[0][j] * v[0] + matrix.rot[1][j] * v[1] + matrix.rot[2][j] * v[2])
  return { raDeg: normalizeDeg(Math.atan2(y, x) / DEG), decDeg: Math.atan2(z, Math.hypot(x, y)) / DEG }
}

/** Wysokość i azymut z kąta godzinnego i deklinacji daty; szerokość geodezyjna, bez refrakcji. */
export function horizontalFromHourAngle(haDeg: number, decDeg: number, latDeg: number): HorizontalDeg {
  const ha = haDeg * DEG
  const dec = decDeg * DEG
  const lat = latDeg * DEG
  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha)
  const az = Math.atan2(
    -Math.cos(dec) * Math.sin(ha),
    Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha),
  )
  return { altDeg: Math.asin(Math.min(1, Math.max(-1, sinAlt))) / DEG, azDeg: normalizeDeg(az / DEG) }
}

/** Szybki wzór Alt/Az dla współrzędnych daty w chwili timeMs [T8]. */
export function horizontalAt(ofDate: EquatorialDeg, site: GeoPosition, timeMs: number): HorizontalDeg {
  const ha = hourAngleDeg(localSiderealTimeDeg(timeMs, site.lonDegEast), ofDate.raDeg)
  return horizontalFromHourAngle(ha, ofDate.decDeg, site.latDeg)
}

/** Odległość kątowa [°] wzorem haversine. */
export function angularSeparationDeg(a: EquatorialDeg, b: EquatorialDeg): number {
  const decA = a.decDeg * DEG
  const decB = b.decDeg * DEG
  const h =
    Math.sin((decB - decA) / 2) ** 2 +
    Math.cos(decA) * Math.cos(decB) * Math.sin(((b.raDeg - a.raDeg) * DEG) / 2) ** 2
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / DEG
}

/** Punkt płaszczyzny stycznej [rad]: ξ w stronę E, η w stronę N w środku kadru. */
export interface TangentPoint {
  xi: number
  eta: number
}

/** Rzut gnomoniczny punktu na płaszczyznę styczną w środku `center`. */
export function gnomonicProject(center: EquatorialDeg, point: EquatorialDeg): TangentPoint {
  const dec0 = center.decDeg * DEG
  const dec = point.decDeg * DEG
  const dRa = (point.raDeg - center.raDeg) * DEG
  const cosC = Math.sin(dec0) * Math.sin(dec) + Math.cos(dec0) * Math.cos(dec) * Math.cos(dRa)
  return {
    xi: (Math.cos(dec) * Math.sin(dRa)) / cosC,
    eta: (Math.cos(dec0) * Math.sin(dec) - Math.sin(dec0) * Math.cos(dec) * Math.cos(dRa)) / cosC,
  }
}

/** Rzut odwrotny z płaszczyzny stycznej na sferę (wzór z sekcji 7B). */
export function gnomonicUnproject(center: EquatorialDeg, { xi, eta }: TangentPoint): EquatorialDeg {
  const dec0 = center.decDeg * DEG
  return {
    raDeg: normalizeDeg(center.raDeg + Math.atan2(xi, Math.cos(dec0) - eta * Math.sin(dec0)) / DEG),
    decDeg: Math.asin((Math.sin(dec0) + eta * Math.cos(dec0)) / Math.sqrt(1 + xi * xi + eta * eta)) / DEG,
  }
}

/** Wysokość horyzontu dla azymutu: interpolacja liniowa z zawinięciem 360 → 0 [T10]; [] = horyzont 0°. */
export function horizonAltitudeDeg(horizon: readonly HorizonPoint[], azDeg: number): number {
  if (horizon.length === 0) return 0
  const az = normalizeDeg(azDeg)
  // Brak punktu o większym azymucie oznacza przejście przez 360° do pierwszego punktu.
  const nextIndex = Math.max(0, horizon.findIndex((point) => point.azDeg > az))
  const next = horizon[nextIndex]
  const prev = horizon[(nextIndex - 1 + horizon.length) % horizon.length]
  const span = normalizeDeg(next.azDeg - prev.azDeg)
  if (span === 0) return prev.altDeg
  return prev.altDeg + (normalizeDeg(az - prev.azDeg) / span) * (next.altDeg - prev.altDeg)
}

export interface OpticsInput {
  apertureMm: number
  focalLengthMm: number
  reducerFactor: number
  resolutionXPx: number
  resolutionYPx: number
  pixelSizeUm: number
  binning: number
}

export interface Optics {
  effectiveFocalLengthMm: number
  focalRatio: number
  sensorWidthMm: number
  sensorHeightMm: number
  fovWidthDeg: number
  fovHeightDeg: number
  scaleArcsecPerPx: number
}

function fieldOfViewDeg(sensorMm: number, focalLengthMm: number): number {
  return (2 * Math.atan(sensorMm / (2 * focalLengthMm))) / DEG
}

/** F_eff, f/, wymiary matrycy, FOV i skala według wzorów z sekcji 7B. */
export function computeOptics(input: OpticsInput): Optics {
  const effectiveFocalLengthMm = input.focalLengthMm * input.reducerFactor
  const sensorWidthMm = (input.resolutionXPx * input.pixelSizeUm) / 1000
  const sensorHeightMm = (input.resolutionYPx * input.pixelSizeUm) / 1000
  return {
    effectiveFocalLengthMm,
    focalRatio: effectiveFocalLengthMm / input.apertureMm,
    sensorWidthMm,
    sensorHeightMm,
    fovWidthDeg: fieldOfViewDeg(sensorWidthMm, effectiveFocalLengthMm),
    fovHeightDeg: fieldOfViewDeg(sensorHeightMm, effectiveFocalLengthMm),
    scaleArcsecPerPx: ((input.pixelSizeUm * input.binning) / effectiveFocalLengthMm) * 206.265,
  }
}

export type Sampling = 'oversampled' | 'ideal' | 'undersampled'

/** Próbkowanie idealne, gdy seeing/3 ≤ skala ≤ seeing/2 (sekcja 7B). */
export function assessSampling(scaleArcsecPerPx: number, seeingArcsec: number): Sampling {
  if (scaleArcsecPerPx < seeingArcsec / 3) return 'oversampled'
  if (scaleArcsecPerPx > seeingArcsec / 2) return 'undersampled'
  return 'ideal'
}

export type SolarSystemBody = 'sun' | 'moon'

const BODIES: Record<SolarSystemBody, Body> = { sun: Body.Sun, moon: Body.Moon }

function observerAt(site: GeoPosition): Observer {
  return new Observer(site.latDeg, site.lonDegEast, site.elevationM)
}

/** Pierwszy wschód albo zachód w [startMs, endMs] według standardowej definicji SearchRiseSet. */
export function riseSetMs(
  body: SolarSystemBody,
  site: GeoPosition,
  kind: 'rise' | 'set',
  startMs: number,
  endMs: number,
): number | null {
  const direction = kind === 'rise' ? +1 : -1
  const time = SearchRiseSet(BODIES[body], observerAt(site), direction, new Date(startMs), (endMs - startMs) / DAY_MS)
  return time ? time.date.getTime() : null
}

/** Pierwsze przejście środka Słońca przez wysokość geometryczną altitudeDeg w [startMs, endMs]. */
export function sunAltitudeCrossingMs(
  site: GeoPosition,
  direction: 'descending' | 'ascending',
  altitudeDeg: number,
  startMs: number,
  endMs: number,
): number | null {
  const sign = direction === 'ascending' ? +1 : -1
  const limitDays = (endMs - startMs) / DAY_MS
  const time = SearchAltitude(Body.Sun, observerAt(site), sign, new Date(startMs), limitDays, altitudeDeg)
  return time ? time.date.getTime() : null
}

/** Dolne górowanie Słońca (kąt godzinny 12 h) po chwili startMs. */
export function sunLowerCulminationMs(site: GeoPosition, startMs: number): number {
  return SearchHourAngle(Body.Sun, observerAt(site), 12, new Date(startMs)).time.date.getTime()
}

/** Pozycja topocentryczna: równik i równonoc daty (z aberracją) oraz wysokość i azymut bez refrakcji. */
export function bodyPosition(body: SolarSystemBody, site: GeoPosition, timeMs: number): EquatorialDeg & HorizontalDeg {
  const date = new Date(timeMs)
  const observer = observerAt(site)
  const equator = Equator(BODIES[body], date, observer, true, true)
  const horizontal = Horizon(date, observer, equator.ra, equator.dec)
  return { raDeg: equator.ra * 15, decDeg: equator.dec, altDeg: horizontal.altitude, azDeg: horizontal.azimuth }
}

/** Oświetlona część tarczy Księżyca, 0–1. */
export function moonIlluminatedFraction(timeMs: number): number {
  return Illumination(Body.Moon, new Date(timeMs)).phase_fraction
}
