// Okno „Pozycja 3D” (ładowane leniwie z widoku Niebo): skale Droga Mleczna i Wszechświat lokalny, a dla zdjęcia
// w Drodze Mlecznej stan Obserwatorium. Kopuła Nieba zostaje pod spodem bez zmian.
import { useCallback, useEffect, useRef, useState } from 'react'
import { fmtDistance } from '../../lib/format'
import { photoStageHeight, type PhotoSceneFrame } from '../../lib/photo'
import type { SpaceScale } from '../../lib/space3d'
import { useSelected } from '../../state/data'
import { useStore } from '../../state/store'
import Observatory from '../observatory/Observatory'
import { PhotoExplorer } from '../PhotoExplorer'
import Space3D from '../Space3D'
import { useGaiaStars, usePhotoSession } from './photoSession'
import { useSpaceSettings } from './spaceSettings'
import { SpaceToolbar } from './SpaceToolbar'
import { SpaceWindow } from './SpaceWindow'

const SUBTITLE: Record<SpaceScale, string> = {
  galaxy: 'Droga Mleczna · skala liniowa, 1 j. = 1000 lś',
  universe: 'Wszechświat lokalny · odległości w skali logarytmicznej',
}

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
  // Stan zdjęcia: Obserwatorium w miejscu sceny Drogi Mlecznej (ta czeka pod spodem, niewidoczna).
  const [photoState, setPhotoState] = useState(false)
  const inPhoto = photoState && !!project
  const [stage, setStage] = useState<HTMLDivElement | null>(null)
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const [summary, setSummary] = useState<HTMLDivElement | null>(null)
  useEffect(() => { if (!project) setPhotoState(false) }, [project])

  function chooseScale(scale: SpaceScale) {
    setPhotoState(false)
    settings.setScale(scale)
  }
  function openObservatory() {
    settings.setScale('galaxy')
    setPhotoState(true)
  }

  const dist = o?.distLy ?? null
  return <SpaceWindow
    label={inPhoto ? 'Obserwatorium 3D zdjęcia' : 'Pozycja 3D'}
    kicker={inPhoto ? 'KONUZASTRO / Obserwatorium 3D' : 'KONUZASTRO / Pozycja 3D'}
    title={inPhoto ? project.name : o ? `${o.id}${o.namePl ? ` · ${o.namePl}` : ''}` : 'Wybierz obiekt'}
    subtitle={inPhoto ? 'Obiekty zdjęcia wzdłuż linii widzenia' : SUBTITLE[settings.scale]}
    summaryRef={setSummary}
    summary={!inPhoto && o ? <strong>{dist !== null ? `Odległość ≈ ${fmtDistance(dist)}` : 'Odległość nieznana'}</strong> : null}
    className={`space-window ${inPhoto ? 'is-photo' : 'is-scale'}`}
    onClose={close}
  >
    <SpaceToolbar o={o} settings={settings} onScale={chooseScale} crumb={inPhoto ? project.name : undefined}>
      {inPhoto && <div ref={setToolbarSlot} className="space-toolbar-slot" />}
    </SpaceToolbar>
    <div ref={setStage} className="obs-stage space-stage" style={{ minHeight: !inPhoto && project && settings.scale === 'universe' ? photoStageHeight(project.cuts) : undefined }}>
      <div className={`space-scene${inPhoto ? ' is-hidden' : ''}`}>
        <Space3D settings={settings} photo={project} frameRef={frameRef} fitRef={fitRef} />
      </div>
      {!inPhoto && <PhotoExplorer session={session} frameRef={frameRef} fitRef={fitRef} onObservatory={openObservatory} />}
    </div>
    {inPhoto && stage && toolbarSlot && summary && <Observatory project={project} slots={{ stage, toolbar: toolbarSlot, summary }} stars={stars} onRetryStars={retry} />}
  </SpaceWindow>
}
