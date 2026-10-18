// Widoczność całego katalogu w noc D (7A): noc przygotowana raz, potem tanie podsumowanie każdego obiektu.
import type { DsoObject, HorizonPoint, Mount, ObserverLocation, PlanningSettings } from '../types'
import {
  angularSeparationDeg,
  bodyPosition,
  moonIlluminatedFraction,
  precessionMatrix,
  sinAltitude,
  toEquatorOfDate,
  unitVector,
  zenithVector,
  type EquatorialDeg,
  type GeoPosition,
  type HorizontalDeg,
  type PrecessionMatrix,
  type Vector3,
} from './astroMath'
import type { MoonConditions } from './filterAdvice'
import {
  darknessWindow,
  highestPoint,
  meridianFlipMs as flipAfterTransitMs,
  nightRange,
  nightSun,
  sampleGrid,
  transitMs,
  visibleAt,
  type Darkness,
  type SampleGrid,
  type TimedAltitude,
  type TimeRange,
} from './visibility'

const MINUTE_MS = 60_000
/** Margines sin h wokół progu: o rzędy wielkości większy od błędów zaokrągleń, więc poza pasem wynik `visibleAt` jest pewny. */
const SIN_ALT_MARGIN = 1e-12
/** Margines cos separacji: większy od błędów zaokrągleń iloczynu skalarnego i wzoru haversine (do ok. 1e-7 przy 180°). */
const MOON_DOT_MARGIN = 1e-6

/** Położenie, strefa czasowa i horyzont lokalizacji; nazwa lokalizacji nie wpływa na wynik. */
export type CatalogNightLocation = Pick<ObserverLocation, 'latDeg' | 'lonDegEast' | 'elevationM' | 'timezone' | 'horizon'>

/** Parametry planowania, od których zależy widoczność katalogu [Z6–Z8]. */
export type CatalogNightSettings = Pick<
  PlanningSettings,
  'darknessThresholdDeg' | 'autoLowerThreshold' | 'minAltitudeDeg' | 'catalogStepMin'
>

export interface CatalogNightParams {
  location: CatalogNightLocation
  /** Noc D jako 'RRRR-MM-DD': od lokalnego południa dnia D do lokalnego południa dnia D+1. */
  nightDate: string
  settings: CatalogNightSettings
}

/** Dane obiektu potrzebne do liczenia: uid i współrzędne J2000. */
export type CatalogTarget = Pick<DsoObject, 'uid' | 'raDeg' | 'decDeg'>

/** Wszystko, co zależy tylko od nocy, miejsca i parametrów: liczone raz dla całego katalogu. */
export interface PreparedCatalogNight {
  site: GeoPosition
  horizon: readonly HorizonPoint[]
  minAltitudeDeg: number
  /** Oś nocy: od zachodu Słońca − 1 h do wschodu + 1 h (`nightSun`). */
  axis: TimeRange
  /** Okno ciemności z użytym progiem albo „brak okna” (`darknessWindow`). */
  darkness: Darkness
  /** Siatka okna ciemności co krok katalogowy (`sampleGrid`); null przy „brak okna”. */
  grid: SampleGrid | null
  /** Księżyc w każdej próbce siatki (`bodyPosition` topocentrycznie, `moonIlluminatedFraction`); pusta przy „brak okna”. */
  moon: MoonStep[]
  /** Macierz precesji liczona raz na noc (`precessionMatrix`). */
  precession: PrecessionMatrix
}

/** Księżyc w jednej próbce siatki: pozycja daty, wysokość geometryczna i oświetlenie. */
export type MoonStep = EquatorialDeg & HorizontalDeg & { illumination: number }

/** Podsumowanie obiektu w noc D. */
export interface ObjectNightSummary {
  uid: string
  /** Użyty próg ciemności (i czy obniżony) z oknem albo stan „brak okna przy progu …”. */
  darkness: Darkness
  /** Czas efektywny [min] z krokiem katalogowym; null przy „brak okna” (0 = obiekt nie jest widoczny). */
  effectiveMinutes: number | null
  /** Górowanie (pierwsze po zachodzie Słońca − 1 h); null, gdy wypada po końcu osi nocy, czyli obiekt góruje w dzień. */
  transitMs: number | null
  /** Najwyższe położenie w oknie ciemności; null przy „brak okna”. */
  highest: TimedAltitude | null
  /**
   * Dane Księżyca w oknie efektywnym obiektu (według reguł `moonConditions` z `filterAdvice.ts`, Księżyc liczony raz na krok siatki);
   * null, gdy obiekt nie ma czasu efektywnego albo noc nie ma okna. Pole opcjonalne, bo podsumowania podane wprost
   * (np. w testach innych funkcji) mogą go nie mieć; `summarizeObject` ma je zawsze wypełniać.
   */
  moon?: MoonConditions | null
}

/** Wynik dla całego katalogu: stan nocy i podsumowania w kolejności obiektów wejścia. */
export interface CatalogNightResult {
  darkness: Darkness
  objects: ObjectNightSummary[]
}

/** Przygotowanie nocy raz: okno ciemności, oś nocy, siatka co krok katalogowy i macierz precesji. */
export function prepareCatalogNight({ location, nightDate, settings }: CatalogNightParams): PreparedCatalogNight {
  const site: GeoPosition = { latDeg: location.latDeg, lonDegEast: location.lonDegEast, elevationM: location.elevationM }
  const night = nightRange(nightDate, location.timezone)
  const { axis } = nightSun(site, night)
  const darkness = darknessWindow(site, night, settings.darknessThresholdDeg, settings.autoLowerThreshold)
  const grid = darkness.kind === 'window' ? sampleGrid(darkness.window, settings.catalogStepMin, site.lonDegEast) : null
  return {
    site,
    horizon: location.horizon,
    minAltitudeDeg: settings.minAltitudeDeg,
    axis,
    darkness,
    grid,
    moon: (grid?.timesMs ?? []).map((timeMs) => ({
      ...bodyPosition('moon', site, timeMs),
      illumination: moonIlluminatedFraction(timeMs),
    })),
    precession: precessionMatrix((axis.startMs + axis.endMs) / 2),
  }
}

/** Wektory próbek siatki i pas sin h wokół progu, liczone raz na noc z jej pól (`vectorsOf`). */
interface NightVectors {
  /** Zenit w każdej próbce siatki (`zenithVector`). */
  zenith: Vector3[]
  /** Księżyc w każdej próbce siatki (`unitVector` pozycji daty). */
  moon: Vector3[]
  /** Poniżej tego sin h obiekt jest na pewno niewidoczny; między progami rozstrzyga `visibleAt`. */
  sinHidden: number
  /** Powyżej tego sin h obiekt jest na pewno widoczny. */
  sinVisible: number
}

const nightVectors = new WeakMap<PreparedCatalogNight, NightVectors>()

/**
 * Pas sin h wokół progu max(h_min, horyzont(az)): interpolacja horyzontu posortowanego po azymucie w [0, 360) nie wychodzi
 * poza zakres wysokości jego punktów (pusty horyzont = 0°). Inny horyzont → pas na całym zakresie, czyli zawsze `visibleAt`.
 */
function sinAltBand(minAltDeg: number, horizon: readonly HorizonPoint[]): Pick<NightVectors, 'sinHidden' | 'sinVisible'> {
  const sorted = horizon.every((point, i) => point.azDeg >= 0 && point.azDeg < 360 && (i === 0 || point.azDeg > horizon[i - 1].azDeg))
  if (!sorted) return { sinHidden: -Infinity, sinVisible: Infinity }
  const alts = horizon.length === 0 ? [0] : horizon.map((point) => point.altDeg)
  return {
    sinHidden: sinAltitude(Math.max(minAltDeg, alts.reduce((a, b) => Math.min(a, b)))) - SIN_ALT_MARGIN,
    sinVisible: sinAltitude(Math.max(minAltDeg, alts.reduce((a, b) => Math.max(a, b)))) + SIN_ALT_MARGIN,
  }
}

function vectorsOf(night: PreparedCatalogNight, grid: SampleGrid): NightVectors {
  let vectors = nightVectors.get(night)
  if (!vectors) {
    vectors = {
      zenith: grid.lstDeg.map((lstDeg) => zenithVector(lstDeg, night.site.latDeg)),
      moon: night.moon.map((moon) => unitVector(moon)),
      ...sinAltBand(night.minAltitudeDeg, night.horizon),
    }
    nightVectors.set(night, vectors)
  }
  return vectors
}

/** Jedno przejście po siatce: czas z widocznym obiektem, w tym z Księżycem pod horyzontem, i cos separacji od Księżyca. */
interface GridScan {
  /** Suma przedziałów próbek z widocznym obiektem [ms]. */
  visibleMs: number
  /** Część visibleMs z Księżycem pod horyzontem (wysokość ≤ 0°). */
  moonDownMs: number
  /** Indeks pierwszej i ostatniej próbki z widocznym obiektem; −1 bez takich próbek. */
  first: number
  last: number
  /** cos separacji obiekt–Księżyc (iloczyn skalarny) w próbkach z widocznym obiektem, −∞ w pozostałych. */
  moonDots: Float64Array
  maxMoonDot: number
}

function scanGrid(night: PreparedCatalogNight, grid: SampleGrid, ofDate: EquatorialDeg): GridScan {
  const { zenith, moon, sinHidden, sinVisible } = vectorsOf(night, grid)
  const [x, y, z] = unitVector(ofDate)
  const scan: GridScan = {
    visibleMs: 0,
    moonDownMs: 0,
    first: -1,
    last: -1,
    moonDots: new Float64Array(grid.timesMs.length).fill(-Infinity),
    maxMoonDot: -Infinity,
  }
  // Obiekt, który nawet w górowaniu (czas gwiazdowy = RA) jest pod pasem, nie jest widoczny w żadnej próbce.
  const [tx, ty, tz] = zenithVector(ofDate.raDeg, night.site.latDeg)
  if (x * tx + y * ty + z * tz < sinHidden - SIN_ALT_MARGIN) return scan
  for (let i = 0; i < grid.timesMs.length; i++) {
    const sinAlt = x * zenith[i][0] + y * zenith[i][1] + z * zenith[i][2]
    // Poza wąskim pasem wokół progu wynik jest pewny; w pasie rozstrzyga `visibleAt`, jak w `effectiveMinutes`.
    const visible =
      sinAlt > sinVisible ? true : sinAlt < sinHidden ? false : visibleAt(ofDate, night.site, grid.lstDeg[i], night.minAltitudeDeg, night.horizon)
    if (!visible) continue
    if (scan.first < 0) scan.first = i
    scan.last = i
    scan.visibleMs += grid.durationsMs[i]
    if (!(night.moon[i].altDeg > 0)) scan.moonDownMs += grid.durationsMs[i]
    const dot = x * moon[i][0] + y * moon[i][1] + z * moon[i][2]
    scan.moonDots[i] = dot
    if (dot > scan.maxMoonDot) scan.maxMoonDot = dot
  }
  return scan
}

/** Dane Księżyca obiektu według reguł `moonConditions` z `filterAdvice.ts`, z próbek całej siatki. */
function moonOf(night: PreparedCatalogNight, grid: SampleGrid, ofDate: EquatorialDeg, scan: GridScan): MoonConditions {
  const { timesMs } = grid
  const midMs = (timesMs[scan.first] + timesMs[scan.last] + grid.durationsMs[scan.last]) / 2
  // Próbka najbliższa środka spośród wszystkich próbek (środek może wypaść w próbce niewidocznej); przy remisie wcześniejsza.
  let nearest = 0
  for (let i = 1; i < timesMs.length; i++) {
    if (Math.abs(timesMs[i] - midMs) < Math.abs(timesMs[nearest] - midMs)) nearest = i
  }
  // Najmniejsza separacja: haversine tylko w próbkach z cos separacji bliskim największemu, pozostałe są na pewno dalej.
  let minSeparationDeg = Infinity
  for (let i = scan.first; i <= scan.last; i++) {
    if (scan.moonDots[i] >= scan.maxMoonDot - MOON_DOT_MARGIN) {
      minSeparationDeg = Math.min(minSeparationDeg, angularSeparationDeg(ofDate, night.moon[i]))
    }
  }
  return {
    moonDownFraction: scan.moonDownMs / scan.visibleMs,
    illumination: night.moon[nearest].illumination,
    minSeparationDeg,
  }
}

/** Podsumowanie jednego obiektu w przygotowanej nocy. */
export function summarizeObject(night: PreparedCatalogNight, target: CatalogTarget): ObjectNightSummary {
  const ofDate = toEquatorOfDate(target, night.precession)
  // t₀ = zachód − 1 h; górowanie po końcu osi nocy wypada w dzień.
  const transit = transitMs(ofDate.raDeg, night.site.lonDegEast, night.axis.startMs)
  const { darkness, grid } = night
  const scan = grid ? scanGrid(night, grid, ofDate) : null
  // Czas efektywny jak w `effectiveMinutes`: suma przedziałów widocznych próbek zaokrąglona do pełnych minut.
  const minutes = scan ? Math.round(scan.visibleMs / MINUTE_MS) : null
  return {
    uid: target.uid,
    darkness,
    effectiveMinutes: minutes,
    transitMs: transit <= night.axis.endMs ? transit : null,
    highest: darkness.kind === 'window' ? highestPoint(ofDate, night.site, darkness.window, transit) : null,
    // Bez czasu efektywnego (także gdy widoczne próbki dają po zaokrągleniu 0 min) nie ma danych Księżyca.
    moon: grid && scan && minutes ? moonOf(night, grid, ofDate, scan) : null,
  }
}

/** Widoczność całego katalogu w noc D; wyniki w kolejności obiektów, z uid. */
export function computeCatalogNight(params: CatalogNightParams, targets: readonly CatalogTarget[]): CatalogNightResult {
  const night = prepareCatalogNight(params)
  return { darkness: night.darkness, objects: targets.map((target) => summarizeObject(night, target)) }
}

/** Przerzut przez południk z górowania i montażu [Z10]: tylko GEM i tylko, gdy obiekt góruje w nocy. */
export function meridianFlipMs(transitMs: number | null, mount: Mount): number | null {
  return transitMs === null ? null : flipAfterTransitMs(transitMs, mount)
}
