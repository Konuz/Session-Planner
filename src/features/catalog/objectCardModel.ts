// Model karty obiektu w katalogu (7A): czysta funkcja, która z obiektu, podsumowania nocy z Workera, aktywnego zestawu,
// kursora, położenia Księżyca w kursorze i kolorów rekomendacji robi gotowe teksty karty.
// ZAŚLEPKA funkcji „karta-obiektu”: objectCardModel zgłasza NotImplementedError.
import type { EquatorialDeg, GeoPosition, PrecessionMatrix } from '../../services/astroMath'
import type { ObjectNightSummary } from '../../services/catalogNight'
import type { FilterAdvice, FilterAdviceColor } from '../../services/filterAdvice'
import type { ColorToken } from '../../theme/tokens'
import type { DsoObject, DsoType, EquipmentProfile, FilterId } from '../../types'

/** Dane wspólne dla wszystkich kart w nocy D przy danym położeniu kursora. */
export interface CardContext {
  /** Położenie obserwatora (szerokość, długość, wysokość n.p.m.). */
  site: GeoPosition
  /** Strefa czasowa IANA lokalizacji, do `formatLocalTime`. */
  timeZone: string
  /** Macierz precesji nocy (jak `PreparedCatalogNight.precession`), do `toEquatorOfDate`. */
  precession: PrecessionMatrix
  /** Aktywny zestaw; liczy się montaż (przerzut tylko dla GEM). */
  profile: Pick<EquipmentProfile, 'mount'>
  /** Kursor czasu (UTC) [ms]. */
  cursorMs: number
  /** Księżyc w kursorze: `bodyPosition('moon', site, cursorMs)`, liczony raz na zmianę kursora dla wszystkich kart. */
  moonAtCursor: EquatorialDeg
}

/** Znak stanu odznaki: ✓ zielony, ! żółty, ✗ czerwony. */
export type BadgeMark = '✓' | '!' | '✗'

/** Odznaka rekomendacji jednego filtra. */
export interface ObjectCardBadge {
  filter: FilterId
  color: FilterAdviceColor
  mark: BadgeMark
  /** Opis tekstowy stanu z nazwą filtra: „Ha: dobre warunki”, „Ha: średnie warunki” albo „Ha: złe warunki”. */
  description: string
  /** Token koloru odznaki: jeden z trzech tokenów odznak (zielony, żółty, czerwony) z `src/theme/tokens.ts`. */
  colorToken: ColorToken
}

/** Gotowe teksty karty obiektu. */
export interface ObjectCardModel {
  /** Oznaczenie główne (`formatDesignation`), np. „M 31”. */
  primary: string
  /** Pozostałe oznaczenia w kolejności z katalogu, rozdzielone „, ”, np. „LBN 529, C 9”; null, gdy ich nie ma. */
  otherDesignations: string | null
  /** Pierwsza nazwa zwyczajowa, np. „Andromeda Galaxy”; null, gdy obiekt nie ma nazwy. */
  name: string | null
  type: DsoType
  /** Etykieta typu, np. „galaktyka”, „gromada z mgławicą”. */
  typeLabel: string
  /** Token koloru typu z sekcji 8, np. 'galaxy'; „inny obiekt” → 'muted'. */
  typeColor: ColorToken
  /** Położenie w kursorze, np. „wysokość 79,2°, azymut 193,6°”. */
  position: string
  /** Separacja od Księżyca w kursorze, np. „112,8°”. */
  moonSeparation: string
  /**
   * Górowanie i najwyższe położenie, np. „górowanie 23:46 CEST, 79,4°”. Gdy obiekt góruje w dzień, tekst zawiera
   * „góruje w dzień” i godzinę najwyższego położenia w oknie ciemności.
   */
  culmination: string
  /** Przerzut, np. „przerzut 23:56 CEST”; null bez montażu GEM albo gdy obiekt góruje w dzień. */
  flip: string | null
  /** Czas efektywny z progiem: „09:39, próg −18°”, „03:01, próg −12° (obniżony)” albo „brak okna przy progu −12°”. */
  effectiveTime: string
  /** Najmniejsza separacja od Księżyca w oknie efektywnym, np. „47,3°”; „—”, gdy obiekt nie ma czasu efektywnego. */
  minMoonSeparation: string
  /** Odznaki filtrów w kolejności rekomendacji; pusta lista, gdy obiekt nie ma rekomendacji. */
  badges: ObjectCardBadge[]
}

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

/** Model karty obiektu na noc D; `advice` to wynik `filterAdvice` dla filtrów aktywnego zestawu. */
export function objectCardModel(
  object: DsoObject,
  summary: ObjectNightSummary,
  advice: readonly FilterAdvice[],
  context: CardContext,
): ObjectCardModel {
  void object
  void summary
  void advice
  void context
  return notImplemented('objectCardModel')
}
