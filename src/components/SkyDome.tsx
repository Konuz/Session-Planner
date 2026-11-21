// Kopuła nieba: gwiazdy w WebGL, nakładka 2D z liniami i postaciami
// gwiazdozbiorów, konturami mgławic, horyzontem, torem obiektu i animacją „znajdź obiekt”. Rysuje tylko przy zmianie stanu.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Compass, Pin, PinOff, RefreshCw } from 'lucide-react'
import {
  altAz,
  bodyAltAz,
  computeOptics,
  constellationOf,
  DEG,
  horizontalMatrix,
  horizontalToVec,
  hourAngleDeg,
  moonInfo,
  mulVec,
  transpose,
  unitVector,
  vecToEquatorial,
  vecToHorizontal,
  type Equatorial,
  type Vec3,
} from '../lib/astro'
import { catalogOf, DEFAULT_ANNOTATION_COLORS, displayName, skyGroupOf, skyShown, TYPE_INFO, type DSO, type ObjectType } from '../lib/catalog'
import { FREE_ROAM_LABEL, isField } from '../lib/fieldTarget'
import { fmtNum, fmtTime } from '../lib/format'
import { frameCorners, gnomonicInverse } from '../lib/framing'
import { SURVEYS } from '../lib/hips'
import { NSNS_EDGE_DEC, skyLookSurvey } from '../lib/hipsSky'
import { horizonAltitude } from '../lib/horizon'
import { altitudeTrack, localHourTicks, nightGrid } from '../lib/night'
import { loadOutlines, pointInOutline, polygonArea, type Outline } from '../lib/outlines'
import { affineFrom3, FULL_DOME, makeProjector, type View } from '../lib/projection'
import { loadMilkyWay, loadSky, type MilkyWay, type SkyData } from '../lib/sky'
import { useCatalog, useNight, useSite, useTarget, useTime } from '../state/data'
import { measureSince, perfNow } from '../lib/perf'
import { useStore } from '../state/store'
import { FrameCoordinates } from './FrameCoordinates'
import { MoonDisc } from './MoonDisc'
import { useHipsSkyLayer } from './useHipsSkyLayer'
import { useSkyPhotoLayer } from './useSkyPhotoLayer'
import {
  GROUND_STEP,
  MW_STEP,
  artLayer,
  artLevel,
  brighter,
  createStarGL,
  drawCelestialGrid,
  drawGround,
  drawMilkyWay,
  getGroundCacheKey,
  groundCanvas,
  overlapsGround,
  polyline,
  withAlpha,
  type StarGL,
} from './skyDomeLayers'

/** Stos warstw (cztery romby): kontur = mniej adnotacji, wypełnienie = więcej. */
export function LayersIcon({ filled }: { filled: boolean }) {
  const layers = [11, 8, 5, 2]
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.4} strokeLinejoin="round">
      {layers.map((y, i) => (
        <path key={y} d={`M12 ${y}l10 5-10 5-10-5z`} opacity={filled ? 1 - i * 0.12 : 1} stroke={filled ? '#000' : undefined} strokeWidth={filled ? 1 : undefined} />
      ))}
    </svg>
  )
}

const MIN_FOV = 4
const NSNS_NARROWBAND_MIN_FOV = 0.5

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

// ---------- Komponent ----------

interface Props {
  /** Animacja czasu (odtwarzanie): wyłącza ciężkie elementy pośrednie. */
  playing?: boolean
}

export function SkyDome({ playing = false }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const underRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const moonRef = useRef<HTMLDivElement>(null)
  const moonMask = useRef<HTMLCanvasElement | null>(null)
  const moonMaskKey = useRef('')
  const tipRef = useRef<HTMLDivElement>(null)
  const [sky, setSky] = useState<SkyData | null>(null)
  const [milkyWay, setMilkyWay] = useState<MilkyWay | null>(null)
  const [outlines, setOutlines] = useState<Outline[] | null>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [view, setView] = useState<View>(FULL_DOME)
  // Przeciąganie i kółko zmieniają widok najwyżej raz na klatkę: każda zmiana stanu to pełne przerysowanie
  // (ok. 20 ms), a mysz i trackpad wysyłają więcej zdarzeń niż klatek (audyt C02).
  const pendingView = useRef<View | null>(null)
  const viewFrame = useRef(0)
  // Podczas interakcji Droga Mleczna liczy się z rzadszych próbek; pełna jakość wraca po chwili bezruchu.
  const [interacting, setInteracting] = useState(false)
  const interactingRef = useRef(false)
  const interactTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const markInteracting = () => {
    if (!interactingRef.current) {
      interactingRef.current = true
      setInteracting(true)
    }
    clearTimeout(interactTimer.current)
    interactTimer.current = setTimeout(() => {
      interactingRef.current = false
      setInteracting(false)
    }, 150)
  }
  const scheduleView = (next: View) => {
    pendingView.current = next
    markInteracting()
    if (viewFrame.current) return
    viewFrame.current = requestAnimationFrame(() => {
      viewFrame.current = 0
      const v = pendingView.current
      pendingView.current = null
      if (v) setView(v)
    })
  }
  const setViewNow = (next: View) => {
    pendingView.current = null
    setView(next)
  }
  // Przeciąganie odpiętej ramki FOV: środek na żywo (najwyżej raz na klatkę), zapis do store po puszczeniu.
  const [dragCenter, setDragCenter] = useState<Equatorial | null>(null)
  const frameDrag = useRef<{ x: number; y: number; grabDx: number; grabDy: number; moved: boolean } | null>(null)
  const latestDragCenter = useRef<Equatorial | null>(null)
  const dragFrame = useRef(0)
  const scheduleDragCenter = (next: Equatorial) => {
    latestDragCenter.current = next
    markInteracting()
    if (dragFrame.current) return
    dragFrame.current = requestAnimationFrame(() => {
      dragFrame.current = 0
      setDragCenter(latestDragCenter.current)
    })
  }
  useEffect(() => () => {
    cancelAnimationFrame(viewFrame.current)
    cancelAnimationFrame(dragFrame.current)
    clearTimeout(interactTimer.current)
  }, [])
  const [isPolarDome, setShowPolarDome] = useState(false)
  const [animationRequest, setAnimationRequest] = useState(0)
  const [hoverOutline, setHoverOutline] = useState<number | null>(null)
  const [hoverDepth, setHoverDepth] = useState<DSO | null>(null)
  // Obiekt pod kursorem (to samo, co wybrałoby kliknięcie): podświetlenie zwłaszcza małych obiektów bez konturu.
  const [hoverObj, setHoverObj] = useState<DSO | null>(null)
  const depthHits = useRef<{ dso: DSO; c: [number, number]; r: number }[]>([])
  const outlineHits = useRef<{ k: number; pts: [number, number][]; holes: [number, number][][]; area: number }[]>([])
  const [hoverCon, setHoverCon] = useState<{ abbr: string; x: number; y: number; since: number } | null>(null)
  const [, setFrame] = useState(0)
  // Rośnie przy każdym utworzeniu i utracie kontekstu gwiazd: warstwa moich zdjęć tworzy się w nim od nowa.
  const [glEpoch, setGlEpoch] = useState(0)
  const photoLayer = useSkyPhotoLayer(glRef, glEpoch, () => setFrame((f) => f + 1))
  const hipsRef = useRef<HTMLCanvasElement>(null)
  const skyLook = useStore((s) => s.skyLook)
  const skySurvey = skyLookSurvey(skyLook)
  const hipsLayer = useHipsSkyLayer(hipsRef, skySurvey, () => setFrame((f) => f + 1))
  const anim = useRef<{ from: View; to: View; start: number; dur: number } | null>(null)
  const lockStart = useRef(0)
  const artCache = useRef(new Map<string, HTMLImageElement>())
  const starGL = useRef<StarGL | null>(null)
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null)

  const site = useSite()
  const time = useTime()
  const night = useNight()
  const { catalog } = useCatalog()
  // W swobodnej eksploracji: pole (obiekt z indeksem −1) w środku przesuniętej ramki.
  const selected = useTarget()
  const horizon = useStore((s) => s.horizon)
  const showGridLabels = useStore((s) => s.showDecLabels)
  const showLines = useStore((s) => s.showLines)
  const showTracks = useStore((s) => s.showTracks)
  const showArt = useStore((s) => s.showArt)
  const showOutlines = useStore((s) => s.showOutlines)
  const outlinesOpacity = useStore((s) => s.outlinesOpacity)
  const showOwnPhotos = useStore((s) => s.showOwnPhotos)
  const ownPhotosOpacity = useStore((s) => s.ownPhotosOpacity)
  const showEllipses = useStore((s) => s.showEllipses)
  const showObjectMarkers = useStore((s) => s.showObjectMarkers)
  const skyGroups = useStore((s) => s.skyGroups)
  const objectDensity = useStore((s) => s.skyObjectDensity)
  const skyExtraHidden = useStore((s) => s.skyExtraHidden)
  const showLabels = useStore((s) => s.showLabels)
  const showAnnotations = useStore((s) => s.showAnnotations)
  const annotationColors = useStore((s) => s.annotationColors)
  const findPulse = useStore((s) => s.findPulse)
  const equipment = useStore((s) => s.equipment)
  const framing = useStore((s) => s.framing)
  const plan = useStore((s) => s.plan)
  const select = useStore((s) => s.select)
  const framePinned = useStore((s) => s.framePinned)
  const setFramePinned = useStore((s) => s.setFramePinned)
  const setFreeField = useStore((s) => s.setFreeField)
  const tz = useStore((s) => s.location.timeZone)

  useEffect(() => {
    loadSky().then(setSky).catch(() => setSky(null))
    loadMilkyWay().then(setMilkyWay).catch((e) => console.error('Kopuła: Droga Mleczna', e))
  }, [])

  useEffect(() => {
    if (showOutlines && !outlines) loadOutlines().then(setOutlines).catch((e) => console.error('Kopuła: kontury mgławic', e))
  }, [showOutlines, outlines])

  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    setSize({ w: Math.max(200, el.clientWidth), h: Math.max(200, el.clientHeight) })
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.max(200, e.contentRect.width), h: Math.max(200, e.contentRect.height) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!sky || !glRef.current) return
    const canvas = glRef.current
    const init = () => {
      try {
        starGL.current = createStarGL(canvas, sky)
        setGlEpoch((n) => n + 1)
      } catch (e) {
        console.error('Kopuła: WebGL niedostępny', e)
        starGL.current = null
      }
      setFrame((f) => f + 1)
    }
    const lost = (e: Event) => {
      e.preventDefault()
      starGL.current = null
      setGlEpoch((n) => n + 1)
    }
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', init)
    init()
    return () => {
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', init)
      starGL.current?.dispose()
      starGL.current = null
    }
  }, [sky])

  const horMatrix = useMemo(() => horizontalMatrix(time, site), [time, site])
  const sun = useMemo(() => bodyAltAz('sun', time, site), [time, site])
  const moon = useMemo(() => ({ ...bodyAltAz('moon', time, site), info: moonInfo(time) }), [time, site])
  const moonMarkerSize = Math.round(2 * Math.max(5, 9 * (184 / view.fovDeg) ** 0.5))

  // Tor wybranego obiektu przez noc (co 5 min).
  const grid = useMemo(() => nightGrid(night, site, 10), [night, site])
  const track = useMemo(() => (selected ? altitudeTrack(selected, grid) : []), [selected, grid])
  const moonTrack = useMemo(() => grid.times.map((t) => ({ t, ...bodyAltAz('moon', t, site) })), [grid, site])
  const catalogMessier = useMemo(() => (catalog && skyGroups.M && showObjectMarkers ? catalog.filter((o) => o.catalogs.includes('M')) : []), [catalog, skyGroups.M, showObjectMarkers])
  // Obiekty katalogu po oznaczeniu głównym, potem po aliasach.
  const catalogById = useMemo(() => {
    if (!catalog) return null
    const byId = new Map<string, DSO>()
    for (const o of catalog) byId.set(o.id, o)
    for (const o of catalog) for (const a of o.aliases) if (!byId.has(a)) byId.set(a, o)
    return byId
  }, [catalog])
  // Obiekty katalogu dla każdego konturu; regiony nie mają obiektu.
  const outlineObjects = useMemo(
    () => (outlines && catalogById ? outlines.map((o) => (o.region ? null : catalogById.get(o.id) ?? null)) : null),
    [outlines, catalogById],
  )
  // Rozmiar wspólny dla wszystkich poziomów konturu danego obiektu.
  const outlineRadii = useMemo(() => {
    const radii = new Map<string, number>()
    outlines?.forEach((outline, index) => {
      const key = outlineObjects?.[index]?.id ?? outline.id
      let radius = radii.get(key) ?? 0
      for (const ring of outline.rings) radius = Math.max(radius, ring.radiusDeg)
      radii.set(key, radius)
    })
    return radii
  }, [outlines, outlineObjects])
  // Obiekty z elipsą: z wymiarem, bez Messiera (ma własne znaczniki), z wektorem liczonym raz.
  const depthObjects = useMemo(
    () => (catalog ?? []).filter((o) => o.majArcmin > 0 && !o.catalogs.includes('M')).map((o) => ({ o, v: unitVector(o.raDeg, o.decDeg), group: skyGroupOf(o) })),
    [catalog],
  )
  // Kolory typów (canvas nie czyta zmiennych CSS).
  const typeColors = useMemo(() => {
    const out = {} as Record<ObjectType, string>
    for (const type of Object.keys(TYPE_INFO) as ObjectType[]) out[type] = annotationColors[type] ?? DEFAULT_ANNOTATION_COLORS[type]
    return out
  }, [annotationColors])
  /** Klucz obiektu konturu: wspólny dla poziomów 1–3 tego samego obiektu. */
  const outlineKey = (k: number) => outlineObjects?.[k]?.id ?? outlines?.[k].id ?? ''
  const planObjects = useMemo(() => plan.flatMap((p) => {
    const o = catalogById?.get(p.objectId)
    return o ? [o] : []
  }), [catalogById, plan])

  // Animacja „znajdź obiekt”: przelot widoku do obiektu i namierzanie.
  const consumedPulseRef = useRef(findPulse)
  useEffect(() => {
    if (!selected || findPulse === 0 || findPulse === consumedPulseRef.current) return
    consumedPulseRef.current = findPulse
    const h = vecToHorizontal(mulVec(horizontalMatrix(time, site), unitVector(selected.raDeg, selected.decDeg)))
    const fov = Math.max(28, Math.min(70, (selected.majArcmin / 60) * 40))
    // Obiekt pod horyzontem: widok na horyzont w jego kierunku, żeby było widać, gdzie wzejdzie.
    const target: View = { azDeg: h.azDeg, altDeg: Math.max(h.altDeg < 0 ? fov * 0.3 : -10, Math.min(89.9, h.altDeg)), fovDeg: fov }
    if (reducedMotion()) {
      setView(target)
      return
    }
    // Najpierw krótko do pełnej kopuły (jeśli przybliżono), potem do obiektu.
    anim.current = { from: view, to: target, start: performance.now(), dur: 1400 }
    lockStart.current = performance.now() + 1100
    setFrame((f) => f + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findPulse])

  // Pętla animacji tylko wtedy, gdy coś się porusza.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const now = performance.now()
      let again = false
      const a = anim.current
      if (a) {
        const k = Math.min(1, (now - a.start) / a.dur)
        const e = easeInOut(k)
        // Azymut po krótszym łuku; w środku drogi lekkie oddalenie (efekt „przelotu”).
        let dAz = ((a.to.azDeg - a.from.azDeg + 540) % 360) - 180
        if (a.from.altDeg > 89) dAz = 0
        const lift = Math.sin(Math.PI * e) * 25
        setView(k >= 1 ? a.to : {
          azDeg: (a.from.altDeg > 89 ? a.to.azDeg : a.from.azDeg + dAz * e),
          altDeg: a.from.altDeg + (a.to.altDeg - a.from.altDeg) * e,
          fovDeg: Math.min(184, a.from.fovDeg + (a.to.fovDeg - a.from.fovDeg) * e + lift),
        })
        if (k < 1) again = true
        else anim.current = null
      }
      if (now - lockStart.current < 1600) again = true
      if (hoverCon && now - hoverCon.since < 500) again = true
      setFrame((f) => (f + 1) % 1e9)
      if (again) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findPulse, hoverCon?.abbr, animationRequest])

  const dpr = Math.min(2, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1)
  const radius = Math.min(size.w, size.h) / 2 - 18
  const proj = useMemo(() => makeProjector(horMatrix, view, size.w / 2, size.h / 2, radius), [horMatrix, view, size, radius])
  const pxPerDeg = proj.scale * DEG
  // 100% zachowuje dotychczasowe progi rysowania, 50% podnosi je o 4 px promienia obiektu.
  const extraRadiusPx = objectDensity === 0 ? Infinity : 4 * (100 / objectDensity - 1)
  const minMessierRadiusDeg = extraRadiusPx / pxPerDeg
  const messier = useMemo(() => new Set(minMessierRadiusDeg > 0
    ? catalogMessier.filter((o) => o.majArcmin / 120 >= minMessierRadiusDeg)
    : catalogMessier), [catalogMessier, minMessierRadiusDeg])
  const moonPoint = proj.hor(horizontalToVec({ altDeg: moon.altDeg, azDeg: moon.azDeg }))

  // Pole widzenia zestawu (jak w kadrowaniu: środek i PA z `framing`). Montaż EQ trzyma PA na niebie, więc ramka obraca się
  // razem z niebem; po górowaniu (meridian flip) kamera jest odwrócona o 180°, co widać po znaczniku górnej krawędzi matrycy.
  const optics = useMemo(() => computeOptics({ apertureMm: equipment.apertureMm, focalLengthMm: equipment.focalLengthMm, reducer: equipment.reducer, widthPx: equipment.widthPx, heightPx: equipment.heightPx, pixelUm: equipment.pixelUm, binning: equipment.binning }), [equipment])
  const frameCenter: Equatorial | null = selected ? dragCenter ?? { raDeg: framing.raDeg ?? selected.raDeg, decDeg: framing.decDeg ?? selected.decDeg } : null
  const frame = (() => {
    if (!frameCenter) return null
    const fp = proj.eq(unitVector(frameCenter.raDeg, frameCenter.decDeg))
    const pa = framing.paDeg + (hourAngleDeg(frameCenter, time, site) > 0 ? 180 : 0)
    const corners = frameCorners({ xi: 0, eta: 0 }, optics.fovWdeg, optics.fovHdeg, pa).map((c) => {
      const q = gnomonicInverse(frameCenter, c)
      return proj.eq(unitVector(q.raDeg, q.decDeg))
    })
    if (!fp || corners.some((c) => !c)) return null
    const diag = Math.hypot(corners[0]![0] - corners[2]![0], corners[0]![1] - corners[2]![1])
    if (!(diag > 0)) return null
    // Rzut stereograficzny zmniejsza ramkę ku zenitowi: przy dużym pomniejszeniu powiększamy ją do 18 px przekątnej
    // (kształt i obrót zostają), zamiast ją chować; tak samo duża jest strefa chwytania odpiętej ramki.
    const s = Math.max(1, 18 / diag)
    const pts = corners.map((c) => [fp[0] + (c![0] - fp[0]) * s, fp[1] + (c![1] - fp[1]) * s] as [number, number])
    return { fp, pts }
  })()
  const frameBox = frame && {
    minX: Math.min(...frame.pts.map((p) => p[0])),
    maxX: Math.max(...frame.pts.map((p) => p[0])),
    minY: Math.min(...frame.pts.map((p) => p[1])),
    maxY: Math.max(...frame.pts.map((p) => p[1])),
  }
  const frameOnScreen = !!frameBox && frameBox.maxX > 0 && frameBox.minX < size.w && frameBox.maxY > 0 && frameBox.minY < size.h
  // Przycisk przypięcia przy górnej (na ekranie) krawędzi ramki: obrócony jak ta krawędź, rozmiar w proporcji do jej długości.
  const pinPose = (() => {
    if (!frame) return null
    const { fp, pts } = frame
    let best = 0
    for (let i = 1; i < 4; i++) if (pts[i][1] + pts[(i + 1) % 4][1] < pts[best][1] + pts[(best + 1) % 4][1]) best = i
    let a = pts[best]
    let b = pts[(best + 1) % 4]
    if (b[0] < a[0]) [a, b] = [b, a]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len]
    // Normalna na zewnątrz ramki (od środka ku krawędzi).
    let n = [-u[1], u[0]]
    if (n[0] * ((a[0] + b[0]) / 2 - fp[0]) + n[1] * ((a[1] + b[1]) / 2 - fp[1]) < 0) n = [-n[0], -n[1]]
    const px = Math.max(16, Math.min(40, len * 0.14))
    // Przycisk w narożniku na zewnątrz: dolny bok leży na krawędzi ramki, boczny przedłuża sąsiednią krawędź.
    const half = px / 2
    return {
      px,
      x: b[0] - u[0] * half + n[0] * half,
      y: b[1] - u[1] * half + n[1] * half,
      angle: Math.atan2(u[1], u[0]) / DEG,
    }
  })()
  const freeRoam = !!selected && isField(selected)
  // Obiekt pod horyzontem chowa ramkę; odpiętą ramkę i swobodne pole widać zawsze (da się je wyciągnąć i odpiąć).
  const targetUp = (() => {
    if (!selected) return false
    const hv = vecToHorizontal(mulVec(horMatrix, unitVector(selected.raDeg, selected.decDeg)))
    return hv.altDeg > horizonAltitude(horizon, hv.azDeg)
  })()
  const frameShown = !!selected && (!framePinned || freeRoam || targetUp)

  // ---------- Rysowanie ----------
  // Canvas i znacznik Księżyca w DOM muszą trafić na ekran w tej samej klatce.
  useLayoutEffect(() => {
    const overlay = overlayRef.current
    const glCanvas = glRef.current
    const under = underRef.current
    const hipsCanvas = hipsRef.current
    if (!overlay || !glCanvas || !under || !hipsCanvas) return
    const drawStart = perfNow()
    for (const c of [overlay, glCanvas, under, hipsCanvas]) {
      const w = Math.round(size.w * dpr)
      const h = Math.round(size.h * dpr)
      if (c.width !== w || c.height !== h) {
        c.width = w
        c.height = h
      }
    }
    const ctx = overlay.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)
    // Spód (pod gwiazdami i moimi zdjęciami): Droga Mleczna, siatka wysokości, południk i linie gwiazdozbiorów.
    const uctx = under.getContext('2d')!
    uctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    uctx.clearRect(0, 0, size.w, size.h)
    const fullDome = view.fovDeg > 150
    const zen: Vec3 = [horMatrix[6], horMatrix[7], horMatrix[8]]
    // Jasność nieba ze Słońca: dzień przygasza gwiazdy.
    const sunAlt = sun.altDeg
    const bright = sunAlt > 0 ? 0.08 : sunAlt > -6 ? 0.25 : sunAlt > -12 ? 0.6 : sunAlt > -18 ? 0.85 : 1
    const magLimit = Math.min(6.6, 4.6 + (184 - view.fovDeg) / 50)
    // Niebo NSNS na najniższym płótnie; gdy podkład już jest, gwiazdy katalogu i Droga Mleczna zostają tylko na południe od granicy pokrycia.
    const nsnsSky = skySurvey ? hipsLayer.current : null
    nsnsSky?.draw({ eqToView: proj.eqToView, zen, scale: proj.scale, cx: proj.cx, cy: proj.cy, width: size.w, height: size.h, dpr, bright, allowDecode: !playing, swapRedBlue: skyLook === 'nsnsSho' })
    const nsnsShown = !!nsnsSky?.ready()
    starGL.current?.draw(proj.eqToView, zen, proj, size.w, size.h, dpr, magLimit, bright, nsnsShown ? Math.sin(NSNS_EDGE_DEC * DEG) : 2, !skySurvey)
    // Moje zdjęcia nad gwiazdami, pod całą nakładką (kontury na wierzchu); jasność niezależna od pory dnia.
    if (starGL.current && showOwnPhotos) {
      photoLayer.current?.draw({ proj, horMatrix, horizon, width: size.w, height: size.h, dpr, opacity: ownPhotosOpacity, selectedId: selected?.id ?? null, allowDecode: !playing })
    }

    // Tło kopuły: kolor nieba zależny od Słońca (rysowany pod gwiazdami jako tło sceny).
    const stage = stageRef.current
    if (stage) {
      const sky1 = sunAlt > 0 ? '#16325a' : sunAlt > -6 ? '#0f2547' : sunAlt > -12 ? '#0a1934' : sunAlt > -18 ? '#071226' : '#040a18'
      stage.style.background = `radial-gradient(circle at 50% 50%, ${sky1} 0%, #02050d ${fullDome ? 62 : 120}%, #000 100%)`
    }

    // Smuga Drogi Mlecznej pod siatką i liniami (wszystko na spodzie, pod gwiazdami); w dzień i zmierzchu słabsza razem z gwiazdami.
    if (milkyWay) drawMilkyWay(uctx, proj, milkyWay, horizon, size.w, size.h, 0.3 * bright * bright, interacting || playing ? MW_STEP * 2 : MW_STEP, nsnsShown ? NSNS_EDGE_DEC : 90)

    const toScreenHor = (alt: number, az: number) => proj.hor(horizontalToVec({ altDeg: alt, azDeg: az }))

    const polarLabels = isPolarDome ? drawCelestialGrid(uctx, proj, site.latDeg, size, showGridLabels) : null
    if (!isPolarDome) {
      // Siatka wysokości (pierścienie co 20°) i kierunki świata.
      uctx.lineWidth = 1
      uctx.strokeStyle = 'rgba(120, 150, 200, 0.16)'
      uctx.font = '11px ui-monospace, Consolas, monospace'
      uctx.fillStyle = 'rgba(160, 180, 210, 0.55)'
      for (const alt of [0, 20, 40, 60, 80]) {
        uctx.beginPath()
        polyline(uctx, Array.from({ length: 121 }, (_, i) => toScreenHor(alt, i * 3)), size)
        uctx.stroke()
        if (showGridLabels && alt > 0) {
          const p = toScreenHor(alt, 315)
          if (p) uctx.fillText(`${alt}°`, p[0] + 4, p[1] - 4)
        }
      }
      for (let az = 0; az < 360; az += 45) {
        uctx.beginPath()
        const a = toScreenHor(0, az)
        const b = toScreenHor(80, az)
        if (a && b) {
          uctx.moveTo(a[0], a[1])
          uctx.lineTo(b[0], b[1])
          uctx.strokeStyle = 'rgba(120, 150, 200, 0.07)'
          uctx.stroke()
        }
      }
    }
    // Południk (N–zenit–S) przerywaną linią.
    uctx.setLineDash([3, 6])
    uctx.strokeStyle = 'rgba(0, 224, 255, 0.22)'
    uctx.beginPath()
    polyline(uctx, Array.from({ length: 91 }, (_, i) => (i * 2 <= 90 ? toScreenHor(i * 2, 180) : toScreenHor(180 - i * 2, 0))), size)
    uctx.stroke()
    uctx.setLineDash([])

    // Linie gwiazdozbiorów.
    if (sky && showLines) {
      uctx.lineWidth = 1
      for (const c of sky.constellations) {
        const hovered = hoverCon?.abbr === c.abbr
        uctx.strokeStyle = hovered ? 'rgba(0, 224, 255, 0.75)' : 'rgba(150, 190, 230, 0.28)'
        uctx.lineWidth = hovered ? 1.4 : 1
        uctx.beginPath()
        for (const line of c.lines) {
          let prev: [number, number] | null = null
          for (const [ra, dec] of line) {
            const p = proj.eq(unitVector(ra, dec))
            if (p && prev && Math.hypot(p[0] - prev[0], p[1] - prev[1]) < size.w) {
              uctx.moveTo(prev[0], prev[1])
              uctx.lineTo(p[0], p[1])
            }
            prev = p
          }
        }
        uctx.stroke()
      }
    }

    // Kontury mgławic (OpenNGC): poziom 1 (słaby zasięg) jako delikatna poświata, pozostałe z obrysem, kontur
    // wybranego obiektu na cyjan, pod kursorem jaśniej. Pierścienie mniejsze niż 2 px i poza ekranem pomijane;
    // wypełnienie (i trafienie kursorem) tylko dla pierścieni widocznych w całości.
    outlineHits.current = []
    depthHits.current = []
    const aboveHorizon = (v: Vec3) => {
      const hv = vecToHorizontal(mulVec(horMatrix, v))
      return hv.altDeg > horizonAltitude(horizon, hv.azDeg)
    }
    // Kandydaci na etykiety konturów i elips; rysowani razem na końcu, bez nakładania się.
    const labelList: { dso: DSO; c: [number, number]; top: [number, number]; r: number; prio: number; minR: number; hov: boolean; color: string; name?: string }[] = []
    // Obiekty z narysowanym konturem nie dostają już elipsy głębi.
    const outlined = new Set<string>()
    ctx.save()
    ctx.lineWidth = 1
    if (outlines && showOutlines) {
      const selIds = selected ? new Set([selected.id, ...selected.aliases]) : null
      const hoverKey = hoverOutline === null ? null : outlineKey(hoverOutline)
      // Największy widoczny pierścień obiektu, z poziomu 2/3 przed poziomem 1.
      const best = new Map<string, { k: number; c: [number, number]; top: [number, number]; r: number; faint: boolean }>()
      const minOutlineRadiusDeg = (2 + extraRadiusPx) / pxPerDeg
      // Suwak krycia konturów działa na obrysy i wypełnienia; podpisy (rysowane później razem z elipsami) zostają czytelne.
      ctx.globalAlpha = outlinesOpacity
      outlines.forEach((o, k) => {
        if (!skyShown(outlineObjects?.[k] ?? { catalogs: [catalogOf(o.id) ?? ''] }, skyGroups, skyExtraHidden)) return
        const key = outlineKey(k)
        const sel = selIds ? selIds.has(o.id) || o.also.some((a) => selIds.has(a)) : false
        if (extraRadiusPx > 0 && !sel && (outlineRadii.get(key) ?? 0) < minOutlineRadiusDeg) return
        const hov = key === hoverKey
        // Kontury z OpenNGC (wszystko poza mgławicami ciemnymi) w kolorze dawnego podświetlenia, stopniowanym poziomem
        // (1: słaby zasięg najciemniej, 3: jasne jądro najjaśniej); pod kursorem jaśniejsza czerwień.
        const ngc = !o.dark
        const lv = o.level === 1 ? 0 : o.level === 3 ? 2 : 1
        const faint = o.level === 1 && !sel && !hov && !ngc
        const tint = outlineObjects?.[k] ? typeColors[outlineObjects[k]!.type] : typeColors[o.dark ? 'DN' : 'EN']
        ctx.fillStyle = sel ? 'rgba(0, 224, 255, 0.08)' : ngc ? (hov ? brighter(tint, 0.18) : withAlpha(tint, [0.05, 0.09, 0.13][lv])) : withAlpha(tint, hov ? 0.13 : faint ? 0.05 : 0.08)
        ctx.strokeStyle = sel ? 'rgba(0, 224, 255, 0.85)' : ngc ? (hov ? brighter(tint, 1) : withAlpha(tint, [0.4, 0.65, 0.9][lv])) : withAlpha(tint, hov ? 0.9 : faint ? 0.25 : 0.45)
        for (const ring of o.rings) {
          const r = ring.radiusDeg * pxPerDeg
          if (r < 2) continue
          const c = proj.eq(ring.centre)
          if (c ? c[0] < -2 * r || c[1] < -2 * r || c[0] > size.w + 2 * r || c[1] > size.h + 2 * r : ring.radiusDeg < 60) continue
          const pts = ring.points.map((v) => proj.eq(v))
          const holes = ring.holes.map((hole) => hole.map((v) => proj.eq(v)))
          ctx.beginPath()
          polyline(ctx, pts, size)
          if (pts.every((q) => q !== null) && holes.every((hole) => hole.every((q) => q !== null))) {
            ctx.closePath()
            for (const hole of holes) {
              polyline(ctx, hole, size)
              ctx.closePath()
            }
            ctx.fill('evenodd')
            const full = pts as [number, number][]
            const fullHoles = holes as [number, number][][]
            outlineHits.current.push({ k, pts: full, holes: fullHoles, area: polygonArea(full) - fullHoles.reduce((sum, hole) => sum + polygonArea(hole), 0) })
            outlined.add(key)
            const prev = best.get(key)
            const better = !prev || (prev.faint && o.level !== 1) || (prev.faint === (o.level === 1) && r > prev.r)
            if (c && !sel && !o.region && outlineObjects?.[k] && better && aboveHorizon(ring.centre)) {
              const top = full.reduce((a, b) => (b[1] < a[1] ? b : a))
              best.set(key, { k, c, top, r, faint: o.level === 1 })
            }
          }
          ctx.stroke()
        }
      })
      ctx.globalAlpha = 1
      for (const [key, l] of best) {
        const dso = outlineObjects![l.k]!
        // Obiekty Messiera przy polu < 90° mają już własną etykietę przy znaczniku (o ile znaczniki M są włączone).
        if (view.fovDeg < 90 && messier.has(dso)) continue
        const hov = key === hoverKey
        const ol = outlines[l.k]
        const lt = typeColors[dso.type]
        labelList.push({
          dso, c: l.c, top: l.top, r: l.r, prio: 1, minR: fullDome ? 8 : 5, hov, name: ol.name ?? undefined,
          color: !ol.dark ? (hov ? brighter(lt, 1) : withAlpha(lt, 0.95)) : withAlpha(lt, hov ? 0.95 : 0.62),
        })
      }
    }

    // Elipsy obiektów katalogu (wymiary i kąt pozycyjny) z włączonych grup katalogów.
    // Elipsy mniejsze niż 1,5 px pomijane, więc przy oddaleniu zostają tylko duże obiekty.
    if (showEllipses) {
      for (const d of depthObjects) {
        const a0 = (d.o.majArcmin / 120) * pxPerDeg
        const sel = selected?.i === d.o.i
        if (a0 < 1.5 + (sel ? 0 : extraRadiusPx)) continue
        if (!skyShown(d.o, skyGroups, skyExtraHidden) || outlined.has(d.o.id)) continue
        // Małe obiekty (jak B 33) powiększone do co najmniej 3 px, żeby dało się je zobaczyć i trafić.
        const k = Math.max(1, 3 / a0)
        const a = a0 * k
        const c = proj.eq(d.v)
        if (!c || c[0] < -a || c[1] < -a || c[0] > size.w + a || c[1] > size.h + a || !aboveHorizon(d.v)) continue
        const b = d.o.minArcmin > 0 ? Math.min(a, (d.o.minArcmin / 120) * pxPerDeg * k) : a
        // Oś wielka: PA liczony od północy przez wschód, kierunki N i E odczytane z rzutu w tym miejscu.
        let rot = 0
        if (d.o.paDeg !== null && b < a) {
          const n = proj.eq(unitVector(d.o.raDeg, Math.min(89.9, d.o.decDeg + 0.1)))
          const e = proj.eq(unitVector(d.o.raDeg + 0.1 / Math.max(0.01, Math.cos(d.o.decDeg * DEG)), d.o.decDeg))
          if (n && e) {
            const nx = n[0] - c[0], ny = n[1] - c[1], ex = e[0] - c[0], ey = e[1] - c[1]
            const nl = Math.hypot(nx, ny) || 1, el = Math.hypot(ex, ey) || 1
            const pa = d.o.paDeg * DEG
            rot = Math.atan2(Math.cos(pa) * ny / nl + Math.sin(pa) * ey / el, Math.cos(pa) * nx / nl + Math.sin(pa) * ex / el)
          }
        }
        const hov = hoverDepth?.i === d.o.i
        const color = typeColors[d.o.type]
        const ngc = d.o.catalogs.some((c) => c === 'NGC' || c === 'IC' || c === 'LBN')
        const tone = (a: number) => (ngc ? (hov ? brighter(color, 1) : withAlpha(color, 0.95)) : withAlpha(color, hov ? 0.95 : a))
        ctx.strokeStyle = sel ? 'rgba(0, 224, 255, 0.85)' : tone(0.5)
        ctx.setLineDash(sel || hov ? [] : [3, 3])
        ctx.beginPath()
        ctx.ellipse(c[0], c[1], a, b, rot, 0, Math.PI * 2)
        ctx.stroke()
        depthHits.current.push({ dso: d.o, c, r: a })
        if (!sel) {
          const top: [number, number] = [c[0], c[1] - Math.hypot(a * Math.sin(rot), b * Math.cos(rot))]
          labelList.push({ dso: d.o, c, top, r: a, prio: 2, minR: fullDome ? 10 : 3.5, hov, color: tone(0.7) })
        }
      }
      ctx.setLineDash([])
    }

    // Etykiety: małe, z ciemną obwódką dla czytelności; najpierw kontury, potem elipsy, od największych.
    ctx.font = '10px ui-monospace, Consolas, monospace'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 3
    // Miejsce celownika i etykiety wybranego obiektu zajęte z góry.
    const boxes: [number, number, number, number][] = []
    const sp = selected ? proj.eq(unitVector(selected.raDeg, selected.decDeg)) : null
    if (sp) boxes.push([sp[0] - 24, sp[1] - 24, sp[0] + 24, sp[1] + 24], [sp[0] + 14, sp[1] + 12, sp[0] + 110, sp[1] + 30])
    // Etykiety Messiera (rysowane niżej, przy polu < 90°) też zajmują miejsce.
    if (showAnnotations && view.fovDeg < 90 && labelList.length) {
      for (const o of messier) {
        const p = proj.eq(unitVector(o.raDeg, o.decDeg))
        if (p) boxes.push([p[0] - 4, p[1] - 7, p[0] + 8 + ctx.measureText(o.id).width, p[1] + 5])
      }
    }
    labelList.sort((p, q) => p.prio - q.prio || q.r - p.r)
    // Przełącznik „Opisy”: bez podpisów konturów i elips.
    for (const l of showAnnotations ? labelList : []) {
      if (l.r < l.minR && !l.hov) continue
      // Kontury: nazwa zawsze (też małe, jak Irys w LDN 1174); elipsy dopiero od 40 px. Na kopule nazwy angielskie.
      const name = l.prio === 1 || l.r >= 40 ? l.dso.namesEn[0] || l.name || '' : ''
      const text = name ? l.dso.id + ' · ' + name : l.dso.id
      const w = ctx.measureText(text).width
      // Mały kształt: etykieta z prawej (jak przy znacznikach Messiera); duży: nad najwyższym punktem. Gdy miejsce
      // zajęte: z lewej, dalej od środka (obiekt pod celownikiem, jak B 33 w IC 434) i pod kształtem.
      const [cx, cy] = l.c
      const spots: [number, number][] = [
        l.r < 12 ? [cx + l.r + 4, cy + 3] : [l.top[0] - w / 2, l.top[1] - 4],
        [cx - l.r - 4 - w, cy + 3],
        [cx + Math.max(l.r + 4, 28), cy + 3],
        [cx - Math.max(l.r + 4, 28) - w, cy + 3],
        [cx - w / 2, cy + Math.max(l.r + 12, 38)],
      ]
      let box: [number, number, number, number] | null = null
      let x = 0, y = 0
      for (const [sx, sy] of spots) {
        x = Math.max(4, Math.min(size.w - w - 4, sx))
        y = sy
        const b: [number, number, number, number] = [x - 2, y - 10, x + w + 2, y + 3]
        if (!boxes.some((bx) => b[0] < bx[2] && b[2] > bx[0] && b[1] < bx[3] && b[3] > bx[1])) {
          box = b
          break
        }
      }
      if (!box) continue
      boxes.push(box)
      ctx.strokeStyle = 'rgba(2, 5, 13, 0.8)'
      ctx.strokeText(text, x, y)
      ctx.fillStyle = l.color
      ctx.fillText(text, x, y)
    }
    ctx.restore()

    // Nazwy gwiazdozbiorów.
    if (sky && showLabels) {
      ctx.textAlign = 'center'
      for (const c of sky.constellations) {
        if (!c.label) continue
        if (fullDome && c.label[2] > 2) continue
        const lv = unitVector(c.label[0], c.label[1])
        if (horMatrix[6] * lv[0] + horMatrix[7] * lv[1] + horMatrix[8] * lv[2] < 0.02) continue
        const p = proj.eq(lv)
        if (!p) continue
        const hovered = hoverCon?.abbr === c.abbr
        ctx.font = hovered ? '600 13px Inter, sans-serif' : '12px Inter, sans-serif'
        ctx.fillStyle = hovered ? 'rgba(0, 224, 255, 0.95)' : 'rgba(190, 205, 230, 0.55)'
        ctx.fillText(c.pl, p[0], p[1])
      }
      ctx.textAlign = 'start'
    }

    // Obiekty Messiera (małe znaczniki) przy przybliżeniu.
    if (view.fovDeg < 150) {
      ctx.font = '10px ui-monospace, Consolas, monospace'
      for (const o of messier) {
        const p = proj.eq(unitVector(o.raDeg, o.decDeg))
        if (!p || p[0] < 0 || p[1] < 0 || p[0] > size.w || p[1] > size.h) continue
        ctx.strokeStyle = withAlpha(typeColors[o.type], 0.85)
        ctx.beginPath()
        ctx.arc(p[0], p[1], 3.5, 0, Math.PI * 2)
        ctx.stroke()
        if (showAnnotations && view.fovDeg < 90) {
          ctx.fillStyle = withAlpha(typeColors[o.type], 0.85)
          ctx.fillText(o.id.replace(' ', ''), p[0] + 6, p[1] + 3)
        }
      }
    }

    // Księżyc z fazą i Słońce.
    const drawSun = (alt: number, az: number, r: number) => {
      const p = toScreenHor(alt, az)
      if (!p) return
      ctx.save()
      const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 3)
      g.addColorStop(0, 'rgba(255, 220, 140, 0.9)')
      g.addColorStop(1, 'rgba(255, 180, 60, 0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(p[0], p[1], r * 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    if (sun.altDeg > -2) drawSun(sun.altDeg, sun.azDeg, 8)

    // Tor Księżyca przez noc; przełącznik „Tory” steruje nim razem z torem obiektu.
    if (showTracks && moonTrack.length) {
      ctx.save()
      ctx.setLineDash([3, 5])
      ctx.strokeStyle = 'rgba(220, 225, 235, 0.65)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      let started = false
      const moonPoints: { p: [number, number]; t: number }[] = []
      for (const point of moonTrack) {
        const p = point.altDeg > -1 ? toScreenHor(point.altDeg, point.azDeg) : null
        if (!p) {
          started = false
          continue
        }
        moonPoints.push({ p, t: point.t })
        if (!started) ctx.moveTo(p[0], p[1])
        else ctx.lineTo(p[0], p[1])
        started = true
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.font = '10px ui-monospace, Consolas, monospace'
      for (const { p, t } of moonPoints) {
        const local = fmtTime(t, tz)
        if (Number(local.slice(3, 5)) >= 10) continue
        ctx.fillStyle = 'rgba(220, 225, 235, 0.85)'
        ctx.beginPath()
        ctx.arc(p[0], p[1], 2.2, 0, Math.PI * 2)
        ctx.fill()
        if (Number(local.slice(0, 2)) % 2 === 0) {
          ctx.fillStyle = 'rgba(220, 225, 235, 0.7)'
          ctx.fillText(local.slice(0, 2), p[0] + 5, p[1] - 4)
        }
      }
      if (moonPoints.length) {
        for (const end of [moonPoints[0], moonPoints[moonPoints.length - 1]]) {
          ctx.fillStyle = '#e1e5ed'
          ctx.beginPath()
          ctx.arc(end.p[0], end.p[1], 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()
    }

    // Tor obiektu przez noc z godzinami.
    if (selected && showTracks && track.length) {
      ctx.save()
      ctx.setLineDash([5, 5])
      ctx.strokeStyle = 'rgba(0, 224, 255, 0.75)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      let started = false
      const pts: { p: [number, number]; t: number; alt: number }[] = []
      for (const s of track) {
        const p = s.alt > -1 ? toScreenHor(s.alt, s.az) : null
        if (!p) {
          started = false
          continue
        }
        pts.push({ p, t: s.t, alt: s.alt })
        if (!started) ctx.moveTo(p[0], p[1])
        else ctx.lineTo(p[0], p[1])
        started = true
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.font = '10px ui-monospace, Consolas, monospace'
      const hourLabels = new Set<string>()
      for (const t of localHourTicks(night.startMs, night.endMs, tz)) {
        const h = altAz(selected, t, site)
        if (h.altDeg <= -1) continue
        const p = toScreenHor(h.altDeg, h.azDeg)
        if (!p) continue
        ctx.fillStyle = 'rgba(0, 224, 255, 0.9)'
        ctx.beginPath()
        ctx.arc(p[0], p[1], 2.2, 0, Math.PI * 2)
        ctx.fill()
        const hour = fmtTime(t, tz).slice(0, 2)
        if (Number(hour) % 2 === 0 && !hourLabels.has(hour)) {
          hourLabels.add(hour)
          ctx.fillStyle = 'rgba(160, 220, 240, 0.65)'
          ctx.fillText(hour, p[0] + 5, p[1] - 4)
        }
      }
      if (pts.length) {
        for (const end of [pts[0], pts[pts.length - 1]]) {
          ctx.fillStyle = '#9ef3ff'
          ctx.beginPath()
          ctx.arc(end.p[0], end.p[1], 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()
    }

    // Ziemia: maska liczona punkt po punkcie w zmniejszonej rozdzielczości (piksel ekranu → kierunek → czy pod
    // horyzontem). W przeciwieństwie do wielokątów po rzucie działa poprawnie przy każdym przybliżeniu i rozmiarze.
    ctx.save()
    drawGround(ctx, proj, horizon, size.w, size.h, view.fovDeg, radius)
    // Nakładka DOM Księżyca dostaje tę samą maskę gruntu co postacie, w swoim lokalnym układzie.
    if (moonRef.current && moonPoint && groundCanvas) {
      // Kodowanie PNG maski kosztuje ok. 1 ms; robimy je tylko, gdy tarcza lub podpis zachodzą na ziemię.
      // Prostokąt z zapasem: tarcza, odstęp i podpis „Księżyc” (ok. 50 px).
      const left = moonPoint[0] - moonMarkerSize / 2
      const top = moonPoint[1] - moonMarkerSize / 2
      const covered = overlapsGround(left, top, left + moonMarkerSize + 80, top + Math.max(moonMarkerSize, 16))
      const nextMaskKey = covered ? `${Math.round(moonPoint[0] * 2)},${Math.round(moonPoint[1] * 2)}|${moonMarkerSize}|${dpr}|${getGroundCacheKey()}` : 'bez maski'
      if (moonMaskKey.current !== nextMaskKey && !covered) {
        moonMaskKey.current = nextMaskKey
        moonRef.current.style.maskImage = ''
      } else if (moonMaskKey.current !== nextMaskKey) {
        moonMaskKey.current = nextMaskKey
        const mask = moonMask.current ??= document.createElement('canvas')
        mask.width = Math.ceil(moonRef.current.offsetWidth * dpr)
        mask.height = Math.ceil(moonRef.current.offsetHeight * dpr)
        const mc = mask.getContext('2d')!
        mc.fillStyle = '#fff'
        mc.fillRect(0, 0, mask.width, mask.height)
        mc.globalCompositeOperation = 'destination-out'
        mc.setTransform(dpr, 0, 0, dpr, -(moonPoint[0] - moonMarkerSize / 2) * dpr, -(moonPoint[1] - moonMarkerSize / 2) * dpr)
        mc.imageSmoothingEnabled = true
        // Jak dla postaci: dwa przejścia usuwają również półprzezroczysty cień pod gruntem.
        for (let i = 0; i < 2; i++) mc.drawImage(groundCanvas, 0, 0, groundCanvas.width * GROUND_STEP, groundCanvas.height * GROUND_STEP)
        moonRef.current.style.maskImage = `url(${mask.toDataURL()})`
      }
    }
    ctx.strokeStyle = horizon.length ? 'rgba(245, 165, 36, 0.55)' : 'rgba(0, 224, 255, 0.35)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    polyline(ctx, Array.from({ length: 181 }, (_, i) => toScreenHor(horizonAltitude(horizon, i * 2), i * 2)), size)
    ctx.stroke()
    ctx.restore()

    // Postać gwiazdozbioru pod kursorem: półprzezroczysta nakładka z płynnym pojawieniem. Rysowana nad ziemią,
    // żeby gwiazdozbiory nisko nad horyzontem (np. Wolarz, Korona Północna, Ryś) miały całą postać.
    // Postać zasłania tylko duży obiekt pod kursorem (kontur ≥ 2500 px² albo elipsa o promieniu ≥ 25 px);
    // obszary mgławic (tło Drogi Mlecznej) i małe obiekty jej nie blokują; inaczej np. Kasjopeja, Lutnia
    // czy Jaszczurka przy pełnej kopule nie miałyby postaci wcale.
    const outlineBlocks =
      hoverOutline !== null &&
      !outlines?.[hoverOutline]?.region &&
      outlineHits.current.some((h) => h.k === hoverOutline && h.area >= 2500)
    const depthBlocks = hoverDepth !== null && depthHits.current.some((h) => h.dso === hoverDepth && h.r >= 25)
    if (sky && showArt && hoverCon && !outlineBlocks && !depthBlocks && !playing) {
      const c = sky.byAbbr.get(hoverCon.abbr)
      if (c?.art) {
        let img = artCache.current.get(c.art.file)
        if (!img) {
          img = new Image()
          img.decoding = 'async'
          img.src = `/data/art/${c.art.file}`
          img.onload = () => setFrame((f) => f + 1)
          artCache.current.set(c.art.file, img)
        }
        const dst = c.art.anchors.map(([, , ra, dec]) => proj.eq(unitVector(ra, dec)))
        if (img.complete && img.naturalWidth && dst.every((d) => d !== null)) {
          const m = affineFrom3(
            c.art.anchors.map(([x, y]) => [x, y] as [number, number]),
            dst as [number, number][],
          )
          if (m) {
            const k = Math.min(1, (performance.now() - hoverCon.since) / 450)
            // Przy mocnym pomniejszeniu (pełna kopuła, małe gwiazdozbiory jak Lutnia) cienkie linie rysunku
            // uśredniają się prawie do zera: rysowana jest pomniejszona wersja z pogrubionymi liniami,
            // a krycie lekko rośnie.
            const imgScale = Math.hypot(m[0], m[1])
            const src = artLevel(img, c.art.file, 384 * imgScale)
            const alpha = Math.min(0.6, 0.42 / Math.min(1, imgScale) ** 0.4)
            // Postać rysowana na osobnej warstwie, z której maska ziemi (ta sama co dla gruntu) wycina wszystko pod
            // horyzontem (własnym, jeśli ustawiony) przy każdym powiększeniu i kierunku widoku.
            const layer = artLayer(overlay.width, overlay.height)
            const lc = layer.getContext('2d')!
            lc.setTransform(1, 0, 0, 1, 0, 0)
            lc.globalCompositeOperation = 'source-over'
            lc.globalAlpha = 1
            lc.clearRect(0, 0, layer.width, layer.height)
            lc.save()
            lc.imageSmoothingEnabled = true
            lc.imageSmoothingQuality = 'high'
            lc.globalAlpha = alpha * easeInOut(k)
            lc.setTransform(m[0] * dpr, m[1] * dpr, m[2] * dpr, m[3] * dpr, m[4] * dpr, m[5] * dpr)
            lc.drawImage(src, 0, 0, 384, 384)
            lc.restore()
            if (groundCanvas) {
              lc.globalCompositeOperation = 'destination-out'
              lc.imageSmoothingEnabled = true
              // Ziemia ma krycie ok. 92–98%, więc dwa przejścia, żeby pod horyzontem nie został cień postaci.
              lc.drawImage(groundCanvas, 0, 0, groundCanvas.width * GROUND_STEP * dpr, groundCanvas.height * GROUND_STEP * dpr)
              lc.drawImage(groundCanvas, 0, 0, groundCanvas.width * GROUND_STEP * dpr, groundCanvas.height * GROUND_STEP * dpr)
              lc.globalCompositeOperation = 'source-over'
            }
            ctx.save()
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalCompositeOperation = 'screen'
            ctx.drawImage(layer, 0, 0)
            ctx.restore()
          }
        }
      }
    }

    // Stopnie wysokości na siatce (nad podkładem i ziemią; w przybliżeniu szukamy widocznego punktu pierścienia).
    if (showGridLabels) {
      ctx.save()
      ctx.font = '11px ui-monospace, Consolas, monospace'
      ctx.lineWidth = 2.5
      ctx.strokeStyle = 'rgba(2, 5, 13, 0.75)'
      ctx.fillStyle = 'rgba(180, 205, 235, 0.78)'
      if (polarLabels) {
        for (const { x, y, text } of polarLabels) {
          ctx.strokeText(text, x + 4, y - 4)
          ctx.fillText(text, x + 4, y - 4)
        }
      } else for (const alt of [0, 20, 40, 60, 80]) {
        let p: [number, number] | null = null
        if (fullDome) {
          p = toScreenHor(alt, 315)
        } else {
          for (let d = 0; d <= 180; d += 5) {
            for (const az of d === 0 || d === 180 ? [view.azDeg + d] : [view.azDeg + d, view.azDeg - d]) {
              const norm = ((az % 360) + 360) % 360
              if (alt === 0 && (norm % 90 < 6 || norm % 90 > 84)) continue
              const pt = toScreenHor(alt, norm)
              if (pt && pt[0] >= 24 && pt[0] <= size.w - 38 && pt[1] >= 18 && pt[1] <= size.h - 28) {
                p = pt
                break
              }
            }
            if (p) break
          }
        }
        if (p) {
          const text = `${alt}°`
          ctx.strokeText(text, p[0] + 4, p[1] - 4)
          ctx.fillText(text, p[0] + 4, p[1] - 4)
        }
      }
      ctx.restore()
    }

    // Kierunki świata.
    ctx.font = '600 14px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const [label, az] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]] as const) {
      const p = toScreenHor(fullDome ? -3.5 : 2, az)
      if (!p || p[0] < 0 || p[0] > size.w || p[1] < 0 || p[1] > size.h) continue
      ctx.fillStyle = 'rgba(230, 240, 255, 0.9)'
      ctx.fillText(label, p[0], p[1])
    }
    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'

    // Obiekty z planu.
    ctx.font = '11px ui-monospace, Consolas, monospace'
    for (const o of planObjects) {
      if (!o || o.i === selected?.i) continue
      const p = proj.eq(unitVector(o.raDeg, o.decDeg))
      if (!p) continue
      ctx.strokeStyle = 'rgba(245, 165, 36, 0.85)'
      ctx.strokeRect(p[0] - 4, p[1] - 4, 8, 8)
      ctx.fillStyle = 'rgba(245, 200, 120, 0.85)'
      ctx.fillText(o.id, p[0] + 7, p[1] + 4)
    }

    // Obiekt pod kursorem: świecący pierścień (nazwę pokazuje dymek). Obiekty z podświetlonym konturem i duże elipsy już się
    // wyróżniają, więc pierścień tylko dla małych (znaczniki Messiera i planu, elipsy do 12 px).
    if (hoverObj && hoverObj.i !== selected?.i) {
      const p = proj.eq(unitVector(hoverObj.raDeg, hoverObj.decDeg))
      const ellipse = depthHits.current.find((h) => h.dso.i === hoverObj.i)
      const viaOutline = hoverOutline !== null && outlineObjects?.[hoverOutline]?.i === hoverObj.i
      if (p && !viaOutline && (ellipse?.r ?? 0) <= 12) {
        const r = Math.max(7, (ellipse?.r ?? 3.5) + 4)
        ctx.save()
        ctx.strokeStyle = 'rgba(230, 251, 255, 0.95)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(p[0], p[1], r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
    }

    // Wybrany obiekt (albo swobodne pole): celownik i animacja namierzania (kiedy widać ramkę: `frameShown`).
    if (selected && frameShown) {
      const p = proj.eq(unitVector(selected.raDeg, selected.decDeg))
      if (p || frame) {
        const now = performance.now()
        const k = Math.max(0, Math.min(1, (now - lockStart.current) / 900))
        const e = 1 - (1 - k) ** 3
        ctx.save()
        ctx.strokeStyle = '#00e0ff'
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.4 + 0.6 * e
        if (frame) {
          // Animacja namierzania: ramka zwęża się do właściwego rozmiaru. Odpięta ramka ma linię przerywaną.
          const { fp } = frame
          const s = 1 + (1 - e) * 1.5
          const pts = frame.pts.map(([x, y]) => [fp[0] + (x - fp[0]) * s, fp[1] + (y - fp[1]) * s] as const)
          if (!framePinned) ctx.setLineDash([6, 4])
          ctx.beginPath()
          pts.forEach(([x, y], i) => {
            if (i) ctx.lineTo(x, y)
            else ctx.moveTo(x, y)
          })
          ctx.closePath()
          ctx.stroke()
          ctx.setLineDash([])
          // Znacznik górnej krawędzi matrycy (narożniki 0 i 1): trójkąt na zewnątrz ramki.
          const mx = (pts[0][0] + pts[1][0]) / 2
          const my = (pts[0][1] + pts[1][1]) / 2
          const ol = Math.hypot(mx - fp[0], my - fp[1]) || 1
          const ox = (mx - fp[0]) / ol
          const oy = (my - fp[1]) / ol
          ctx.fillStyle = '#00e0ff'
          ctx.beginPath()
          ctx.moveTo(mx + ox * 6, my + oy * 6)
          ctx.lineTo(mx - oy * 4, my + ox * 4)
          ctx.lineTo(mx + oy * 4, my - ox * 4)
          ctx.closePath()
          ctx.fill()
        }
        // Krzyżyk w środku ramki (bez niej w miejscu obiektu).
        const [cx, cy] = frame ? frame.fp : p!
        ctx.beginPath()
        ctx.moveTo(cx - 6, cy)
        ctx.lineTo(cx + 6, cy)
        ctx.moveTo(cx, cy - 6)
        ctx.lineTo(cx, cy + 6)
        ctx.stroke()
        // Podpis przy obiekcie; ramka przeciągana albo pole: „Swobodna eksploracja” przy środku ramki.
        const roaming = freeRoam || !!dragCenter
        const at = roaming && frame ? frame.fp : p
        if (at) {
          ctx.font = '600 13px ui-monospace, Consolas, monospace'
          ctx.fillStyle = '#e6fbff'
          ctx.fillText(roaming ? FREE_ROAM_LABEL : selected.id, at[0] + 16, at[1] + 26)
        }
      }
    }
    measureSince('dome:draw', drawStart)
  })

  // ---------- Interakcja ----------

  const pick = (x: number, y: number): DSO | null => {
    if (!catalog) return null
    let best: DSO | null = null
    let bestD = 14
    const candidates = view.fovDeg < 150 ? messier : []
    for (const o of [...planObjects, ...candidates, ...(selected && !freeRoam ? [selected] : [])]) {
      if (!o) continue
      const p = proj.eq(unitVector(o.raDeg, o.decDeg))
      if (!p) continue
      const d = Math.hypot(p[0] - x, p[1] - y)
      if (d < bestD) {
        bestD = d
        best = o
      }
    }
    if (best) return best
    const d = depthAt(x, y)
    if (d) return d
    const k = outlineAt(x, y)
    return k === null ? null : outlineObjects?.[k] ?? null
  }

  /** Najmniejsza elipsa głębi pod punktem (małe obiekty łapane w promieniu 6 px). */
  const depthAt = (x: number, y: number): DSO | null => {
    let best: { dso: DSO; r: number } | null = null
    for (const h of depthHits.current) {
      if ((!best || h.r < best.r) && Math.hypot(h.c[0] - x, h.c[1] - y) <= Math.max(6, h.r)) best = h
    }
    return best?.dso ?? null
  }

  /** Najmniejszy kontur pod punktem ekranu (gromada w środku dużej mgławicy wygrywa z mgławicą). */
  const outlineAt = (x: number, y: number): number | null => {
    let best: { k: number; area: number } | null = null
    for (const h of outlineHits.current) {
      if ((!best || h.area < best.area) && pointInOutline(h.pts, h.holes, x, y)) best = h
    }
    return best?.k ?? null
  }

  /** Punkt wewnątrz odpiętej ramki: tam przeciąganie przesuwa ramkę zamiast nieba. */
  const overFrame = (x: number, y: number) => !framePinned && !!frame && pointInOutline(frame.pts, [], x, y)

  const finishFrameDrag = () => {
    const fd = frameDrag.current
    frameDrag.current = null
    cancelAnimationFrame(dragFrame.current)
    dragFrame.current = 0
    const c = latestDragCenter.current
    latestDragCenter.current = null
    setDragCenter(null)
    if (fd?.moved && c) setFreeField(c)
    return fd
  }

  /** Środek wpisany ręcznie: ramka przechodzi tam, a widok podąża, gdy nowe miejsce jest poza ekranem. */
  const applyFrameCoordinates = (c: Equatorial) => {
    setFreeField(c)
    const v = unitVector(c.raDeg, c.decDeg)
    const p = proj.eq(v)
    if (view.fovDeg > 150 || (p && p[0] >= 0 && p[0] <= size.w && p[1] >= 0 && p[1] <= size.h)) return
    const h = vecToHorizontal(mulVec(horMatrix, v))
    const to: View = { azDeg: h.azDeg, altDeg: Math.max(-10, Math.min(89.9, h.altDeg)), fovDeg: view.fovDeg }
    if (reducedMotion()) {
      anim.current = null
      setViewNow(to)
      return
    }
    anim.current = { from: view, to, start: performance.now(), dur: 900 }
    setAnimationRequest((n) => n + 1)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const fd = frameDrag.current
    if (fd) {
      if (!fd.moved && Math.abs(x - fd.x) + Math.abs(y - fd.y) <= 3) return
      fd.moved = true
      // Środek ramki idzie za kursorem z zachowaniem miejsca chwytu.
      const v = proj.unprojectHor(x + fd.grabDx, y + fd.grabDy)
      scheduleDragCenter(vecToEquatorial(mulVec(transpose(horMatrix), v)))
      return
    }
    if (drag.current) {
      const dx = x - drag.current.x
      const dy = y - drag.current.y
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true
      if (drag.current.moved) {
        anim.current = null
        const degPerPx = drag.current.view.fovDeg / (radius * 2)
        scheduleView({
          ...drag.current.view,
          azDeg: (drag.current.view.azDeg - dx * degPerPx / Math.max(0.2, Math.cos(drag.current.view.altDeg * DEG)) + 360) % 360,
          altDeg: Math.max(-20, Math.min(90, drag.current.view.altDeg + dy * degPerPx)),
        })
      }
      return
    }
    const v = proj.unprojectHor(x, y)
    const h = vecToHorizontal(v)
    if (h.altDeg < -5 || (view.fovDeg > 150 && Math.hypot(x - proj.cx, y - proj.cy) > radius * 1.02)) {
      if (hoverCon) setHoverCon(null)
      if (hoverOutline !== null) setHoverOutline(null)
      if (hoverDepth) setHoverDepth(null)
      if (hoverObj) setHoverObj(null)
      return
    }
    const visible = h.altDeg >= horizonAltitude(horizon, h.azDeg)
    const dh = visible ? depthAt(x, y) : null
    if (dh !== hoverDepth) setHoverDepth(dh)
    const k = !visible || dh ? null : outlineAt(x, y)
    if (k !== hoverOutline) setHoverOutline(k)
    const eq = vecToEquatorial(mulVec(transpose(horMatrix), v))
    const abbr = constellationOf(eq)
    if (abbr !== hoverCon?.abbr) setHoverCon({ abbr, x, y, since: performance.now() })
    else if (hoverCon) {
      hoverCon.x = x
      hoverCon.y = y
      if (tipRef.current) {
        tipRef.current.style.left = `${x}px`
        tipRef.current.style.top = `${y}px`
      }
    }
    const hit = visible ? pick(x, y) : null
    if (hit !== hoverObj) setHoverObj(hit)
    overlayRef.current!.style.cursor = overFrame(x, y) ? 'move' : hit ? 'pointer' : 'grab'
  }

  // Przybliżanie kółkiem nad kopułą.
  const setFov = (target: number) => {
    anim.current = null
    const base = pendingView.current ?? viewRef.current
    const minFov = skySurvey === 'nsnsOhs' ? NSNS_NARROWBAND_MIN_FOV : MIN_FOV
    const fovDeg = Math.max(Math.min(minFov, base.fovDeg), Math.min(184, target))
    scheduleView(fovDeg >= 184 ? FULL_DOME : { ...base, fovDeg })
  }

  // Rolka myszy przybliża tylko nad kopułą: nasłuch nie-pasywny, żeby zablokować przewijanie strony.
  const setFovRef = useRef(setFov)
  setFovRef.current = setFov
  const viewRef = useRef(view)
  viewRef.current = view
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      // Od widoku oczekującego: zdarzenia kółka w jednej klatce sumują się, zamiast liczyć od tej samej wartości.
      setFovRef.current((pendingView.current ?? viewRef.current).fovDeg * Math.exp(e.deltaY * 0.0015))
    }
    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  const hovered = hoverCon && sky ? sky.byAbbr.get(hoverCon.abbr) : null
  const hoveredOutline: { dso: DSO | null; region: string | null; outline?: Outline } | null = hoverObj
    ? { dso: hoverObj, region: null }
    : hoverDepth
    ? { dso: hoverDepth, region: null }
    : hoverOutline !== null && outlines?.[hoverOutline]
      ? { dso: outlineObjects?.[hoverOutline] ?? null, region: outlines[hoverOutline].region, outline: outlines[hoverOutline] }
      : null

  // Warstwy zachowują proporcje poprzedniej klatki, dopóki scena nie zostanie przerysowana.
  const canvasStyle = { width: size.w, height: size.h }

  return (
    <div ref={stageRef} className="sky-stage">
      <canvas ref={hipsRef} style={canvasStyle} aria-hidden />
      <canvas ref={underRef} style={canvasStyle} aria-hidden />
      <canvas ref={glRef} style={canvasStyle} aria-hidden />
      <canvas
        ref={overlayRef}
        style={canvasStyle}
        className="overlay"
        role="img"
        aria-label={`Niebo${selected ? freeRoam ? `, ${FREE_ROAM_LABEL.toLowerCase()}` : `, wybrany obiekt ${selected.id}` : ''}`}
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          setHoverCon(null)
          setHoverOutline(null)
          setHoverDepth(null)
          setHoverObj(null)
          drag.current = null
          if (frameDrag.current) finishFrameDrag()
        }}
        onPointerCancel={() => {
          drag.current = null
          frameDrag.current = null
          latestDragCenter.current = null
          setDragCenter(null)
        }}
        onPointerDown={(e) => {
          const rect = overlayRef.current!.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          if (frame && overFrame(x, y)) {
            anim.current = null
            // Podczas przeciągania ramki bez dymków i postaci gwiazdozbioru spod kursora.
            setHoverCon(null)
            frameDrag.current = { x, y, grabDx: frame.fp[0] - x, grabDy: frame.fp[1] - y, moved: false }
            return
          }
          drag.current = { x, y, view, moved: false }
        }}
        onPointerUp={(e) => {
          // Kliknięcie bez ruchu (także w ramce) wybiera obiekt pod kursorem, jak dotąd. Wyjątek: kliknięcie w odpiętą ramkę
          // na bieżącym obiekcie nie wybiera go ponownie (to przypięłoby ramkę i przeleciało do obiektu).
          const fd = frameDrag.current ? finishFrameDrag() : null
          if (fd?.moved) return
          const d = drag.current
          drag.current = null
          if (fd || (d && !d.moved)) {
            const rect = overlayRef.current!.getBoundingClientRect()
            const o = pick(e.clientX - rect.left, e.clientY - rect.top)
            if (o && !(fd && o.i === selected?.i)) select(o.i, true)
          }
        }}
        onDoubleClick={() => {
          if (reducedMotion()) {
            anim.current = null
            setViewNow(FULL_DOME)
            return
          }
          anim.current = { from: view, to: FULL_DOME, start: performance.now(), dur: 900 }
          setAnimationRequest((n) => n + 1)
        }}
      />
      {moonPoint && (
        <div
          ref={moonRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate3d(${moonPoint[0] - moonMarkerSize / 2}px, ${moonPoint[1] - moonMarkerSize / 2}px, 0)`,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            pointerEvents: 'none',
            maskSize: '100% 100%',
            maskRepeat: 'no-repeat',
          }}
        >
          <MoonDisc illumination={moon.info.illumination} waxing={moon.info.waxing} phaseName={moon.info.name} size={moonMarkerSize} />
          <span style={{ color: 'rgba(220, 225, 235, 0.7)', font: '11px Inter, sans-serif', whiteSpace: 'nowrap' }}>Księżyc</span>
        </div>
      )}
      {hoverCon && !drag.current && !dragCenter && (hoveredOutline ? (
        <div ref={tipRef} className="const-tip" style={{ left: hoverCon.x, top: hoverCon.y }}>
          {hoveredOutline.dso ? (
            <>
              <b>{hoveredOutline.dso.id}</b>
              {hoveredOutline.outline?.also.length ? <span className="dim"> · {hoveredOutline.outline.also.join(', ')}</span> : null}
              {(displayName(hoveredOutline.dso) || hoveredOutline.outline?.name) && <> {displayName(hoveredOutline.dso) || hoveredOutline.outline?.name}</>}
              <span className="dim"> · {TYPE_INFO[hoveredOutline.dso.type].short}</span>
            </>
          ) : (
            <>
              <b>{hoveredOutline.region}</b> <span className="dim">· obszar mgławic</span>
            </>
          )}
        </div>
      ) : hovered && (
        <div ref={tipRef} className="const-tip" style={{ left: hoverCon.x, top: hoverCon.y }}>
          <b>{hovered.pl}</b> <span className="dim">· {hovered.la}</span>
        </div>
      ))}
      <div className="sky-hud tl">
        {view === FULL_DOME
          ? isPolarDome ? `NIEBO · BIEGUN ${site.latDeg >= 0 ? 'PÓŁNOCNY' : 'POŁUDNIOWY'}` : 'NIEBO · ZENIT'
          : `POLE ${fmtNum(view.fovDeg, view.fovDeg < 1 ? 1 : 0)}° · AZ ${Math.round(view.azDeg)}° · H ${Math.round(view.altDeg)}°`}
      </div>
      <div className="sky-hud tr">
        {selected ? freeRoam ? FREE_ROAM_LABEL : `${selected.id} ${displayName(selected) ? '· ' + displayName(selected) : ''}` : 'Wybierz obiekt'}
      </div>
      {frameShown && pinPose && frameOnScreen && (
        <button
          className="hud-icon frame-pin"
          style={{ left: pinPose.x - pinPose.px / 2, top: pinPose.y - pinPose.px / 2, width: pinPose.px, height: pinPose.px, transform: `rotate(${pinPose.angle}deg)` }}
          aria-pressed={!framePinned}
          title={framePinned ? 'Odepnij ramkę: swobodna eksploracja (przeciągnij ramkę)' : 'Przypnij ramkę'}
          aria-label={framePinned ? 'Odepnij ramkę pola widzenia' : 'Przypnij ramkę pola widzenia'}
          onClick={() => setFramePinned(!framePinned)}
        >
          {framePinned ? <Pin size={Math.round(pinPose.px * 0.62)} /> : <PinOff size={Math.round(pinPose.px * 0.62)} />}
        </button>
      )}
      {(skySurvey || (!framePinned && frameCenter)) && (
        <div className="sky-hud bl">
          {!framePinned && frameCenter && <FrameCoordinates center={frameCenter} onApply={applyFrameCoordinates} />}
          {skySurvey && (hipsLayer.current?.failed() ? 'NSNS: nie udało się pobrać nieba z /api/hips/ · ponawiam co 20 s' : `${skyLook === 'nsnsSho' ? 'NSNS SHO' : SURVEYS[skySurvey].label} · ${SURVEYS[skySurvey].credit}`)}
        </div>
      )}
      <div className="sky-hud br" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {view !== FULL_DOME && (
          <button className="hud-icon" onClick={() => { anim.current = null; setViewNow(FULL_DOME) }} title="Cała kopuła" aria-label="Cała kopuła">
            <RefreshCw size={14} />
          </button>
        )}
        <button className="hud-icon" onClick={() => setShowPolarDome((enabled) => !enabled)}
          title="Widok biegunowy" aria-label="Widok biegunowy" aria-pressed={isPolarDome}>
          <Compass size={14} />
        </button>
      </div>
    </div>
  )
}
