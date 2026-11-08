// Wszechświat lokalny: fotografia rozchodzi się na rzeczywiste fragmenty obrazu w scenie 3D.
import { Pause, Play, RotateCcw, Settings2, X } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { fmtDistance } from '../../lib/format'
import { cutsInThreeD, distanceSummary, photoFrame, type PhotoSceneFrame } from '../../lib/photo'
import { Range } from '../Range'
import type { Space3DHandle } from '../Space3D'
import type { PhotoSession } from './photoSession'
import { createUniversePhoto, type UniversePhotoLabel } from './universePhoto'

interface Props {
  session: PhotoSession
  frameRef: RefObject<((frame: PhotoSceneFrame) => void) | null>
  fitRef: RefObject<(() => void) | null>
  handle: Space3DHandle | null
  onObservatory(): void
}

export function PhotoUnfold({ session, frameRef, fitRef, handle, onObservatory }: Props) {
  const { project, editing, setEditing, activeId, setActiveId, busy } = session
  const [scene, setScene] = useState<PhotoSceneFrame>({ width: 800, height: 520, anchors: [] })
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [labels, setLabels] = useState<UniversePhotoLabel[]>([])
  const progressRef = useRef(progress)
  progressRef.current = progress
  const gallery = useRef<ReturnType<typeof createUniversePhoto> | null>(null)

  useEffect(() => {
    frameRef.current = setScene
    return () => { frameRef.current = null }
  }, [frameRef])
  useEffect(() => {
    if (!handle || !project) return
    const next = createUniversePhoto(handle, project, progressRef, setLabels)
    gallery.current = next
    return () => { next.dispose(); gallery.current = null }
  }, [handle, project?.id, project?.cuts])
  useEffect(() => { gallery.current?.setSelected(activeId) }, [activeId, project?.cuts])
  useEffect(() => { setPlaying(false); setProgress(0) }, [project?.id, busy])
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100)
      last = now
      setProgress(p => Math.min(1, p + dt / 5000))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])
  useEffect(() => { if (progress >= 1) setPlaying(false) }, [progress])

  const { width, height } = scene
  const frame = project ? photoFrame(width, height, project) : { x: 0, y: 0, scale: 1 }
  const enabled = cutsInThreeD(project?.cuts ?? [])
  const move = Math.max(0, Math.min(1, (progress - 0.18) / 0.82))

  function fit() {
    if (gallery.current) gallery.current.frameCamera()
    else fitRef.current?.()
  }
  function play() {
    if (!playing && (progress === 0 || progress >= 1)) fit()
    setEditing(false)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setProgress(1); return }
    if (progress >= 1) setProgress(0)
    setPlaying(p => !p)
  }

  return <>
    {project && <>
      {!editing && <svg className="photo-overlay photo-unfold" viewBox={`0 0 ${width} ${height}`} aria-label="Zdjęcie z wycinkami obiektów">
        <image href={project.image} width={project.width} height={project.height} opacity={Math.max(0, 1 - progress / 0.38)} transform={`translate(${frame.x} ${frame.y}) scale(${frame.scale})`} />
        {labels.map(label => {
          const cut = enabled.find(c => c.id === label.id)
          if (!cut || !label.visible || move === 0) return null
          const caption = `≈ ${fmtDistance(cut.distLy)}`
          return <g key={cut.id} className="photo-fragment-label" opacity={move}>
            <rect x={label.x - label.size / 2} y={label.y - label.size / 2} width={label.size} height={label.size} fill="transparent" className="photo-fragment-hit" onClick={() => setActiveId(cut.id)}>
              <title>{`${cut.id}: ${distanceSummary(cut)}`}</title>
            </rect>
            <text x={label.x} y={label.y + label.size / 2 + 18} className="photo-label">{cut.id}</text>
            <text x={label.x} y={label.y + label.size / 2 + 34} className="photo-distance">{caption}</text>
          </g>
        })}
      </svg>}
      <div className="photo-controls">
        <div className="photo-heading"><span title={project.name}>{project.name}</span><span className="dim">{enabled.length}/{project.cuts.length} obiektów w 3D</span></div>
        <div className="photo-timeline">
          <button className="icon-button" aria-label={playing ? 'Zatrzymaj rozkładanie' : 'Odtwórz rozkładanie'} disabled={!enabled.length} onClick={play}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
          <button className="icon-button" aria-label="Wróć do fotografii" onClick={() => { setPlaying(false); setProgress(0) }}><RotateCcw size={14} /></button>
          <span>Zdjęcie</span><Range aria-label="Rozłożenie zdjęcia w 3D" min={0} max={1} step={0.001} value={progress} onChange={(e) => { setPlaying(false); if (progress === 0) fit(); setProgress(Number(e.target.value)) }} /><span>Mapa 3D</span>
          <button className="button small" title="Obserwatorium 3D: gwiazdy Gaia i obiekty w swoich odległościach" aria-label="Otwórz obserwatorium 3D" onClick={() => { setPlaying(false); setEditing(false); onObservatory() }}>3D</button>
          <button className={`icon-button${editing ? ' active' : ''}`} aria-label="Edytuj wycinki" aria-expanded={editing} onClick={() => { setPlaying(false); setProgress(0); setEditing(!editing) }}><Settings2 size={16} /></button>
          <button className="icon-button" aria-label="Usuń zdjęcie z widoku" onClick={() => { setPlaying(false); setProgress(0); session.change(null) }}><X size={15} /></button>
        </div>
      </div>
    </>}
  </>
}
