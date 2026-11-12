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
import { SpaceDive, restoreSpace, type UniverseDive } from './dive'
import { GalaxyPhotoBar, PhotoCutEditor, PhotoFlatView, PhotoImport, PhotoMessages } from './PhotoEditing'
import { usePhotoGuide, type PhotoGuide } from './photoGuide'
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
  const settings = useSpaceSettings(o, project)
  useCutDistances(session)
  const regressing = useRegressor(session)
  const inputRef = useRef<HTMLInputElement>(null)
  const [handle, setHandle] = useState<Space3DHandle | null>(null)
  const [mode, setMode] = useState<Mode>('scale')
  // Układ stanu zdjęcia (panele Obserwatorium); w nurkowaniu zmienia się na początku fazy wejścia.
  const [panels, setPanels] = useState(false)
  const diveRef = useRef<SpaceDive | null>(null)
  const entryPose = useRef<Pose | null>(null)
  const obsScene = useRef<ObservatoryScene | null>(null)
  const universeRef = useRef<UniverseDive | null>(null)
  /** Linia widzenia i stożek okna zdjęcia we Wszechświecie lokalnym (odpowiednik znaczników Drogi Mlecznej). */
  const universeGuideRef = useRef<PhotoGuide | null>(null)
  const [stage, setStage] = useState<HTMLDivElement | null>(null)
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const [summary, setSummary] = useState<HTMLDivElement | null>(null)
  const galaxy = settings.scale === 'galaxy'
  const diving = mode === 'in' || mode === 'out'
  // Obserwatorium powstaje przy pierwszym nurkowaniu i zostaje (ukryte, wstrzymane) do zmiany zdjęcia lub skali:
  // ponowne tworzenie i niszczenie kontekstu WebGL dawało białą klatkę na końcu powrotu.
  const [obsAlive, setObsAlive] = useState(false)
  const [obsVisible, setObsVisible] = useState(false)
  const { stars, retry } = useGaiaStars(session, galaxy || obsAlive || mode !== 'scale')
  useEffect(() => { setObsAlive(false); setObsVisible(false) }, [project?.id, galaxy])
  // Dane Obserwatorium: w stanie zdjęcia na bieżąco, poza nim dopiero przy nurkowaniu (edycja wycinków nie przebudowuje
  // ukrytej sceny); gwiazdy Gaia, które przyjdą w trakcie przejścia, trafiają do niego po nim.
  const [obsProject, setObsProject] = useState(project)
  // Edycja wycinków nie przebudowuje ukrytej sceny przy każdym przesunięciu okręgu: dane dochodzą po jej zakończeniu.
  useEffect(() => { if (mode === 'photo' || (mode === 'scale' && !session.editing)) setObsProject(project) }, [project, mode, session.editing])
  // Scena Obserwatorium powstaje z wyprzedzeniem, w bezczynności po pokazaniu zdjęcia: dekodowanie,
  // wysyłka tekstur i kompilacja shaderów nie przypadają na start nurkowania.
  useEffect(() => {
    if (!project || obsAlive || mode !== 'scale' || session.editing || reducedMotion()) return
    const idle = window.requestIdleCallback?.(() => setObsAlive(true), { timeout: 3000 }) ?? window.setTimeout(() => setObsAlive(true), 1000)
    return () => { if (window.cancelIdleCallback) window.cancelIdleCallback(idle); else window.clearTimeout(idle) }
  }, [project, obsAlive, mode, session.editing])
  // Edycja wycinków to osobny widok okna: płaskie zdjęcie na scenie, panel edytora z prawej, scena 3D wstrzymana.
  const editing = mode === 'scale' && !!project && session.editing
  const guideRef = usePhotoGuide(handle, project, galaxy && mode !== 'photo' && !editing)
  /** Przewodnik nurkowania sceny bieżącej skali. */
  const sceneGuide = useCallback(() => handle?.scale === 'galaxy' ? guideRef.current : handle?.scale === 'universe' ? universeGuideRef.current : null, [handle, guideRef])

  /** Stan końcowy bez animacji: ograniczony ruch, kliknięcie w trakcie przebudowy sceny, zmiana skali. */
  const settle = useCallback((target: 'scale' | 'photo') => {
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
    if (target === 'scale' && handle) restoreSpace(handle, sceneGuide(), entryPose.current, universeRef.current)
    setMode(target)
    setPanels(target === 'photo')
  }, [handle, sceneGuide])

  function startDive(direction: DiveDirection) {
    if (direction === 'in') setObsVisible(false)
    const guide = sceneGuide()
    const universe = handle?.scale === 'universe' ? universeRef.current : null
    if (!project || !handle || !guide || reducedMotion()) {
      // Bez nurkowania: od razu stan zdjęcia (rozłożony, jak dawne Obserwatorium) albo skala.
      if (handle && direction === 'in') {
        handle.stopIntro()
        entryPose.current = { position: handle.camera.position.toArray() as Pose['position'], target: handle.controls.target.toArray() as Pose['target'], up: handle.camera.up.toArray() as Pose['up'] }
        handle.setExternal(true)
        setObsProject(project)
        setObsAlive(true)
      }
      if (handle && direction === 'out') restoreSpace(handle, guide, entryPose.current, universe)
      settle(direction === 'in' ? 'photo' : 'scale')
      return
    }
    setObsProject(project)
    setObsAlive(true)
    const items = observatoryItems(project)
    const domain = distanceDomain(items.map((item) => item.distLy))
    const seamProgress = direction === 'out' ? obsScene.current?.getProgress() ?? 1 : 1
    const markerTargets = new Map(items.filter((item) => item.kind === 'object' && item.distLy !== null)
      .map((item) => [item.id, observatoryPosition(item, project, item.distLy, domain, 0)]))
    const dive = new SpaceDive({
      direction, space: handle, guide, universe,
      observatory: () => obsScene.current,
      seam: structureViewPose(items, project, domain),
      markerTargets,
      seamProgress,
      imageAspect: project.height / project.width,
      spacePose: direction === 'out' ? entryPose.current ?? undefined : undefined,
      onPhase: (phase) => { if (phase === 'enter') setPanels(direction === 'in') },
      onObservatoryFrame: () => setObsVisible(true),
      onDone: () => { diveRef.current = null; setMode(direction === 'in' ? 'photo' : 'scale') },
    })
    if (direction === 'in') entryPose.current = dive.spacePose
    diveRef.current = dive
    setMode(direction)
  }

  function unfold() {
    session.setEditing(false)
    startDive('in')
  }
  function chooseScale(scale: SpaceScale) {
    // Bieżąca skala w stanie zdjęcia wraca nurkowaniem; w trakcie przejścia nic nie zmienia.
    if (scale === settings.scale && mode !== 'scale') {
      if (mode === 'photo') startDive('out')
      return
    }
    if (diving || mode === 'photo') settle('scale')
    settings.setScale(scale)
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
  useEffect(() => { if (!project && mode !== 'scale') settle('scale') }, [project, mode, settle])
  useEffect(() => {
    if (!handle || !editing) return
    handle.setExternal(true)
    // Nurkowanie startujące z edycji samo przejmuje klatki sceny.
    return () => { if (!diveRef.current) handle.setExternal(false) }
  }, [handle, editing])

  // Klik albo klawisz (poza Esc, który zamyka okno) w trakcie przejścia: od razu stan końcowy.
  useEffect(() => {
    if (!diving) return
    const skip = (e: Event) => { if (!(e instanceof KeyboardEvent && e.key === 'Escape')) diveRef.current?.skip() }
    window.addEventListener('pointerdown', skip, true)
    window.addEventListener('keydown', skip, true)
    return () => { window.removeEventListener('pointerdown', skip, true); window.removeEventListener('keydown', skip, true) }
  }, [diving])

  const showPhoto = panels && !!project
  const dist = o?.distLy ?? null
  return <SpaceWindow
    label={showPhoto ? 'Obserwatorium 3D zdjęcia' : 'Pozycja 3D'}
    kicker={showPhoto ? 'KONUZASTRO / Obserwatorium 3D' : 'KONUZASTRO / Pozycja 3D'}
    title={project && (showPhoto || !galaxy) ? project.name : o ? `${o.id}${o.namePl ? ` · ${o.namePl}` : ''}` : 'Wybierz obiekt'}
    subtitle={showPhoto ? 'Obiekty zdjęcia wzdłuż linii widzenia' : SUBTITLE[settings.scale]}
    summaryRef={setSummary}
    summary={!showPhoto && o && !(project && !galaxy) ? <strong>{dist !== null ? `Odległość ≈ ${fmtDistance(dist)}` : 'Odległość nieznana'}</strong> : null}
    className={`space-window ${panels ? 'is-photo' : 'is-scale'}${diving ? ' is-diving' : ''}${editing ? ' is-editing' : ''}`}
    // Panele wsuwają się i zwijają przez całą fazę wejścia danego kierunku (naprzód dłużej niż wstecz).
    style={diving ? { '--dive-enter': `${DIVE_PHASE_MS[mode].enter}ms` } as CSSProperties : undefined}
    onClose={close}
  >
    <SpaceToolbar o={o} settings={settings} onScale={chooseScale} crumb={showPhoto ? project.name : undefined}>
      {showPhoto && <div ref={setToolbarSlot} className="space-toolbar-slot" />}
    </SpaceToolbar>
    <div ref={setStage} className="obs-stage space-stage">
      <div className={`space-scene${mode === 'photo' || editing ? ' is-hidden' : ''}`}>
        <Space3D settings={settings} photo={project} onHandle={setHandle} />
      </div>
      {project && !galaxy && <PhotoUnfold key={project.id} session={session} handle={handle} visible={mode !== 'photo' && !editing} panel={mode === 'scale'} diveRef={universeRef} guideRef={universeGuideRef} />}
      {mode === 'scale' && <>
        <PhotoImport session={session} inputRef={inputRef} showButton={!project} />
        <PhotoMessages session={session} />
        {project && <GalaxyPhotoBar session={session} stars={stars} regressing={regressing.length} onUnfold={unfold} onPick={() => inputRef.current?.click()} onRetryStars={retry} />}
        {editing && <PhotoFlatView session={session} />}
      </>}
    </div>
    {editing && <PhotoCutEditor session={session} regressing={regressing} />}
    {(obsAlive || mode !== 'scale') && obsProject && stage && summary && <Observatory project={obsProject} slots={{ stage, toolbar: showPhoto ? toolbarSlot : null, summary: showPhoto ? summary : null }}
      stars={stars} onRetryStars={retry} diving={diving} hidden={mode === 'scale' || (mode === 'in' && !obsVisible)} onScene={(scene) => { obsScene.current = scene }} />}
  </SpaceWindow>
}
