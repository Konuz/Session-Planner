// Lista obiektów zdjęcia we Wszechświecie lokalnym: wirtualizowana lista według odległości z wyszukiwaniem i wybrany
// obiekt z przelotem kamery do jego znacznika. Scena (stożek pola i znaczniki jak w Drodze Mlecznej): photoGuide.ts.
import { useVirtualizer } from '@tanstack/react-virtual'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { fmtDistance, fmtDistanceRange } from '../../lib/format'
import { cutsInThreeD, distanceSummary, photoCropSquare, type PhotoCut, type PhotoProject } from '../../lib/photo'
import type { SpaceScale } from '../../lib/space3d'
import type { PhotoGuide } from './photoGuide'
import type { PhotoSession } from './photoSession'

interface Props {
  session: PhotoSession
  /** Znaczniki zdjęcia w scenie: wskazanie z listy i przelot do obiektu. */
  guideRef?: RefObject<PhotoGuide | null>
  /** Skala sceny: jej zmiana kadruje ponownie stożek, więc zeruje stan przybliżenia. */
  scale?: SpaceScale
  /** Panel pokazany (tylko w skali, poza edycją i nurkowaniem). */
  visible?: boolean
}

function CutPreview({ project, cut }: { project: PhotoProject; cut: PhotoCut }) {
  const { x, y, side } = photoCropSquare(cut, project.width, project.height)
  return <svg className="pw-thumb" viewBox={`${x} ${y} ${side} ${side}`} aria-label={`Wycinek ${cut.id}`} role="img">
    <image href={project.image} width={project.width} height={project.height} preserveAspectRatio="none" />
  </svg>
}

function ObjectList({ cuts, project, activeId, onChoose, onHover }: { cuts: PhotoCut[]; project: PhotoProject; activeId: string | null; onChoose(id: string): void; onHover(id: string | null): void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({ count: cuts.length, getScrollElement: () => scrollRef.current, estimateSize: () => 40, overscan: 6 })
  const index = cuts.findIndex((cut) => cut.id === activeId)
  useEffect(() => { if (index >= 0) virtualizer.scrollToIndex(index, { align: 'auto' }) }, [index, virtualizer])
  return <div ref={scrollRef} className="pw-list" role="listbox" aria-label="Obiekty zdjęcia według odległości" onPointerLeave={() => onHover(null)}>
    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map((item) => {
        const cut = cuts[item.index]
        return <div key={cut.id} role="option" aria-selected={cut.id === activeId} className={`pw-row${cut.id === activeId ? ' on' : ''}`} style={{ transform: `translateY(${item.start}px)`, height: item.size }}
          title={distanceSummary(cut)} onClick={() => onChoose(cut.id)} onPointerEnter={() => onHover(cut.id)}>
          <CutPreview project={project} cut={cut} />
          <span className="pw-row-name">{cut.id}</span>
          <span className="pw-row-dist figures">{fmtDistance(cut.distLy)}</span>
        </div>
      })}
    </div>
  </div>
}

export function PhotoUnfold({ session, guideRef, scale, visible = true }: Props) {
  const { project, editing, activeId, setActiveId } = session
  const [query, setQuery] = useState('')
  const [zoomed, setZoomed] = useState(false)
  const cuts = useMemo(() => cutsInThreeD(project?.cuts ?? []).sort((a, b) => a.distLy! - b.distLy! || a.id.localeCompare(b.id)), [project?.cuts])
  const needle = query.trim().toLocaleLowerCase()
  const shown = useMemo(() => needle ? cuts.filter((cut) => cut.id.toLocaleLowerCase().includes(needle)) : cuts, [cuts, needle])
  const active = activeId ? cuts.find((cut) => cut.id === activeId) : undefined

  useEffect(() => { setZoomed(false) }, [activeId, scale, project?.id])

  if (!project || editing || !visible) return null
  const hover = (id: string | null) => guideRef?.current?.setHover(id)
  const toggleZoom = () => {
    if (!active) return
    if (zoomed) {
      guideRef?.current?.frameCamera()
      setZoomed(false)
    } else {
      guideRef?.current?.focus(active.id)
      setZoomed(true)
    }
  }

  return <aside className="photo-window-panel" aria-label="Obiekty zdjęcia w przestrzeni">
    <div className="pw-heading">
      <span className="pw-eyebrow">OBIEKTY ZDJĘCIA</span>
      <strong>{cuts.length} {cuts.length === 1 ? 'obiekt' : 'obiektów'} w przestrzeni</strong>
      {cuts.length > 0 && <span className="pw-meta">≈ {fmtDistanceRange(cuts[0].distLy!, cuts[cuts.length - 1].distLy!)}</span>}
    </div>
    {cuts.length > 6 && <input className="pw-search" type="search" placeholder="Znajdź obiekt…" aria-label="Znajdź obiekt na zdjęciu" value={query} onChange={(e) => setQuery(e.target.value)} />}
    {shown.length > 0 && <ObjectList cuts={shown} project={project} activeId={activeId} onChoose={setActiveId} onHover={hover} />}
    {cuts.length > 0 && !shown.length && <p className="pw-note">Brak obiektów pasujących do wyszukiwania.</p>}
    {active && <section className="pw-selection" aria-label="Wybrany obiekt">
      <div className="pw-selected">
        <button
          type="button"
          className="pw-zoom"
          onClick={toggleZoom}
          aria-label={zoomed ? 'Oddal widok' : 'Przybliż obiekt'}
          title={zoomed ? 'Oddal widok' : 'Przybliż obiekt'}
        >
          {zoomed ? <ZoomOut size={15} aria-hidden /> : <ZoomIn size={15} aria-hidden />}
        </button>
        <CutPreview project={project} cut={active} />
        <div className="pw-selected-meta">
          <strong>{active.id}</strong>
          <span className="figures">≈ {fmtDistance(active.distLy)}</span>
        </div>
      </div>
      <p>{distanceSummary(active)}</p>
    </section>}
    {!cuts.length && <p className="pw-note">Włącz wycinki z ustaloną odległością w edytorze, aby pokazać zdjęcie w przestrzeni.</p>}
  </aside>
}
