// Okno „Pozycja 3D” (ładowane leniwie z widoku Niebo): skale Droga Mleczna i Wszechświat lokalny, a dla zdjęcia
// w Drodze Mlecznej stan Obserwatorium, do którego prowadzi nurkowanie (i z którego wraca). Kopuła Nieba zostaje
// pod spodem bez zmian.
import { useCallback, useEffect, useRef, useState } from 'react'
import { fmtDistance } from '../../lib/format'
import { distanceDomain, observatoryItems, structureViewPose } from '../../lib/observatory'
import { photoStageHeight, type PhotoSceneFrame } from '../../lib/photo'
import type { SpaceScale } from '../../lib/space3d'
import type { DiveDirection, Pose } from '../../lib/spaceDive'
import { useSelected } from '../../state/data'
import { useStore } from '../../state/store'
import Observatory from '../observatory/Observatory'
import type { ObservatoryScene } from '../observatory/scene'
import Space3D, { type Space3DHandle } from '../Space3D'
import { SpaceDive, restoreSpace } from './dive'
import { GalaxyPhotoBar, PhotoCutEditor, PhotoFlatView, PhotoImport, PhotoMessages } from './PhotoEditing'
import { usePhotoGuide } from './photoGuide'
import { useGaiaStars, usePhotoSession } from './photoSession'
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
  const setOpen = useStore((s) => s.setSpace3DOpen)
  const close = useCallback(() => setOpen(false), [setOpen])
  const o = useSelected()
  const session = usePhotoSession()
  const project = session.project
  const settings = useSpaceSettings(o, project)
  const { stars, retry } = useGaiaStars(session, settings.scale === 'galaxy')
  const frameRef = useRef<((frame: PhotoSceneFrame) => void) | null>(null)
  const fitRef = useRef<(() => void) | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [handle, setHandle] = useState<Space3DHandle | null>(null)
  const [mode, setMode] = useState<Mode>('scale')
  // Układ stanu zdjęcia (panele Obserwatorium); w nurkowaniu zmienia się na początku fazy wejścia.
  const [panels, setPanels] = useState(false)
  const diveRef = useRef<SpaceDive | null>(null)
  const entryPose = useRef<Pose | null>(null)
  const obsScene = useRef<ObservatoryScene | null>(null)
  const pendingDive = useRef(false)
  const [stage, setStage] = useState<HTMLDivElement | null>(null)
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const [summary, setSummary] = useState<HTMLDivElement | null>(null)
  const galaxy = settings.scale === 'galaxy'
  const diving = mode === 'in' || mode === 'out'
  // Gwiazdy Gaia, które przyjdą w trakcie przejścia, trafiają do Obserwatorium dopiero po nim.
  const [obsProject, setObsProject] = useState(project)
  useEffect(() => { if (!diving) setObsProject(project) }, [project, diving])
  const guideRef = usePhotoGuide(handle, project, galaxy && mode !== 'photo' && !session.editing)

  /** Stan końcowy bez animacji: ograniczony ruch, kliknięcie w trakcie przebudowy sceny, zmiana skali. */
  const settle = useCallback((target: 'scale' | 'photo') => {
    diveRef.current?.cancel()
    diveRef.current = null
    const obs = obsScene.current
    if (target === 'photo' && obs) {
      obs.setFade({ earth: 1, pyramid: 1, axis: 1, photo: 1, grid: 1 })
      obs.setInteractive(true)
      obs.setExternal(false)
      obs.setView('structure', false)
    }
    setMode(target)
    setPanels(target === 'photo')
  }, [])

  function startDive(direction: DiveDirection) {
    const guide = guideRef.current
    if (!project || !handle || handle.scale !== 'galaxy' || !guide || reducedMotion()) {
      // Bez nurkowania: od razu stan zdjęcia (rozłożony, jak dawne Obserwatorium) albo skala.
      if (handle && direction === 'in') { handle.stopIntro(); handle.setExternal(true) }
      if (handle && direction === 'out') restoreSpace(handle, guide, entryPose.current)
      settle(direction === 'in' ? 'photo' : 'scale')
      return
    }
    const items = observatoryItems(project)
    const dive = new SpaceDive({
      direction, space: handle, guide,
      observatory: () => obsScene.current,
      seam: structureViewPose(items, project, distanceDomain(items.map((item) => item.distLy))),
      imageAspect: project.height / project.width,
      spacePose: direction === 'out' ? entryPose.current ?? undefined : undefined,
      progress: direction === 'out' ? obsScene.current?.getProgress() ?? 0 : 0,
      onPhase: (phase) => { if (phase === 'enter') setPanels(direction === 'in') },
      onDone: () => { diveRef.current = null; setMode(direction === 'in' ? 'photo' : 'scale') },
    })
    if (direction === 'in') entryPose.current = dive.spacePose
    diveRef.current = dive
    setMode(direction)
  }

  function unfold() {
    session.setEditing(false)
    if (galaxy) startDive('in')
    else {
      // Z Wszechświata lokalnego: najpierw skala Drogi Mlecznej (bez animacji), po przebudowie sceny nurkowanie.
      pendingDive.current = true
      settings.setScale('galaxy')
    }
  }
  function chooseScale(scale: SpaceScale) {
    // „Droga Mleczna” w stanie zdjęcia wraca nurkowaniem; w trakcie przejścia nic nie zmienia.
    if (scale === 'galaxy' && mode !== 'scale') {
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
    if (pendingDive.current && handle.scale === 'galaxy') {
      pendingDive.current = false
      startDive('in')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle])
  useEffect(() => () => diveRef.current?.cancel(), [])
  // Pomiar renderowania na żądanie (tylko dev): liczba narysowanych klatek obu scen.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __spaceFrames?: () => { space: number | null; observatory: number | null } }).__spaceFrames = () => ({ space: handle?.renderer.info.render.frame ?? null, observatory: obsScene.current?.frames ?? null })
  }, [handle])
  useEffect(() => { if (!project && mode !== 'scale') settle('scale') }, [project, mode, settle])

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
    title={showPhoto ? project.name : o ? `${o.id}${o.namePl ? ` · ${o.namePl}` : ''}` : 'Wybierz obiekt'}
    subtitle={showPhoto ? 'Obiekty zdjęcia wzdłuż linii widzenia' : SUBTITLE[settings.scale]}
    summaryRef={setSummary}
    summary={!showPhoto && o ? <strong>{dist !== null ? `Odległość ≈ ${fmtDistance(dist)}` : 'Odległość nieznana'}</strong> : null}
    className={`space-window ${panels ? 'is-photo' : 'is-scale'}${diving ? ' is-diving' : ''}`}
    onClose={close}
  >
    <SpaceToolbar o={o} settings={settings} onScale={chooseScale} crumb={showPhoto ? project.name : undefined}>
      {showPhoto && <div ref={setToolbarSlot} className="space-toolbar-slot" />}
    </SpaceToolbar>
    <div ref={setStage} className="obs-stage space-stage" style={{ minHeight: mode === 'scale' && project && !galaxy ? photoStageHeight(project.cuts) : undefined }}>
      <div className={`space-scene${mode === 'photo' ? ' is-hidden' : ''}`}>
        <Space3D settings={settings} photo={project} frameRef={frameRef} fitRef={fitRef} onHandle={setHandle} />
      </div>
      {mode === 'scale' && <>
        <PhotoImport session={session} inputRef={inputRef} showButton={!project || !galaxy} />
        <PhotoMessages session={session} />
        {project && !galaxy && <PhotoUnfold key={project.id} session={session} frameRef={frameRef} fitRef={fitRef} onObservatory={unfold} />}
        {project && galaxy && <GalaxyPhotoBar session={session} stars={stars} onUnfold={unfold} onPick={() => inputRef.current?.click()} onRetryStars={retry} />}
        {project && session.editing && <><PhotoFlatView session={session} /><PhotoCutEditor session={session} /></>}
      </>}
    </div>
    {mode !== 'scale' && obsProject && stage && summary && <Observatory project={obsProject} slots={{ stage, toolbar: showPhoto ? toolbarSlot : null, summary: showPhoto ? summary : null }}
      stars={stars} onRetryStars={retry} diving={diving} onScene={(scene) => { obsScene.current = scene }} />}
  </SpaceWindow>
}
