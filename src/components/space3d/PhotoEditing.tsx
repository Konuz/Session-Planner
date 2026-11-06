// Wspólna część zdjęcia w oknie „Pozycja 3D” (obie skale): wczytanie, komunikaty, płaski widok edycji okręgów
// i panel wycinków ze źródłami odległości. Rozkładanie zdjęcia robi Obserwatorium (Droga Mleczna) albo stara
// nakładka z kolumnami (Wszechświat lokalny).
import { Box, ImagePlus, Settings2, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { DEFAULT_ANNOTATION_COLORS, TYPE_INFO } from '../../lib/catalog'
import { fmtDistance } from '../../lib/format'
import { coveredPhotoCircles, photoFrame, type PhotoCut, type PhotoDistances } from '../../lib/photo'
import { hasUnsavedPhoto } from '../../lib/photoStorage'
import { CloseButton } from '../CloseButton'
import type { PhotoSession, StarsStatus } from './photoSession'

const ACCEPT = '.jpg,.jpeg,.png,.webp,.tif,.tiff,.fit,.fits,.fts'

/** Ukryte pole pliku (zawsze w oknie) i przycisk wczytania w lewym górnym rogu sceny. */
export function PhotoImport({ session, inputRef, showButton }: { session: PhotoSession; inputRef: RefObject<HTMLInputElement | null>; showButton: boolean }) {
  const { project, busy, ready } = session
  return <div className="photo-import">
    <input ref={inputRef} type="file" hidden accept={ACCEPT} onChange={(e) => { const file = e.target.files?.[0]; if (file) session.upload(file); e.target.value = '' }} />
    {(showButton || busy) && <button className="button small" onClick={() => inputRef.current?.click()} disabled={busy}><ImagePlus size={14} />{busy ? 'Rozwiązywanie zdjęcia…' : project ? 'Zmień zdjęcie' : 'Rozłóż zdjęcie'}</button>}
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

/** Widok edycji: płaskie zdjęcie z okręgami wycinków na całej scenie (nad paskiem zdjęcia); przeciąganie okręgu
 *  i jego uchwytu (promień). */
export function PhotoFlatView({ session }: { session: PhotoSession }) {
  const { project, updateCut, activeId, setActiveId } = session
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ width: 800, height: 520, bar: 63 })
  const prefix = useId().replace(/:/g, '')
  const dragRef = useRef<{ id: string; x: number; y: number; original: PhotoCut; resize: boolean } | null>(null)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    // Zdjęcie kończy się nad paskiem zdjęcia (na telefonie pasek ma dwa wiersze przycisków).
    const bar = () => svg.parentElement?.querySelector<HTMLElement>('.photo-controls')?.offsetHeight ?? 0
    const ro = new ResizeObserver(() => setSize({ width: Math.max(1, svg.clientWidth), height: Math.max(1, svg.clientHeight), bar: bar() }))
    ro.observe(svg)
    return () => ro.disconnect()
  }, [])
  if (!project) return null
  const { width, height } = size
  const frame = photoFrame(width, height, project, { top: 16, bottom: (size.bar ? size.bar + 12 : 0) + 16, side: 16 })
  const enabled = project.cuts.filter((c) => c.enabled)
  const circles = enabled.map((cut) => ({ cut, x: frame.x + cut.x * frame.scale, y: frame.y + cut.y * frame.scale, radius: cut.radius * frame.scale }))
  const covered = coveredPhotoCircles(circles)

  function point(e: React.PointerEvent<SVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: (e.clientX - rect.left) * width / rect.width, y: (e.clientY - rect.top) * height / rect.height }
  }
  function startDrag(e: React.PointerEvent<SVGElement>, cut: PhotoCut, resize: boolean) {
    e.preventDefault(); e.stopPropagation()
    setActiveId(cut.id)
    dragRef.current = { id: cut.id, ...point(e), original: { ...cut }, resize }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function drag(e: React.PointerEvent<SVGElement>) {
    const d = dragRef.current
    if (!d || !project) return
    const p = point(e)
    if (d.resize) updateCut(d.id, { radius: Math.max(4, Math.min(Math.max(project.width, project.height) * 2, d.original.radius + (p.x - d.x) / frame.scale)) })
    else updateCut(d.id, { x: d.original.x + (p.x - d.x) / frame.scale, y: d.original.y + (p.y - d.y) / frame.scale })
  }

  return <svg ref={svgRef} className="photo-overlay" viewBox={`0 0 ${width} ${height}`} aria-label="Zdjęcie z wycinkami obiektów" onPointerMove={drag} onPointerUp={() => { dragRef.current = null }} onPointerCancel={() => { dragRef.current = null }}>
    <image id={`${prefix}-image`} href={project.image} width={project.width} height={project.height} transform={`translate(${frame.x} ${frame.y}) scale(${frame.scale})`} />
    {circles.map(({ cut, x, y, radius }, i) => {
      const caption = cut.distLy ? `≈ ${fmtDistance(cut.distLy)}${cut.uncertaintyLy ? ` ± ${fmtDistance(cut.uncertaintyLy)}` : ''}` : 'odległość nieznana'
      return <g key={cut.id}>
        <circle cx={x} cy={y} r={radius} fill="transparent" stroke={activeId === cut.id ? 'var(--accent)' : DEFAULT_ANNOTATION_COLORS[cut.type]} strokeWidth={activeId === cut.id ? 2 : 1.4} strokeDasharray={covered[i] ? '5 4' : undefined} className="photo-draggable" onPointerDown={(e) => startDrag(e, cut, false)} onClick={() => setActiveId(cut.id)}><title>{`${cut.id}: ${caption}${cut.distanceSource ? ` — ${cut.distanceSource}` : ''}${cut.distanceScope === 'complex' ? ' (pomiar całego kompleksu)' : ''}`}</title></circle>
        {activeId === cut.id && <circle cx={x + radius} cy={y} r={5} fill="var(--accent)" className="photo-resize" onPointerDown={(e) => startDrag(e, cut, true)} />}
        <text x={x} y={y + radius + 14} className="photo-label">{cut.id}</text>
      </g>
    })}
  </svg>
}

/** Panel wycinków: widoczność, wybór źródła odległości i zakres pomiaru, dokładność astrometrii. */
export function PhotoCutEditor({ session }: { session: PhotoSession }) {
  const { project, updateCut, activeId, setActiveId } = session
  const [distances, setDistances] = useState<{ key: string; data: PhotoDistances } | null>(null)
  const [distanceRetry, setDistanceRetry] = useState(0)
  const active = project?.cuts.find((c) => c.id === activeId)
  const distanceKey = project && active ? `${project.id}:${active.id}` : ''
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
  if (!project) return null

  return <div className="photo-editor">
    <div className="photo-editor-heading"><strong>Wycinki zdjęcia</strong><CloseButton label="Zamknij edycję wycinków" onClick={() => session.setEditing(false)} /></div>
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
  </div>
}

/** Pasek zdjęcia w Drodze Mlecznej: miejsce i wymiary jak pasek starej nakładki, bez suwaka. */
export function GalaxyPhotoBar({ session, stars, onUnfold, onPick, onRetryStars }: { session: PhotoSession; stars: StarsStatus; onUnfold(): void; onPick(): void; onRetryStars(): void }) {
  const { project, editing, setEditing } = session
  if (!project) return null
  const enabled = project.cuts.filter((c) => c.enabled).length
  return <div className="photo-controls">
    <div className="photo-heading">
      <span title={project.name}>{project.name}</span>
      <span className="dim">
        {stars.status === 'loading' && <span className="accent">Pobieranie gwiazd Gaia DR3… · </span>}
        {stars.status === 'error' && <span className="photo-notice" title={stars.message}>Gwiazdy Gaia: błąd · <button type="button" className="link-button" onClick={onRetryStars}>ponów</button> · </span>}
        {enabled}/{project.cuts.length} obiektów
      </span>
    </div>
    <div className="photo-timeline photo-actions">
      <button type="button" className="button small" title="Nurkowanie z Drogi Mlecznej do Obserwatorium: gwiazdy Gaia i obiekty w swoich odległościach" onClick={() => { setEditing(false); onUnfold() }}><Box size={14} />Rozłóż zdjęcie 3D</button>
      <button type="button" className={`button small${editing ? ' active' : ''}`} aria-expanded={editing} onClick={() => setEditing(!editing)}><Settings2 size={14} />Edytuj wycinki</button>
      <button type="button" className="button small" onClick={onPick} disabled={session.busy}><ImagePlus size={14} />Zmień zdjęcie</button>
      <button type="button" className="button small" onClick={() => { setEditing(false); session.change(null) }}><X size={14} />Usuń</button>
    </div>
  </div>
}
