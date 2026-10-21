// Karta obiektu w katalogu (7A): komponent prezentacyjny modelu karty; ikony z Lucide, kolory tylko z tokenów.
import { ChartSpline } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { tokenVariable, type ColorToken } from '../../theme/tokens'
import type { ObjectCardModel } from './objectCardModel'
import { TYPE_ICONS } from './typeIcons'

/** Kolor z tokenu przez zmienną CSS, więc Red Mode przełącza go razem z paletą (tło odznaki liczy się z `color`). */
function tokenColor(token: ColorToken): CSSProperties {
  return { color: `var(${tokenVariable(token)})` }
}

export interface ObjectCardProps {
  card: ObjectCardModel
  /**
   * Przycisk „Pokaż na wykresie nocy” (ikona, tekst, co najmniej 44 px wysokości), element <button> bezpośrednio w
   * karcie; kliknięcie wywołuje tę funkcję. CatalogList podaje tu otwarcie obiektu karty (`openObject(uid)` ze stanu).
   * Bez tej funkcji karta nie ma przycisku.
   */
  onShowOnNight?: () => void
  /** Miniatura obiektu (zdjęcie z lewej); bez niej karta jest bez zdjęcia. */
  image?: ReactNode
  /** Mini-wykres wysokości w nocy (z prawej, na szerokim ekranie). */
  altitude?: ReactNode
}

export function ObjectCard({ card, onShowOnNight, image, altitude }: ObjectCardProps) {
  const TypeIcon = TYPE_ICONS[card.type]
  return (
    <article className="card flex gap-4 p-4 text-sm text-foreground md:gap-5">
      {image}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-serif text-2xl leading-tight font-medium text-parchment">{card.primary}</h3>
            {card.name !== null && <p className="font-serif text-lg leading-snug italic">{card.name}</p>}
            {card.otherDesignations !== null && <p className="text-xs text-muted">{card.otherDesignations}</p>}
          </div>
          <span className="flex shrink-0 items-center gap-1.5 pt-1 text-xs font-semibold" style={tokenColor(card.typeColor)}>
            <TypeIcon aria-hidden size={16} />
            {card.typeLabel}
          </span>
        </header>
        <div className={`grid gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] ${altitude ? 'xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_15rem]' : ''}`}>
          <p className="flex flex-col">
            <span className="text-xs text-muted">Czas efektywny</span>
            <span className="figures text-2xl leading-tight text-accent">{card.effectiveTime}</span>
          </p>
          <ul className="flex flex-col gap-0.5">
            <li>{card.position}</li>
            <li>{card.culmination}</li>
            {card.flip !== null && <li>{card.flip}</li>}
            <li>
              <span className="text-muted">Księżyc w kursorze </span>
              {card.moonSeparation}
              <span className="text-muted">, najbliżej w oknie </span>
              {card.minMoonSeparation}
            </li>
          </ul>
          {altitude && <div className="overflow-hidden rounded-lg border border-border max-xl:hidden">{altitude}</div>}
        </div>
        {(card.badges.length > 0 || onShowOnNight) && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {card.badges.length > 0 && (
              <ul className="flex flex-wrap gap-1" aria-label="Rekomendacje filtrów">
                {card.badges.map((badge) => (
                  <li key={badge.filter} title={badge.description} className="filter-cell" style={tokenColor(badge.colorToken)}>
                    <span aria-hidden="true">
                      {badge.mark} {badge.filter}
                    </span>
                    <span className="sr-only">{badge.description}</span>
                  </li>
                ))}
              </ul>
            )}
            {onShowOnNight && (
              <button type="button" className="button ml-auto" onClick={onShowOnNight}>
                <ChartSpline aria-hidden size={16} />
                Pokaż na wykresie nocy
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
