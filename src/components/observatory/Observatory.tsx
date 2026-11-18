// Obserwatorium 3D zdjęcia: gwiazdy Gaia i wycinki katalogowe wzdłuż linii widzenia. Treść stanu zdjęcia okna
// „Pozycja 3D”: scena i podpisy trafiają do wspólnej sceny okna, przełączniki do jego paska, panele do siatki okna.
// Układ i interakcje wzorowane na SyQon Studio („3D distances”), kolory i krój z tokenów aplikacji.
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SCOPE_LABELS, adsUrl, hasDistance } from '../../lib/distance'
import { fmtDistance, fmtNum } from '../../lib/format'
import { CATEGORY_LABELS, PHOTO_UNFOLD_MS, byDistance, categoryCounts, distanceDomain, distanceHistogram, fieldOfView, matchesFilter, observatoryItems, type CategoryFilter, type ObservatoryItem } from '../../lib/observatory'
import { photoCropSquare, type PhotoProject } from '../../lib/photo'
import { useStore } from '../../state/store'
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
  /** Skala Drogi Mlecznej między nurkowaniami: scena czeka ukryta i wstrzymana (bez klatek i bez nowego kontekstu). */
  hidden: boolean
  onScene?(scene: ObservatoryScene | null): void
}

const VIEWS: { id: ObservatoryView; label: string }[] = [
  { id: 'structure', label: 'Struktura' }, { id: 'earth', label: 'Z Ziemi' }, { id: 'top', label: 'Z góry' }, { id: 'side', label: 'Z boku' },
]
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Najdłuższy bok tekstury płaszczyzny zdjęcia w scenie. */
const PLANE_TEXTURE_PX = 2048

function thumbnail(image: HTMLImageElement, item: ObservatoryItem): string {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 96
  const radius = item.kind === 'star' ? Math.max(24, image.naturalWidth * 0.012) : item.radius
  const { x, y, side } = photoCropSquare({ x: item.x, y: item.y, radius }, image.naturalWidth, image.naturalHeight)
  canvas.getContext('2d')!.drawImage(image, x, y, side, side, 0, 0, 96, 96)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export default function Observatory({ project, slots, stars, onRetryStars, diving, hidden, onScene }: Props) {
  const colors = useStore((s) => s.annotationColors)
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ObservatoryScene | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  // Płaszczyzna zdjęcia: pomniejszona bitmapa przygotowana poza głównym wątkiem (wysyłka pełnych kilku megapikseli
  // na GPU trwała ponad 100 ms w jednej klatce).
  const [plane, setPlane] = useState<ImageBitmap | null>(null)
  const [progress, setProgress] = useState(1)
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
  const withDistance = visibleItems
  const active = items.find((item) => item.id === selected) ?? null
  const fov = fieldOfView(project.astrometry.wcs, project.width, project.height)
  const thumb = useMemo(() => image && active ? thumbnail(image, active) : null, [image, active])

  useEffect(() => {
    // Dekodowanie poza głównym wątkiem: inaczej robi je pierwsze rysowanie wycinków (klatka setek ms).
    let live = true
    const img = new Image()
    img.src = project.image
    img.decode().catch(() => {}).then(async () => {
      const scale = Math.min(1, PLANE_TEXTURE_PX / Math.max(img.naturalWidth, img.naturalHeight))
      // Z obiektu Blob dekodowanie i zmniejszenie idą poza głównym wątkiem (z elementu <img> nie).
      const blob = await fetch(project.image).then((r) => r.blob()).catch(() => null)
      const bitmap = await createImageBitmap(blob ?? img, { resizeWidth: Math.max(1, Math.round(img.naturalWidth * scale)), resizeHeight: Math.max(1, Math.round(img.naturalHeight * scale)), resizeQuality: 'high', imageOrientation: 'flipY' }).catch(() => null)
      if (!live) { bitmap?.close(); return }
      setPlane(bitmap)
      setImage(img)
    })
    return () => { live = false }
  }, [project.image])
  // Poprzednia bitmapa płaszczyzny (ok. 16 MB) zwalniana jawnie przy zmianie zdjęcia i odmontowaniu (C19).
  useEffect(() => () => plane?.close(), [plane])

  // Scena powstaje po wczytaniu obrazu i odtwarza się, gdy zmieni się zestaw obiektów (np. po pobraniu gwiazd).
  const idleRef = useRef(diving || hidden)
  idleRef.current = diving || hidden
  const onSceneRef = useRef(onScene)
  onSceneRef.current = onScene
  // Jedna scena (i jeden kontekst WebGL) na czas życia komponentu: nowe dane podmieniają zawartość.
  // Sprzątanie w fazie układu, póki DOM jest podłączony: OrbitControls szuka document przez getRootNode() (audyt C01).
  useLayoutEffect(() => () => {
    onSceneRef.current?.(null)
    sceneRef.current?.dispose()
    sceneRef.current = null
  }, [])
  useEffect(() => {
    if (!image || !hostRef.current) return
    sceneRef.current ??= new ObservatoryScene(hostRef.current, { reducedMotion: reducedMotion(), onSelect: setSelected, external: idleRef.current })
    sceneRef.current.setData(image, { width: project.width, height: project.height }, items, domain, plane, colors)
    onSceneRef.current?.(sceneRef.current)
  }, [image, plane, items, domain, project.width, project.height, colors])

  useEffect(() => { sceneRef.current?.setProgress(progress) }, [progress, image, items])
  useEffect(() => { sceneRef.current?.setVisible(new Set(visibleItems.map((item) => item.id))) }, [visibleItems, image, colors])
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
      setProgress((p) => Math.min(1, p + dt / PHOTO_UNFOLD_MS))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])
  useEffect(() => { if (progress >= 1) setPlaying(false) }, [progress])
  // W nurkowaniu pozycje prowadzi sterownik przejścia. Po wejściu suwak przejmuje końcowy stan sceny.
  useEffect(() => {
    if (diving || hidden) {
      setPlaying(false)
      // Postęp prowadzi sterownik nurkowania: stan zgodny ze sceną, żeby efekt postępu niczego nie przestawił.
      viewRef.current = 'structure'
      setView('structure')
    } else setProgress(sceneRef.current?.getProgress() ?? 1)
  }, [diving, hidden])

  function unfold() {
    if (reducedMotion()) { setProgress(1); return }
    if (progress >= 1) setProgress(0)
    setPlaying((p) => !p)
  }
  const span = withDistance.length ? [Math.min(...withDistance.map((i) => i.distLy!)), Math.max(...withDistance.map((i) => i.distLy!))] : null
  // Pominięte: włączone wycinki i gwiazdy bez ustalonej odległości (nie ma ich w scenie ani na liście).
  const skipped = project.cuts.filter((cut) => cut.enabled && !hasDistance(cut)).length + (project.stars?.stars.filter((star) => star.distLy === null).length ?? 0)

  return <>
    {slots.summary && createPortal(<>
      {span ? <><strong>Obiekty w 3D: {withDistance.length}</strong><span>{fmtDistance(span[0])} — {fmtDistance(span[1])}</span></> : <strong>Brak obiektów z odległością w tej grupie</strong>}
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
    {createPortal(<div className={`obs-layer${hidden ? ' is-hidden' : ''}`}>
      <div ref={hostRef} className="obs-canvas" />
      <div className="obs-stage-title">
        <strong>{progress < 0.02 ? 'Zdjęcie na niebie' : 'Wewnątrz kadru'}</strong>
        <span className="faint">{progress < 0.02 ? 'Widok przejściowy · dokładne położenia przy 100%' : 'Perspektywa · oś odległości logarytmiczna, dekady na osi'}</span>
      </div>
      {view === 'earth' && fov && <div className="obs-fov figures">Pole {fmtNum(fov.widthDeg, 2)}° × {fmtNum(fov.heightDeg, 2)}° ≈ {fmtNum(fov.moons, 1)} tarczy Księżyca</div>}
      {!withDistance.length && <div className="obs-empty" role="status">Brak obiektów z odległością w tym przedziale lub grupie.<br />Poszerz zakres albo wybierz inną grupę obiektów.</div>}
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
            <span className="dim">{active ? `${itemKind(active)} · ${active.kind === 'star' ? 'Gaia DR3' : `zakres: ${SCOPE_LABELS[active.scope]}`}` : 'Kliknij w scenie lub na liście'}</span>
          </div>
        </div>
        <span className="label">Odległość od Ziemi</span>
        <div className="obs-distance figures">{active ? fmtDistance(active.distLy) : '—'}</div>
        {active && <>
          <div className="dim figures">RA {fmtNum(active.raDeg, 5)}° · Dec {fmtNum(active.decDeg, 5)}°<br />{active.kind === 'star' ? 'równikowe ICRS · epoka 2025,0' : 'równikowe J2000'}</div>
          {active.distLy !== null && active.distLoLy !== null && active.distHiLy !== null && <div className="dim figures">Niepewność głębi −{fmtDistance(active.distLy - active.distLoLy)} / +{fmtDistance(active.distHiLy - active.distLy)}</div>}
          <button type="button" className="button small" onClick={() => sceneRef.current?.flyTo(active.id)}>Leć do zaznaczenia</button>
          <details>
            <summary>Źródło i niepewność</summary>
            <p>{[active.method, active.source].filter(Boolean).join(' · ')}{active.ref && <> · <a href={adsUrl(active.ref)} target="_blank" rel="noreferrer">ADS ↗</a></>}</p>
            {active.kind === 'star' && <p className="figures">G = {fmtNum(active.gMag ?? 0, 2)}{active.bpRp !== null && ` · BP−RP = ${fmtNum(active.bpRp, 2)}`}{active.parallaxOverError !== null && ` · ϖ/σ = ${fmtNum(active.parallaxOverError, 1)}`}<br />Odległość podajemy przy ϖ/σ ≥ 5; przedział to 16. i 84. percentyl.</p>}
          </details>
        </>}
      </section>
      <input className="control" type="search" placeholder="Znajdź obiekt…" aria-label="Znajdź obiekt" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ObjectList key={project.id} items={listed} revealStars={category === 'stars' || !!query.trim()} selected={selected} onSelect={setSelected} descending={descending} onSort={() => setDescending((d) => !d)} />
      <div className="faint figures">W 3D: {withDistance.length}{skipped > 0 && ` · pominięte bez odległości: ${skipped}`}</div>
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
        <span className="faint">Gwiazdy: ESA/Gaia/DPAC (DR3, CC BY-NC 3.0 IGO), odległości Bailer-Jones i in. 2021 (CC BY 4.0) przy ϖ/σ ≥ 5 · pokazujemy tylko obiekty z ustaloną odległością</span>
      </div>
    </div>
  </>
}
