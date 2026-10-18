// Lista katalogu (7A): przewijana lista kart obiektów, wirtualizowana przez @tanstack/react-virtual.
// Komponent prezentacyjny: obiekty, wyniki nocy D i kontekst kart dostaje przez właściwości.
// ZAŚLEPKA funkcji „zakladka-katalog”: CatalogList zgłasza NotImplementedError.
import type { ObjectNightSummary } from '../../services/catalogNight'
import type { DsoObject, EquipmentProfile, MoonRuleThresholds } from '../../types'
import type { CardContext } from './objectCardModel'

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

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

export function CatalogList(props: CatalogListProps) {
  void props
  return notImplemented('CatalogList')
}
