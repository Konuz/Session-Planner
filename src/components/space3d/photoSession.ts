// Sesja zdjęcia okna „Pozycja 3D”: odczyt i zapis w IndexedDB, astrometria nowego zdjęcia, edycja wycinków
// i gwiazdy Gaia. Wspólna dla Drogi Mlecznej, Wszechświata lokalnego i Obserwatorium.
import { useEffect, useMemo, useRef, useState } from 'react'
import { cutDistance, refreshCutDistances, regressorDistance, regressorEligible, regressorPollDelay, type RegressorPollState, type RegressorResult } from '../../lib/distance'
import { fieldOfView } from '../../lib/observatory'
import { mergePhotoCatalogCuts, type PhotoCatalogResult, type PhotoCut, type PhotoProject, type PhotoStars } from '../../lib/photo'
import { hasUnsavedPhoto, photoImageUrl, readPhoto, writePhoto } from '../../lib/photoStorage'
import { useCatalog } from '../../state/data'

const saveFailure = 'Nie udało się zapisać zmian zdjęcia. Ponów zapis przed zamknięciem aplikacji.'

export type StarsStatus = { status: 'idle' | 'loading' | 'error'; message?: string }

export interface PhotoSession {
  project: PhotoProject | null
  getCurrentProject(): PhotoProject | null
  restoring: boolean
  change(next: PhotoProject | null): void
  updateCut(id: string, patch: Partial<PhotoCut>): void
  retryCatalogObjects(): void
  catalogSearch: { loading: boolean; retryable: boolean; warnings: string[] } | null
  upload(file: File): void
  cancelUpload(): void
  busy: boolean
  error: string
  clearError(): void
  saveError: string
  retrySave(): void
  /** Lokalny Skyshot gotowy (null: jeszcze nie wiadomo). */
  ready: boolean | null
  editing: boolean
  setEditing(editing: boolean): void
  activeId: string | null
  setActiveId(id: string | null): void
}

export function usePhotoSession(): PhotoSession {
  const [project, setProject] = useState<PhotoProject | null>(null)
  const [restoring, setRestoring] = useState(true)
  const projectRef = useRef<PhotoProject | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(false)
  const restorePending = useRef(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [ready, setReady] = useState<boolean | null>(null)
  const [editing, setEditing] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [catalogSearch, setCatalogSearch] = useState<PhotoSession['catalogSearch']>(null)
  const [catalogRetry, setCatalogRetry] = useState(0)

  useEffect(() => {
    let live = true
    mounted.current = true
    const statusAbort = new AbortController()
    void readPhoto().then((saved) => {
      if (live && restorePending.current) {
        if (saved || hasUnsavedPhoto()) {
          projectRef.current = saved
          setProject(saved)
        }
        if (hasUnsavedPhoto()) setSaveError(saveFailure)
        setRestoring(false)
      }
    }).catch(() => { if (live) { setSaveError('Nie udało się odczytać zapisanego zdjęcia.'); setRestoring(false) } })
    void fetch('/api/photo/status', { signal: statusAbort.signal }).then((r) => r.ok ? r.json() : null).then((status) => { if (live) setReady(status?.ready === true) }).catch(() => { if (live) setReady(false) })
    return () => {
      live = false
      mounted.current = false
      statusAbort.abort()
      abortRef.current?.abort()
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
        void writePhoto(projectRef.current).catch(() => console.warn('Nie udało się zapisać zmian zdjęcia. Zachowano je w pamięci aplikacji.'))
      }
    }
  }, [])

  function save(next: PhotoProject | null) {
    void writePhoto(next).then(() => {
      if (mounted.current && projectRef.current === next) setSaveError('')
    }).catch(() => {
      if (mounted.current && projectRef.current === next) setSaveError(saveFailure)
    })
  }
  function change(next: PhotoProject | null) {
    if (projectRef.current?.id !== next?.id) setCatalogSearch(null)
    restorePending.current = false
    setRestoring(false)
    projectRef.current = next
    setProject(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      save(next)
    }, 350)
  }
  function updateCut(id: string, patch: Partial<PhotoCut>) {
    const current = projectRef.current
    if (current) change({ ...current, cuts: current.cuts.map((c) => c.id === id ? { ...c, ...patch } : c) })
  }
  const { id: projectId, width, height, astrometry } = project ?? {}
  const catalogObjectsLoaded = !!project?.catalogObjects
  useEffect(() => {
    if (!projectId || !astrometry?.wcs || busy || catalogObjectsLoaded) return
    const abort = new AbortController()
    const failure = 'Nie udało się pobrać obiektów katalogowych.'
    let retryable = true
    setCatalogSearch({ loading: true, retryable: false, warnings: [] })
    void fetch('/api/photo/catalog-objects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.signal,
      body: JSON.stringify({ wcs: astrometry.wcs, width, height }),
    }).then(async (response) => {
      const result = await response.json() as PhotoCatalogResult & { error?: string }
      retryable = response.status !== 422
      if (!response.ok) throw new Error(result.error || failure)
      const current = projectRef.current
      if (abort.signal.aborted || current?.id !== projectId || current.astrometry !== astrometry) return
      const cuts = mergePhotoCatalogCuts(current.cuts, result.cuts)
      if (cuts !== current.cuts || result.complete) {
        change({ ...current, cuts, ...(result.complete && { catalogObjects: { warnings: result.warnings } }) })
      }
      if (!current.cuts.length && cuts.length) setActiveId((id) => id ?? cuts[0].id)
      setCatalogSearch({ loading: false, retryable: !result.complete, warnings: result.warnings })
    }).catch((error) => {
      const current = projectRef.current
      if (!abort.signal.aborted && current?.id === projectId && current.astrometry === astrometry) {
        setCatalogSearch({ loading: false, retryable, warnings: [error instanceof Error ? error.message : failure] })
      }
    })
    return () => abort.abort()
    // Wycinki i gwiazdy zmieniają projekt w trakcie pobierania. Zapisujemy wynik do aktualnego projektu.
  }, [projectId, astrometry, width, height, busy, catalogObjectsLoaded, catalogRetry])
  async function upload(file: File) {
    restorePending.current = false
    abortRef.current?.abort()
    setCatalogSearch(null)
    const abort = new AbortController()
    abortRef.current = abort
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/photo/solve', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Photo-Name': encodeURIComponent(file.name) }, body: file, signal: abort.signal })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Nie udało się wczytać zdjęcia.')
      // Obraz z serwera przychodzi jako data: (kilka MB); w projekcie trzymany jest krótki adres blob: (audyt C06).
      const image = await photoImageUrl((result as PhotoProject).image)
      if (!abort.signal.aborted) {
        change({ ...(result as PhotoProject), image })
        setEditing(true); setActiveId(result.cuts[0]?.id ?? null); setReady(true)
      }
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Nie udało się wczytać zdjęcia.') }
    finally { if (abortRef.current === abort) setBusy(false) }
  }

  return {
    project, getCurrentProject: () => projectRef.current, restoring, change, updateCut, upload: (file) => void upload(file), cancelUpload: () => { abortRef.current?.abort(); setBusy(false) },
    retryCatalogObjects: () => setCatalogRetry((n) => n + 1), catalogSearch,
    busy, error, clearError: () => setError(''), saveError, retrySave: () => save(projectRef.current), ready,
    editing, setEditing, activeId, setActiveId,
  }
}

/** Gwiazdy Gaia pobieramy, gdy zdjęcie jest w skali Drogi Mlecznej: scena Obserwatorium jest wtedy kompletna przed wejściem. */
export function useGaiaStars(session: PhotoSession, enabled: boolean): { stars: StarsStatus; retry(): void } {
  const { project } = session
  const sessionRef = useRef(session)
  sessionRef.current = session
  const [stars, setStars] = useState<StarsStatus>({ status: 'idle' })
  const [retry, setRetry] = useState(0)
  // Pobierane raz i zapisywane w projekcie (IndexedDB).
  const missing = !!project && project.stars === null
  useEffect(() => {
    if (!enabled || !missing || !project) return
    const abort = new AbortController()
    setStars({ status: 'loading' })
    fetch('/api/photo/stars', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wcs: project.astrometry.wcs, width: project.width, height: project.height }), signal: abort.signal })
      .then(async (response) => {
        const data = await response.json() as { stars?: PhotoStars['stars']; magLimit?: number; error?: string }
        if (!response.ok || !data.stars) throw new Error(data.error ?? 'Nie udało się pobrać gwiazd Gaia.')
        if (abort.signal.aborted) return
        const latest = sessionRef.current.getCurrentProject()
        if (latest?.id !== project.id || latest.astrometry !== project.astrometry) return
        sessionRef.current.change({ ...latest, stars: { stars: data.stars, magLimit: data.magLimit ?? 0, fetchedAt: Date.now() } })
        setStars({ status: 'idle' })
      })
      .catch((e: Error) => {
        const latest = sessionRef.current.getCurrentProject()
        if (!abort.signal.aborted && latest?.id === project.id && latest.astrometry === project.astrometry) setStars({ status: 'error', message: e.message })
      })
    return () => { abort.abort(); setStars({ status: 'idle' }) }
    // Projekt zmienia się przy każdym zapisie; zapytanie zależy tylko od zdjęcia i braku gwiazd.
  }, [project?.id, project?.astrometry, missing, enabled, retry])
  return { stars, retry: () => setRetry((n) => n + 1) }
}

/** Odległości wycinków ustalane przez aplikację: z bieżącego katalogu (także w zapisanych projektach) i, po pobraniu
 *  gwiazd Gaia, z gwiazdy oświetlającej. Wybory z edycji wycinka zostają. */
export function useCutDistances(session: PhotoSession) {
  const { catalog } = useCatalog()
  const byId = useMemo(() => catalog && new Map(catalog.map((o) => [o.id, o])), [catalog])
  const { project } = session
  const sessionRef = useRef(session)
  sessionRef.current = session
  useEffect(() => {
    if (!project || !catalog || !byId) return
    const current = sessionRef.current
    const latest = current.getCurrentProject()
    if (latest?.id !== project.id || latest.astrometry !== project.astrometry) return
    const next = refreshCutDistances(latest, catalog, byId)
    if (next !== latest) {
      const primary = current.activeId && byId.get(current.activeId)?.photoPrimaryId
      if (primary && next.cuts.some((cut) => cut.id === primary)) current.setActiveId(primary)
      current.change(next)
    }
  }, [project, catalog, byId])
}

export type RegressorJob = { key: string; status: 'queued' | 'running' | 'done' | 'error' | 'unknown'; result?: RegressorResult }
const NO_REGRESSOR_JOBS: ReadonlyMap<string, RegressorJob> = new Map()
/** Limit wycinków w jednym zapytaniu serwera (`MAX_TARGETS` w server/regressor.ts). */
const REGRESSOR_BATCH = 40
const pollState = (jobs: ReadonlyMap<string, RegressorJob>): RegressorPollState =>
  [...jobs.values()].some((job) => job.status === 'running') ? 'running' : 'queued'

/**
 * Regresor (astro-regressor na serwerze) dla wycinków bez żadnej odległości: zgłoszenie w tle po astrometrii i odpytywanie
 * w odstępach z `regressorPollDelay`. Sensowną wartość wpisuje jako niezweryfikowaną (origin „regressor”); odmowy i awarie zostawiają brak odległości.
 * Zwraca aktualny stan i wynik ostatniej próby dla każdego zgłoszonego wycinka.
 */
export function useRegressor(session: PhotoSession, starsFailed: boolean): ReadonlyMap<string, RegressorJob> {
  const { catalog } = useCatalog()
  const byId = useMemo(() => catalog && new Map(catalog.map((o) => [o.id, o])), [catalog])
  const [ready, setReady] = useState<boolean | null>(null)
  const [attempts, setAttempts] = useState<{ projectId: string; astrometry: PhotoProject['astrometry']; jobs: ReadonlyMap<string, RegressorJob> } | null>(null)
  const attemptsRef = useRef(attempts)
  const sessionRef = useRef(session)
  sessionRef.current = session
  const { project } = session
  const targets = useMemo(() => project && catalog && byId ? project.cuts.filter((cut) => {
    const object = byId.get(cut.id)
    return object && !object.photoPrimaryId && regressorEligible(cut, object) &&
      (!object.illuminator || project.stars !== null || starsFailed) &&
      cutDistance(object, project.stars?.stars ?? null, catalog[object.illuminator?.cluster ?? -1] ?? null).distLy === null
  }) : [], [project, catalog, byId, starsFailed])
  const targetKey = targets.map((cut) => cut.id).join('|')

  useEffect(() => {
    const abort = new AbortController()
    fetch('/api/photo/regressor', { signal: abort.signal }).then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!abort.signal.aborted) setReady(data?.ready === true) })
      .catch(() => { if (!abort.signal.aborted) setReady(false) })
    return () => abort.abort()
  }, [])

  useEffect(() => {
    if (!project || ready === null || !targets.length) return
    const previous = attemptsRef.current?.projectId === project.id && attemptsRef.current.astrometry === project.astrometry
      ? attemptsRef.current.jobs : NO_REGRESSOR_JOBS
    const pending = targets.filter((cut) => {
      const job = previous.get(cut.id)
      return !job || job.status === 'queued' || job.status === 'running'
    })
    if (!pending.length) return
    const ids = pending.map((cut) => cut.id)
    const update = (jobs: ReadonlyMap<string, RegressorJob>) => {
      const next = { projectId: project.id, astrometry: project.astrometry, jobs: new Map([...previous, ...jobs]) }
      attemptsRef.current = next
      setAttempts(next)
    }
    if (!ready) {
      update(new Map(ids.map((id) => [id, { key: '', status: 'error', result: { status: 'error', message: 'Usługa jest niedostępna.' } }])))
      return
    }
    const scale = fieldOfView(project.astrometry.wcs, project.width, project.height)
    if (!scale) return
    const degPerPx = scale.widthDeg / project.width
    const abort = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const apply = (jobs: ReadonlyMap<string, RegressorJob>) => {
      const latest = sessionRef.current.getCurrentProject()
      if (latest?.id !== project.id || latest.astrometry !== project.astrometry || abort.signal.aborted) return false
      let changed = false
      const cuts = latest.cuts.map((cut) => {
        const job = jobs.get(cut.id)
        const result = job?.status === 'done' ? job.result : undefined
        const distance = result && regressorEligible(cut, byId?.get(cut.id)) ? regressorDistance(result, cut.raDeg, cut.decDeg) : null
        if (!distance) return cut
        changed = true
        return { ...cut, ...distance }
      })
      if (changed) sessionRef.current.change({ ...latest, cuts })
      update(jobs)
      return [...jobs.values()].some((job) => job.status === 'queued' || job.status === 'running')
    }
    // Odstęp z regressorPollDelay według stanu zadań na serwerze; w ukrytej karcie odpytywanie czeka na jej pokazanie (C08).
    let delay: number | null = null
    const poll = (jobs: ReadonlyMap<string, RegressorJob>, state: RegressorPollState) => {
      delay = regressorPollDelay(delay, state)
      wait(jobs, delay)
    }
    const wait = (jobs: ReadonlyMap<string, RegressorJob>, ms: number) => {
      timer = setTimeout(() => {
        if (document.hidden) {
          const resume = () => { document.removeEventListener('visibilitychange', resume); if (!abort.signal.aborted) wait(jobs, ms) }
          document.addEventListener('visibilitychange', resume)
          abort.signal.addEventListener('abort', () => document.removeEventListener('visibilitychange', resume))
          return
        }
        const running = [...jobs].filter(([, job]) => job.status === 'queued' || job.status === 'running')
        const keys = running.map(([, job]) => job.key)
        const chunks = Array.from({ length: Math.ceil(keys.length / REGRESSOR_BATCH) }, (_, i) => keys.slice(i * REGRESSOR_BATCH, (i + 1) * REGRESSOR_BATCH))
        Promise.all(chunks.map((chunk) => fetch(`/api/photo/regressor?${new URLSearchParams({ keys: chunk.join(',') })}`, { signal: abort.signal })
          .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<{ jobs: RegressorJob[] }> })))
          .then((parts) => {
            const polled = parts.flatMap((part) => part.jobs)
            const next = new Map(jobs)
            running.forEach(([id], i) => next.set(id, polled[i]))
            if (apply(next)) poll(next, pollState(next))
          })
          .catch(() => {
            if (abort.signal.aborted) return
            poll(jobs, 'error')
          })
      }, ms)
    }
    const all = pending.map((cut) => ({ raDeg: cut.raDeg, decDeg: cut.decDeg, radiusDeg: Math.min(2, Math.max(0.001, cut.radius * degPerPx)), type: cut.type }))
    const batches = Array.from({ length: Math.ceil(all.length / REGRESSOR_BATCH) }, (_, i) => all.slice(i * REGRESSOR_BATCH, (i + 1) * REGRESSOR_BATCH))
    // Identyfikator zdjęcia jako grupa: jego wycinki idą na serwerze przed zadaniami poprzednich zdjęć.
    Promise.all(batches.map((batch) => fetch('/api/photo/regressor', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.signal,
      body: JSON.stringify({ targets: batch, group: project.id }),
    }).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<{ jobs: RegressorJob[] }> })
      .catch((): { jobs: RegressorJob[] } => ({
        jobs: batch.map(() => ({ key: '', status: 'error', result: { status: 'error', message: 'Nie udało się zgłosić wycinka.' } })),
      }))))
      .then((parts) => {
        const jobs = new Map(parts.flatMap((part) => part.jobs).map((job, i) => [ids[i], job]))
        if (apply(jobs)) poll(jobs, pollState(jobs))
      })
    return () => { abort.abort(); clearTimeout(timer) }
    // Zmiana pozostałych pól projektu (np. zapis gwiazd) nie zgłasza wycinków ponownie.
  }, [ready, project?.id, project?.astrometry, targetKey])
  // Zadanie może pozostać na serwerze, gdy wynik z gwiazdy oświetlającej dotrze wcześniej.
  if (!attempts || attempts.projectId !== project?.id || attempts.astrometry !== project.astrometry) return NO_REGRESSOR_JOBS
  const visible = new Map<string, RegressorJob>()
  for (const cut of targets) {
    const job = attempts.jobs.get(cut.id)
    if (job) visible.set(cut.id, job)
  }
  return visible
}
