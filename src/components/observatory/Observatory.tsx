// Obserwatorium 3D zdjęcia: gwiazdy Gaia i wycinki katalogowe wzdłuż linii widzenia. Treść stanu zdjęcia okna
// „Pozycja 3D”: scena i podpisy trafiają do wspólnej sceny okna, przełączniki do jego paska, panele do siatki okna.
// Układ i interakcje wzorowane na SyQon Studio („3D distances”), kolory i krój z tokenów aplikacji.
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fmtDistance, fmtNum } from '../../lib/format'
import { CATEGORY_LABELS, byDistance, categoryCounts, distanceDomain, distanceHistogram, fieldOfView, matchesFilter, observatoryItems, type CategoryFilter, type ObservatoryItem } from '../../lib/observatory'
import type { PhotoProject } from '../../lib/photo'
import { Range } from '../Range'
import type { StarsStatus } from '../space3d/photoSession'
import { DistanceHistogram } from './DistanceHistogram'
import { ObjectList, itemKind } from './ObjectList'
import { ObservatoryScene, type ObservatoryView } from './scene'

/** Miejsca w oknie „Pozycja 3D”: scena (pod nią płótno Drogi Mlecznej), pasek narzędzi i podsumowanie w nagłówku.
 *  Pasek dostaje przełączniki dopiero w stanie zdjęcia (w nurkowaniu go nie ma). */
export interface ObservatorySlots { stage: HTMLElement; toolbar: HTMLElement | null; summary: HTMLElement | null }

interface Props {
  project: PhotoProject
  slots: ObservatorySlots
  stars: StarsStatus
  onRetryStars(): void
  /** Nurkowanie w toku: scena bez własnej pętli i bez samoczynnego rozkładania (rusza po wejściu). */
  diving: boolean
  onScene?(scene: ObservatoryScene | null): void
}

const VIEWS: { id: ObservatoryView; label: string }[] = [
  { id: 'structure', label: 'Struktura' }, { id: 'earth', label: 'Z Ziemi' }, { id: 'top', label: 'Z góry' }, { id: 'side', label: 'Z boku' },
]
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function thumbnail(image: HTMLImageElement, item: ObservatoryItem): string {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 96
  const r = item.kind === 'star' ? Math.max(24, image.naturalWidth * 0.012) : item.radius
  canvas.getContext('2d')!.drawImage(image, item.x - r, item.y - r, r * 2, r * 2, 0, 0, 96, 96)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export default function Observatory({ project, slots, stars, onRetryStars, diving, onScene }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ObservatoryScene | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [progress, setProgress] = useState(() => reducedMotion() ? 1 : 0)
  const [playing, setPlaying] = useState(false)
  const [view, setView] = useState<ObservatoryView>('structure')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [range, setRange] = useState<[number, number] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [descending, setDescending] = useState(false)

  const items = useMemo(() => observatoryItems(project), [project])
  const domain = useMemo(() => distanceDomain(items.map((item) => item.distLy)), [items])
  const visibleItems = useMemo(() => items.filter((item) => matchesFilter(item, { category, range })), [items, category, range])
  const inCategory = useMemo(() => items.filter((item) => matchesFilter(item, { category, range: null })), [items, category])
  const histogram = useMemo(() => distanceHistogram(inCategory.map((item) => item.distLy), domain), [inCategory, domain])
  const counts = useMemo(() => categoryCounts(items), [items])
  const listed = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = visibleItems.filter((item) => !q || item.id.toLowerCase().includes(q)).sort(byDistance)
    return descending ? list.reverse() : list
  }, [visibleItems, query, descending])
  const withDistance = visibleItems.filter((item) => item.distLy !== null)
  const active = items.find((item) => item.id === selected) ?? null
  const fov = fieldOfView(project.astrometry.wcs, project.width, project.height)
  const thumb = useMemo(() => image && active ? thumbnail(image, active) : null, [image, active])

  useEffect(() => {
    const img = new Image()
    img.onload = () => setImage(img)
    img.src = project.image
  }, [project.image])

  // Scena powstaje po wczytaniu obrazu i odtwarza się, gdy zmieni się zestaw obiektów (np. po pobraniu gwiazd).
  const divingRef = useRef(diving)
  divingRef.current = diving
  const onSceneRef = useRef(onScene)
  onSceneRef.current = onScene
  useEffect(() => {
    if (!image || !hostRef.current) return
    const scene = new ObservatoryScene(hostRef.current, { reducedMotion: reducedMotion(), onSelect: setSelected, external: divingRef.current })
    scene.setData(image, { width: project.width, height: project.height }, items, domain)
    sceneRef.current = scene
    onSceneRef.current?.(scene)
    return () => { onSceneRef.current?.(null); scene.dispose(); sceneRef.current = null }
  }, [image, items, domain, project.width, project.height])

  useEffect(() => { sceneRef.current?.setProgress(progress) }, [progress, image, items])
  useEffect(() => { sceneRef.current?.setVisible(new Set(visibleItems.map((item) => item.id))) }, [visibleItems, image])
  useEffect(() => { sceneRef.current?.setSelected(selected) }, [selected, image, items])
  // Widok ustawiamy po zbudowaniu sceny bez animacji, przy zmianie zakładki z przelotem.
  const viewRef = useRef(view)
  useEffect(() => { sceneRef.current?.setView(viewRef.current, false) }, [image, items])
  useEffect(() => { if (viewRef.current !== view) { viewRef.current = view; sceneRef.current?.setView(view) } }, [view])

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
  // Po wejściu rozkładanie rusza samo, gdy obraz jest wczytany i scena już stoi (przy ograniczonym ruchu od razu 100%).
  // W nurkowaniu stoi: powrót zwija postęp do zera, a wejście kończy się na płaskim zdjęciu.
  useEffect(() => {
    if (diving) setPlaying(false)
    else if (image && !reducedMotion()) setPlaying(true)
  }, [image, diving])

  function unfold() {
    if (reducedMotion()) { setProgress(1); return }
    if (progress >= 1) setProgress(0)
    setPlaying((p) => !p)
  }
  const span = withDistance.length ? [Math.min(...withDistance.map((i) => i.distLy!)), Math.max(...withDistance.map((i) => i.distLy!))] : null
  const unknown = visibleItems.length - withDistance.length

  return <>
    {slots.summary && createPortal(<>
      {span ? <><strong>Obiekty w 3D: {withDistance.length}</strong><span>{fmtDistance(span[0])} — {fmtDistance(span[1])}</span></> : <strong>Brak odległości w tej grupie</strong>}
      {stars.status === 'loading' && <span className="accent">Pobieranie gwiazd Gaia DR3…</span>}
    </>, slots.summary)}
    {slots.toolbar && createPortal(<>
      <select className="control" aria-label="Grupa obiektów" value={category} onChange={(e) => setCategory(e.target.value as CategoryFilter)}>
        {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]} ({counts[c]})</option>)}
      </select>
      <div className="obs-tabs" role="tablist" aria-label="Widok kamery">
        {VIEWS.map((v) => <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={`toggle-chip${view === v.id ? ' on' : ''}`} title={view === v.id ? 'Kliknij ponownie, aby dopasować widok' : undefined} onClick={() => { if (view === v.id) sceneRef.current?.setView(v.id); else setView(v.id) }}>{v.label}</button>)}
      </div>
    </>, slots.toolbar)}
    {createPortal(<div className="obs-layer">
      <div ref={hostRef} className="obs-canvas" />
      <div className="obs-stage-title">
        <strong>{progress < 0.02 ? 'Zdjęcie na niebie' : 'Wewnątrz kadru'}</strong>
        <span className="faint">{progress < 0.02 ? 'Widok przejściowy · dokładne położenia przy 100%' : 'Perspektywa · oś odległości logarytmiczna, dekady na osi'}</span>
      </div>
      {view === 'earth' && fov && <div className="obs-fov figures">Pole {fmtNum(fov.widthDeg, 2)}° × {fmtNum(fov.heightDeg, 2)}° ≈ {fmtNum(fov.moons, 1)} tarczy Księżyca</div>}
      {!withDistance.length && <div className="obs-empty" role="status">Brak odległości w tym przedziale lub grupie.<br />Poszerz zakres albo wybierz inną grupę obiektów.</div>}
      {stars.status === 'error' && <div className="obs-error photo-error" role="alert">{stars.message}<button type="button" className="button small" onClick={onRetryStars}>Ponów</button></div>}
      <div className="obs-reference">
        <span className="label">Zdjęcie źródłowe</span>
        <div><img src={project.image} alt="" decoding="async" />{active && <span className="obs-crosshair" style={{ left: `${active.x / project.width * 100}%`, top: `${active.y / project.height * 100}%` }} />}</div>
      </div>
      <div className="obs-hint faint">Przeciągnij: obrót · prawy przycisk: przesunięcie · kółko: przybliżenie · WASD: ruch</div>
    </div>, slots.stage)}
    <aside className="obs-aside">
      <section className="obs-inspector" aria-live="polite">
        <span className="label">Inspektor obiektu</span>
        <div className="obs-inspector-head">
          {thumb ? <img src={thumb} alt="" /> : <span className="obs-thumb-empty" />}
          <div>
            <strong>{active ? active.id : 'Wybierz obiekt'}</strong>
            <span className="dim">{active ? `${itemKind(active)} · ${active.kind === 'star' ? 'Gaia DR3' : active.distLy ? 'pomiar z katalogu' : 'bez pomiaru'}` : 'Kliknij w scenie lub na liście'}</span>
          </div>
        </div>
        <span className="label">Odległość od Ziemi</span>
        <div className="obs-distance figures">{active ? active.distLy ? fmtDistance(active.distLy) : 'brak wiarygodnej odległości' : '—'}</div>
        {active && <>
          <div className="dim figures">RA {fmtNum(active.raDeg, 5)}° · Dec {fmtNum(active.decDeg, 5)}°<br />{active.kind === 'star' ? 'równikowe ICRS · epoka 2025,0' : 'równikowe J2000'}</div>
          {active.distLy !== null && active.distLoLy !== null && active.distHiLy !== null && <div className="dim figures">Niepewność głębi −{fmtDistance(active.distLy - active.distLoLy)} / +{fmtDistance(active.distHiLy - active.distLy)}</div>}
          <button type="button" className="button small" onClick={() => sceneRef.current?.flyTo(active.id)}>Leć do zaznaczenia</button>
          <details>
            <summary>Źródło i niepewność</summary>
            <p>{active.source || 'Brak źródła odległości.'}</p>
            {active.kind === 'star' && <p className="figures">G = {fmtNum(active.gMag ?? 0, 2)}{active.bpRp !== null && ` · BP−RP = ${fmtNum(active.bpRp, 2)}`}{active.parallaxOverError !== null && ` · ϖ/σ = ${fmtNum(active.parallaxOverError, 1)}`}<br />Odległość podajemy przy ϖ/σ ≥ 5; przedział to 16. i 84. percentyl.</p>}
          </details>
        </>}
      </section>
      <input className="control" type="search" placeholder="Znajdź obiekt…" aria-label="Znajdź obiekt" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ObjectList items={listed} selected={selected} onSelect={setSelected} descending={descending} onSort={() => setDescending((d) => !d)} />
      <div className="faint figures">Z odległością: {withDistance.length} · bez odległości: {unknown}</div>
    </aside>
    <DistanceHistogram histogram={histogram} domain={domain} range={range} onRange={setRange} marker={active?.distLy ?? null} />
    <div className="obs-bottom">
      <div className="obs-timeline">
        <button type="button" className="button small icon-button" aria-label={playing ? 'Wstrzymaj rozkładanie' : 'Rozłóż zdjęcie'} title={playing ? 'Wstrzymaj rozkładanie' : 'Rozłóż zdjęcie'} onClick={unfold}>{playing ? <Pause size={14} /> : <Play size={14} />}</button>
        <button type="button" className={`button small icon-button${progress === 0 ? ' active' : ''}`} aria-pressed={progress === 0} aria-label="Początek: płaskie zdjęcie (0%)" title="Początek: płaskie zdjęcie (0%)" onClick={() => { setPlaying(false); setProgress(0) }}><SkipBack size={14} /></button>
        <button type="button" className={`button small icon-button${progress === 1 ? ' active' : ''}`} aria-pressed={progress === 1} aria-label="Koniec: pełna głębia z odległości (100%)" title="Koniec: pełna głębia z odległości (100%)" onClick={() => { setPlaying(false); setProgress(1) }}><SkipForward size={14} /></button>
        <Range aria-label="Rozłożenie zdjęcia w głąb" min={0} max={1} step={0.001} value={progress} onChange={(e) => { setPlaying(false); setProgress(Number(e.target.value)) }} />
        <span className="figures obs-percent">{Math.round(progress * 100)}%</span>
      </div>
      <div className="obs-legend">
        <span><span className="obs-marker stars" />Gwiazdy</span>
        <span><span className="obs-marker galaxies" />Galaktyki</span>
        <span><span className="obs-marker nebulae" />Mgławice i gromady</span>
        <span className="obs-spacer" />
        <span className="faint">Gwiazdy: ESA/Gaia/DPAC (DR3, CC BY-NC 3.0 IGO), odległości Bailer-Jones i in. 2021 (CC BY 4.0) przy ϖ/σ ≥ 5 · obiekty bez odległości zostają na zdjęciu</span>
      </div>
    </div>
  </>
}
