// Lista katalogu (7A): przewijana lista kart obiektów, wirtualizowana przez @tanstack/react-virtual.
// Komponent prezentacyjny: obiekty, wyniki nocy D i kontekst kart dostaje przez właściwości.
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef } from 'react'
import { formatDesignation } from '../../services/catalog/records'
import type { ObjectNightSummary } from '../../services/catalogNight'
import { filterAdvice } from '../../services/filterAdvice'
import type { DsoObject, EquipmentProfile, MoonRuleThresholds } from '../../types'
import { ObjectCard } from './ObjectCard'
import { DSO_TYPES, objectCardModel, type CardContext } from './objectCardModel'

export interface CatalogListProps {
  /** Obiekty listy po filtrach i sortowaniu (`catalogView`), w tej kolejności. */
  objects: readonly DsoObject[]
  /** Wyniki nocy D z Workera (dopasowanie po uid); null, dopóki Worker nie odpowie: karty są wtedy bez czasów nocy. */
  results: readonly ObjectNightSummary[] | null
  /** Kontekst kart (`objectCardModel`): miejsce, strefa, macierz precesji nocy, montaż, kursor i Księżyc w kursorze. */
  context: CardContext
  /** Aktywny zestaw: odznaki rekomendacji (`filterAdvice`) dla jego filtrów. */
  profile: EquipmentProfile
  /** Progi Księżyca z parametrów planowania (`filterAdvice`). */
  moonRules: MoonRuleThresholds
  /** Wymiary obszaru listy przed pierwszym pomiarem (`initialRect` wirtualizatora) [px]; pierwszy ekran także w Node. */
  initialRect?: { width: number; height: number }
}

/** Szacowana wysokość karty z odstępem [px], zanim wirtualizator ją zmierzy. */
const CARD_HEIGHT_PX = 180

/** Karta przed odpowiedzią Workera: oznaczenia, nazwa i typ, bez danych nocy. */
function PendingCard({ object }: { object: DsoObject }) {
  return (
    <article className="card flex flex-col gap-1 p-3 text-sm text-foreground">
      <h3 className="font-semibold">{formatDesignation(object.primary)}</h3>
      {object.commonNames.length > 0 && <p>{object.commonNames[0]}</p>}
      <p className="text-xs text-muted">{DSO_TYPES[object.type].label}</p>
    </article>
  )
}

export function CatalogList({ objects, results, context, profile, moonRules, initialRect }: CatalogListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const summaries = useMemo(() => new Map((results ?? []).map((summary) => [summary.uid, summary])), [results])
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: objects.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_HEIGHT_PX,
    getItemKey: (index) => objects[index].uid,
    initialRect,
    overscan: 3,
  })
  return (
    <div ref={scrollRef} className="h-[75dvh] overflow-y-auto">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const object = objects[item.index]
          const summary = summaries.get(object.uid)
          return (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute inset-x-0 top-0 pb-2"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              {summary ? (
                <ObjectCard
                  card={objectCardModel(
                    object,
                    summary,
                    filterAdvice(summary.moon ?? null, object.type, moonRules, profile.filters),
                    context,
                  )}
                />
              ) : (
                <PendingCard object={object} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
