import { ImagePlus, Pause, Play, RotateCcw, Settings2, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useId, useRef, useState, type RefObject } from 'react'
import { DEFAULT_ANNOTATION_COLORS, TYPE_INFO } from '../lib/catalog'
import { fmtDistance } from '../lib/format'
import { coveredPhotoCircles, photoColumnCapacity, photoColumns, photoPose, type PhotoCut, type PhotoDistances, type PhotoProject, type PhotoSceneFrame, type PhotoStars } from '../lib/photo'
import { hasUnsavedPhoto, readPhoto, writePhoto } from '../lib/photoStorage'
import { Range } from './Range'
import { CloseButton } from './CloseButton'

const Observatory = lazy(() => import('./observatory/Observatory'))

interface Props {
  project: PhotoProject | null
  onProject: (project: PhotoProject | null) => void
  frameRef: RefObject<((frame: PhotoSceneFrame) => void) | null>
  fitRef: RefObject<(() => void) | null>
}

const saveFailure = 'Nie udało się zapisać zmian zdjęcia. Ponów zapis przed zamknięciem aplikacji.'

export function PhotoExplorer({ project, onProject, frameRef, fitRef }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(false)
  const [scene, setScene] = useState<PhotoSceneFrame>({ width: 800, height: 520, anchors: [] })
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [observatory, setObservatory] = useState(false)
  const observatoryButton = useRef<HTMLButtonElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [ready, setReady] = useState<boolean | null>(null)
  const [distances, setDistances] = useState<{ key: string; data: PhotoDistances } | null>(null)
  const [distanceRetry, setDistanceRetry] = useState(0)
  const restorePending = useRef(true)
  const projectRef = useRef(project)
  projectRef.current = project
  const prefix = useId().replace(/:/g, '')
  const dragRef = useRef<{ id: string; x: number; y: number; original: PhotoCut; resize: boolean } | null>(null)

  useEffect(() => {
    let live = true
    mounted.current = true
    const statusAbort = new AbortController()
    void readPhoto().then((saved) => {
      if (live && restorePending.current) {
        if (saved || hasUnsavedPhoto()) onProject(saved)
        if (hasUnsavedPhoto()) setSaveError(saveFailure)
      }
    }).catch(() => { if (live) setSaveError('Nie udało się odczytać zapisanego zdjęcia.') })
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
  }, [onProject])

  useEffect(() => {
    frameRef.current = setScene
    return () => { frameRef.current = null }
  }, [frameRef])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100)
      last = now
      setProgress((p) => Math.min(1, p + dt / 5000))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])
  useEffect(() => { if (progress >= 1) setPlaying(false) }, [progress])

  function save(next: PhotoProject | null) {
    void writePhoto(next).then(() => {
      if (mounted.current && projectRef.current === next) setSaveError('')
    }).catch(() => {
      if (mounted.current && projectRef.current === next) setSaveError(saveFailure)
    })
  }
  function change(next: PhotoProject | null) {
    restorePending.current = false
    projectRef.current = next
    onProject(next)
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
    setBusy(true); setError(''); setPlaying(false)
    try {
      const response = await fetch('/api/photo/solve', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Photo-Name': encodeURIComponent(file.name) }, body: file, signal: abort.signal })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Nie udało się wczytać zdjęcia.')
      if (!abort.signal.aborted) {
        change(result as PhotoProject)
        setProgress(0); setEditing(true); setActiveId(result.cuts[0]?.id ?? null); setReady(true)
      }
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Nie udało się wczytać zdjęcia.') }
    finally { if (abortRef.current === abort) setBusy(false) }
  }

  const { width, height } = scene
  const imageScale = project ? Math.min((width - 36) / project.width, Math.max(80, height - 170) / project.height) : 1
  const frame = { x: project ? (width - project.width * imageScale) / 2 : 0, y: project ? 65 + (height - 170 - project.height * imageScale) / 2 : 0, scale: imageScale }
  const enabled = project?.cuts.filter((c) => c.enabled) ?? []
  const active = project?.cuts.find((c) => c.id === activeId)
  const distanceKey = editing && active ? `${project!.id}:${active.id}` : ''
  const distanceData = distances?.key === distanceKey ? distances.data : null
  const selectedDistance = distanceData?.measurements.findIndex((m) => m.distLy === active?.distLy && m.uncertaintyLy === active?.uncertaintyLy && m.distanceSource === active?.distanceSource) ?? -1
  useEffect(() => {
    if (!distanceKey || !activeId) return
    const abort = new AbortController()
    void fetch(`/api/photo/distances?${new URLSearchParams({ id: activeId })}`, { signal: abort.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return await response.json() as PhotoDistances })
      .then((data) => { if (!abort.signal.aborted) setDistances({ key: distanceKey, data }) })
      .catch(() => { if (!abort.signal.aborted) setDistances({ key: distanceKey, data: { measurements: [], warnings: ['Nie udało się pobrać źródeł odległości.'] } }) })
    return () => abort.abort()
  }, [distanceKey, activeId, distanceRetry])
  const move = Math.max(0, Math.min(1, (progress - 0.18) / 0.82))
  const circleOpacity = Math.min(1, progress / 0.12)
  const columns = photoColumns(enabled, project?.width ?? 0, photoColumnCapacity(project?.cuts ?? []))
  const rows = Math.max(1, ...columns.map((column) => column.length))
  const rowSpacing = Math.max(0, height - 305) / Math.max(1, rows - 1)
  const cardRadius = Math.max(13, Math.min(48, width / 9, rows > 1 ? (rowSpacing - 32) / 2 : 48))
  const positions = columns.flatMap((column, side) => column.map((cut, i) => {
    const destination = { x: side === 0 ? cardRadius + 35 : width - cardRadius - 35, y: column.length === 1 ? height / 2 : 110 + i * Math.max(0, height - 305) / (column.length - 1), radius: cardRadius }
    return { cut, pose: photoPose(cut, frame, destination, move), anchor: scene.anchors.find((a) => a.id === cut.id) }
  }))
  const covered = coveredPhotoCircles(positions.map(({ pose }) => pose))

  function point(e: React.PointerEvent<SVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: (e.clientX - rect.left) * width / rect.width, y: (e.clientY - rect.top) * height / rect.height }
  }
  function startDrag(e: React.PointerEvent<SVGElement>, cut: PhotoCut, resize: boolean) {
    if (!editing || progress !== 0) return
    e.preventDefault(); e.stopPropagation()
    const p = point(e)
    setActiveId(cut.id)
    dragRef.current = { id: cut.id, ...p, original: { ...cut }, resize }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function drag(e: React.PointerEvent<SVGElement>) {
    const d = dragRef.current
    if (!d) return
    const p = point(e)
    if (d.resize) updateCut(d.id, { radius: Math.max(4, Math.min(Math.max(project!.width, project!.height) * 2, d.original.radius + (p.x - d.x) / imageScale)) })
    else updateCut(d.id, { x: d.original.x + (p.x - d.x) / imageScale, y: d.original.y + (p.y - d.y) / imageScale })
  }
  function saveStars(id: string, stars: PhotoStars) {
    const current = projectRef.current
    if (current?.id === id) change({ ...current, stars })
  }
  function closeObservatory() {
    setObservatory(false)
    observatoryButton.current?.focus({ preventScroll: true })
  }
  /** Z obserwatorium do skali Drogi Mlecznej: wycinki lecą do swoich położeń w Space3D. */
  function zoomOutFromObservatory() {
    setObservatory(false)
    setEditing(false)
    fitRef.current?.()
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setProgress(1); return }
    setProgress(0)
    setPlaying(true)
  }
  function play() {
    if (!playing && (progress === 0 || progress >= 1)) fitRef.current?.()
    setEditing(false)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setProgress(1); return }
    if (progress >= 1) setProgress(0)
    setPlaying((p) => !p)
  }

  return <>
    <div className="photo-import">
      <input ref={input} type="file" hidden accept=".jpg,.jpeg,.png,.webp,.tif,.tiff,.fit,.fits,.fts" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = '' }} />
      <button className="button small" onClick={() => input.current?.click()} disabled={busy}><ImagePlus size={14} />{busy ? 'Rozwiązywanie zdjęcia…' : project ? 'Zmień zdjęcie' : 'Rozłóż zdjęcie'}</button>
      {busy && <button className="button small" onClick={() => { abortRef.current?.abort(); setBusy(false) }}>Anuluj</button>}
      {!project && ready === false && <span className="photo-notice">Astrometria wymaga lokalnego Skyshota.</span>}
    </div>
    {error && <div className="photo-error" role="alert">{error}<CloseButton label="Zamknij komunikat" onClick={() => setError('')} /></div>}
    {saveError && !error && <div role="status" className="photo-error photo-save-error">
      {saveError}
      {hasUnsavedPhoto() && <button className="button small" onClick={() => save(projectRef.current)}>Ponów zapis</button>}
    </div>}
    {project && <>
      <svg ref={svgRef} className="photo-overlay" viewBox={`0 0 ${width} ${height}`} aria-label="Zdjęcie z wycinkami obiektów" onPointerMove={drag} onPointerUp={() => { dragRef.current = null }} onPointerCancel={() => { dragRef.current = null }}>
        <defs>
          <image id={`${prefix}-image`} href={project.image} width={project.width} height={project.height} />
          <clipPath id={`${prefix}-union`} clipPathUnits="userSpaceOnUse">{enabled.map((c) => <circle key={c.id} cx={c.x} cy={c.y} r={c.radius} />)}</clipPath>
          <marker id={`${prefix}-arrow`} markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="var(--accent)" strokeWidth="0.75" /></marker>
          {positions.map(({ cut, pose }, i) => <clipPath key={cut.id} id={`${prefix}-cut-${i}`}><circle cx={pose.x} cy={pose.y} r={pose.radius} /></clipPath>)}
        </defs>
        <g opacity={Math.max(0, 1 - progress / 0.38)} transform={`translate(${frame.x} ${frame.y}) scale(${imageScale})`}>
          <use href={`#${prefix}-image`} opacity={1 - Math.min(1, progress / 0.18) * 0.8} />
          <use href={`#${prefix}-image`} clipPath={`url(#${prefix}-union)`} />
        </g>
        {positions.map(({ cut, pose, anchor }, i) => {
          const ratio = pose.radius / cut.radius
          const dx = anchor ? anchor.x - pose.x : 0
          const dy = anchor ? anchor.y - pose.y : 0
          const length = Math.hypot(dx, dy)
          return <g key={cut.id}>
            {anchor?.visible && move > 0 && <g opacity={move} stroke="var(--accent)" fill="none" strokeWidth="0.75">
              {anchor.kind === 'direction' || anchor.kind === 'outside'
                ? <line x1={anchor.originX} y1={anchor.originY} x2={anchor.x} y2={anchor.y} strokeDasharray="4 5" markerEnd={`url(#${prefix}-arrow)`} />
                : anchor.kind === 'position' && <circle cx={anchor.x} cy={anchor.y} r={3} fill="var(--accent)" />}
              <line x1={pose.x + dx / Math.max(1, length) * pose.radius} y1={pose.y + dy / Math.max(1, length) * pose.radius} x2={anchor.x} y2={anchor.y} strokeDasharray={anchor.kind === 'position' ? undefined : '3 5'} />
            </g>}
            <g clipPath={`url(#${prefix}-cut-${i})`}>
              <use href={`#${prefix}-image`} transform={`translate(${pose.x - cut.x * ratio} ${pose.y - cut.y * ratio}) scale(${ratio})`} />
            </g>
          </g>
        })}
        {positions.map(({ cut, pose, anchor }, i) => {
          const color = DEFAULT_ANNOTATION_COLORS[cut.type]
          const caption = anchor?.kind === 'outside' ? 'poza skalą • kierunek' : anchor?.kind === 'local' ? 'w Drodze Mlecznej' : cut.distLy ? `≈ ${fmtDistance(cut.distLy)}${cut.uncertaintyLy ? ` ± ${fmtDistance(cut.uncertaintyLy)}` : ''}` : 'odległość nieznana'
          return <g key={cut.id}>
            <circle cx={pose.x} cy={pose.y} r={pose.radius} fill="transparent" stroke={activeId === cut.id ? 'var(--accent)' : color} strokeWidth={activeId === cut.id ? 2 : 1.4} strokeDasharray={covered[i] ? '5 4' : undefined} opacity={editing ? 1 : circleOpacity} className={editing && progress === 0 ? 'photo-draggable' : 'photo-circle'} onPointerDown={(e) => startDrag(e, cut, false)} onClick={() => setActiveId(cut.id)}><title>{`${cut.id}: ${caption}${cut.distanceSource ? ` — ${cut.distanceSource}` : ''}${cut.distanceScope === 'complex' ? ' (pomiar całego kompleksu)' : ''}`}</title></circle>
            {editing && progress === 0 && activeId === cut.id && <circle cx={pose.x + pose.radius} cy={pose.y} r={5} fill="var(--accent)" className="photo-resize" onPointerDown={(e) => startDrag(e, cut, true)} />}
            <text x={pose.x} y={pose.y + pose.radius + 14} className="photo-label" opacity={editing ? 1 : circleOpacity}>{cut.id}</text>
            <text x={pose.x} y={pose.y + pose.radius + 27} className="photo-distance" opacity={move}>{caption}</text>
          </g>
        })}
      </svg>
      <div className="photo-controls">
        <div className="photo-heading"><span title={project.name}>{project.name}</span><span className="dim">{enabled.length}/{project.cuts.length} obiektów</span></div>
        <div className="photo-timeline">
          <button className="icon-button" aria-label={playing ? 'Zatrzymaj rozkładanie' : 'Odtwórz rozkładanie'} disabled={!enabled.length} onClick={play}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
          <button className="icon-button" aria-label="Wróć do fotografii" onClick={() => { setPlaying(false); setProgress(0) }}><RotateCcw size={14} /></button>
          <span>Zdjęcie</span><Range aria-label="Rozłożenie zdjęcia w 3D" min={0} max={1} step={0.001} value={progress} onChange={(e) => { setPlaying(false); if (progress === 0) fitRef.current?.(); setProgress(Number(e.target.value)) }} /><span>Mapa 3D</span>
          <button ref={observatoryButton} className="button small" title="Obserwatorium 3D: gwiazdy Gaia i obiekty w swoich odległościach" aria-label="Otwórz obserwatorium 3D" onClick={() => { setPlaying(false); setEditing(false); setObservatory(true) }}>3D</button>
          <button className={`icon-button${editing ? ' active' : ''}`} aria-label="Edytuj wycinki" aria-expanded={editing} onClick={() => { setPlaying(false); setProgress(0); setEditing(!editing) }}><Settings2 size={16} /></button>
          <button className="icon-button" aria-label="Usuń zdjęcie z widoku" onClick={() => { setPlaying(false); setProgress(0); change(null) }}><X size={15} /></button>
        </div>
      </div>
      {observatory && <Suspense fallback={null}>
        <Observatory project={project} onStars={(stars) => saveStars(project.id, stars)} onClose={closeObservatory} onZoomOut={zoomOutFromObservatory} />
      </Suspense>}
      {editing && <div className="photo-editor">
        <div className="photo-editor-heading"><strong>Wycinki zdjęcia</strong><CloseButton label="Zamknij edycję wycinków" onClick={() => setEditing(false)} /></div>
        <p className="dim">Propozycje z katalogu. Zaznacz widoczne obiekty; przesuń okrąg i jego uchwyt.</p>
        <div className="photo-object-list">{project.cuts.map((c) => <div key={c.id} className={activeId === c.id ? 'active' : ''}>
          <input type="checkbox" aria-label={`Pokaż ${c.id}`} checked={c.enabled} onChange={(e) => updateCut(c.id, { enabled: e.target.checked })} />
          <button onClick={() => setActiveId(c.id)}><span style={{ color: DEFAULT_ANNOTATION_COLORS[c.type] }}>{c.id}</span><small>{TYPE_INFO[c.type].short}</small></button>
        </div>)}</div>
        {project.cuts.length === 0 && <p>Brak obiektów katalogowych w tym kadrze.</p>}
        {active && <div className="photo-fields">
          <strong>{active.id}</strong>
          <label>Źródło odległości<select value={selectedDistance < 0 ? active.distLy ? 'saved' : 'unknown' : selectedDistance} title={active.distanceSource} onChange={(e) => {
            if (e.target.value === 'unknown') { updateCut(active.id, { distLy: null, uncertaintyLy: null, distanceSource: '' }); return }
            const measurement = distanceData?.measurements[Number(e.target.value)]
            if (measurement) updateCut(active.id, { distLy: measurement.distLy, uncertaintyLy: measurement.uncertaintyLy, distanceSource: measurement.distanceSource })
          }}>
            <option value="unknown">Brak pomiaru — tylko kierunek</option>
            {selectedDistance < 0 && active.distLy && <option value="saved">{fmtDistance(active.distLy)} · {active.distanceSource || 'Zapisany pomiar'}</option>}
            {!distanceData && <option disabled>Pobieranie pomiarów…</option>}
            {(['Wikidata', 'SIMBAD', 'NED'] as const).map((source) => distanceData?.measurements.some((m) => m.source === source) && <optgroup key={source} label={source}>
              {distanceData.measurements.map((m, i) => m.source === source && <option key={i} value={i} title={m.distanceSource}>{fmtDistance(m.distLy)}{m.uncertaintyLy !== null ? ` ± ${fmtDistance(m.uncertaintyLy)}` : ''} · {m.distanceSource.split(' — ').slice(0, 3).join(' · ')}</option>)}
            </optgroup>)}
          </select></label>
          {distanceData && selectedDistance >= 0 && distanceData.measurements[selectedDistance].url && <a href={distanceData.measurements[selectedDistance].url} target="_blank" rel="noreferrer">Publikacja źródłowa ↗</a>}
          {distanceData?.warnings.map((warning) => <p key={warning} className="photo-notice" role="status">{warning}</p>)}
          {!!distanceData?.warnings.length && <button className="button small" onClick={() => { setDistances(null); setDistanceRetry((n) => n + 1) }}>Ponów pobieranie</button>}
          {distanceData && !distanceData.measurements.length && !distanceData.warnings.length && <p className="photo-notice">Brak opublikowanych pomiarów w obsługiwanych źródłach.</p>}
          <label>Zakres pomiaru<select value={active.distanceScope} onChange={(e) => updateCut(active.id, { distanceScope: e.target.value as PhotoCut['distanceScope'] })}><option value="object">Obiekt</option><option value="complex">Cały kompleks</option></select></label>
        </div>}
        <details><summary>Dokładność astrometrii</summary><p>{project.astrometry.matches} dopasowań, RMS {project.astrometry.rmsPx.toFixed(2)} px.</p><p>Brzegi: {project.astrometry.edgeMatches} dopasowań{project.astrometry.edgeRmsPx !== null && `, RMS ${project.astrometry.edgeRmsPx.toFixed(2)} px`}.</p><p>To reszty dopasowania solvera; wymagają oceny na zdjęciu. Wycinek zawiera także tło i gwiazdy.</p></details>
      </div>}
    </>}
  </>
}
