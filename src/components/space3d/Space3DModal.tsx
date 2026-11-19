// Okno „Pozycja 3D” (ładowane leniwie z widoku Niebo): skale Droga Mleczna i Wszechświat lokalny oraz stan
// Obserwatorium, do którego z obu skal prowadzi przejście „Rozłóż zdjęcie 3D” (i z którego wraca). Kopuła Nieba zostaje
// pod spodem bez zmian.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { fmtDistance } from '../../lib/format'
import { distanceDomain, observatoryItems, observatoryPosition, structureViewPose } from '../../lib/observatory'
import type { SpaceScale } from '../../lib/space3d'
import { DIVE_PHASE_MS, type DiveDirection, type Pose } from '../../lib/spaceDive'
import { useSelected } from '../../state/data'
import { useStore } from '../../state/store'
import Observatory from '../observatory/Observatory'
import type { ObservatoryScene } from '../observatory/scene'
import Space3D, { type Space3DHandle } from '../Space3D'
import { SpaceDive, restoreSpace } from './dive'
import { GalaxyPhotoBar, PhotoCutEditor, PhotoFlatView, PhotoImport, PhotoMessages } from './PhotoEditing'
import { usePhotoGuide } from './photoGuide'
import { useCutDistances, useGaiaStars, usePhotoSession, useRegressor, type PhotoSession } from './photoSession'
import { PhotoUnfold } from './PhotoUnfold'
import { useSpaceSettings } from './spaceSettings'
import { SpaceToolbar } from './SpaceToolbar'
import { SpaceWindow } from './SpaceWindow'

const SUBTITLE: Record<SpaceScale, string> = {
  galaxy: 'Droga Mleczna · skala liniowa, 1 j. = 1000 lś',
  universe: 'Wszechświat lokalny · odległości w skali logarytmicznej',
}
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** scale: skala bez Obserwatorium; in/out: nurkowanie do zdjęcia i z powrotem; photo: stan zdjęcia. */
type Mode = 'scale' | DiveDirection | 'photo'

export default function Space3DModal() {
  const session = usePhotoSession()
  return session.restoring ? null : <Space3DWindow session={session} />
}

function Space3DWindow({ session }: { session: PhotoSession }) {
  const setOpen = useStore((s) => s.setSpace3DOpen)
  const close = useCallback(() => setOpen(false), [setOpen])
  const o = useSelected()
  const project = session.project
  const [photoActive, setPhotoActive] = useState(true)
  const [photoProjectId, setPhotoProjectId] = useState(project?.id)
  const projectChanged = photoProjectId !== project?.id
  // Nowo wczytane lub zmienione zdjęcie od razu staje się aktywne w scenie 3D.
  if (projectChanged) {
    setPhotoProjectId(project?.id)
    setPhotoActive(true)
  }
  const active = projectChanged || photoActive
  const activePhoto = active ? project : null
  const { setEditing } = session
  const activatePhoto = useCallback(() => setPhotoActive(true), [])
  const deactivatePhoto = useCallback(() => {
    setPhotoActive(false)
    setEditing(false)
  }, [setEditing])
  const settings = useSpaceSettings(o, project, active)
  useCutDistances(session)
  const inputRef = useRef<HTMLInputElement>(null)
  const [handle, setHandle] = useState<Space3DHandle | null>(null)
  const [mode, setMode] = useState<Mode>('scale')
  // Układ stanu zdjęcia (panele Obserwatorium); w nurkowaniu zmienia się na początku fazy wejścia.
  const [panels, setPanels] = useState(false)
  const diveRef = useRef<SpaceDive | null>(null)
  const entry = useRef<{ scale: SpaceScale; pose: SpaceDive['spacePose'] } | null>(null)
  const obsScene = useRef<ObservatoryScene | null>(null)
  const [stage, setStage] = useState<HTMLDivElement | null>(null)
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const [summary, setSummary] = useState<HTMLDivElement | null>(null)
  const galaxy = settings.scale === 'galaxy'
  const diving = mode === 'in' || mode === 'out'
  // Obserwatorium powstaje przy pierwszym nurkowaniu i zostaje (ukryte, wstrzymane) do zmiany zdjęcia lub skali:
  // ponowne tworzenie i niszczenie kontekstu WebGL dawało białą klatkę na końcu powrotu.
  const [obsAlive, setObsAlive] = useState(false)
  const [obsVisible, setObsVisible] = useState(false)
  const { stars, retry } = useGaiaStars(session, !!activePhoto && (galaxy || session.editing || obsAlive || mode !== 'scale'))
  const regressorJobs = useRegressor(session, stars.status === 'error')
  const regressing = [...regressorJobs.values()].filter((job) => job.status === 'queued' || job.status === 'running').length
  // Scena Obserwatorium zależy tylko od zdjęcia: zmiana zakładki (jedna scena 3D dla obu) jej nie przebudowuje,
  // więc odtworzenie kontekstu WebGL nie wypada w trakcie przelotu zakładek.
  useEffect(() => { setObsAlive(false); setObsVisible(false) }, [project?.id])
  // Dane Obserwatorium: w stanie zdjęcia na bieżąco, poza nim dopiero przy nurkowaniu (edycja wycinków nie przebudowuje
  // ukrytej sceny); gwiazdy Gaia, które przyjdą w trakcie przejścia, trafiają do niego po nim.
  const [obsProject, setObsProject] = useState(project)
  // Edycja wycinków nie przebudowuje ukrytej sceny przy każdym przesunięciu okręgu: dane dochodzą po jej zakończeniu.
  useEffect(() => { if (mode === 'photo' || (mode === 'scale' && !session.editing)) setObsProject(project) }, [project, mode, session.editing])
  // Scena Obserwatorium powstaje z wyprzedzeniem, w bezczynności po pokazaniu zdjęcia: dekodowanie,
  // wysyłka tekstur i kompilacja shaderów nie przypadają na start nurkowania.
  // Dopiero gdy kamera sceny 3D stoi: w bezczynności między klatkami przelotu startowego dekodowanie zdjęcia, wycinki,
  // kontekst WebGL i shadery dawały w nim klatki 50–170 ms.
  useEffect(() => {
    if (!activePhoto || obsAlive || mode !== 'scale' || session.editing || reducedMotion() || !handle) return
    let idle = 0
    const cancel = handle.afterFlight(() => {
      idle = window.requestIdleCallback?.(() => setObsAlive(true), { timeout: 3000 }) ?? window.setTimeout(() => setObsAlive(true), 1000)
    })
    return () => {
      cancel()
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle); else window.clearTimeout(idle)
    }
  }, [activePhoto, obsAlive, mode, session.editing, handle])
  // Edycja wycinków to osobny widok okna: płaskie zdjęcie na scenie, panel edytora z prawej, scena 3D wstrzymana.
  const editing = mode === 'scale' && !!activePhoto && session.editing
  // Stożek pola i znaczniki zdjęcia w obu skalach (we Wszechświecie lokalnym jak w Drodze Mlecznej).
  const guideRef = usePhotoGuide(handle, activePhoto, settings.scale, mode !== 'photo' && !editing,
    session.activeId, session.setActiveId, mode !== 'photo', diving || editing)
  /** Przewodnik nurkowania sceny bieżącej skali. */
  const sceneGuide = useCallback(() => guideRef.current, [guideRef])

  /** Stan końcowy bez animacji: ograniczony ruch, kliknięcie w trakcie przebudowy sceny, zmiana skali. */
  const settle = useCallback((target: 'scale' | 'photo', pose = diveRef.current?.spacePose ?? entry.current?.pose ?? null) => {
    diveRef.current?.cancel()
    diveRef.current = null
    const obs = obsScene.current
    if (target === 'photo' && obs) {
      obs.setProgress(1)
      obs.setFade({ earth: 1, pyramid: 1, axis: 1, photo: 1, grid: 1 })
      obs.setInteractive(true)
      obs.setExternal(false)
      obs.setView('structure', false)
    }
    if (target === 'scale') {
      if (handle) restoreSpace(handle, sceneGuide(), pose)
      // Ukryte Obserwatorium stoi bez własnej pętli do następnego nurkowania (jak po powrocie nurkowaniem).
      obs?.setExternal(true)
    }
    setMode(target)
    setPanels(target === 'photo')
  }, [handle, sceneGuide])

  const startDive = useCallback((direction: DiveDirection) => {
    if (direction === 'in') setObsVisible(false)
    const guide = sceneGuide()
    let spacePose = entry.current?.pose ?? null
    if (direction === 'out' && entry.current?.scale !== settings.scale) {
      const frame = guide?.getFramePose()
      spacePose = frame ? { ...frame, up: [0, 1, 0] } : null
    }
    if (!activePhoto || !handle || !guide || reducedMotion()) {
      // Bez nurkowania: od razu stan zdjęcia (rozłożony, jak dawne Obserwatorium) albo skala.
      if (handle && direction === 'in' && activePhoto) {
        handle.stopIntro()
        const { camera, controls } = handle
        entry.current = {
          scale: settings.scale,
          pose: {
            position: camera.position.toArray() as Pose['position'],
            target: controls.target.toArray() as Pose['target'],
            up: camera.up.toArray() as Pose['up'],
            fov: camera.fov, near: camera.near,
          },
        }
        handle.setExternal(true)
        setObsProject(activePhoto)
        setObsAlive(true)
      }
      settle(direction === 'in' ? 'photo' : 'scale', spacePose)
      return
    }
    setObsProject(activePhoto)
    setObsAlive(true)
    const items = observatoryItems(activePhoto)
    const domain = distanceDomain(items.map((item) => item.distLy))
    const seamProgress = direction === 'out' ? obsScene.current?.getProgress() ?? 1 : 1
    const markerTargets = new Map(items.filter((item) => item.kind === 'object' && item.distLy !== null)
      .map((item) => [item.id, observatoryPosition(item, activePhoto, item.distLy, domain, 0)]))
    const dive = new SpaceDive({
      direction, space: handle, guide,
      observatory: () => obsScene.current,
      seam: structureViewPose(items, activePhoto, domain),
      markerTargets,
      seamProgress,
      imageAspect: activePhoto.height / activePhoto.width,
      spacePose: direction === 'out' ? spacePose ?? undefined : undefined,
      onPhase: (phase, dir) => { if (phase === 'enter') setPanels(dir === 'in') },
      onObservatoryFrame: () => setObsVisible(true),
      onDone: (dir) => { diveRef.current = null; setMode(dir === 'in' ? 'photo' : 'scale') },
    })
    if (direction === 'in') entry.current = { scale: settings.scale, pose: dive.spacePose }
    diveRef.current = dive
    setMode(direction)
  }, [activePhoto, handle, sceneGuide, settings.scale, settle])

  function unfold() {
    session.setEditing(false)
    startDive('in')
  }
  // Przed powrotem ze zdjęcia czekamy na przewodnik wybranej skali. Przy przerwaniu trwającego nurkowania
  // oczekująca zakładka przełącza się po zakończeniu ruchu.
  const [pendingScale, setPendingScale] = useState<SpaceScale | null>(null)
  // Scena 3D montowana po pierwszym malowaniu okna (rAF, potem zadanie po klatce): budowa sceny (punkty, kontekst WebGL,
  // shadery) nie opóźnia pojawienia się okna, a przelot startowy rusza z jej pierwszą klatką.
  const [sceneMounted, setSceneMounted] = useState(false)
  useEffect(() => {
    let timer = 0
    const frame = requestAnimationFrame(() => { timer = window.setTimeout(() => setSceneMounted(true)) })
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer) }
  }, [])
  const { setScale } = settings
  useEffect(() => {
    if (!pendingScale) return
    if (mode === 'photo' && settings.scale === pendingScale) {
      setPendingScale(null)
      startDive('out')
    } else if (mode === 'scale') {
      setPendingScale(null)
      setScale(pendingScale)
    }
  }, [mode, pendingScale, settings.scale, setScale, startDive])
  function chooseScale(scale: SpaceScale) {
    // W stanie zdjęcia kliknięcie skali wraca nurkowaniem; w trakcie wejścia zawraca płynnie (albo anuluje przed startem).
    const action = scaleChoiceAction(mode, settings.scale, scale)
    if (action.type === 'set-scale') { setScale(action.scale); return }
    if (action.type === 'dive-out') {
      if (action.scale === settings.scale) startDive('out')
      else {
        setScale(action.scale)
        setPendingScale(action.scale)
      }
      return
    }
    setPendingScale(action.then)
    if (action.type === 'reverse-or-cancel') {
      if (diveRef.current?.reverse()) { setMode('out'); setPanels(false) }
      else settle('scale')
    }
    // after-return: powrót już trwa, zmiana zakładki czeka na jego koniec.
  }

  useEffect(() => {
    if (!handle) return
    // Przebudowa sceny Space3D w trakcie przejścia przeskakuje do stanu końcowego; w stanie zdjęcia scena stoi.
    if (diveRef.current) settle(mode === 'out' ? 'scale' : 'photo')
    if (mode === 'photo' || mode === 'in') { handle.stopIntro(); handle.setExternal(true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle])
  useEffect(() => () => diveRef.current?.cancel(), [])
  // Pomiar renderowania na żądanie (tylko dev): liczba narysowanych klatek obu scen.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __spaceFrames?: () => { space: number | null; observatory: number | null } }).__spaceFrames = () => ({ space: handle?.renderer.info.render.frame ?? null, observatory: obsScene.current?.frames ?? null })
  }, [handle])
  useEffect(() => { if (!activePhoto && mode !== 'scale') settle('scale') }, [activePhoto, mode, settle])
  useEffect(() => {
    if (!handle || !editing) return
    handle.setExternal(true)
    // Nurkowanie startujące z edycji samo przejmuje klatki sceny.
    return () => { if (!diveRef.current) handle.setExternal(false) }
  }, [handle, editing])

  // Klik w scenę albo klawisz (poza Esc, przyciskami i paskami narzędzi/nagłówka) w trakcie przejścia: od razu stan końcowy.
  useEffect(() => {
    if (!diving) return
    const skip = (e: Event) => {
      if (shouldSkipDive(e as { key?: string; target?: unknown })) diveRef.current?.skip()
    }
    window.addEventListener('click', skip, true)
    window.addEventListener('keydown', skip, true)
    return () => { window.removeEventListener('click', skip, true); window.removeEventListener('keydown', skip, true) }
  }, [diving])

  const showPhoto = panels && !!activePhoto
  const dist = o?.distLy ?? null
  return <SpaceWindow
    label={showPhoto ? 'Obserwatorium 3D zdjęcia' : 'Pozycja 3D'}
    kicker={showPhoto ? 'KONUZASTRO / Obserwatorium 3D' : 'KONUZASTRO / Pozycja 3D'}
    title={activePhoto ? activePhoto.name : o ? `${o.id}${o.namePl ? ` · ${o.namePl}` : ''}` : 'Wybierz obiekt'}
    subtitle={showPhoto ? 'Obiekty zdjęcia wzdłuż linii widzenia' : SUBTITLE[settings.scale]}
    summaryRef={setSummary}
    summary={!showPhoto && !activePhoto && o ? <strong>{dist !== null ? `Odległość ≈ ${fmtDistance(dist)}` : 'Odległość nieznana'}</strong> : null}
    className={`space-window ${panels ? 'is-photo' : 'is-scale'}${diving ? ' is-diving' : ''}${editing ? ' is-editing' : ''}`}
    // Panele wsuwają się i zwijają przez całą fazę wejścia danego kierunku (naprzód dłużej niż wstecz).
    style={diving ? { '--dive-enter': `${DIVE_PHASE_MS[mode].enter}ms` } as CSSProperties : undefined}
    onClose={close}
  >
    <SpaceToolbar o={o} settings={pendingScale ? { ...settings, scale: pendingScale } : settings} onScale={chooseScale} crumb={showPhoto ? activePhoto.name : undefined}
      onConstellationView={handle && mode === 'scale' && !editing ? handle.viewConstellation : undefined}>
      {showPhoto && <div ref={setToolbarSlot} className="space-toolbar-slot" />}
      {regressing > 0 && <div className="photo-regressor-progress">
        <span>Regresor · w toku: {regressing}</span>
        <progress aria-label="Szacowanie odległości przez regresor" />
      </div>}
    </SpaceToolbar>
    <div ref={setStage} className="obs-stage space-stage">
      <div className={`space-scene${mode === 'photo' || editing ? ' is-hidden' : ''}`}>
        {sceneMounted && <Space3D settings={settings} photo={activePhoto} onSelectObject={deactivatePhoto} onHandle={setHandle} />}
      </div>
      {activePhoto && <PhotoUnfold key={activePhoto.id} session={session} scale={settings.scale} visible={mode === 'scale'} guideRef={guideRef} />}
      {mode === 'scale' && <>
        <PhotoImport session={session} inputRef={inputRef} showButton={!activePhoto} onActivate={activatePhoto} />
        <PhotoMessages session={session} />
        {activePhoto && <GalaxyPhotoBar session={session} stars={stars} onUnfold={unfold} onPick={() => inputRef.current?.click()} onRetryStars={retry} />}
        {editing && <PhotoFlatView session={session} />}
      </>}
    </div>
    {editing && <PhotoCutEditor session={session} regressorJobs={regressorJobs} />}
    {(obsAlive || mode !== 'scale') && obsProject && stage && summary && <Observatory project={obsProject} slots={{ stage, toolbar: showPhoto ? toolbarSlot : null, summary: showPhoto ? summary : null }}
      stars={stars} onRetryStars={retry} diving={diving} hidden={mode === 'scale' || (mode === 'in' && !obsVisible)} onScene={(scene) => { obsScene.current = scene }} />}
  </SpaceWindow>
}


/** then: zakładka do przełączenia po przerwanym lub trwającym nurkowaniu. */
export type ScaleChoiceAction =
  | { type: 'dive-out'; scale: SpaceScale }
  | { type: 'reverse-or-cancel'; then: SpaceScale | null }
  | { type: 'after-return'; then: SpaceScale | null }
  | { type: 'set-scale'; scale: SpaceScale }

/** Wybór skali z rozłożonego zdjęcia od razu nadaje cel nurkowaniu powrotnemu. */
export function scaleChoiceAction(mode: Mode, currentScale: SpaceScale, nextScale: SpaceScale): ScaleChoiceAction {
  if (mode === 'scale') return { type: 'set-scale', scale: nextScale }
  if (mode === 'photo') return { type: 'dive-out', scale: nextScale }
  const then = nextScale === currentScale ? null : nextScale
  if (mode === 'in') return { type: 'reverse-or-cancel', then }
  return { type: 'after-return', then }
}

/** Czy klik lub klawisz w trakcie animacji ma przeskoczyć do jej końca (pomija kontrolki UI i Esc). */
export function shouldSkipDive(e: { key?: string; target?: unknown }): boolean {
  if (e.key === 'Escape') return false
  const target = e.target as { closest?: (selector: string) => unknown; parentElement?: { closest?: (selector: string) => unknown } | null } | null | undefined
  const element = target && typeof target.closest === 'function' ? target : target?.parentElement
  if (element && typeof element.closest === 'function' && element.closest('button, a, input, select, textarea, [role="button"], .obs-toolbar, .obs-header')) {
    return false
  }
  return true
}
