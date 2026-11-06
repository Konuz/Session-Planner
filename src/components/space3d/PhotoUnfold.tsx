// Stara nakładka zdjęcia (tylko Wszechświat lokalny): okręgi wycinków wylatują ze zdjęcia do kolumn z liniami
// do położeń w scenie. Edycję okręgów i panel wycinków daje wspólna część (PhotoEditing).
import { Pause, Play, RotateCcw, Settings2, X } from 'lucide-react'
import { useEffect, useId, useState, type RefObject } from 'react'
import { DEFAULT_ANNOTATION_COLORS } from '../../lib/catalog'
import { fmtDistance } from '../../lib/format'
import { coveredPhotoCircles, photoColumnCapacity, photoColumns, photoFrame, photoPose, type PhotoSceneFrame } from '../../lib/photo'
import { Range } from '../Range'
import type { PhotoSession } from './photoSession'

interface Props {
  session: PhotoSession
  frameRef: RefObject<((frame: PhotoSceneFrame) => void) | null>
  fitRef: RefObject<(() => void) | null>
  /** Przycisk „3D”: przejście do Drogi Mlecznej i nurkowanie do Obserwatorium zdjęcia. */
  onObservatory(): void
}

export function PhotoUnfold({ session, frameRef, fitRef, onObservatory }: Props) {
  const { project, editing, setEditing, activeId, setActiveId, busy } = session
  const [scene, setScene] = useState<PhotoSceneFrame>({ width: 800, height: 520, anchors: [] })
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const prefix = useId().replace(/:/g, '')

  useEffect(() => {
    frameRef.current = setScene
    return () => { frameRef.current = null }
  }, [frameRef])

  // Nowe zdjęcie zaczyna od fotografii.
  useEffect(() => { setPlaying(false); setProgress(0) }, [project?.id, busy])

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

  const { width, height } = scene
  const frame = project ? photoFrame(width, height, project) : { x: 0, y: 0, scale: 1 }
  const enabled = project?.cuts.filter((c) => c.enabled) ?? []
  const move = Math.max(0, Math.min(1, (progress - 0.18) / 0.82))
  const circleOpacity = Math.min(1, progress / 0.12)
  const columns = photoColumns(enabled, project?.width ?? 0, photoColumnCapacity(project?.cuts ?? []))
  const rows = Math.max(1, ...columns.map((column) => column.length))
  const rowSpacing = Math.max(0, height - 305) / Math.max(1, rows - 1)
  // Okno ma stałą wysokość: przy wielu wycinkach karty maleją (do 8 px promienia) zamiast wydłużać scenę.
  const cardRadius = Math.max(8, Math.min(48, width / 9, rows > 1 ? (rowSpacing - 32) / 2 : 48))
  const positions = columns.flatMap((column, side) => column.map((cut, i) => {
    const destination = { x: side === 0 ? cardRadius + 35 : width - cardRadius - 35, y: column.length === 1 ? height / 2 : 110 + i * Math.max(0, height - 305) / (column.length - 1), radius: cardRadius }
    return { cut, pose: photoPose(cut, frame, destination, move), anchor: scene.anchors.find((a) => a.id === cut.id) }
  }))
  const covered = coveredPhotoCircles(positions.map(({ pose }) => pose))

  function play() {
    if (!playing && (progress === 0 || progress >= 1)) fitRef.current?.()
    setEditing(false)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setProgress(1); return }
    if (progress >= 1) setProgress(0)
    setPlaying((p) => !p)
  }

  return <>
    {project && <>
      {!editing && <svg className="photo-overlay" viewBox={`0 0 ${width} ${height}`} aria-label="Zdjęcie z wycinkami obiektów">
        <defs>
          <image id={`${prefix}-image`} href={project.image} width={project.width} height={project.height} />
          <clipPath id={`${prefix}-union`} clipPathUnits="userSpaceOnUse">{enabled.map((c) => <circle key={c.id} cx={c.x} cy={c.y} r={c.radius} />)}</clipPath>
          <marker id={`${prefix}-arrow`} markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="var(--accent)" strokeWidth="0.75" /></marker>
          {positions.map(({ cut, pose }, i) => <clipPath key={cut.id} id={`${prefix}-cut-${i}`}><circle cx={pose.x} cy={pose.y} r={pose.radius} /></clipPath>)}
        </defs>
        <g opacity={Math.max(0, 1 - progress / 0.38)} transform={`translate(${frame.x} ${frame.y}) scale(${frame.scale})`}>
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
            <circle cx={pose.x} cy={pose.y} r={pose.radius} fill="transparent" stroke={activeId === cut.id ? 'var(--accent)' : color} strokeWidth={activeId === cut.id ? 2 : 1.4} strokeDasharray={covered[i] ? '5 4' : undefined} opacity={circleOpacity} className="photo-circle" onClick={() => setActiveId(cut.id)}><title>{`${cut.id}: ${caption}${cut.distanceSource ? ` — ${cut.distanceSource}` : ''}${cut.distanceScope === 'complex' ? ' (pomiar całego kompleksu)' : ''}`}</title></circle>
            <text x={pose.x} y={pose.y + pose.radius + 14} className="photo-label" opacity={circleOpacity}>{cut.id}</text>
            <text x={pose.x} y={pose.y + pose.radius + 27} className="photo-distance" opacity={move}>{caption}</text>
          </g>
        })}
      </svg>}
      <div className="photo-controls">
        <div className="photo-heading"><span title={project.name}>{project.name}</span><span className="dim">{enabled.length}/{project.cuts.length} obiektów</span></div>
        <div className="photo-timeline">
          <button className="icon-button" aria-label={playing ? 'Zatrzymaj rozkładanie' : 'Odtwórz rozkładanie'} disabled={!enabled.length} onClick={play}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
          <button className="icon-button" aria-label="Wróć do fotografii" onClick={() => { setPlaying(false); setProgress(0) }}><RotateCcw size={14} /></button>
          <span>Zdjęcie</span><Range aria-label="Rozłożenie zdjęcia w 3D" min={0} max={1} step={0.001} value={progress} onChange={(e) => { setPlaying(false); if (progress === 0) fitRef.current?.(); setProgress(Number(e.target.value)) }} /><span>Mapa 3D</span>
          <button className="button small" title="Obserwatorium 3D: gwiazdy Gaia i obiekty w swoich odległościach" aria-label="Otwórz obserwatorium 3D" onClick={() => { setPlaying(false); setEditing(false); onObservatory() }}>3D</button>
          <button className={`icon-button${editing ? ' active' : ''}`} aria-label="Edytuj wycinki" aria-expanded={editing} onClick={() => { setPlaying(false); setProgress(0); setEditing(!editing) }}><Settings2 size={16} /></button>
          <button className="icon-button" aria-label="Usuń zdjęcie z widoku" onClick={() => { setPlaying(false); setProgress(0); session.change(null) }}><X size={15} /></button>
        </div>
      </div>
    </>}
  </>
}
