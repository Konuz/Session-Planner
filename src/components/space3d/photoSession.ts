// Sesja zdjęcia okna „Pozycja 3D”: odczyt i zapis w IndexedDB, astrometria nowego zdjęcia, edycja wycinków
// i gwiazdy Gaia. Wspólna dla Drogi Mlecznej, Wszechświata lokalnego i Obserwatorium.
import { useEffect, useMemo, useRef, useState } from 'react'
import { refreshCutDistances, regressorDistance, regressorEligible, type RegressorResult } from '../../lib/distance'
import { fieldOfView } from '../../lib/observatory'
import type { PhotoCut, PhotoProject, PhotoStars } from '../../lib/photo'
import { hasUnsavedPhoto, readPhoto, writePhoto } from '../../lib/photoStorage'
import { useCatalog } from '../../state/data'

const saveFailure = 'Nie udało się zapisać zmian zdjęcia. Ponów zapis przed zamknięciem aplikacji.'

export type StarsStatus = { status: 'idle' | 'loading' | 'error'; message?: string }

export interface PhotoSession {
  project: PhotoProject | null
  restoring: boolean
  change(next: PhotoProject | null): void
  updateCut(id: string, patch: Partial<PhotoCut>): void
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
  const projectRef = useRef(project)
  projectRef.current = project
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

  useEffect(() => {
    let live = true
    mounted.current = true
    const statusAbort = new AbortController()
    void readPhoto().then((saved) => {
      if (live && restorePending.current) {
        if (saved || hasUnsavedPhoto()) setProject(saved)
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
  async function upload(file: File) {
    restorePending.current = false
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/photo/solve', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Photo-Name': encodeURIComponent(file.name) }, body: file, signal: abort.signal })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Nie udało się wczytać zdjęcia.')
      if (!abort.signal.aborted) {
        change(result as PhotoProject)
        setEditing(true); setActiveId(result.cuts[0]?.id ?? null); setReady(true)
      }
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Nie udało się wczytać zdjęcia.') }
    finally { if (abortRef.current === abort) setBusy(false) }
  }

  return {
    project, restoring, change, updateCut, upload: (file) => void upload(file), cancelUpload: () => { abortRef.current?.abort(); setBusy(false) },
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
        const latest = sessionRef.current.project
        if (latest?.id === project.id) sessionRef.current.change({ ...latest, stars: { stars: data.stars, magLimit: data.magLimit ?? 0, fetchedAt: Date.now() } })
        setStars({ status: 'idle' })
      })
      .catch((e: Error) => { if (!abort.signal.aborted) setStars({ status: 'error', message: e.message }) })
    return () => { abort.abort(); setStars({ status: 'idle' }) }
    // Projekt zmienia się przy każdym zapisie; zapytanie zależy tylko od zdjęcia i braku gwiazd.
  }, [project?.id, missing, enabled, retry])
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
    const next = refreshCutDistances(project, catalog, byId)
    if (next !== project) sessionRef.current.change(next)
  }, [project, catalog, byId])
}

type RegressorJob = { key: string; status: 'queued' | 'running' | 'done' | 'error' | 'unknown'; result?: RegressorResult }
const REGRESSOR_POLL_MS = 15_000

/**
 * Regresor (astro-regressor na serwerze) dla wycinków bez żadnej odległości: zgłoszenie w tle po astrometrii i odpytywanie
 * co 15 s. Sensowną wartość wpisuje jako niezweryfikowaną (origin „regressor”); odmowy i awarie zostawiają brak odległości.
 * Zwraca identyfikatory wycinków, na które regresor jeszcze pracuje.
 */
export function useRegressor(session: PhotoSession): string[] {
  const { catalog } = useCatalog()
  const byId = useMemo(() => catalog && new Map(catalog.map((o) => [o.id, o])), [catalog])
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState<string[]>([])
  const sessionRef = useRef(session)
  sessionRef.current = session
  const { project } = session
  const targets = useMemo(() => project && byId ? project.cuts.filter((cut) => regressorEligible(cut, byId.get(cut.id))) : [], [project, byId])
  const targetKey = targets.map((cut) => cut.id).join('|')

  useEffect(() => {
    const abort = new AbortController()
    fetch('/api/photo/regressor', { signal: abort.signal }).then((r) => r.ok ? r.json() : null).then((data) => setReady(data?.ready === true)).catch(() => {})
    return () => abort.abort()
  }, [])

  useEffect(() => {
    if (!ready || !project || !targets.length) { setPending([]); return }
    const scale = fieldOfView(project.astrometry.wcs, project.width, project.height)
    if (!scale) return
    const degPerPx = scale.widthDeg / project.width
    const abort = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const ids = targets.map((cut) => cut.id)
    const apply = (jobs: RegressorJob[]) => {
      const latest = sessionRef.current.project
      if (!latest || latest.id !== project.id || abort.signal.aborted) return []
      const results = new Map(jobs.flatMap((job, i) => job.status === 'done' && job.result ? [[ids[i], job.result] as const] : []))
      let changed = false
      const cuts = latest.cuts.map((cut) => {
        const result = results.get(cut.id)
        const distance = result && regressorEligible(cut, byId?.get(cut.id)) ? regressorDistance(result, cut.raDeg, cut.decDeg) : null
        if (!distance) return cut
        changed = true
        return { ...cut, ...distance }
      })
      if (changed) sessionRef.current.change({ ...latest, cuts })
      const waiting = jobs.flatMap((job, i) => job.status === 'queued' || job.status === 'running' ? [ids[i]] : [])
      setPending(waiting)
      return waiting
    }
    const poll = (keys: string[]) => {
      timer = setTimeout(() => {
        fetch(`/api/photo/regressor?${new URLSearchParams({ keys: keys.join(',') })}`, { signal: abort.signal })
          .then((r) => r.json() as Promise<{ jobs: RegressorJob[] }>)
          .then((data) => { if (apply(data.jobs).length) poll(keys) })
          .catch(() => { if (!abort.signal.aborted) poll(keys) })
      }, REGRESSOR_POLL_MS)
    }
    fetch('/api/photo/regressor', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.signal,
      body: JSON.stringify({ targets: targets.map((cut) => ({ raDeg: cut.raDeg, decDeg: cut.decDeg, radiusDeg: Math.min(2, Math.max(0.001, cut.radius * degPerPx)), type: cut.type })) }),
    })
      .then((r) => r.ok ? r.json() as Promise<{ jobs: RegressorJob[] }> : null)
      .then((data) => { if (data && apply(data.jobs).length) poll(data.jobs.map((job) => job.key)) })
      .catch(() => {})
    return () => { abort.abort(); clearTimeout(timer) }
    // Zmiana pozostałych pól projektu (np. zapis gwiazd) nie zgłasza wycinków ponownie.
  }, [ready, project?.id, targetKey])
  return pending
}
