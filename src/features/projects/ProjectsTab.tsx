// Zakładka Projekty (7E, sekcja 9): lista projektów z importem pliku JSON i szczegóły wybranego projektu.
// Projekty żyją w IndexedDB (`useProjects`), a w plannerStore jest tylko id wybranego projektu (bez zapisu).
import { Frame, FolderOpen, Upload } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { formatDesignation } from '../../services/catalog/records'
import { useActiveLocation, useActiveProfile, usePlannerStore } from '../../state/plannerStore'
import type { DsoObject, Project } from '../../types'
import { useFeaturedObjects } from '../night/useFeaturedObjects'
import { ProjectDetail } from './ProjectDetail'
import { canTakeFraming, framingTexts, readProjectFile, takeFraming, totalText } from './projectModel'
import { useProjects } from './useProjects'

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

export function ProjectsTab() {
  const { state, save, update, remove } = useProjects()
  const { featured } = useFeaturedObjects()
  const projectId = usePlannerStore((s) => s.projectId)
  const profiles = usePlannerStore((s) => s.profiles)
  const nightDate = usePlannerStore((s) => s.nightDate)
  const framing = usePlannerStore((s) => s.framing)
  const framingObjectUid = usePlannerStore((s) => s.framingObjectUid)
  const selectProject = usePlannerStore((s) => s.selectProject)
  const saveProfile = usePlannerStore((s) => s.saveProfile)
  const location = useActiveLocation()
  const activeProfile = useActiveProfile()
  const [importMessage, setImportMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  if (state.status === 'loading') return <p className="text-sm text-muted">Wczytywanie projektów…</p>
  if (state.status === 'error') {
    return (
      <p role="alert" className="card p-3 text-sm text-alert">
        Nie udało się wczytać projektów: {state.message}
      </p>
    )
  }

  const { projects } = state
  const catalog = featured.status === 'ready' ? featured.catalog : []
  const objectOf = (project: Project): DsoObject | null => catalog.find((object) => object.uid === project.objectUid) ?? null
  const selected = projects.find((project) => project.id === projectId) ?? projects[0] ?? null

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = readProjectFile(await file.text(), { projectIds: projects.map((project) => project.id), profiles })
    if ('error' in result) {
      setImportMessage({ kind: 'error', text: result.error })
      return
    }
    try {
      if (result.addProfile) await saveProfile(result.addProfile)
      await save(result.project)
      selectProject(result.project.id)
      const added = result.addProfile ? ` i zestaw „${result.addProfile.name}”` : ''
      setImportMessage({ kind: 'ok', text: `Zaimportowano projekt „${result.project.name}”${added}.` })
    } catch (error) {
      setImportMessage({ kind: 'error', text: `Nie udało się zaimportować: ${errorText(error)}` })
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <ProjectList
        projects={projects}
        selectedId={selected?.id ?? null}
        objectLabel={(project) => {
          const object = objectOf(project)
          return object ? formatDesignation(object.primary) : project.objectUid
        }}
        message={importMessage}
        onSelect={(id) => selectProject(id)}
        onImport={(event) => void importFile(event)}
      />
      {selected ? (
        <ProjectDetail
          key={selected.id}
          project={selected}
          object={objectOf(selected)}
          profiles={profiles}
          location={location}
          nightDate={nightDate}
          framingFromTab={
            canTakeFraming(selected, framing, framingObjectUid)
              ? `W zakładce Kadr: PA ${framingTexts(framing).pa}, ${framingTexts(framing).mosaic}, zestaw „${activeProfile.name}”.`
              : null
          }
          onUpdate={(change) => update(selected.id, change)}
          onRemove={async () => {
            await remove(selected.id)
            selectProject(null)
          }}
          onOpenInFraming={() => {
            const store = usePlannerStore.getState()
            store.selectObject(selected.objectUid)
            if (profiles.some((profile) => profile.id === selected.equipmentId)) store.selectProfile(selected.equipmentId)
            store.updateFraming(selected.objectUid, selected.framing)
            store.setTab('framing')
          }}
          onTakeFraming={() => {
            if (canTakeFraming(selected, framing, framingObjectUid)) void update(selected.id, (current) => takeFraming(current, framing, activeProfile.id))
          }}
        />
      ) : (
        <EmptyProjects />
      )}
    </div>
  )
}

function ProjectList({
  projects,
  selectedId,
  objectLabel,
  message,
  onSelect,
  onImport,
}: {
  projects: readonly Project[]
  selectedId: string | null
  objectLabel: (project: Project) => string
  message: { kind: 'ok' | 'error'; text: string } | null
  onSelect: (id: string) => void
  onImport: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <section className="card flex flex-col gap-3 self-start p-4" aria-labelledby="projects-title">
      <h2 id="projects-title" className="font-serif text-xl font-medium text-parchment">
        Projekty
      </h2>
      {projects.length > 0 && (
        <ul className="flex flex-col gap-1">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                aria-pressed={project.id === selectedId}
                className="button w-full flex-col items-start gap-0 py-2 text-left"
                onClick={() => onSelect(project.id)}
              >
                <span className="font-serif text-lg leading-tight text-parchment">{project.name}</span>
                <span className="text-xs text-muted">
                  {objectLabel(project)} · {framingTexts(project.framing).mosaic} · {totalText(project)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="button cursor-pointer justify-center focus-within:outline-2 focus-within:outline-accent">
        <Upload aria-hidden size={18} /> Importuj projekt (JSON)
        <input type="file" accept=".json,application/json" className="sr-only" onChange={onImport} />
      </label>
      {message && (
        <p role="status" className={`text-sm ${message.kind === 'error' ? 'text-alert' : 'text-muted'}`}>
          {message.text}
        </p>
      )}
    </section>
  )
}

function EmptyProjects() {
  const setTab = usePlannerStore((s) => s.setTab)
  return (
    <section className="card flex flex-col items-start gap-3 p-6" aria-label="Brak projektów">
      <FolderOpen aria-hidden size={32} className="text-accent" />
      <h2 className="font-serif text-2xl font-medium text-parchment">Nie masz jeszcze projektów</h2>
      <p className="max-w-prose text-sm">
        Projekt zapisuje obiekt, kadr (środek, PA, mozaikę) i zestaw, a potem zbiera dziennik akwizycji z sumami na filtr.
        Ustaw kadr w zakładce Kadr i wybierz „Zapisz jako projekt”.
      </p>
      <button type="button" className="button button-primary" onClick={() => setTab('framing')}>
        <Frame aria-hidden size={18} /> Przejdź do Kadru
      </button>
    </section>
  )
}
