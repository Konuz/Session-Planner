// Karta obiektu w katalogu (7A): komponent prezentacyjny modelu karty; ikony z Lucide, kolory tylko z tokenów.
import {
  Blend,
  CircleDot,
  CircleQuestionMark,
  Cloud,
  CloudFog,
  Cloudy,
  Grip,
  Haze,
  Orbit,
  Sparkle,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { tokenVariable, type ColorToken } from '../../theme/tokens'
import type { DsoType } from '../../types'
import type { ObjectCardModel } from './objectCardModel'

const TYPE_ICONS: Record<DsoType, LucideIcon> = {
  galaxy: Orbit,
  galaxy_group: Blend,
  emission_nebula: Cloud,
  reflection_nebula: Cloudy,
  dark_nebula: CloudFog,
  planetary_nebula: CircleDot,
  supernova_remnant: Sparkle,
  open_cluster: Sparkles,
  globular_cluster: Grip,
  cluster_nebula: Haze,
  other: CircleQuestionMark,
}

/** Kolor z tokenu przez zmienną CSS, więc Red Mode przełącza go razem z paletą. */
function tokenColor(token: ColorToken): CSSProperties {
  return { color: `var(${tokenVariable(token)})`, borderColor: `var(${tokenVariable(token)})` }
}

export interface ObjectCardProps {
  card: ObjectCardModel
  /**
   * Przycisk „Pokaż na wykresie nocy” (ikona, tekst, co najmniej 44 px wysokości), element <button> bezpośrednio w
   * karcie; kliknięcie wywołuje tę funkcję. CatalogList podaje tu otwarcie obiektu karty (`openObject(uid)` ze stanu).
   * ZAŚLEPKA funkcji „wybor-obiektu”: karta jeszcze nie ma przycisku.
   */
  onShowOnNight?: () => void
}

export function ObjectCard({ card }: ObjectCardProps) {
  const TypeIcon = TYPE_ICONS[card.type]
  return (
    <article className="card flex flex-col gap-2 p-3 text-sm text-foreground">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{card.primary}</h3>
          {card.name !== null && <p>{card.name}</p>}
          {card.otherDesignations !== null && <p className="text-xs text-muted">{card.otherDesignations}</p>}
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs" style={tokenColor(card.typeColor)}>
          <TypeIcon aria-hidden size={16} />
          {card.typeLabel}
        </span>
      </header>
      <ul className="flex flex-col gap-0.5 text-xs">
        <li>{card.position}</li>
        <li>{card.culmination}</li>
        {card.flip !== null && <li>{card.flip}</li>}
        <li>
          <span className="text-muted">Czas efektywny </span>
          {card.effectiveTime}
        </li>
        <li>
          <span className="text-muted">Księżyc w kursorze </span>
          {card.moonSeparation}
          <span className="text-muted">, najbliżej w oknie </span>
          {card.minMoonSeparation}
        </li>
      </ul>
      {card.badges.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label="Rekomendacje filtrów">
          {card.badges.map((badge) => (
            <li
              key={badge.filter}
              title={badge.description}
              className="rounded border px-1.5 text-xs"
              style={tokenColor(badge.colorToken)}
            >
              <span aria-hidden="true">
                {badge.mark} {badge.filter}
              </span>
              <span className="sr-only">{badge.description}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
