// Podsekcja „Edycja zestawu: <nazwa>” sekcji „Sprzęt” (zakladka-sprzet): formularz aktywnego zestawu z wyszukiwarkami
// teleskopu i kamery, przyciskami mnożnika, komunikatami przy polach, podglądem na żywo, „Zapisz zestaw”,
// „Odrzuć zmiany zestawu”, „Zapisz jako mój teleskop / moją kamerę” i „Duplikuj jako własny”. Komponent prezentacyjny.
// ZAŚLEPKA: komponent rzuca NotImplementedError; implementację dopisuje implementer.
import type { ReactNode } from 'react'
import type { CameraSpec, EquipmentProfile, TelescopeSpec } from '../../types'
import type { ProfileForm } from './profileForm'

/** Rodzaj wpisu katalogu sprzętu. */
export type EquipmentKind = 'telescope' | 'camera'

/** Komunikat akcji (zapis zestawu, zapis wpisu): powodzenie albo błąd. */
export interface EquipmentMessage {
  kind: 'saved' | 'error'
  text: string
}

export interface ProfileEditorProps {
  /** Formularz edytowanego (aktywnego) zestawu. */
  form: ProfileForm
  /** Zapisany zestaw (do „Niezapisane zmiany” i „Odrzuć zmiany zestawu”). */
  saved: EquipmentProfile
  /** Wpisy katalogu: wbudowane i własne. */
  telescopes: readonly TelescopeSpec[]
  cameras: readonly CameraSpec[]
  /** Seeing z parametrów planowania [″]. */
  seeingArcsec: number
  /** Tekst pól „Szukaj teleskopu” i „Szukaj kamery”. */
  telescopeQuery: string
  cameraQuery: string
  message: EquipmentMessage | null
  onFormChange: (form: ProfileForm) => void
  /** Nowy tekst pola szukania teleskopu albo kamery (pusty = wyczyszczenie pola). */
  onQueryChange: (kind: EquipmentKind, query: string) => void
  onSave: () => void
  onDiscard: () => void
  onSaveTelescope: () => void
  onSaveCamera: () => void
  /** „Duplikuj jako własny” przy wpisie wbudowanym o danym id. */
  onDuplicateBuiltin: (kind: EquipmentKind, id: string) => void
}

export function ProfileEditor(props: ProfileEditorProps): ReactNode {
  const error = new Error(`ProfileEditor: not implemented (${props.form.id})`)
  error.name = 'NotImplementedError'
  throw error
}
