// Model karty obiektu w katalogu (7A): czysta funkcja, która z obiektu, podsumowania nocy z Workera, aktywnego zestawu,
// kursora, położenia Księżyca w kursorze i kolorów rekomendacji robi gotowe teksty karty.
import {
  angularSeparationDeg,
  horizontalAt,
  toEquatorOfDate,
  type EquatorialDeg,
  type GeoPosition,
  type PrecessionMatrix,
} from '../../services/astroMath'
import { designationKey, formatDesignation } from '../../services/catalog/records'
import { meridianFlipMs, type ObjectNightSummary } from '../../services/catalogNight'
import type { FilterAdvice, FilterAdviceColor } from '../../services/filterAdvice'
import { formatDeg } from '../../services/format'
import { formatDuration, formatLocalTime } from '../../services/time'
import type { Darkness } from '../../services/visibility'
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

/** Etykieta i token koloru typu (P10, P11). */
const TYPES: Record<DsoType, { label: string; color: ColorToken }> = {
  galaxy: { label: 'galaktyka', color: 'galaxy' },
  galaxy_group: { label: 'grupa galaktyk', color: 'galaxy' },
  emission_nebula: { label: 'mgławica emisyjna', color: 'emissionNebula' },
  reflection_nebula: { label: 'mgławica refleksyjna', color: 'reflectionNebula' },
  dark_nebula: { label: 'mgławica ciemna', color: 'darkNebula' },
  planetary_nebula: { label: 'mgławica planetarna', color: 'planetaryNebula' },
  supernova_remnant: { label: 'pozostałość po supernowej', color: 'emissionNebula' },
  open_cluster: { label: 'gromada otwarta', color: 'cluster' },
  globular_cluster: { label: 'gromada kulista', color: 'cluster' },
  cluster_nebula: { label: 'gromada z mgławicą', color: 'emissionNebula' },
  other: { label: 'inny obiekt', color: 'muted' },
}

/** Znak, opis i token odznaki dla każdego stanu rekomendacji (P9). */
const BADGES: Record<FilterAdviceColor, { mark: BadgeMark; text: string; token: ColorToken }> = {
  green: { mark: '✓', text: 'dobre warunki', token: 'badgeGood' },
  yellow: { mark: '!', text: 'średnie warunki', token: 'badgeFair' },
  red: { mark: '✗', text: 'złe warunki', token: 'badgePoor' },
}

function effectiveTimeText(darkness: Darkness, minutes: number | null): string {
  const threshold = formatDeg(darkness.thresholdDeg, 0)
  if (darkness.kind === 'none') return `brak okna przy progu ${threshold}`
  return `${formatDuration(minutes ?? 0)}, próg ${threshold}${darkness.lowered ? ' (obniżony)' : ''}`
}

/** Model karty obiektu na noc D; `advice` to wynik `filterAdvice` dla filtrów aktywnego zestawu. */
export function objectCardModel(
  object: DsoObject,
  summary: ObjectNightSummary,
  advice: readonly FilterAdvice[],
  context: CardContext,
): ObjectCardModel {
  const time = (timeMs: number) => formatLocalTime(timeMs, context.timeZone)
  const primaryKey = designationKey(object.primary)
  const others = object.designations.filter((designation) => designationKey(designation) !== primaryKey)
  const ofDate = toEquatorOfDate(object, context.precession)
  const { altDeg, azDeg } = horizontalAt(ofDate, context.site, context.cursorMs)
  const { transitMs, highest } = summary
  const altitude = highest ? `, ${formatDeg(highest.altDeg)}` : ''
  const flipMs = meridianFlipMs(transitMs, context.profile.mount)
  return {
    primary: formatDesignation(object.primary),
    otherDesignations: others.length > 0 ? others.map(formatDesignation).join(', ') : null,
    name: object.commonNames[0] ?? null,
    type: object.type,
    typeLabel: TYPES[object.type].label,
    typeColor: TYPES[object.type].color,
    position: `wysokość ${formatDeg(altDeg)}, azymut ${formatDeg(azDeg)}`,
    moonSeparation: formatDeg(angularSeparationDeg(ofDate, context.moonAtCursor)),
    culmination:
      transitMs !== null
        ? `górowanie ${time(transitMs)}${altitude}`
        : `góruje w dzień${highest ? `, najwyżej ${time(highest.timeMs)}${altitude}` : ''}`,
    flip: flipMs === null ? null : `przerzut ${time(flipMs)}`,
    effectiveTime: effectiveTimeText(summary.darkness, summary.effectiveMinutes),
    minMoonSeparation: summary.moon ? formatDeg(summary.moon.minSeparationDeg) : '—',
    badges: advice.map(({ filter, color }) => ({
      filter,
      color,
      mark: BADGES[color].mark,
      description: `${filter}: ${BADGES[color].text}`,
      colorToken: BADGES[color].token,
    })),
  }
}
