// Podsekcja „Edycja zestawu: <nazwa>” sekcji „Sprzęt” (zakladka-sprzet): formularz aktywnego zestawu z wyszukiwarkami
// teleskopu i kamery, przyciskami mnożnika, komunikatami przy polach, podglądem na żywo, „Zapisz zestaw”,
// „Odrzuć zmiany zestawu”, „Zapisz jako mój teleskop / moją kamerę” i „Duplikuj jako własny”. Komponent prezentacyjny.
import type { ReactNode } from 'react'
import type { CameraSpec, EquipmentProfile, FilterId, Mount, TelescopeSpec } from '../../types'
import {
  CAMERA_MANUAL,
  TELESCOPE_MANUAL,
  cameraText,
  isDirty,
  numberText,
  resultText,
  sourceInfo,
  telescopeText,
} from './equipmentSectionModel'
import { MessageField, type FieldNote } from './MessageField'
import {
  changedFields,
  formSources,
  profilePreview,
  readProfileForm,
  reducerButtons,
  searchCameras,
  searchTelescopes,
  selectCamera,
  selectTelescope,
  type ProfileForm,
  type ProfileFormField,
} from './profileForm'

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

const CHANGED = 'zmienione względem katalogu'
const FILTERS: readonly FilterId[] = ['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII', 'OSC', 'DualBand']
const MOUNTS: [Mount['type'], string][] = [
  ['gem', 'GEM'],
  ['fork', 'widłowy'],
  ['altaz', 'alt-az'],
]
const TELESCOPE_KEYS: ProfileFormField[] = ['telescopeLabel', 'apertureMm', 'focalLengthMm']
const CAMERA_KEYS: ProfileFormField[] = ['cameraLabel', 'resolutionXPx', 'resolutionYPx', 'pixelSizeUm']
const DASH = '—'

type TextKey = {
  [K in ProfileFormField]: ProfileForm[K] extends string ? K : never
}[ProfileFormField]

export function ProfileEditor(props: ProfileEditorProps): ReactNode {
  const { form, saved, telescopes, cameras, seeingArcsec, message, onFormChange } = props
  const { profile, issues } = readProfileForm(form)
  const changed = new Set(changedFields(form, telescopes, cameras))
  const sources = formSources(form, telescopes, cameras)
  const dirty = isDirty(form, saved)
  const preview = profilePreview(form, seeingArcsec)
  const hasError = (keys: readonly ProfileFormField[]) =>
    issues.some((issue) => issue.severity === 'error' && keys.includes(issue.field))

  const notes = (key: ProfileFormField): FieldNote[] => [
    ...issues.filter((issue) => issue.field === key),
    ...(changed.has(key) ? [{ severity: 'note' as const, message: CHANGED }] : []),
  ]

  const text = (key: TextKey, label: string, decimal = true) => (
    <MessageField label={label} issues={notes(key)}>
      <input
        className="control text-sm"
        inputMode={decimal ? 'decimal' : 'text'}
        value={form[key]}
        aria-invalid={hasError([key])}
        onChange={(event) => onFormChange({ ...form, [key]: event.target.value })}
      />
    </MessageField>
  )

  const select = (key: 'sensor' | 'binning' | 'mountType', label: string, options: [string, string][], parse: (value: string) => unknown) => (
    <MessageField label={label} issues={notes(key)}>
      <select
        className="control text-sm"
        value={String(form[key])}
        onChange={(event) => onFormChange({ ...form, [key]: parse(event.target.value) })}
      >
        {options.map(([value, optionText]) => (
          <option key={value} value={value}>
            {optionText}
          </option>
        ))}
      </select>
    </MessageField>
  )

  const source = (kind: EquipmentKind, spec: TelescopeSpec | CameraSpec | null, manual: string) => {
    const info = sourceInfo(spec, manual)
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>{info.text}</span>
        {info.builtinId !== null && (
          <button type="button" className="button" onClick={() => props.onDuplicateBuiltin(kind, info.builtinId as string)}>
            Duplikuj jako własny
          </button>
        )}
      </div>
    )
  }

  const searchBox = <T extends TelescopeSpec | CameraSpec>(
    kind: EquipmentKind,
    label: string,
    listLabel: string,
    query: string,
    options: { spec: T | null; label: string }[],
    describe: (spec: T) => string,
    choose: (spec: T | null) => ProfileForm,
  ) => (
    <div className="flex flex-col gap-2">
      <MessageField label={label} issues={[]}>
        <input
          className="control text-sm"
          type="search"
          value={query}
          onChange={(event) => props.onQueryChange(kind, event.target.value)}
        />
      </MessageField>
      <ul aria-label={listLabel} className="flex flex-wrap gap-2">
        {(query.trim() === '' ? options.slice(0, 1) : options).map((option) => (
          <li key={option.spec?.id ?? ''}>
            <button
              type="button"
              className="button"
              onClick={() => {
                onFormChange(choose(option.spec))
                props.onQueryChange(kind, '')
              }}
            >
              {option.spec === null ? option.label : resultText(option.spec, describe)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )

  const toggleFilter = (id: FilterId, checked: boolean) =>
    onFormChange({ ...form, filters: checked ? [...form.filters.filter((f) => f !== id), id] : form.filters.filter((f) => f !== id) })

  const matrix = preview.sensor === DASH ? DASH : `${preview.sensor}, przekątna ${preview.sensorDiagonal}`
  const fov = preview.fieldOfViewDeg === DASH ? DASH : `${preview.fieldOfViewDeg} (${preview.fieldOfViewArcmin})`
  const sampling = preview.sampling === DASH ? DASH : `${preview.sampling} (seeing ${numberText(seeingArcsec)}″)`
  const previewRows: [string, string][] = [
    ['F_eff', preview.effectiveFocalLength],
    ['Światłosiła', preview.focalRatio],
    ['Matryca', matrix],
    ['Pole widzenia', fov],
    ['Skala', preview.scale],
    ['Próbkowanie', sampling],
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2">{text('name', 'Nazwa profilu', false)}</div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold">Teleskop</legend>
        {source('telescope', sources.telescope, TELESCOPE_MANUAL)}
        {searchBox('telescope', 'Szukaj teleskopu', 'Wyniki: teleskopy', props.telescopeQuery, searchTelescopes(props.telescopeQuery, telescopes), telescopeText, (spec) =>
          selectTelescope(form, spec),
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          {text('telescopeLabel', 'Nazwa teleskopu', false)}
          {text('apertureMm', 'Apertura [mm]')}
          {text('focalLengthMm', 'Ogniskowa [mm]')}
        </div>
        <div>
          <button type="button" className="button" disabled={hasError(TELESCOPE_KEYS)} onClick={props.onSaveTelescope}>
            Zapisz jako mój teleskop
          </button>
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <div className="grid gap-3 sm:grid-cols-3">{text('reducerFactor', 'Mnożnik [×]')}</div>
        <div role="group" aria-label="Szybki wybór mnożnika" className="flex flex-wrap gap-2">
          {reducerButtons(form).map((button) => (
            <button
              key={button.label}
              type="button"
              className="button"
              aria-pressed={button.pressed}
              onClick={() => onFormChange({ ...form, reducerFactor: button.text })}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold">Kamera</legend>
        {source('camera', sources.camera, CAMERA_MANUAL)}
        {searchBox('camera', 'Szukaj kamery', 'Wyniki: kamery', props.cameraQuery, searchCameras(props.cameraQuery, cameras), cameraText, (spec) =>
          selectCamera(form, spec),
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {text('cameraLabel', 'Nazwa kamery', false)}
          {text('resolutionXPx', 'Rozdzielczość X [px]')}
          {text('resolutionYPx', 'Rozdzielczość Y [px]')}
          {text('pixelSizeUm', 'Rozmiar piksela [µm]')}
          {select('sensor', 'Typ', [['mono', 'mono'], ['osc', 'OSC']], (value) => value)}
        </div>
        <div>
          <button type="button" className="button" disabled={hasError(CAMERA_KEYS)} onClick={props.onSaveCamera}>
            Zapisz jako moją kamerę
          </button>
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        {select('binning', 'Binning', [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']], Number)}
        {select('mountType', 'Montaż', MOUNTS, (value) => value)}
        {text('flipMinutes', 'Przerzut [min]')}
      </div>

      <fieldset className="flex flex-wrap gap-3 text-sm">
        <legend className="text-sm font-semibold">Filtry</legend>
        {FILTERS.map((id) => (
          <label key={id} className="flex items-center gap-1">
            <input type="checkbox" checked={form.filters.includes(id)} onChange={(event) => toggleFilter(id, event.target.checked)} />
            {id}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.oagEnabled} onChange={(event) => onFormChange({ ...form, oagEnabled: event.target.checked })} />
          OAG
        </label>
        {form.oagEnabled && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {text('oagPrismWidthMm', 'Szerokość pryzmatu [mm]')}
            {text('oagPrismHeightMm', 'Wysokość pryzmatu [mm]')}
            {text('oagOffsetMm', 'Odległość od środka matrycy [mm]')}
            {text('oagAngleDeg', 'Kąt OAG [°]')}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {previewRows.flatMap(([term, value]) => [<dt key={`t-${term}`} className="text-muted">{term}</dt>, <dd key={`d-${term}`}>{value}</dd>])}
        </dl>
        {preview.oscNote && <p className="text-xs text-muted">{preview.oscNote}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button type="button" className="button button-primary" disabled={!dirty || profile === null} onClick={props.onSave}>
          Zapisz zestaw
        </button>
        <button type="button" className="button" disabled={!dirty} onClick={props.onDiscard}>
          Odrzuć zmiany zestawu
        </button>
        {dirty && <span className="text-sm text-muted">Niezapisane zmiany</span>}
        {message && (
          <span role="status" className={`text-sm ${message.kind === 'error' ? 'text-alert' : 'text-muted'}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  )
}
