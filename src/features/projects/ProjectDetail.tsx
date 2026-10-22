// Szczegóły projektu (7E): obiekt i suma czasu, postęp na filtr z celami, dziennik akwizycji, notatki, kadr i eksport.
// Komponent renderuje model z projectModel.ts; zmiany oddaje przez `onUpdate` jako funkcje `Project → Project` liczone na
// wersji z bazy (dwie szybkie zmiany się nie nadpisują), pliki pobiera w obsłudze zdarzeń.
import { Crosshair, Download, FileJson, FileSpreadsheet, Info, Mountain, Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { exportHorizonFile } from '../../services/horizonFile'
import { FILTER_IDS } from '../../services/equipment'
import type { DsoObject, EquipmentProfile, FilterId, ObserverLocation, Project } from '../../types'
import { downloadText } from '../../ui/download'
import { tokenVariable } from '../../theme/tokens'
import { DSO_TYPES } from '../catalog/objectCardModel'
import { ObjectThumbnail } from '../catalog/ObjectThumbnail'
import { TYPE_ICONS } from '../catalog/typeIcons'
import { MessageField } from '../equipment/MessageField'
import { objectName } from '../night/objectName'
import {
  addLogEntry,
  coordinateTexts,
  filterRows,
  framingTexts,
  logRows,
  projectCsv,
  projectEquipment,
  projectFileName,
  projectToFile,
  readGoalInput,
  readLogForm,
  removeLogEntry,
  setGoal,
  totalText,
  type LogForm,
  type LogIssue,
} from './projectModel'

export const NINA_IMPORT_NOTE =
  'Import w N.I.N.A.: prosty sekwencer → importuj cele → pliki Telescopius (*.csv). Import czyści bieżącą listę celów prostego sekwencera.'

export type ProjectChange = (project: Project) => Project

export interface ProjectDetailProps {
  project: Project
  /** Obiekt projektu z katalogu; null, gdy katalog się wczytuje albo obiektu w nim nie ma. */
  object: DsoObject | null
  profiles: readonly EquipmentProfile[]
  location: ObserverLocation
  /** Noc D z górnego paska: domyślna noc nowego wpisu dziennika. */
  nightDate: string
  /** Opis kadru w zakładce Kadr, który można przenieść do projektu; null = nie ma takiego kadru. */
  framingFromTab: string | null
  onUpdate: (change: ProjectChange) => Promise<void>
  onRemove: () => Promise<void>
  onOpenInFraming: () => void
  onTakeFraming: () => void
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

export function ProjectDetail(props: ProjectDetailProps) {
  const { project, object, profiles } = props
  const equipment = projectEquipment(project, profiles)
  const [message, setMessage] = useState<string | null>(null)

  const save = async (change: ProjectChange) => {
    try {
      await props.onUpdate(change)
      setMessage(null)
    } catch (error) {
      setMessage(`Nie udało się zapisać projektu: ${errorText(error)}`)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ProjectHeader project={project} object={object} onRename={(name) => void save((current) => ({ ...current, name }))} />
      {message && (
        <p role="alert" className="card p-3 text-sm text-alert">
          {message}
        </p>
      )}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <FilterProgress project={project} filters={equipment?.filters ?? []} onChange={(change) => void save(change)} />
          <AcquisitionLog
            project={project}
            nightDate={props.nightDate}
            defaultFilter={equipment?.filters[0] ?? 'L'}
            onChange={(change) => void save(change)}
          />
          <Notes key={project.id} project={project} onChange={(change) => void save(change)} />
        </div>
        <div className="flex flex-col gap-4">
          <FramingCard {...props} equipment={equipment} onEquipment={(equipmentId) => void save((current) => ({ ...current, equipmentId }))} />
          <ExportCard project={project} profiles={profiles} equipment={equipment} location={props.location} />
          <RemoveProject name={project.name} onRemove={props.onRemove} />
        </div>
      </div>
    </div>
  )
}

function Card({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card flex flex-col gap-3 p-4 md:p-5 ${className}`} aria-label={title}>
      <h3 className="font-serif text-xl font-medium text-parchment">{title}</h3>
      {children}
    </section>
  )
}

function ProjectHeader({ project, object, onRename }: { project: Project; object: DsoObject | null; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const TypeIcon = object ? TYPE_ICONS[object.type] : null
  const commit = () => {
    const name = draft?.trim() ?? ''
    if (name !== '' && name !== project.name) onRename(name)
    setDraft(null)
  }
  return (
    <section className="card flex flex-wrap items-start gap-5 p-4 md:p-6" aria-label="Projekt">
      {object && <ObjectThumbnail key={object.uid} object={object} sizePx={120} layer="dss2-red" />}
      <div className="flex min-w-60 flex-1 flex-col gap-1">
        <label className="text-xs text-muted" htmlFor={`project-name-${project.id}`}>
          Nazwa projektu
        </label>
        <input
          id={`project-name-${project.id}`}
          className="control control-quiet -ml-1 max-w-full font-serif text-3xl font-medium text-parchment max-sm:text-xl"
          value={draft ?? project.name}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') setDraft(null)
          }}
        />
        <p className="text-sm">{object ? objectName(object) : `Obiekt ${project.objectUid}`}</p>
        {object && TypeIcon ? (
          <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: `var(${tokenVariable(DSO_TYPES[object.type].color)})` }}>
            <TypeIcon aria-hidden size={16} />
            {DSO_TYPES[object.type].label}
          </p>
        ) : null}
        <p className="text-xs text-muted">Utworzony {new Date(project.createdAtIso).toLocaleDateString('pl-PL')}</p>
      </div>
      <p className="flex flex-col items-end">
        <span className="text-xs text-muted">Zebrano łącznie</span>
        <span className="figures text-4xl leading-tight text-accent">{totalText(project)}</span>
        <span className="text-xs text-muted">h:mm</span>
      </p>
    </section>
  )
}

function FilterProgress({ project, filters, onChange }: { project: Project; filters: readonly FilterId[]; onChange: (change: ProjectChange) => void }) {
  const rows = filterRows(project, filters)
  return (
    <Card title="Postęp na filtr">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Zestaw projektu nie ma filtrów, a dziennik jest pusty.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 pr-3 font-normal">Filtr</th>
                <th className="py-2 pr-3 text-right font-normal">Klatki</th>
                <th className="py-2 pr-3 text-right font-normal">Zebrano</th>
                <th className="py-2 pr-3 font-normal">Cel [min]</th>
                <th className="w-2/5 py-2 font-normal">Postęp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.filter}>
                  <th scope="row" className="py-2 pr-3 text-left font-semibold">
                    {row.filter}
                  </th>
                  <td className="py-2 pr-3 text-right tabular-nums">{row.subs}</td>
                  <td className="figures py-2 pr-3 text-right text-lg text-parchment">{row.total}</td>
                  <td className="py-2 pr-3">
                    <GoalInput
                      key={`${row.filter}-${row.goalMinutes ?? ''}`}
                      filter={row.filter}
                      goalMinutes={row.goalMinutes}
                      onChange={(minutes) => onChange((current) => setGoal(current, row.filter, minutes))}
                    />
                  </td>
                  <td className="py-2">
                    {row.progress === null ? (
                      <span className="text-xs text-muted">bez celu</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          role="progressbar"
                          aria-label={`Postęp ${row.filter}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(Math.min(1, row.progress) * 100)}
                          className="h-2.5 flex-1 overflow-hidden rounded-full bg-border"
                        >
                          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(1, row.progress) * 100}%` }} />
                        </div>
                        <span className="w-12 text-right text-xs tabular-nums">{row.progressText}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted">Cel w minutach na filtr; puste pole = bez celu. Sumy w h:mm.</p>
    </Card>
  )
}

function GoalInput({ filter, goalMinutes, onChange }: { filter: FilterId; goalMinutes: number | null; onChange: (minutes: number | null) => void }) {
  const [draft, setDraft] = useState(goalMinutes === null ? '' : String(goalMinutes).replace('.', ','))
  const { minutes, error } = readGoalInput(draft)
  return (
    <span className="flex flex-col gap-1">
      <input
        className="control w-24 text-sm"
        inputMode="decimal"
        aria-label={`Cel ${filter} w minutach`}
        aria-invalid={error !== null}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (error === null && minutes !== goalMinutes) onChange(minutes)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
      />
      {error && <span className="text-xs text-alert">{error}</span>}
    </span>
  )
}

function AcquisitionLog({
  project,
  nightDate,
  defaultFilter,
  onChange,
}: {
  project: Project
  nightDate: string
  defaultFilter: FilterId
  onChange: (change: ProjectChange) => void
}) {
  const [form, setForm] = useState<LogForm>({ nightDate, filter: defaultFilter, subs: '', exposureS: '300' })
  const [issues, setIssues] = useState<LogIssue[]>([])
  const rows = logRows(project)
  const issuesFor = (field: keyof LogForm) => issues.filter((issue) => issue.field === field).map((issue) => ({ severity: 'error' as const, message: issue.message }))
  const update = (field: keyof LogForm, value: string) => {
    setForm({ ...form, [field]: value })
    setIssues([])
  }
  const add = () => {
    const result = readLogForm(form)
    setIssues(result.issues)
    if (result.entry === null) return
    const entry = result.entry
    onChange((current) => addLogEntry(current, entry))
    setForm({ ...form, subs: '' })
  }
  return (
    <Card title="Dziennik akwizycji">
      <form
        className="grid items-start gap-3 sm:grid-cols-2 2xl:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault()
          add()
        }}
      >
        <MessageField label="Noc (data wieczoru)" issues={issuesFor('nightDate')}>
          <input type="date" className="control text-sm" value={form.nightDate} onChange={(event) => update('nightDate', event.target.value)} />
        </MessageField>
        <MessageField label="Filtr" issues={issuesFor('filter')}>
          <select className="control text-sm" value={form.filter} onChange={(event) => update('filter', event.target.value)}>
            {FILTER_IDS.map((filter) => (
              <option key={filter} value={filter}>
                {filter}
              </option>
            ))}
          </select>
        </MessageField>
        <MessageField label="Liczba klatek" issues={issuesFor('subs')}>
          <input className="control text-sm" inputMode="numeric" value={form.subs} aria-invalid={issuesFor('subs').length > 0} onChange={(event) => update('subs', event.target.value)} />
        </MessageField>
        <MessageField label="Czas klatki [s]" issues={issuesFor('exposureS')}>
          <input
            className="control text-sm"
            inputMode="decimal"
            value={form.exposureS}
            aria-invalid={issuesFor('exposureS').length > 0}
            onChange={(event) => update('exposureS', event.target.value)}
          />
        </MessageField>
        <button type="submit" className="button button-primary justify-self-start sm:col-span-2 2xl:col-span-4">
          <Plus aria-hidden size={18} /> Dodaj wpis
        </button>
      </form>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Dziennik jest pusty. Dodaj klatki zebrane w danej nocy.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 pr-3 font-normal">Noc</th>
                <th className="py-2 pr-3 font-normal">Filtr</th>
                <th className="py-2 pr-3 text-right font-normal">Klatki</th>
                <th className="py-2 pr-3 text-right font-normal">Czas klatki</th>
                <th className="py-2 pr-3 text-right font-normal">Suma</th>
                <th className="py-2 font-normal">
                  <span className="sr-only">Usuń</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={`${row.index}-${row.night}-${row.filter}`}>
                  <td className="py-1 pr-3 tabular-nums">{row.night}</td>
                  <td className="py-1 pr-3 font-semibold">{row.filter}</td>
                  <td className="py-1 pr-3 text-right tabular-nums">{row.subs}</td>
                  <td className="py-1 pr-3 text-right tabular-nums">{row.exposure}</td>
                  <td className="py-1 pr-3 text-right tabular-nums">{row.total}</td>
                  <td className="py-1 text-right">
                    <button
                      type="button"
                      className="button min-w-11 justify-center"
                      aria-label={`Usuń wpis: noc ${row.night}, ${row.filter}, ${row.subs} klatek`}
                      onClick={() => onChange((current) => removeLogEntry(current, row.index))}
                    >
                      <Trash2 aria-hidden size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function Notes({ project, onChange }: { project: Project; onChange: (change: ProjectChange) => void }) {
  const [draft, setDraft] = useState(project.notes)
  return (
    <Card title="Notatki">
      <textarea
        className="control min-h-24 text-sm"
        aria-label="Notatki projektu"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== project.notes) onChange((current) => ({ ...current, notes: draft }))
        }}
      />
    </Card>
  )
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3 py-2">
      <dt className="text-muted">{term}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  )
}

function FramingCard({
  project,
  profiles,
  equipment,
  framingFromTab,
  onEquipment,
  onOpenInFraming,
  onTakeFraming,
}: ProjectDetailProps & { equipment: EquipmentProfile | null; onEquipment: (equipmentId: string) => void }) {
  const coordinates = coordinateTexts(project.framing)
  const { pa, mosaic } = framingTexts(project.framing)
  return (
    <Card title="Kadr">
      <dl className="divide-y divide-border text-sm">
        <Row term="RA (J2000)">
          {coordinates.ra}
          <span className="block text-xs text-muted">{coordinates.raDecimal}</span>
        </Row>
        <Row term="Dec (J2000)">
          {coordinates.dec}
          <span className="block text-xs text-muted">{coordinates.decDecimal}</span>
        </Row>
        <Row term="Kąt PA">{pa}</Row>
        <Row term="Mozaika">{mosaic}</Row>
      </dl>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Zestaw
        <select className="control text-sm" value={equipment?.id ?? ''} onChange={(event) => onEquipment(event.target.value)}>
          {equipment === null && <option value="">Usunięty zestaw — wybierz inny</option>}
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="button" onClick={onOpenInFraming}>
          <Crosshair aria-hidden size={18} /> Otwórz w Kadrze
        </button>
        <button type="button" className="button" disabled={framingFromTab === null} onClick={onTakeFraming}>
          Weź kadr z zakładki Kadr
        </button>
      </div>
      <p className="text-xs text-muted">
        {framingFromTab ?? 'Kadr tego obiektu ustawiony w zakładce Kadr można tu przenieść razem z zestawem.'}
      </p>
    </Card>
  )
}

function ExportCard({
  project,
  profiles,
  equipment,
  location,
}: {
  project: Project
  profiles: readonly EquipmentProfile[]
  equipment: EquipmentProfile | null
  location: ObserverLocation
}) {
  const csv = projectCsv(project, profiles)
  const flatHorizon = location.horizon.length < 2
  return (
    <Card title="Eksport">
      <button
        type="button"
        className="button button-primary"
        disabled={'error' in csv}
        onClick={() => {
          if ('csv' in csv) downloadText(csv.csv, csv.fileName, 'text/csv;charset=utf-8')
        }}
      >
        <FileSpreadsheet aria-hidden size={18} /> CSV dla N.I.N.A.
      </button>
      {'error' in csv && <p className="text-sm text-alert">{csv.error}</p>}
      <p className="flex gap-2 text-xs text-muted">
        <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-accent" />
        {NINA_IMPORT_NOTE}
      </p>
      <button
        type="button"
        className="button"
        onClick={() => downloadText(projectToFile(project, equipment), projectFileName(project.name, 'json'), 'application/json')}
      >
        <FileJson aria-hidden size={18} /> Projekt (JSON)
      </button>
      <button
        type="button"
        className="button"
        disabled={flatHorizon}
        onClick={() => downloadText(exportHorizonFile(location.horizon, location.name), projectFileName(location.name, 'hrz'), 'text/plain;charset=utf-8')}
      >
        <Mountain aria-hidden size={18} /> Horyzont dla N.I.N.A.
      </button>
      <p className="text-xs text-muted">
        {flatHorizon
          ? `Lokalizacja „${location.name}” ma płaski horyzont, więc nie ma czego eksportować.`
          : `Horyzont lokalizacji „${location.name}” (pary azymut–wysokość, jak w pliku horyzontu N.I.N.A.).`}
      </p>
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Download aria-hidden size={14} /> Pliki zapisują się w folderze pobranych plików przeglądarki.
      </p>
    </Card>
  )
}

function RemoveProject({ name, onRemove }: { name: string; onRemove: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {confirm ? (
        <>
          Usunąć projekt „{name}” razem z dziennikiem?
          <button
            type="button"
            className="button"
            onClick={() =>
              void onRemove().catch((caught: unknown) => {
                setConfirm(false)
                setError(`Nie udało się usunąć: ${errorText(caught)}`)
              })
            }
          >
            <Trash2 aria-hidden size={18} /> Usuń
          </button>
          <button type="button" className="button" onClick={() => setConfirm(false)}>
            Anuluj
          </button>
        </>
      ) : (
        <button type="button" className="button" onClick={() => setConfirm(true)}>
          <Trash2 aria-hidden size={18} /> Usuń projekt
        </button>
      )}
      {error && (
        <p role="alert" className="text-alert">
          {error}
        </p>
      )}
    </div>
  )
}
