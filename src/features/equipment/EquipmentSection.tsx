// Sekcja „Sprzęt” w Ustawieniach (zakladka-sprzet, kontener): nagłówek h2 „Sprzęt” i podsekcje h3 „Zestawy”,
// „Edycja zestawu: <nazwa>” i „Mój sprzęt”. Łączy stan aplikacji (`plannerStore`) i akcje własnych wpisów
// (`userEquipment.ts`) z komponentami ProfileList, ProfileEditor i OwnEquipmentList.
// ZAŚLEPKA: komponent rzuca NotImplementedError; implementację dopisuje implementer, a SettingsTab ma go wyrenderować
// po edycji lokalizacji i przed „Parametrami planowania”.
import type { ReactNode } from 'react'

export function EquipmentSection(): ReactNode {
  const error = new Error('EquipmentSection: not implemented')
  error.name = 'NotImplementedError'
  throw error
}
