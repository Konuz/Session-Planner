// Wspólna część zdjęcia w oknie „Pozycja 3D” (obie skale): wczytanie, komunikaty, płaski widok edycji okręgów
// i panel wycinków ze źródłami odległości. Rozkładanie zdjęcia robi Obserwatorium, do którego z obu skal
// prowadzi nurkowanie.
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { catalogOf, DEFAULT_ANNOTATION_COLORS, EXTRA_CATALOGS, TYPE_INFO } from '../../lib/catalog'
import { hasDistance, MAX_RELATIVE_UNCERTAINTY, measurementDistance, newestCutMeasurement, NO_DISTANCE, REGRESSOR_TYPES, SCOPE_LABELS, type DistanceScope } from '../../lib/distance'
import { coveredPhotoCircles, cutsInThreeD, distanceSummary, PHOTO_CATALOG_LABELS, photoFrame, type PhotoCatalogKind, type PhotoCut, type PhotoDistances } from '../../lib/photo'
import { hasUnsavedPhoto } from '../../lib/photoStorage'
import { useCatalog } from '../../state/data'
import { useStore } from '../../state/store'
import { CloseButton } from '../CloseButton'
import type { PhotoSession, RegressorJob, StarsStatus } from './photoSession'

const ACCEPT = '.jpg,.jpeg,.png,.webp,.tif,.tiff,.fit,.fits,.fts'

/** Ukryte pole pliku (zawsze w oknie) i przycisk wczytania w lewym górnym rogu sceny. */
export function PhotoImport({ session, inputRef, showButton, onActivate }: { session: PhotoSession; inputRef: RefObject<HTMLInputElement | null>; showButton: boolean; onActivate?(): void }) {
  const { project, busy, ready } = session
  return <div className="photo-import">
    <input ref={inputRef} type="file" hidden accept={ACCEPT} onChange={(e) => { const file = e.target.files?.[0]; if (file) session.upload(file); e.target.value = '' }} />
    {(showButton || busy) && <button className="button small" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? 'Rozwiązywanie zdjęcia…' : 'Rozłóż zdjęcie'}</button>}
    {showButton && !busy && project && onActivate && <button type="button" className="button small photo-restore" title={`Pokaż zdjęcie: ${project.name}`} onClick={onActivate}><span>Pokaż zdjęcie: {project.name}</span></button>}
    {busy && <button className="button small" onClick={session.cancelUpload}>Anuluj</button>}
    {!project && ready === false && <span className="photo-notice">Astrometria wymaga lokalnego Skyshota.</span>}
  </div>
}

export function PhotoMessages({ session }: { session: PhotoSession }) {
  const { error, saveError } = session
  return <>
    {error && <div className="photo-error" role="alert">{error}<CloseButton label="Zamknij komunikat" onClick={session.clearError} /></div>}
    {saveError && !error && <div role="status" className="photo-error photo-save-error">
      {saveError}
      {hasUnsavedPhoto() && <button className="button small" onClick={session.retrySave}>Ponów zapis</button>}
    </div>}
  </>
}

/** Widok edycji: płaskie zdjęcie z okręgami wycinków na całej scenie (nad paskiem zdjęcia). Okręgi pokazują położenie
 *  z rozwiązania i służą tylko do zaznaczania (klik w obwódkę); bez przesuwania i zmiany promienia. */
export function PhotoFlatView({ session }: { session: PhotoSession }) {
  const { project, activeId, setActiveId } = session
  const colors = useStore((s) => s.annotationColors)
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ width: 800, height: 520, bar: 63 })
  const prefix = useId().replace(/:/g, '')
  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    // Zdjęcie kończy się nad paskiem zdjęcia (na telefonie pasek ma dwa wiersze przycisków).
    const bar = svg.parentElement?.querySelector<HTMLElement>('.photo-controls')
    const measure = () => setSize({ width: Math.max(1, svg.clientWidth), height: Math.max(1, svg.clientHeight), bar: bar?.offsetHeight ?? 0 })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(svg)
    if (bar) ro.observe(bar)
    return () => ro.disconnect()
  }, [])
  if (!project) return null
  const { width, height } = size
  const frame = photoFrame(width, height, project, { top: 16, bottom: (size.bar ? size.bar + 12 : 0) + 16, side: 16 })
  // Okręgi wszystkich obiektów rozwiązania; spoza 3D (bez odległości lub odznaczone) bledsze. Od największego,
  // żeby obwódki mniejszych okręgów leżały na wierzchu.
  const inThreeD = new Set(cutsInThreeD(project.cuts))
  const circles = [...project.cuts].sort((a, b) => b.radius - a.radius)
    .map((cut) => ({ cut, x: frame.x + cut.x * frame.scale, y: frame.y + cut.y * frame.scale, radius: cut.radius * frame.scale }))
  const covered = coveredPhotoCircles(circles)

  return <svg ref={svgRef} className="photo-overlay" viewBox={`0 0 ${width} ${height}`} aria-label="Zdjęcie z wycinkami obiektów">
    <image id={`${prefix}-image`} href={project.image} width={project.width} height={project.height} transform={`translate(${frame.x} ${frame.y}) scale(${frame.scale})`} />
    {circles.map(({ cut, x, y, radius }, i) => {
      const muted = !inThreeD.has(cut) && activeId !== cut.id
      return <g key={cut.id}>
        <circle cx={x} cy={y} r={radius} fill="none" stroke={activeId === cut.id ? 'var(--accent)' : colors[cut.type] ?? DEFAULT_ANNOTATION_COLORS[cut.type]} strokeOpacity={muted ? 0.5 : undefined} strokeWidth={activeId === cut.id ? 2 : 1.4} strokeDasharray={covered[i] ? '5 4' : undefined} />
        {/* Szersza niewidoczna obwódka do kliknięcia; wnętrze okręgu nie łapie kursora. */}
        <circle cx={x} cy={y} r={radius} fill="none" stroke="transparent" strokeWidth={12} className="photo-circle" onClick={() => setActiveId(cut.id)}><title>{`${cut.id}: ${distanceSummary(cut)}`}</title></circle>
        <text x={x} y={y + radius + 14} className={muted ? 'photo-label muted' : 'photo-label'}>{cut.id}</text>
      </g>
    })}
  </svg>
}

const REGRESSOR_REFUSALS: Record<string, string> = {
  FIELD_POPULATION_KINEMATICS: 'zbyt duży rozrzut prędkości grupy gwiazd',
  NO_SUPPORTED_CLUSTER: 'brak spójnej grupy gwiazd',
  NO_KINEMATICALLY_COHERENT_CLUSTER: 'brak grupy o zgodnych ruchach własnych',
  EMPTY_SIGHTLINE: 'brak danych o gwiazdach w tym polu',
  TOO_FEW_STARS: 'zbyt mało gwiazd z odległością',
  NO_MATCHED_EXTRAGALACTIC_DISTANCE: 'brak dopasowanej odległości galaktyki',
}

function regressorNotice(cut: PhotoCut, job: RegressorJob | undefined): string | undefined {
  if (hasDistance(cut) || cut.distanceOrigin === 'user') return undefined
  if (job?.status === 'queued') return 'Regresor: oczekuje w kolejce.'
  if (job?.status === 'running') return 'Regresor: szacowanie w toku.'
  if (job?.result?.status === 'error') return `Regresor: ${job.result.message}`
  if (job?.status === 'error' || job?.status === 'unknown') return 'Regresor: nie udało się odczytać wyniku.'
  if (job?.result?.status === 'abstain') return `Regresor: ${REGRESSOR_REFUSALS[job.result.reason] ?? 'brak podstaw do oszacowania odległości'}.`
  if (job?.status === 'done') return 'Regresor: oszacowanie nie spełniło kryteriów jakości.'
  if (!REGRESSOR_TYPES.includes(cut.type)) return 'Regresor nie obsługuje tego typu obiektu.'
  return undefined
}

/** Panel wycinków: widoczność, wybór źródła odległości i zakres pomiaru, dokładność astrometrii. */
export function PhotoCutEditor({ session, regressorJobs }: { session: PhotoSession; regressorJobs?: ReadonlyMap<string, RegressorJob> }) {
  const { project, updateCut, activeId, setActiveId, catalogSearch, retryCatalogObjects } = session
  const { catalog } = useCatalog()
  const colors = useStore((s) => s.annotationColors)
  const cuts = project?.cuts
  const cutsByCatalog = useMemo(() => {
    const groups = new Map<string, PhotoCut[]>()
    for (const cut of cuts ?? []) {
      const id = catalogOf(cut.id) ?? cut.catalogMatch?.kind ?? (/^PGC \d+$/.test(cut.id) ? 'PGC' : 'Inne')
      const group = groups.get(id)
      if (group) group.push(cut)
      else groups.set(id, [cut])
    }
    return Array.from(groups)
  }, [cuts])
  const [distances, setDistances] = useState<{ key: string; data: PhotoDistances } | null>(null)
  const [distanceRetry, setDistanceRetry] = useState(0)
  const active = project?.cuts.find((c) => c.id === activeId)
  const local = active ? catalog?.find((object) => object.id === active.id) : undefined
  const alias = active?.catalogMatch?.id !== active?.id ? active?.catalogMatch?.id : undefined
  const aliases = [...new Set([...(local?.photoAliases ?? []), ...(alias ? [alias] : [])])]
  const activeRegressorNotice = active && (local || !active.catalogMatch) ? regressorNotice(active, regressorJobs?.get(active.id)) : undefined
  const distanceKey = project && active ? `${project.id}:${active.id}` : ''
  const distanceData = distances?.key === distanceKey ? distances.data : null
  const recorded = active?.catalogMatch?.distance
  const catalogWarnings = catalogSearch?.warnings ?? project?.catalogObjects?.warnings ?? []
  const measurements = [...(recorded ? [recorded] : []), ...(distanceData?.measurements ?? [])]
  const selectedDistance = measurements.findIndex((m) => m.distLy === active?.distLy && m.uncertaintyLy === active?.uncertaintyLy && m.distanceSource === active?.distanceSource && m.distanceMethod === active?.distanceMethod)
  useEffect(() => {
    if (!distanceKey || !activeId) return
    const abort = new AbortController()
    void fetch(`/api/photo/distances?${new URLSearchParams({ id: activeId })}`, { signal: abort.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return await response.json() as PhotoDistances })
      .then((data) => { if (!abort.signal.aborted) setDistances({ key: distanceKey, data }) })
      .catch(() => { if (!abort.signal.aborted) setDistances({ key: distanceKey, data: { measurements: [], warnings: ['Nie udało się pobrać źródeł odległości.'] } }) })
    return () => abort.abort()
  }, [distanceKey, activeId, distanceRetry])
  useEffect(() => {
    if (!distanceData || !active || !catalog || local?.unresolved) return
    const current = session.getCurrentProject()
    if (current !== project) return
    const next = newestCutMeasurement(active, recorded ? [recorded, ...distanceData.measurements] : distanceData.measurements)
    if (next) updateCut(active.id, next)
  }, [distanceData, active, catalog, local, session, project, recorded, updateCut])
  if (!project) return null

  return <div className="photo-editor">
    <div className="photo-editor-heading"><strong>Wycinki zdjęcia</strong><CloseButton label="Zamknij edycję wycinków" onClick={() => session.setEditing(false)} /></div>
    <p className="dim">Obiekty z rozwiązania zdjęcia. Wybierz obiekt z listy albo kliknij obwódkę jego okręgu; zaznacz, które pokazać w 3D. Obiekty bez ustalonej odległości nie trafiają do 3D (na zdjęciu są bledsze).</p>
    {(catalogSearch?.loading || catalogWarnings.length > 0) && <div aria-live="polite">
      {catalogSearch?.loading && <p className="dim">Pobieranie galaktyk PGC, kwazarów i gromad ACO…</p>}
      {catalogWarnings.map((warning) => <p key={warning} className="photo-notice">{warning}</p>)}
      {catalogSearch?.retryable && <button type="button" className="button small" onClick={retryCatalogObjects}>Ponów pobieranie katalogów</button>}
    </div>}
    <div className="photo-object-list">
      {cutsByCatalog.map(([id, group]) => (
        <details key={`${project.id}:${id}`} className="photo-object-group" open>
          <summary>{id === 'M' ? 'Messier' : PHOTO_CATALOG_LABELS[id as PhotoCatalogKind] ?? EXTRA_CATALOGS.find((item) => item.id === id)?.label ?? id} <span className="dim">{group.length}</span></summary>
          {group.map((c) => <div key={c.id} className={`photo-object-row${activeId === c.id ? ' active' : ''}`}>
            <input type="checkbox" aria-label={`Pokaż ${c.id}`} checked={c.enabled && hasDistance(c)} disabled={!hasDistance(c)} title={hasDistance(c) ? undefined : regressorNotice(c, regressorJobs?.get(c.id)) ?? 'Bez ustalonej odległości: obiekt nie trafia do 3D'} onChange={(e) => updateCut(c.id, { enabled: e.target.checked })} />
            <button onClick={() => setActiveId(c.id)}><span style={{ color: colors[c.type] ?? DEFAULT_ANNOTATION_COLORS[c.type] }}>{c.id}</span><small>{c.catalogMatch?.kind === 'QSO' ? 'Kwazar' : c.catalogMatch?.kind === 'ACO' ? 'Gromada gal.' : TYPE_INFO[c.type].short}</small></button>
          </div>)}
        </details>
      ))}
    </div>
    {project.cuts.length === 0 && (project.catalogObjects || !project.astrometry.wcs) && <p>Brak obiektów katalogowych w tym kadrze.</p>}
    {active && <div className="photo-fields">
      <strong>{active.id}</strong>
      {!!aliases.length && <small className="dim">{aliases.join(', ')}</small>}
      <label>Źródło odległości<select value={selectedDistance < 0 ? active.distLy ? 'saved' : 'unknown' : selectedDistance} title={distanceSummary(active)} onChange={(e) => {
        if (e.target.value === 'unknown') { updateCut(active.id, { ...NO_DISTANCE, distanceOrigin: 'user' }); return }
        const measurement = measurements[Number(e.target.value)]
        if (measurement) updateCut(active.id, measurementDistance(measurement, 'user'))
      }}>
        <option value="unknown">Brak odległości — bez 3D</option>
        {selectedDistance < 0 && active.distLy && <option value="saved">{distanceSummary(active)}</option>}
        {!distanceData && <option disabled>Pobieranie pomiarów…</option>}
        {(['Katalog', 'SIMBAD', 'NED'] as const).map((source) => measurements.some((m) => m.source === source) && <optgroup key={source} label={source}>
          {measurements.map((m, i) => m.source === source && <option key={i} value={i} title={distanceSummary(m)}>{distanceSummary(m)}</option>)}
        </optgroup>)}
      </select></label>
      {!hasDistance(active) && <p className="photo-notice">{active.distLy ? `Niepewność powyżej ${MAX_RELATIVE_UNCERTAINTY * 100} %: obiekt nie trafia do 3D.` : 'Bez ustalonej odległości obiekt nie trafia do 3D.'}</p>}
      {active.distanceRef && <a href={`https://ui.adsabs.harvard.edu/abs/${encodeURIComponent(active.distanceRef)}/abstract`} target="_blank" rel="noopener noreferrer">Publikacja źródłowa ↗</a>}
      <div className="photo-distance-status" aria-live="polite">
        {activeRegressorNotice && <p className="photo-notice">{activeRegressorNotice}</p>}
        {!distanceData && <p className="dim">Pobieranie pomiarów…</p>}
        {distanceData?.warnings.map((warning) => <p key={warning} className="photo-notice">{warning}</p>)}
        {!!distanceData?.warnings.length && <button className="button small" onClick={() => { setDistances(null); setDistanceRetry((n) => n + 1) }}>Ponów pobieranie</button>}
        {distanceData && !measurements.length && !distanceData.warnings.length && <p className="photo-notice">Brak opublikowanych pomiarów w obsługiwanych źródłach.</p>}
      </div>
      <label>Zakres pomiaru<select value={active.distanceScope} disabled={!active.distLy} onChange={(e) => updateCut(active.id, { distanceScope: e.target.value as DistanceScope, distanceOrigin: 'user' })}>
        {(Object.keys(SCOPE_LABELS) as DistanceScope[]).map((scope) => <option key={scope} value={scope}>{SCOPE_LABELS[scope]}</option>)}
      </select></label>
    </div>}
    <details><summary>Dokładność astrometrii</summary><p>{project.astrometry.matches} dopasowań, RMS {project.astrometry.rmsPx.toFixed(2)} px.</p><p>Brzegi: {project.astrometry.edgeMatches} dopasowań{project.astrometry.edgeRmsPx !== null && `, RMS ${project.astrometry.edgeRmsPx.toFixed(2)} px`}.</p><p>To reszty dopasowania solvera; wymagają oceny na zdjęciu. Wycinek zawiera także tło i gwiazdy.</p></details>
  </div>
}

/** Pasek zdjęcia w obu skalach: miejsce i wymiary jak pasek starej nakładki, bez suwaka. */
export function GalaxyPhotoBar({ session, stars, onUnfold, onPick, onRetryStars }: { session: PhotoSession; stars: StarsStatus; onUnfold(): void; onPick(): void; onRetryStars(): void }) {
  const { project, editing, setEditing } = session
  if (!project) return null
  const enabled = cutsInThreeD(project.cuts).length
  return <div className="photo-controls">
    <div className="photo-heading">
      <span title={project.name}>{project.name}</span>
      <span className="dim">
        {stars.status === 'loading' && <span className="accent">Pobieranie gwiazd Gaia DR3… · </span>}
        {stars.status === 'error' && <span className="photo-notice" title={stars.message}>Gwiazdy Gaia: błąd · <button type="button" className="link-button" onClick={onRetryStars}>ponów</button> · </span>}
        {enabled}/{project.cuts.length} obiektów w 3D
      </span>
    </div>
    <div className="photo-timeline photo-actions">
      <button type="button" className="button small" title="Przejście do Obserwatorium: gwiazdy Gaia i obiekty w swoich odległościach" onClick={() => { setEditing(false); onUnfold() }}>Rozłóż zdjęcie 3D</button>
      <button type="button" className={`button small${editing ? ' active' : ''}`} aria-expanded={editing} onClick={() => setEditing(!editing)}>Edytuj wycinki</button>
      <button type="button" className="button small" onClick={onPick} disabled={session.busy}>Zmień zdjęcie</button>
      <button type="button" className="button small" onClick={() => { setEditing(false); session.change(null) }}>Usuń</button>
    </div>
  </div>
}
