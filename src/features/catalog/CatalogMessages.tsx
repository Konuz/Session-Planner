// Komunikaty zakładki „Katalog”: liczba wyników, stan (wczytywanie, liczenie, błędy) z przyciskiem „Spróbuj ponownie”,
// komunikat o progu ciemności i o pustej liście. Komponent prezentacyjny modelu widoku (`catalogView`).
// ZAŚLEPKA funkcji „zakladka-katalog”: CatalogMessages zgłasza NotImplementedError.
import type { CatalogView } from './catalogTabModel'

export interface CatalogMessagesProps {
  /** Model widoku zakładki. */
  view: CatalogView
  /** Ponowne wczytanie katalogu (przycisk „Spróbuj ponownie”). */
  onRetry: () => void
}

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

export function CatalogMessages(props: CatalogMessagesProps) {
  void props
  return notImplemented('CatalogMessages')
}
