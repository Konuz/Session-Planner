// Zakładka Kadr (zakladka-kadr): obiekt, widok SVG kadru (przesuwanie tła wskaźnikiem), PA, mozaika i dane kadru.
//
// - Obiekty z haka `useFeaturedObjects` (jak zakładka Noc); wybór obiektu jest wspólny (`objectUid`, `selectObject`).
// - Kadr w sklepie (`framing`, `framingObjectUid`, `updateFraming`); inny obiekt przenosi środek na siebie, a PA
//   i mozaika zostają (`effectiveFraming`).
// - Widok: pole wycinka `cutoutFovDeg(mosaicSizeDeg(...))` z `zrodla-zdjec` i mapa zastępcza z całego katalogu.
// - Przeciąganie: przesunięcie liczone zawsze od chwili wciśnięcia wskaźnika (P11), a piksele ekranu przeliczane na
//   jednostki widoku z szerokości widoku na ekranie (P12).
// - Red Mode: kontener widoku ma `filter: url(#red-only)`; filtr z sekcji 8 jest na stronie.
// - Zdjęcie nieba (zdjecie-w-kadrze): hak `useSkyImage` dostaje środek kadru, rozmiar kadru lub mozaiki i „przeciąganie
//   trwa”; zdjęcie leży w widoku pod mapą i ramką (`photoRect`), a pod widokiem jest `PhotoPanel`.
// - Zoom (zoom-kadru): pole widoku tylko w pamięci komponentu; „+”, „−”, „Dopasuj”, kółko (nasłuch niepasywny,
//   `preventDefault`) i szczypanie dwoma palcami, zawsze wokół środka. Zmiana profilu albo mozaiki wraca do „Dopasuj”.
//   W trakcie szczypania i do 300 ms po ostatnim ząbku kółka warstwa zdjęcia dostaje „gest trwa” (bez pobierania).
// - Tło mapy (tlo-mapy): gwiazdy z `useBackgroundStars` (katalog wczytywany w efekcie) i siatka RA/Dec w widoku.
import { Crosshair, RotateCcw } from 'lucide-react'
import { useEffect, useEffectEvent, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { selectFeatured, nightObjectOptions } from '../../data/featuredObjects'
import { mosaicSizeDeg } from '../../services/framing'
import { useActiveProfile, usePlannerStore } from '../../state/plannerStore'
import type { DsoObject, Framing } from '../../types'
import { MessageField } from '../equipment/MessageField'
import { objectName } from '../night/objectName'
import { useFeaturedObjects } from '../night/useFeaturedObjects'
import {
  DEFAULT_MOSAIC,
  canZoomIn,
  canZoomOut,
  centerReadout,
  centeredOn,
  dragFraming,
  effectiveFraming,
  fieldText,
  fovReadout,
  framingFacts,
  pinchZoom,
  readOverlapInput,
  readPaInput,
  viewCutout,
  wheelZoom,
  zoomBounds,
  zoomIn,
  zoomOut,
  type DragStart,
  type ScreenPoint,
} from './framingModel'
import { FramingView } from './FramingView'
import { viewMapObjects } from './mapData'
import { PhotoPanel } from './PhotoPanel'
import { photoRect } from './photoModel'
import { useBackgroundStars } from './useBackgroundStars'
import { useSkyImage } from './useSkyImage'

const MOSAIC_COUNTS = [1, 2, 3, 4, 5] as const
const RED_ONLY_MATRIX = '0.2126 0.7152 0.0722 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'

export function FramingTab() {
  const profile = useActiveProfile()
  const objectUid = usePlannerStore((state) => state.objectUid)
  const stored = usePlannerStore((state) => state.framing)
  const storedUid = usePlannerStore((state) => state.framingObjectUid)
  const seeingArcsec = usePlannerStore((state) => state.planningSettings.seeingArcsec)
  const redMode = usePlannerStore((state) => state.redMode)
  const selectObject = usePlannerStore((state) => state.selectObject)
  const updateFraming = usePlannerStore((state) => state.updateFraming)
  const { featured, retry } = useFeaturedObjects()
  const titleId = useId()

  const catalog = featured.status === 'ready' ? featured.catalog : null
  const object = selectFeatured(catalog ?? [], objectUid)
  const frame = object ? effectiveFraming(object, stored, storedUid) : null
  const facts = framingFacts(profile, frame?.mosaic ?? stored?.mosaic ?? DEFAULT_MOSAIC, seeingArcsec)

  const chooseObject = (uid: string) => {
    const next = catalog?.find((entry) => entry.uid === uid)
    selectObject(uid)
    if (next) updateFraming(uid, centeredOn(next, frame))
  }

  return (
    <div className="flex flex-col gap-4">
      <RedOnlyFilter />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="card flex flex-col gap-3 p-3 md:p-4" aria-labelledby={titleId}>
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-xs text-muted">
              Obiekt
            </h2>
            {featured.status === 'ready' && object ? (
              <select
                aria-labelledby={titleId}
                className="control max-w-md text-sm"
                value={object.uid}
                onChange={(event) => chooseObject(event.target.value)}
              >
                {nightObjectOptions(featured.objects, object).map((option) => (
                  <option key={option.uid} value={option.uid}>
                    {objectName(option)}
                  </option>
                ))}
              </select>
            ) : featured.status === 'error' ? (
              <p role="alert" className="flex flex-wrap items-center gap-2 text-sm">
                Nie udało się wczytać katalogu: {featured.message}
                <button type="button" className="button" onClick={retry}>
                  <RotateCcw aria-hidden size={16} /> Spróbuj ponownie
                </button>
              </p>
            ) : (
              <p className="flex min-h-11 items-center text-sm text-muted">Wczytywanie katalogu…</p>
            )}
          </div>
          {object && frame && catalog && (
            <FramingCanvas
              object={object}
              frame={frame}
              catalog={catalog}
              redMode={redMode}
              onChange={(next) => updateFraming(object.uid, next)}
            />
          )}
        </section>

        <div className="flex flex-col gap-4">
          {object && frame && <FramingControls frame={frame} onChange={(next) => updateFraming(object.uid, next)} />}
          <section className="card p-4" aria-label="Dane kadru">
            <h2 className="font-serif text-xl font-medium text-parchment">Dane kadru</h2>
            <dl className="mt-2 divide-y divide-border text-sm">
              <Row term="Pole widzenia">{facts.fov}</Row>
              <Row term="Skala">{facts.scale}</Row>
              <Row term="Próbkowanie">{facts.sampling}</Row>
            </dl>
            {facts.mosaic && <p className="mt-2 text-sm">Mozaika: {facts.mosaic}</p>}
            {facts.oscNote && <p className="mt-2 text-xs text-muted">{facts.oscNote}</p>}
          </section>
        </div>
      </div>
    </div>
  )
}

/** Filtr Red Mode z sekcji 8 (odwołanie `filter: url(#red-only)` na kontenerze widoku). */
function RedOnlyFilter() {
  return (
    <svg width={0} height={0} aria-hidden className="absolute">
      <defs>
        <filter id="red-only" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={RED_ONLY_MATRIX} />
        </filter>
      </defs>
    </svg>
  )
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-2">
      <dt className="text-muted">{term}</dt>
      <dd>{children}</dd>
    </div>
  )
}

interface DragState {
  pointerId: number
  start: DragStart
  fovDeg: number
  widthPx: number
}

/** Szczypanie: dwa wskaźniki, odległość i pole widoku z chwili dotknięcia drugim palcem. */
interface PinchState {
  ids: [number, number]
  startDistance: number
  startFovDeg: number
}

/** Pole widoku po zoomie; `key` = profil i mozaika, dla których je ustawiono (inne → „Dopasuj”). */
interface ZoomState {
  key: string
  fovDeg: number
}

/** Cisza po ostatnim ząbku kółka, po której zmiana pola się kończy [ms]. */
const WHEEL_IDLE_MS = 300

/** Widok kadru z przesuwaniem tła wskaźnikiem (mysz, dotyk, pióro), zoomem i przyciskiem „Wyśrodkuj na obiekcie”. */
function FramingCanvas({
  object,
  frame,
  catalog,
  redMode,
  onChange,
}: {
  object: DsoObject
  frame: Framing
  catalog: readonly DsoObject[]
  redMode: boolean
  onChange: (next: Framing) => void
}) {
  const profile = useActiveProfile()
  const drag = useRef<DragState | null>(null)
  const pending = useRef<{ x: number; y: number } | null>(null)
  const frameRequest = useRef<number | null>(null)
  const pointers = useRef(new Map<number, ScreenPoint>())
  const pinch = useRef<PinchState | null>(null)
  /** Po szczypaniu nic się nie przesuwa, dopóki wszystkie palce nie odejdą od widoku. */
  const blocked = useRef(false)
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [pinching, setPinching] = useState(false)
  const [wheeling, setWheeling] = useState(false)
  const [zoom, setZoom] = useState<ZoomState | null>(null)
  const size = mosaicSizeDeg(profile, frame)
  const bounds = zoomBounds(profile, frame)
  const zoomKey = JSON.stringify([profile, frame.mosaic])
  const fovDeg = zoom?.key === zoomKey ? zoom.fovDeg : bounds.fitDeg
  const mapObjects = viewMapObjects(catalog, viewCutout(frame, fovDeg))
  const center = { raDeg: frame.centerRaDeg, decDeg: frame.centerDecDeg }
  const gesture = dragging || pinching || wheeling
  const sky = useSkyImage({ center, size, dragging: gesture, fovDeg })
  const stars = useBackgroundStars(center, fovDeg, gesture)
  const shown = sky.view.photo
  const photo = shown && sky.photoHref ? { href: sky.photoHref, rect: photoRect(shown, center, fovDeg) } : null

  /** Nowe pole liczone od bieżącego (funkcja, żeby kilka zdarzeń przed przerysowaniem się sumowało). */
  const changeFov = (change: (current: number) => number) =>
    setZoom((previous) => ({ key: zoomKey, fovDeg: change(previous?.key === zoomKey ? previous.fovDeg : bounds.fitDeg) }))

  const endWheel = () => {
    if (wheelTimer.current !== null) clearTimeout(wheelTimer.current)
    wheelTimer.current = null
    setWheeling(false)
  }

  /** Przycisk kończy zmianę pola od razu (także trwającą zmianę kółkiem). */
  const clickZoom = (change: (current: number) => number) => {
    endWheel()
    changeFov(change)
  }

  const onWheel = useEffectEvent((event: WheelEvent) => {
    event.preventDefault()
    changeFov((current) => wheelZoom(current, event.deltaY, event.deltaMode, bounds))
    setWheeling(true)
    if (wheelTimer.current !== null) clearTimeout(wheelTimer.current)
    wheelTimer.current = setTimeout(() => {
      wheelTimer.current = null
      setWheeling(false)
    }, WHEEL_IDLE_MS)
  })

  // Nasłuch niepasywny: `onWheel` z Reacta jest pasywny, więc jego `preventDefault` nie zatrzyma przewijania strony.
  useEffect(() => {
    const element = viewRef.current
    if (!element) return
    const listener = (event: WheelEvent) => onWheel(event)
    element.addEventListener('wheel', listener, { passive: false })
    return () => {
      element.removeEventListener('wheel', listener)
      if (wheelTimer.current !== null) clearTimeout(wheelTimer.current)
      wheelTimer.current = null
    }
  }, [])

  const applyPending = () => {
    frameRequest.current = null
    const state = drag.current
    const pointer = pending.current
    if (!state || !pointer) return
    onChange(dragFraming(state.start, pointer, state.fovDeg, state.widthPx))
  }

  const stopDrag = () => {
    if (frameRequest.current !== null) {
      cancelAnimationFrame(frameRequest.current)
      applyPending()
    }
    drag.current = null
    pending.current = null
    setDragging(false)
  }

  const distance = ([a, b]: [number, number]) => {
    const first = pointers.current.get(a)
    const second = pointers.current.get(b)
    return first && second ? Math.hypot(first.x - second.x, first.y - second.y) : 0
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || pointers.current.has(event.pointerId)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pinch.current) return
    if (pointers.current.size === 2) {
      stopDrag()
      const ids = [...pointers.current.keys()] as [number, number]
      pinch.current = { ids, startDistance: distance(ids), startFovDeg: fovDeg }
      setPinching(true)
      return
    }
    if (pointers.current.size !== 1 || blocked.current) return
    drag.current = {
      pointerId: event.pointerId,
      start: { framing: frame, pointer: { x: event.clientX, y: event.clientY } },
      fovDeg,
      widthPx: event.currentTarget.getBoundingClientRect().width,
    }
    setDragging(true)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const gesture = pinch.current
    if (gesture) {
      if (!gesture.ids.includes(event.pointerId)) return
      setZoom({ key: zoomKey, fovDeg: pinchZoom(gesture.startFovDeg, gesture.startDistance, distance(gesture.ids), bounds) })
      return
    }
    if (drag.current?.pointerId !== event.pointerId) return
    pending.current = { x: event.clientX, y: event.clientY }
    frameRequest.current ??= requestAnimationFrame(applyPending)
  }

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return
    if (pinch.current) {
      if (pinch.current.ids.includes(event.pointerId)) {
        pinch.current = null
        blocked.current = true
        setPinching(false)
      }
    } else if (drag.current?.pointerId === event.pointerId) {
      stopDrag()
    }
    if (pointers.current.size === 0) blocked.current = false
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="tabular-nums">{centerReadout(frame)}</p>
        <button
          type="button"
          className="button"
          onClick={() => onChange({ ...frame, centerRaDeg: object.raDeg, centerDecDeg: object.decDeg })}
        >
          <Crosshair aria-hidden size={16} /> Wyśrodkuj na obiekcie
        </button>
      </div>
      <div
        ref={viewRef}
        className="mx-auto w-full max-w-[min(100%,75dvh)] cursor-grab touch-none overflow-hidden rounded-md border border-border select-none active:cursor-grabbing"
        style={redMode ? { filter: 'url(#red-only)' } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
      >
        <FramingView fovDeg={fovDeg} profile={profile} framing={frame} mapObjects={mapObjects} photo={photo} stars={stars} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          className="button min-w-11 justify-center"
          aria-label="Przybliż"
          disabled={!canZoomIn(fovDeg, bounds)}
          onClick={() => clickZoom((current) => zoomIn(current, bounds))}
        >
          +
        </button>
        <button
          type="button"
          className="button min-w-11 justify-center"
          aria-label="Oddal"
          disabled={!canZoomOut(fovDeg, bounds)}
          onClick={() => clickZoom((current) => zoomOut(current, bounds))}
        >
          −
        </button>
        <button type="button" className="button" onClick={() => clickZoom(() => bounds.fitDeg)}>
          Dopasuj
        </button>
        <p className="tabular-nums">{fovReadout(fovDeg)}</p>
      </div>
      <p className="text-xs text-muted">
        Przeciągnij tło, żeby przesunąć kadr; kółko myszy albo dwa palce zmieniają pole widoku. Północ u góry, wschód po
        lewej.
      </p>
      <PhotoPanel
        view={sky.view}
        onChooseSource={(source) => sky.layer.chooseSource(source)}
        onChooseLayer={(layerId) => sky.layer.chooseLayer(layerId)}
        onRetry={() => sky.layer.retry()}
        onSaveOffline={() => void sky.layer.saveOffline()}
      />
    </div>
  )
}

/** PA (suwak i pole), mozaika (kolumny, wiersze, zakładka); komunikat błędu stoi pod swoim polem. */
function FramingControls({ frame, onChange }: { frame: Framing; onChange: (next: Framing) => void }) {
  const [paDraft, setPaDraft] = useState<string | null>(null)
  const [paError, setPaError] = useState<string | null>(null)
  const [overlapDraft, setOverlapDraft] = useState<string | null>(null)
  const [overlapError, setOverlapError] = useState<string | null>(null)
  const sliderId = useId()
  const { mosaic } = frame

  const setPa = (paDeg: number) => onChange({ ...frame, paDeg })
  const setMosaic = (change: Partial<Framing['mosaic']>) => onChange({ ...frame, mosaic: { ...mosaic, ...change } })

  const typePa = (text: string) => {
    setPaDraft(text)
    const result = readPaInput(text, frame.paDeg)
    setPaError(result.error)
    if (result.error === null) setPa(result.paDeg)
  }
  const typeOverlap = (text: string) => {
    setOverlapDraft(text)
    const result = readOverlapInput(text, mosaic.overlapPct)
    setOverlapError(result.error)
    if (result.error === null) setMosaic({ overlapPct: result.overlapPct })
  }
  /** Po wyjściu z pola poprawny wpis pokazuje się tak, jak go odczytano (np. „-30” → „330”). */
  const blurPa = () => {
    if (paError === null) setPaDraft(null)
  }
  const blurOverlap = () => {
    if (overlapError === null) setOverlapDraft(null)
  }
  const submitOnEnter = (event: { key: string; currentTarget: HTMLInputElement }) => {
    if (event.key === 'Enter') event.currentTarget.blur()
  }

  return (
    <section className="card flex flex-col gap-4 p-4" aria-label="Ustawienia kadru">
      <div className="flex flex-col gap-2">
        <h2 className="font-serif text-xl font-medium text-parchment">Kąt PA</h2>
        <label htmlFor={sliderId} className="sr-only">
          Suwak kąta PA
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={360}
          step={0.5}
          value={frame.paDeg}
          className="w-full accent-accent"
          onChange={(event) => {
            const value = Number(event.target.value)
            if (!Number.isFinite(value)) return
            setPaDraft(null)
            setPaError(null)
            setPa(value % 360)
          }}
        />
        <MessageField label="PA [°]" issues={paError ? [{ severity: 'error', message: paError }] : []}>
          <input
            type="text"
            inputMode="decimal"
            className="control text-sm"
            aria-invalid={paError !== null}
            value={paDraft ?? fieldText(frame.paDeg)}
            onChange={(event) => typePa(event.target.value)}
            onBlur={blurPa}
            onKeyDown={submitOnEnter}
          />
        </MessageField>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-serif text-xl font-medium text-parchment">Mozaika</h2>
        <div className="grid grid-cols-3 gap-2">
          <MosaicCount label="Kolumny" value={mosaic.cols} onChange={(cols) => setMosaic({ cols })} />
          <MosaicCount label="Wiersze" value={mosaic.rows} onChange={(rows) => setMosaic({ rows })} />
          <MessageField label="Zakładka [%]" issues={overlapError ? [{ severity: 'error', message: overlapError }] : []}>
            <input
              type="text"
              inputMode="decimal"
              className="control text-sm"
              aria-invalid={overlapError !== null}
              value={overlapDraft ?? fieldText(mosaic.overlapPct)}
              onChange={(event) => typeOverlap(event.target.value)}
              onBlur={blurOverlap}
              onKeyDown={submitOnEnter}
            />
          </MessageField>
        </div>
      </div>
    </section>
  )
}

function MosaicCount({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <select className="control text-sm" value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {MOSAIC_COUNTS.map((count) => (
          <option key={count} value={count}>
            {count}
          </option>
        ))}
      </select>
    </label>
  )
}
