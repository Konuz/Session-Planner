// Podsekcja „Zestawy” sekcji „Sprzęt” (zakladka-sprzet): przyciski zestawów (aktywny wciśnięty), „Dodaj zestaw”,
// „Duplikuj zestaw”, „Usuń zestaw” z pytaniem o potwierdzenie i komunikat błędu. Komponent prezentacyjny.
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
  const { profiles, activeId, canRemove, confirmRemove, error } = props
  const active = profiles.find((profile) => profile.id === activeId)
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2">
        {profiles.map((profile) => (
          <li key={profile.id}>
            <button type="button" className="button" aria-pressed={profile.id === activeId} onClick={() => props.onSelect(profile.id)}>
              {profile.name}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="button" onClick={props.onAdd}>
          Dodaj zestaw
        </button>
        <button type="button" className="button" onClick={props.onDuplicate}>
          Duplikuj zestaw
        </button>
        {confirmRemove ? (
          <span className="flex flex-wrap items-center gap-2 text-sm">
            {`Usunąć „${active?.name ?? ''}”?`}
            <button type="button" className="button" onClick={props.onRemoveConfirm}>
              Usuń
            </button>
            <button type="button" className="button" onClick={props.onRemoveCancel}>
              Anuluj
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="button"
            disabled={!canRemove}
            title={canRemove ? undefined : 'Ostatniego zestawu nie można usunąć'}
            onClick={props.onRemoveRequest}
          >
            Usuń zestaw
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  )
}
