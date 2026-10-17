// Filtry katalogu (7A): katalog, typ, gwiazdozbiór, jasność, rozmiar, „Widoczne w wybraną noc”, „Pasuje do kadru” [Z7, Z21].
// ZAŚLEPKA funkcji „polecane-na-miesiac”: referenceNightDate i filtr „Polecane na miesiąc” zgłaszają NotImplementedError.
import type { CatalogId, DsoObject, DsoType, EquipmentProfile, PlanningSettings } from '../types'
import { computeOptics } from './astroMath'
import type { ObjectNightSummary } from './catalogNight'

/** Zakres wartości; obie granice włącznie. */
export interface NumberRange {
  min: number
  max: number
}

/** Stan filtrów katalogu. Filtry łączą się przez „i”, a wartości w obrębie jednego filtra przez „lub”. */
export interface CatalogFilterState {
  /** Katalogi (wiele naraz); liczy się każde oznaczenie obiektu, nie tylko główne. [] = bez ograniczenia. */
  catalogs: CatalogId[]
  /** Typy obiektów (wiele naraz). [] = bez ograniczenia. */
  types: DsoType[]
  /** Skrót IAU gwiazdozbioru, np. 'Cep'; null = bez ograniczenia. */
  constellation: string | null
  /** Jasność `magV` [mag]; null = filtr wyłączony. */
  magnitude: NumberRange | null
  /** „Pokaż obiekty bez jasności”: przy włączonym filtrze jasności obiekty bez `magV` przechodzą. */
  showWithoutMagnitude: boolean
  /** Rozmiar (wielka oś, `sizeMajorArcmin`) [′]; null = filtr wyłączony. Obiekty bez rozmiaru odpadają. */
  size: NumberRange | null
  /** „Widoczne w wybraną noc”: czas efektywny ≥ `minEffectiveHours` [Z7]. */
  visibleTonight: boolean
  /** „Pasuje do kadru” aktywnego zestawu: wielka oś w zakresie `fitRange` krótszego boku kadru [Z21]. */
  fitsFrame: boolean
  /**
   * „Polecane na miesiąc” [Z22]: czas efektywny ≥ `minEffectiveHours` w nocy odniesienia (`referenceNightDate`),
   * czyli w nocy z 15. dnia miesiąca nocy D. Brak albo false = filtr wyłączony.
   */
  recommendedThisMonth?: boolean
}

/** Stan domyślny: żaden filtr nie jest włączony, „pokaż obiekty bez jasności” zaznaczone. */
export const DEFAULT_CATALOG_FILTERS: CatalogFilterState = {
  catalogs: [],
  types: [],
  constellation: null,
  magnitude: null,
  showWithoutMagnitude: true,
  size: null,
  visibleTonight: false,
  fitsFrame: false,
}

/** Dane spoza stanu filtrów: wyniki nocy D z Workera, parametry planowania i aktywny zestaw. */
export interface CatalogFilterContext {
  /** Podsumowania obiektów w noc D (`ObjectNightSummary`, dopasowanie po uid); null = wynik jeszcze się liczy. */
  results: readonly ObjectNightSummary[] | null
  /** Minimum godzin czasu efektywnego [Z7] i zakres „Pasuje do kadru” [Z21]. */
  settings: Pick<PlanningSettings, 'minEffectiveHours' | 'fitRange'>
  /** Aktywny zestaw; kadr z `computeOptics` (krótszy bok FOV). */
  profile: EquipmentProfile
  /** Noc D jako 'RRRR-MM-DD' (data wieczoru). Gdy noc D jest nocą odniesienia, „Polecane na miesiąc” bierze `results`. */
  nightDate?: string
  /** Podsumowania obiektów w nocy odniesienia (dopasowanie po uid); null albo brak = wynik jeszcze się liczy. */
  referenceResults?: readonly ObjectNightSummary[] | null
}

type Predicate = (object: DsoObject) => boolean

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

/** Noc odniesienia „Polecane na miesiąc” [Z22]: 'RRRR-MM-15' z miesiąca daty wieczoru nocy D ('RRRR-MM-DD'). */
export function referenceNightDate(nightDate: string): string {
  void nightDate
  return notImplemented('referenceNightDate')
}

const inRange = (value: number | null, range: NumberRange): boolean =>
  value !== null && value >= range.min && value <= range.max

/** Zakres „Pasuje do kadru” [′]: części `fitRange` krótszego boku kadru z `computeOptics` [Z21]. */
function frameRange(profile: EquipmentProfile, fitRange: readonly [number, number]): NumberRange {
  const { telescope, camera } = profile
  const optics = computeOptics({
    apertureMm: telescope.apertureMm,
    focalLengthMm: telescope.focalLengthMm,
    reducerFactor: profile.reducerFactor,
    resolutionXPx: camera.resolutionXPx,
    resolutionYPx: camera.resolutionYPx,
    pixelSizeUm: camera.pixelSizeUm,
    binning: camera.binning,
  })
  const side = Math.min(optics.fovWidthDeg, optics.fovHeightDeg) * 60
  return { min: side * fitRange[0], max: side * fitRange[1] }
}

/** Obiekty, które przechodzą wszystkie włączone filtry, w kolejności wejścia; wejście się nie zmienia. */
export function filterCatalog(
  objects: readonly DsoObject[],
  filters: CatalogFilterState,
  context: CatalogFilterContext,
): DsoObject[] {
  const checks: Predicate[] = []
  const { catalogs, types, constellation, magnitude, size } = filters
  if (catalogs.length > 0) checks.push((o) => o.designations.some((d) => catalogs.includes(d.catalog)))
  if (types.length > 0) checks.push((o) => types.includes(o.type))
  if (constellation !== null) checks.push((o) => o.constellation === constellation)
  if (magnitude !== null) checks.push((o) => (o.magV === null ? filters.showWithoutMagnitude : inRange(o.magV, magnitude)))
  if (size !== null) checks.push((o) => inRange(o.sizeMajorArcmin, size))
  if (filters.visibleTonight) {
    const minutes = new Map((context.results ?? []).map((s) => [s.uid, s.effectiveMinutes]))
    const minimum = context.settings.minEffectiveHours * 60
    checks.push((o) => inRange(minutes.get(o.uid) ?? null, { min: minimum, max: Infinity }))
  }
  if (filters.fitsFrame) {
    const frame = frameRange(context.profile, context.settings.fitRange)
    checks.push((o) => inRange(o.sizeMajorArcmin, frame))
  }
  if (filters.recommendedThisMonth) notImplemented('filterCatalog: „Polecane na miesiąc”')
  return objects.filter((object) => checks.every((check) => check(object)))
}
