// Zakładka Ustawienia (sekcja 9): lokalizacje i edytor horyzontu, pod nimi parametry planowania; zapis w IndexedDB.
import { MapPin, Plus, Save, Trash2, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { locationToForm, readLocationForm, type LocationField, type LocationForm } from '../../services/location'
import { useActiveLocation, usePlannerStore } from '../../state/plannerStore'
import type { HorizonPoint, ObserverLocation, PlanningSettings } from '../../types'
import { Field } from './Field'
import { HorizonEditor } from './HorizonEditor'
import { PlanningSettingsEditor } from './PlanningSettingsEditor'
import { planningSettingsToForm, submitPlanningSettingsForm, type PlanningSaveMessage } from './planningSettingsForm'

const TIME_ZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

export function SettingsTab() {
  const location = useActiveLocation()
  const planningSettings = usePlannerStore((state) => state.planningSettings)
  // Komunikat zapisu parametrów jest tutaj, bo udany zapis zmienia klucz sekcji poniżej.
  const [planningMessage, setPlanningMessage] = useState<PlanningSaveMessage | null>(null)
  return (
    <div className="flex flex-col gap-4">
      <LocationList />
      {/* Klucz resetuje formularz po wyborze innej lokalizacji. */}
      <LocationEditor key={location.id} location={location} />
      {/* Klucz ustawia formularz na nowo, gdy zmienią się zapisane parametry (wczytanie z bazy po starcie, zapis). */}
      <PlanningSettingsSection
        key={JSON.stringify(planningSettings)}
        saved={planningSettings}
        message={planningMessage}
        onMessage={setPlanningMessage}
      />
    </div>
  )
}

function PlanningSettingsSection({
  saved,
  message,
  onMessage,
}: {
  saved: PlanningSettings
  message: PlanningSaveMessage | null
  onMessage: (message: PlanningSaveMessage | null) => void
}) {
  const savePlanningSettings = usePlannerStore((state) => state.savePlanningSettings)
  const [form, setForm] = useState(() => planningSettingsToForm(saved))

  const save = async () => {
    const result = await submitPlanningSettingsForm(form, savePlanningSettings)
    setForm(result.form)
    onMessage(result.message)
  }

  return (
    <PlanningSettingsEditor
      saved={saved}
      form={form}
      message={message}
      onFormChange={(next) => {
        setForm(next)
        onMessage(null)
      }}
      onSave={() => void save()}
    />
  )
}

function LocationList() {
  const locations = usePlannerStore((state) => state.locations)
  const active = useActiveLocation()
  const selectLocation = usePlannerStore((state) => state.selectLocation)
  const saveLocation = usePlannerStore((state) => state.saveLocation)
  const [error, setError] = useState<string | null>(null)

  const addLocation = async () => {
    try {
      await saveLocation({ ...active, id: crypto.randomUUID(), name: 'Nowa lokalizacja', horizon: [], bortle: null, sqm: null })
      setError(null)
    } catch (caught) {
      setError(`Nie udało się dodać lokalizacji: ${errorText(caught)}`)
    }
  }

  return (
    <section className="card p-4" aria-labelledby="locations-title">
      <h2 id="locations-title" className="text-base font-semibold">
        Lokalizacje
      </h2>
      <p className="mt-1 text-sm text-muted">Wybrana lokalizacja jest aktywna w całej aplikacji; formularz poniżej ją edytuje.</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {locations.map((location) => (
          <li key={location.id}>
            <button
              type="button"
              className="button"
              aria-pressed={location.id === active.id}
              onClick={() => selectLocation(location.id)}
            >
              <MapPin aria-hidden size={16} /> {location.name}
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="button" onClick={() => void addLocation()}>
            <Plus aria-hidden size={16} /> Dodaj lokalizację
          </button>
        </li>
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-accent">
          {error}
        </p>
      )}
    </section>
  )
}

function sameHorizon(a: readonly HorizonPoint[], b: readonly HorizonPoint[]): boolean {
  return a.length === b.length && a.every((point, i) => point.azDeg === b[i].azDeg && point.altDeg === b[i].altDeg)
}

function sameForm(a: LocationForm, b: LocationForm): boolean {
  return (Object.keys(a) as (keyof LocationForm)[]).every((key) => a[key] === b[key])
}

function LocationEditor({ location }: { location: ObserverLocation }) {
  const saveLocation = usePlannerStore((state) => state.saveLocation)
  const removeLocation = usePlannerStore((state) => state.removeLocation)
  const canRemove = usePlannerStore((state) => state.locations.length > 1)
  const [form, setForm] = useState(() => locationToForm(location))
  const [horizon, setHorizon] = useState(location.horizon)
  const [message, setMessage] = useState<{ kind: 'saved' | 'error'; text: string } | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const { location: draft, issues } = readLocationForm(form, { id: location.id, horizon })
  const dirty = !sameForm(form, locationToForm(location)) || !sameHorizon(horizon, location.horizon)
  const issueFor = (field: LocationField) => issues.find((issue) => issue.field === field)?.message

  const update = (field: keyof LocationForm, value: string) => {
    setForm({ ...form, [field]: value })
    setMessage(null)
  }

  const save = async () => {
    if (!draft) return
    try {
      await saveLocation(draft)
      setForm(locationToForm(draft))
      setHorizon(draft.horizon)
      setMessage({ kind: 'saved', text: 'Zapisano lokalizację.' })
    } catch (caught) {
      setMessage({ kind: 'error', text: `Nie udało się zapisać: ${errorText(caught)}` })
    }
  }

  const discard = () => {
    setForm(locationToForm(location))
    setHorizon(location.horizon)
    setMessage(null)
  }

  const remove = async () => {
    try {
      await removeLocation(location.id)
    } catch (caught) {
      setConfirmRemove(false)
      setMessage({ kind: 'error', text: `Nie udało się usunąć: ${errorText(caught)}` })
    }
  }

  const input = (field: Exclude<keyof LocationForm, 'timezone'>, className: string) => (
    <input
      className={`control text-sm ${className}`}
      inputMode={field === 'name' ? 'text' : 'decimal'}
      value={form[field]}
      aria-invalid={issueFor(field) !== undefined}
      onChange={(event) => update(field, event.target.value)}
    />
  )

  return (
    <section className="card flex flex-col gap-5 p-4" aria-labelledby="location-editor-title">
      <h2 id="location-editor-title" className="text-base font-semibold">
        Edycja: {location.name}
      </h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Nazwa" error={issueFor('name')}>
          {input('name', '')}
        </Field>
        <Field label="Szerokość geograficzna [°]" error={issueFor('latDeg')} hint="N dodatnia">
          {input('latDeg', '')}
        </Field>
        <Field label="Długość geograficzna [°]" error={issueFor('lonDegEast')} hint="E dodatnia (19°E = 19)">
          {input('lonDegEast', '')}
        </Field>
        <Field label="Wysokość n.p.m. [m]" error={issueFor('elevationM')}>
          {input('elevationM', '')}
        </Field>
        <Field label="Strefa czasowa (IANA)" error={issueFor('timezone')} hint="np. Europe/Warsaw">
          <input
            className="control text-sm"
            list="time-zones"
            value={form.timezone}
            aria-invalid={issueFor('timezone') !== undefined}
            onChange={(event) => update('timezone', event.target.value)}
          />
          <datalist id="time-zones">
            {TIME_ZONES.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bortle" error={issueFor('bortle')} hint="1–9, informacyjnie">
            {input('bortle', '')}
          </Field>
          <Field label="SQM [mag/arcsec²]" error={issueFor('sqm')} hint="informacyjnie">
            {input('sqm', '')}
          </Field>
        </div>
      </div>

      <section aria-labelledby="horizon-title" className="flex flex-col gap-2">
        <h3 id="horizon-title" className="text-sm font-semibold">
          Horyzont
        </h3>
        <HorizonEditor
          points={horizon}
          onChange={(points) => {
            setHorizon(points)
            setMessage(null)
          }}
          locationName={form.name.trim() || location.name}
        />
        {issueFor('horizon') && (
          <p role="alert" className="text-sm text-accent">
            {issueFor('horizon')}
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button type="button" className="button button-primary" disabled={!dirty || !draft} onClick={() => void save()}>
          <Save aria-hidden size={18} /> Zapisz zmiany
        </button>
        <button type="button" className="button" disabled={!dirty} onClick={discard}>
          <Undo2 aria-hidden size={18} /> Odrzuć zmiany
        </button>
        {dirty && <span className="text-sm text-muted">Niezapisane zmiany</span>}
        {message && (
          <span role="status" className={`text-sm ${message.kind === 'error' ? 'text-accent' : 'text-muted'}`}>
            {message.text}
          </span>
        )}
        <span className="flex-1" />
        {confirmRemove ? (
          <span className="flex flex-wrap items-center gap-2 text-sm">
            Usunąć „{location.name}”?
            <button type="button" className="button" onClick={() => void remove()}>
              <Trash2 aria-hidden size={18} /> Usuń
            </button>
            <button type="button" className="button" onClick={() => setConfirmRemove(false)}>
              Anuluj
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="button"
            disabled={!canRemove}
            title={canRemove ? undefined : 'Ostatniej lokalizacji nie można usunąć'}
            onClick={() => setConfirmRemove(true)}
          >
            <Trash2 aria-hidden size={18} /> Usuń lokalizację
          </button>
        )}
      </div>
    </section>
  )
}
