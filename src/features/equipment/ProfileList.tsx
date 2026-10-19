// Podsekcja „Zestawy” sekcji „Sprzęt” (zakladka-sprzet): przyciski zestawów (aktywny wciśnięty), „Dodaj zestaw”,
// „Duplikuj zestaw”, „Usuń zestaw” z pytaniem o potwierdzenie i komunikat błędu. Komponent prezentacyjny.
// ZAŚLEPKA: komponent rzuca NotImplementedError; implementację dopisuje implementer.
import type { ReactNode } from 'react'
import type { EquipmentProfile } from '../../types'

export interface ProfileListProps {
  profiles: readonly EquipmentProfile[]
  /** Id aktywnego zestawu. */
  activeId: string
  /** false → „Usuń zestaw” nieaktywny z podpowiedzią „Ostatniego zestawu nie można usunąć”. */
  canRemove: boolean
  /** true → pytanie „Usunąć „<nazwa aktywnego>”?” z przyciskami „Usuń” i „Anuluj”. */
  confirmRemove: boolean
  /** Komunikat błędu (np. „Nie udało się dodać zestawu: …”); null = brak. */
  error: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  /** Duplikuje aktywny zestaw. */
  onDuplicate: () => void
  onRemoveRequest: () => void
  onRemoveConfirm: () => void
  onRemoveCancel: () => void
}

export function ProfileList(props: ProfileListProps): ReactNode {
  const error = new Error(`ProfileList: not implemented (${props.profiles.length})`)
  error.name = 'NotImplementedError'
  throw error
}
