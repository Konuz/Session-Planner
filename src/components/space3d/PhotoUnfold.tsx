// Okno zdjęcia we Wszechświecie lokalnym: panel planów odległości (pierwszy plan, główny plan, tło), pasek odległości,
// wirtualizowana lista z wyszukiwaniem i wybrany obiekt. Scena: universePhoto.ts, matematyka: src/lib/spacePhoto.ts.
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { fmtDistance, fmtNum } from '../../lib/format'
import { cutsInThreeD, distanceSummary, type PhotoCut, type PhotoProject } from '../../lib/photo'
import { LAYER_LABELS, LAYER_ORDER, depthLayers, windowRows, type DepthLayer, type DepthLayers, type WindowRow } from '../../lib/spacePhoto'
import type { Space3DHandle } from '../Space3D'
import type { UniverseDive } from './dive'
import type { PhotoGuide } from './photoGuide'
import type { PhotoSession } from './photoSession'
import { createPhotoWindow, type PhotoWindow, type WindowView } from './universePhoto'

interface Props {
  session: PhotoSession
  handle: Space3DHandle | null
  /** Scena okna widoczna (skala i nurkowanie; w stanie zdjęcia i w edycji ukryta). */
  visible?: boolean
  /** Panel pokazany (tylko w skali: w nurkowaniu znika, a kadr wraca na środek sceny). */
  panel?: boolean
  diveRef?: RefObject<UniverseDive | null>
  /** Linia widzenia i stożek okna dla nurkowania do Obserwatorium. */
  guideRef?: RefObject<PhotoGuide | null>
}

const VIEWS: { id: WindowView; label: string; title: string }[] = [
  { id: 'position', label: 'Położenie', title: 'Droga Mleczna, linia widzenia i okno zdjęcia w jednym kadrze' },
  { id: 'frame', label: 'Kadr', title: 'Okno zdjęcia z bliska: pierwszy plan przed nim, tło za nim' },
  { id: 'earth', label: 'Z Ziemi', title: 'Wzdłuż linii widzenia: plany składają się w płaską fotografię' },
]
/** Zmiana widoku przyciskiem: składanie planów w widoku „Z Ziemi” i rozkładanie w pozostałych. */
const VIEW_LIFT_MS = 700
const STRIP = { width: 240, height: 30, pad: 6 }

function CutPreview({ project, cut }: { project: PhotoProject; cut: PhotoCut }) {
  return <svg className="pw-thumb" viewBox={`${cut.x - cut.radius} ${cut.y - cut.radius} ${cut.radius * 2} ${cut.radius * 2}`} aria-label={`Wycinek ${cut.id}`} role="img">
    <image href={project.image} width={project.width} height={project.height} />
  </svg>
}

/** Pasek odległości (log): kreska na obiekt w kolorze planu, pasmo głównego planu, kliknięcie wybiera najbliższy obiekt. */
function DepthStrip({ cuts, layers, activeId, onPick }: { cuts: PhotoCut[]; layers: DepthLayers; activeId: string | null; onPick(id: string): void }) {
  const logs = cuts.map((c) => Math.log10(c.distLy!))
  const min = Math.min(...logs), max = Math.max(...logs)
  const x = (log: number) => STRIP.pad + (max > min ? (log - min) / (max - min) : 0.5) * (STRIP.width - 2 * STRIP.pad)
  const ticks = (layer: DepthLayer) => cuts.map((c, i) => layers.layer.get(c.id) === layer ? `M${x(logs[i]).toFixed(1)} 7V23` : '').join('')
  const active = cuts.findIndex((c) => c.id === activeId)
  return <div className="pw-strip">
    <svg viewBox={`0 0 ${STRIP.width} ${STRIP.height}`} role="img" aria-label="Rozkład odległości obiektów zdjęcia w skali logarytmicznej"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const at = (e.clientX - rect.left) / rect.width * STRIP.width
        let best = 0
        logs.forEach((log, i) => { if (Math.abs(x(log) - at) < Math.abs(x(logs[best]) - at)) best = i })
        onPick(cuts[best].id)
      }}>
      <rect className="pw-band" x={x(Math.log10(layers.lo)) - 2} y={4} width={x(Math.log10(layers.hi)) - x(Math.log10(layers.lo)) + 4} height={22} />
      <path className="pw-axis" d={`M${STRIP.pad} 15H${STRIP.width - STRIP.pad}`} />
      {LAYER_ORDER.map((layer) => <path key={layer} className={`pw-tick pw-${layer}`} d={ticks(layer)} />)}
      {active >= 0 && <path className="pw-tick pw-active" d={`M${x(logs[active]).toFixed(1)} 2V28`} />}
    </svg>
    <div className="pw-strip-scale"><span>{fmtDistance(10 ** min)}</span><span>{max > min ? fmtDistance(10 ** max) : ''}</span></div>
  </div>
}

function WindowList({ rows, project, byId, activeId, onChoose, onHover }: { rows: WindowRow[]; project: PhotoProject; byId: Map<string, PhotoCut>; activeId: string | null; onChoose(id: string): void; onHover(id: string | null): void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: (i) => rows[i].kind === 'header' ? 24 : 40, overscan: 6 })
  const index = rows.findIndex((row) => row.kind === 'cut' && row.id === activeId)
  useEffect(() => { if (index >= 0) virtualizer.scrollToIndex(index, { align: 'auto' }) }, [index, virtualizer])
  return <div ref={scrollRef} className="pw-list" role="listbox" aria-label="Obiekty zdjęcia według planu i odległości" onPointerLeave={() => onHover(null)}>
    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map((item) => {
        const row = rows[item.index]
        const style = { transform: `translateY(${item.start}px)`, height: item.size }
        if (row.kind === 'header') return <div key={`h-${row.layer}`} className={`pw-row pw-group pw-${row.layer}`} style={style}><i /><span>{LAYER_LABELS[row.layer]}</span><b>{row.count}</b></div>
        const cut = byId.get(row.id)!
        return <div key={row.id} role="option" aria-selected={row.id === activeId} className={`pw-row pw-${row.layer}${row.id === activeId ? ' on' : ''}`} style={style}
          title={distanceSummary(cut)} onClick={() => onChoose(row.id)} onPointerEnter={() => onHover(row.id)}>
          <CutPreview project={project} cut={cut} />
          <span className="pw-row-name">{row.id}</span>
          <span className="pw-row-dist figures">{fmtDistance(row.distLy)}</span>
        </div>
      })}
    </div>
  </div>
}

export function PhotoUnfold({ session, handle, visible = true, panel = true, diveRef, guideRef }: Props) {
  const { project, editing, activeId, setActiveId } = session
  const [query, setQuery] = useState('')
  const [only, setOnly] = useState<DepthLayer | null>(null)
  const [view, setView] = useState<WindowView>('position')
  const [frame, setFrame] = useState<{ magnification: number; fieldDeg: [number, number] } | null>(null)
  const windowRef = useRef<PhotoWindow | null>(null)
  const panelRef = useRef<HTMLElement>(null)
  /** Bieżące wysunięcie planów (0 płaska fotografia, 1 rozłożone) i jego animacja. */
  const lift = useRef({ value: 1, raf: 0 })
  const liftTo = (target: number, ms: number) => {
    cancelAnimationFrame(lift.current.raf)
    const from = lift.current.value
    if (from === target || ms <= 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lift.current.value = target
      windowRef.current?.setLift(target)
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      lift.current.value = from + (target - from) * t * t * (3 - 2 * t)
      windowRef.current?.setLift(lift.current.value)
      if (t < 1) lift.current.raf = requestAnimationFrame(step)
    }
    lift.current.raf = requestAnimationFrame(step)
  }
  const framed = useRef<{ handle: Space3DHandle | null; id: string }>({ handle: null, id: '' })
  const visibleRef = useRef(visible)
  visibleRef.current = visible
  const pickRef = useRef(setActiveId)
  pickRef.current = setActiveId
  const cuts = useMemo(() => cutsInThreeD(project?.cuts ?? []), [project?.cuts])
  const layerCuts = useMemo(() => cuts.map((c) => ({ id: c.id, distLy: c.distLy!, radius: c.radius })), [cuts])
  const layers = useMemo(() => depthLayers(layerCuts), [layerCuts])
  const rows = useMemo(() => windowRows(layerCuts, layers, query, only), [layerCuts, layers, query, only])
  const byId = useMemo(() => new Map(cuts.map((c) => [c.id, c])), [cuts])
  const active = activeId ? byId.get(activeId) : undefined

  useEffect(() => {
    if (!handle || handle.scale !== 'universe' || !project) return
    const css = getComputedStyle(document.documentElement)
    const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
    const next = createPhotoWindow(handle, project, { near: token('--plan-near', '#f5a524'), main: token('--accent', '#00e0ff'), far: token('--plan-far', '#8b9dff'), accent: token('--accent', '#00e0ff') },
      (id) => pickRef.current(id))
    if (!next) return
    windowRef.current = next
    if (guideRef) guideRef.current = next.guide
    lift.current.value = 1
    setFrame({ magnification: next.magnification, fieldDeg: next.fieldDeg })
    next.setVisible(visibleRef.current)
    if (framed.current.handle !== handle || framed.current.id !== project.id) {
      framed.current = { handle, id: project.id }
      next.view('position', 1800)
      setView('position')
    }
    return () => { cancelAnimationFrame(lift.current.raf); next.dispose(); windowRef.current = null; if (guideRef) guideRef.current = null }
  }, [handle, project?.id, project?.cuts, project?.image, guideRef])
  useEffect(() => { windowRef.current?.setSelected(activeId) }, [activeId, handle, project?.cuts])
  useEffect(() => { windowRef.current?.setVisible(visible) }, [visible])
  // Kadr centruje się w części sceny wolnej od panelu i paska zdjęcia. Bez panelu (nurkowanie) zostaje ostatni
  // pomiar: przesunięcie kadru wygasza wtedy samo nurkowanie.
  useLayoutEffect(() => {
    const aside = panelRef.current
    if (!aside) return
    const bar = aside.parentElement?.querySelector<HTMLElement>('.photo-controls')
    windowRef.current?.setInsets(aside.offsetWidth + 16, bar ? bar.offsetHeight + 12 : 0)
  })
  useEffect(() => {
    if (!diveRef) return
    diveRef.current = {
      setDive(progress, fade) {
        cancelAnimationFrame(lift.current.raf)
        lift.current.value = progress
        windowRef.current?.setDive(progress, fade)
      },
      setVisible(next) { windowRef.current?.setVisible(next) },
    }
    return () => { diveRef.current = null }
  }, [diveRef])

  if (!project || editing || !visible || !panel) return null
  const show = (next: WindowView) => {
    windowRef.current?.view(next)
    liftTo(next === 'earth' ? 0 : 1, VIEW_LIFT_MS)
    setView(next)
  }
  const excluded = project.cuts.length - cuts.length

  return <aside ref={panelRef} className="photo-window-panel" aria-label="Okno zdjęcia: plany odległości i obiekty">
    <div className="pw-heading">
      <span className="pw-eyebrow">OKNO ZDJĘCIA</span>
      <strong>{cuts.length} {cuts.length === 1 ? 'obiekt' : 'obiektów'} w przestrzeni</strong>
      {frame && <span className="pw-meta" title="Okno jest większe od prawdziwego pola zdjęcia, które w tej skali jest cienką igłą">kadr ×{fmtNum(frame.magnification, frame.magnification < 10 ? 1 : 0)} · {fmtNum(frame.fieldDeg[0], 2)}° × {fmtNum(frame.fieldDeg[1], 2)}°</span>}
    </div>
    <div className="pw-views" role="group" aria-label="Widok kamery">
      {VIEWS.map((v) => <button key={v.id} type="button" className={`button small${view === v.id ? ' active' : ''}`} aria-pressed={view === v.id} title={v.title} onClick={() => show(v.id)}>{v.label}</button>)}
    </div>
    {layers && <>
      <div className="pw-layers" role="group" aria-label="Plany odległości">
        {LAYER_ORDER.map((layer) => <button key={layer} type="button" className={`pw-layer pw-${layer}${only === layer ? ' active' : ''}`} aria-pressed={only === layer} disabled={!layers.counts[layer]}
          title={layer === 'main' ? `Przedział odległości zajmujący największą część kadru: ≈ ${fmtDistance(layers.lo)} – ${fmtDistance(layers.hi)}` : layer === 'near' ? 'Obiekty bliższe niż główny plan: wysunięte przed okno' : 'Obiekty dalsze niż główny plan: wysunięte za okno'}
          onClick={() => setOnly(only === layer ? null : layer)}><i /><span>{LAYER_LABELS[layer]}</span><b>{layers.counts[layer]}</b></button>)}
      </div>
      <DepthStrip cuts={cuts} layers={layers} activeId={activeId} onPick={setActiveId} />
    </>}
    {cuts.length > 6 && <input className="pw-search" type="search" placeholder="Znajdź obiekt…" aria-label="Znajdź obiekt na zdjęciu" value={query} onChange={(e) => setQuery(e.target.value)} />}
    {rows.length > 0 && <WindowList rows={rows} project={project} byId={byId} activeId={activeId} onChoose={setActiveId} onHover={(id) => windowRef.current?.setHover(id)} />}
    {layers && !rows.length && <p className="pw-note">Brak obiektów pasujących do wyszukiwania.</p>}
    {active && layers && <section className="pw-selection" aria-label="Wybrany obiekt">
      <div className="pw-selected">
        <CutPreview project={project} cut={active} />
        <div><strong>{active.id}</strong><span className={`pw-tag pw-${layers.layer.get(active.id)}`}>{LAYER_LABELS[layers.layer.get(active.id) ?? 'main']}</span><span className="figures">≈ {fmtDistance(active.distLy)}</span></div>
      </div>
      <p>{distanceSummary(active)}</p>
      <div className="pw-actions">
        <button type="button" className="button small" onClick={() => windowRef.current?.focus(active.id)}>Przybliż</button>
        <button type="button" className="button small" onClick={() => session.setEditing(true)}>Źródło odległości</button>
      </div>
    </section>}
    {layers && !active && <p className="pw-note">Główny plan zostaje na zdjęciu: rozrzut odległości w gromadzie wynika głównie z prędkości galaktyk, nie z głębi. Wysunięcie planów jest poglądowe; prawdziwe pole to igła od Drogi Mlecznej.</p>}
    {excluded > 0 && <button type="button" className="link-button pw-excluded" onClick={() => session.setEditing(true)}>{excluded} poza 3D · sprawdź wycinki i odległości</button>}
    {!cuts.length && <p className="pw-note">Włącz wycinki z ustaloną odległością w edytorze, aby pokazać zdjęcie w przestrzeni.</p>}
  </aside>
}
