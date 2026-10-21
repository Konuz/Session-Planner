// Komunikaty zakładki „Katalog”: liczba wyników, stan (wczytywanie, liczenie, błędy) z przyciskiem „Spróbuj ponownie”,
// komunikat o progu ciemności i o pustej liście. Komponent prezentacyjny modelu widoku (`catalogView`).
import { RotateCcw, TriangleAlert } from 'lucide-react'
import type { CatalogView } from './catalogTabModel'

export interface CatalogMessagesProps {
  /** Model widoku zakładki. */
  view: CatalogView
  /** Ponowne wczytanie katalogu (przycisk „Spróbuj ponownie”). */
  onRetry: () => void
}

export function CatalogMessages({ view, onRetry }: CatalogMessagesProps) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      {view.count !== null && <p className="text-base font-semibold text-accent">{view.count}</p>}
      {view.status !== null && (
        <p role={view.retry ? 'alert' : 'status'} className="flex flex-wrap items-center gap-2 text-muted">
          {view.status}
          {view.retry && (
            <button type="button" className="button" onClick={onRetry}>
              <RotateCcw aria-hidden size={16} /> Spróbuj ponownie
            </button>
          )}
        </p>
      )}
      {view.darknessNote !== null && (
        <p role="status" className="flex items-start gap-2 text-alert">
          <TriangleAlert aria-hidden size={18} className="mt-0.5 shrink-0" />
          {view.darknessNote}
        </p>
      )}
      {view.emptyNote !== null && <p className="text-muted">{view.emptyNote}</p>}
    </div>
  )
}
