// Karta obiektu w katalogu (7A): komponent prezentacyjny modelu karty; ikony z Lucide, kolory tylko z tokenów.
// ZAŚLEPKA funkcji „karta-obiektu”: ObjectCard zgłasza NotImplementedError.
import type { ObjectCardModel } from './objectCardModel'

function notImplemented(name: string): never {
  throw new Error(`NotImplementedError: ${name}`)
}

export function ObjectCard({ card }: { card: ObjectCardModel }) {
  void card
  return notImplemented('ObjectCard')
}
