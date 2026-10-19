// Podsekcja „Mój sprzęt” sekcji „Sprzęt” (zakladka-sprzet): listy „Teleskopy” i „Kamery” z własnymi wpisami,
// przyciski „Edytuj” i „Usuń”, formularz edycji wpisu pod wpisem, pytanie o usunięcie i komunikat. Komponent prezentacyjny.
// ZAŚLEPKA: komponent rzuca NotImplementedError; implementację dopisuje implementer.
import type { ReactNode } from 'react'
import type { CameraSpec, TelescopeSpec } from '../../types'
import type { EquipmentKind } from './ProfileEditor'

/** Wskazanie własnego wpisu: rodzaj i id. */
export interface OwnEntryRef {
  kind: EquipmentKind
  id: string
}

/** Pola edycji własnego teleskopu (tekst jak w formularzu zestawu). */
export interface OwnTelescopeForm {
  name: string
  apertureMm: string
  focalLengthMm: string
}

/** Pola edycji własnej kamery (tekst jak w formularzu zestawu). */
export interface OwnCameraForm {
  name: string
  resolutionXPx: string
  resolutionYPx: string
  pixelSizeUm: string
}

export type OwnEntryForm = OwnTelescopeForm | OwnCameraForm

export interface OwnEquipmentListProps {
  /** Tylko własne wpisy, w kolejności do pokazania; null = wpisy jeszcze się wczytują. */
  telescopes: readonly TelescopeSpec[] | null
  cameras: readonly CameraSpec[] | null
  /** Edytowany wpis; null = brak edycji. */
  editing: OwnEntryRef | null
  /** Pola edytowanego wpisu (gdy `editing` nie jest null). */
  editForm: OwnEntryForm | null
  /** Wpis, o którego usunięcie pytamy; null = brak pytania. */
  confirmRemove: OwnEntryRef | null
  /** Komunikat pod listą (np. błąd akcji); null = brak. */
  message: string | null
  onEdit: (kind: EquipmentKind, id: string) => void
  onEditChange: (form: OwnEntryForm) => void
  onEditSave: () => void
  onEditCancel: () => void
  onRemoveRequest: (kind: EquipmentKind, id: string) => void
  onRemoveConfirm: () => void
  onRemoveCancel: () => void
}

export function OwnEquipmentList(props: OwnEquipmentListProps): ReactNode {
  const error = new Error(`OwnEquipmentList: not implemented (${props.message ?? ''})`)
  error.name = 'NotImplementedError'
  throw error
}
