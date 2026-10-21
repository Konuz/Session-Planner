// Podsekcja „Mój sprzęt” sekcji „Sprzęt” (zakladka-sprzet): listy „Teleskopy” i „Kamery” z własnymi wpisami,
// przyciski „Edytuj” i „Usuń”, formularz edycji wpisu pod wpisem, pytanie o usunięcie i komunikat. Komponent prezentacyjny.
import type { ReactNode } from 'react'
import type { CameraSpec, TelescopeSpec } from '../../types'
import { cameraText, editIssues, telescopeText } from './equipmentSectionModel'
import { MessageField } from './MessageField'
import type { EquipmentKind } from './ProfileEditor'
import { equipmentLabel } from './userEquipment'

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

const TELESCOPE_FIELDS: [string, string][] = [
  ['name', 'Nazwa teleskopu'],
  ['apertureMm', 'Apertura [mm]'],
  ['focalLengthMm', 'Ogniskowa [mm]'],
]

const CAMERA_FIELDS: [string, string][] = [
  ['name', 'Nazwa kamery'],
  ['resolutionXPx', 'Rozdzielczość X [px]'],
  ['resolutionYPx', 'Rozdzielczość Y [px]'],
  ['pixelSizeUm', 'Rozmiar piksela [µm]'],
]

function EditForm({ kind, form, props }: { kind: EquipmentKind; form: OwnEntryForm; props: OwnEquipmentListProps }) {
  const issues = editIssues(form)
  const values = form as unknown as Record<string, string>
  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(kind === 'telescope' ? TELESCOPE_FIELDS : CAMERA_FIELDS).map(([key, label]) => {
          const own = issues.filter((issue) => issue.field === key)
          return (
            <MessageField key={key} label={label} issues={own}>
              <input
                className="control text-sm"
                inputMode={key === 'name' ? 'text' : 'decimal'}
                value={values[key]}
                aria-invalid={own.some((issue) => issue.severity === 'error')}
                onChange={(event) => props.onEditChange({ ...form, [key]: event.target.value })}
              />
            </MessageField>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="button button-primary"
          disabled={issues.some((issue) => issue.severity === 'error')}
          onClick={props.onEditSave}
        >
          Zapisz wpis
        </button>
        <button type="button" className="button" onClick={props.onEditCancel}>
          Anuluj
        </button>
      </div>
    </div>
  )
}

function EntryList<T extends TelescopeSpec | CameraSpec>({
  kind,
  title,
  entries,
  text,
  props,
}: {
  kind: EquipmentKind
  title: string
  entries: readonly T[]
  text: (spec: T) => string
  props: OwnEquipmentListProps
}) {
  if (entries.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="flex flex-col gap-2">
        {entries.map((spec) => {
          const editing = props.editing?.kind === kind && props.editing.id === spec.id && props.editForm !== null
          return (
            <li key={spec.id} className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>{text(spec)}</span>
                <span className="flex-1" />
                <button type="button" className="button" onClick={() => props.onEdit(kind, spec.id)}>
                  Edytuj
                </button>
                <button type="button" className="button" onClick={() => props.onRemoveRequest(kind, spec.id)}>
                  Usuń
                </button>
              </div>
              {editing && props.editForm && <EditForm kind={kind} form={props.editForm} props={props} />}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function OwnEquipmentList(props: OwnEquipmentListProps): ReactNode {
  const { telescopes, cameras, confirmRemove, message } = props
  if (telescopes === null || cameras === null) return <p className="text-sm text-muted">Wczytywanie własnych wpisów…</p>
  const removed =
    confirmRemove === null
      ? undefined
      : confirmRemove.kind === 'telescope'
        ? telescopes.find((spec) => spec.id === confirmRemove.id)
        : cameras.find((spec) => spec.id === confirmRemove.id)
  return (
    <div className="flex flex-col gap-3">
      {telescopes.length === 0 && cameras.length === 0 ? (
        <p className="text-sm text-muted">
          Brak własnych wpisów. Użyj „Zapisz jako mój teleskop” albo „Zapisz jako moją kamerę”.
        </p>
      ) : (
        <>
          <EntryList kind="telescope" title="Teleskopy" entries={telescopes} text={telescopeText} props={props} />
          <EntryList kind="camera" title="Kamery" entries={cameras} text={cameraText} props={props} />
        </>
      )}
      {removed && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {`Usunąć wpis „${equipmentLabel(removed)}”? Zestawy zachowają swoje wartości.`}
          <button type="button" className="button" onClick={props.onRemoveConfirm}>
            Usuń
          </button>
          <button type="button" className="button" onClick={props.onRemoveCancel}>
            Anuluj
          </button>
        </div>
      )}
      {message && (
        <p role="alert" className="text-sm text-alert">
          {message}
        </p>
      )}
    </div>
  )
}
