// Kopuła nieba: gwiazdy w WebGL (rzut stereograficzny w shaderze), nakładka 2D z liniami i postaciami
// gwiazdozbiorów, konturami mgławic, horyzontem, torem obiektu i animacją „znajdź obiekt”. Rysuje tylko przy zmianie stanu.
import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, ZoomIn, ZoomOut } from 'lucide-react'
import {
  bodyAltAz,
  constellationOf,
  DEG,
  horizontalMatrix,
  horizontalToVec,
  moonInfo,
  mulVec,
  transpose,
  unitVector,
  vecToEquatorial,
  vecToHorizontal,
  type Mat3,
  type Vec3,
} from '../lib/astro'
import { annotationDepthOf, displayName, TYPE_INFO, type DSO, type ObjectType } from '../lib/catalog'
import { horizonAltitude, type HorizonPoint } from '../lib/horizon'
import { altitudeTrack, nightGrid } from '../lib/night'
import { loadOutlines, pointInPolygon, polygonArea, type Outline } from '../lib/outlines'
import { affineFrom3, FULL_DOME, makeProjector, type Projector, type View } from '../lib/projection'
import { loadMilkyWay, loadSky, type MilkyWay, type SkyData } from '../lib/sky'
import { useCatalog, useNight, useSelected, useSite, useTime } from '../state/data'
import { useStore } from '../state/store'
import { MoonDisc, moonPhaseImageIndex } from './MoonDisc'
import { Range } from './Range'

// Opis kroków suwaka głębi adnotacji (podpowiedź i czytnik ekranu).
const DEPTH_TITLES = [
  'Głębia 0: tylko kontury mgławic',
  'Głębia 1: + obiekty NGC, IC i Caldwella',
  'Głębia 2: + Sharpless, Barnard, van den Bergh',
  'Głębia 3: + LBN, LDN i pozostałości po supernowych',
]

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

// Suwak powiększenia w skali logarytmicznej: 0 = cała kopuła (184°), 100 = pole 8°.
const MIN_FOV = 8
const sliderToFov = (v: number) => 184 * (MIN_FOV / 184) ** (v / 100)
const fovToSlider = (fov: number) => (Math.log(fov / 184) / Math.log(MIN_FOV / 184)) * 100

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

// ---------- WebGL: gwiazdy ----------

const VS = `#version 300 es
in vec3 a_dir;
in vec2 a_magbv;
uniform mat3 u_m;
uniform vec3 u_zen;
uniform float u_scale;
uniform vec2 u_center;
uniform vec2 u_res;
uniform float u_magLimit;
uniform float u_dpr;
uniform float u_bright;
out vec3 v_color;
out float v_alpha;
vec3 bvColor(float bv) {
  float t = clamp((bv + 0.3) / 2.0, 0.0, 1.0);
  return mix(vec3(0.70, 0.82, 1.0), mix(vec3(1.0, 0.98, 0.94), vec3(1.0, 0.78, 0.55), smoothstep(0.35, 1.0, t)), smoothstep(0.0, 0.35, t));
}
void main() {
  vec3 v = u_m * a_dir;
  float d = 1.0 + v.z;
  float alt = dot(u_zen, a_dir);
  if (d < 0.02 || a_magbv.x > u_magLimit) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); gl_PointSize = 0.0; return; }
  vec2 p = u_center + 2.0 * u_scale * v.xy / d;
  vec2 clip = vec2(p.x / u_res.x * 2.0 - 1.0, p.y / u_res.y * 2.0 - 1.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  float m = u_magLimit - a_magbv.x;
  gl_PointSize = clamp(2.4 + m * 1.45, 2.4, 15.0) * u_dpr;
  v_color = bvColor(a_magbv.y);
  v_alpha = clamp(0.5 + m * 0.18, 0.45, 1.0) * smoothstep(-0.03, 0.01, alt) * u_bright;
}`

const FS = `#version 300 es
precision mediump float;
in vec3 v_color;
in float v_alpha;
out vec4 outColor;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = dot(c, c);
  if (r > 1.0) discard;
  float d = sqrt(r);
  float a = smoothstep(1.0, 0.0, d);
  a = (a * a * 0.75 + exp(-r * 18.0) * 0.5) * v_alpha;
  outColor = vec4(v_color * a, a);
}`

interface StarGL {
  draw(m: Mat3, zen: Vec3, p: Projector, width: number, height: number, dpr: number, magLimit: number, bright: number): void
  dispose(): void
}

function createStarGL(canvas: HTMLCanvasElement, sky: SkyData): StarGL | null {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true })
  if (!gl) return null
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS))
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS))
  gl.linkProgram(prog)
  const n = sky.starCount
  const dirs = new Float32Array(n * 3)
  const magbv = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) {
    const [x, y, z] = unitVector(sky.stars[i * 4], sky.stars[i * 4 + 1])
    dirs.set([x, y, z], i * 3)
    magbv.set([sky.stars[i * 4 + 2], sky.stars[i * 4 + 3]], i * 2)
  }
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const buf = (data: Float32Array, name: string, size: number) => {
    const b = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, name)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
  }
  buf(dirs, 'a_dir', 3)
  buf(magbv, 'a_magbv', 2)
  const u = (name: string) => gl.getUniformLocation(prog, name)
  const uM = u('u_m'), uZen = u('u_zen'), uScale = u('u_scale'), uCenter = u('u_center'), uRes = u('u_res'), uMag = u('u_magLimit'), uDpr = u('u_dpr'), uBright = u('u_bright')
  return {
    draw(m, zen, p, width, height, dpr, magLimit, bright) {
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      gl.bindVertexArray(vao)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      // WebGL ma oś Y w górę: środek rzutu podany jako H − cy, a „góra” widoku to +Y w obu układach.
      gl.uniformMatrix3fv(uM, true, new Float32Array(m))
      gl.uniform3f(uZen, zen[0], zen[1], zen[2])
      gl.uniform1f(uScale, p.scale * dpr)
      gl.uniform2f(uCenter, p.cx * dpr, (height - p.cy) * dpr)
      gl.uniform2f(uRes, width * dpr, height * dpr)
      gl.uniform1f(uMag, magLimit)
      gl.uniform1f(uDpr, Math.min(dpr, 1.5))
      gl.uniform1f(uBright, bright)
      gl.drawArrays(gl.POINTS, 0, n)
    },
    dispose() {
      // Kontekst zostaje przy płótnie (StrictMode tworzy scenę dwa razy); zwalniamy tylko bufory i program.
      gl.deleteProgram(prog)
      gl.deleteVertexArray(vao)
    },
  }
}

/** Kolor „#rrggbb” z przezroczystością (tokeny typów obiektów z :root). */
function withAlpha(hex: string, a: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  return m ? `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${a})` : `rgba(160, 175, 200, ${a})`
}

// ---------- Postacie gwiazdozbiorów ----------

const artLevels = new Map<string, HTMLCanvasElement>()
let artLayerCanvas: HTMLCanvasElement | null = null

/** Płótno robocze postaci w rozmiarze nakładki (piksele urządzenia). */
function artLayer(w: number, h: number): HTMLCanvasElement {
  artLayerCanvas ??= document.createElement('canvas')
  if (artLayerCanvas.width !== w || artLayerCanvas.height !== h) {
    artLayerCanvas.width = w
    artLayerCanvas.height = h
  }
  return artLayerCanvas
}

/**
 * Wersja ilustracji dla rozmiaru na ekranie `screenPx`: oryginał tylko przy prawie pełnym rozmiarze, poniżej
 * najbliższy większy poziom (192, 96 lub 48 px) pogrubiony: kilka przesuniętych kopii łączonych trybem „lighten”
 * (najjaśniejszy piksel), żeby cienkie linie nie zniknęły, a wypełnienia nie przepaliły się do bieli.
 */
function artLevel(img: HTMLImageElement, file: string, screenPx: number): CanvasImageSource {
  const size = screenPx > 320 ? 384 : screenPx > 150 ? 192 : screenPx > 72 ? 96 : 48
  if (size === 384) return img
  const key = `${file}@${size}`
  let level = artLevels.get(key)
  if (!level) {
    level = document.createElement('canvas')
    level.width = level.height = size
    const g = level.getContext('2d')!
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    g.globalCompositeOperation = 'lighten'
    const passes = size >= 96 ? [[0, 0], [0.5, 0], [0, 0.5]] : [[0, 0], [0.6, 0], [0, 0.6], [-0.6, 0], [0, -0.6]]
    for (const [dx, dy] of passes) g.drawImage(img, dx, dy, size, size)
    artLevels.set(key, level)
  }
  return level
}

// ---------- Ziemia i linie ----------

type Pt = [number, number] | null

/** Łamana z przerwami w punktach niewidocznych i przy skokach dłuższych niż ekran (punkty za obserwatorem). */
function polyline(ctx: CanvasRenderingContext2D, pts: Pt[], size: { w: number; h: number }) {
  const maxJump = Math.max(size.w, size.h) * 0.6
  let prev: Pt = null
  for (const p of pts) {
    if (p && prev && Math.hypot(p[0] - prev[0], p[1] - prev[1]) < maxJump) ctx.lineTo(p[0], p[1])
    else if (p) ctx.moveTo(p[0], p[1])
    prev = p
  }
}

const groundCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
const GROUND_STEP = 3 // piksele CSS na piksel maski

/** Maska ziemi: każdy piksel maski → kierunek (rzut odwrotny) → wysokość pod horyzontem? Brzeg wygładzony. */
function drawGround(ctx: CanvasRenderingContext2D, proj: Projector, horizon: readonly HorizonPoint[], w: number, h: number, fovDeg: number, radius: number) {
  if (!groundCanvas) return
  const mw = Math.ceil(w / GROUND_STEP)
  const mh = Math.ceil(h / GROUND_STEP)
  if (groundCanvas.width !== mw || groundCanvas.height !== mh) {
    groundCanvas.width = mw
    groundCanvas.height = mh
  }
  const g = groundCanvas.getContext('2d')!
  const img = g.createImageData(mw, mh)
  // Wysokość horyzontu co 0,5° azymutu (tablica zamiast interpolacji dla każdego piksela).
  const table = new Float32Array(721)
  for (let i = 0; i <= 720; i++) table[i] = horizonAltitude(horizon, i / 2)
  const m = proj.horToView
  const k = 1 / (2 * proj.scale)
  // Szerokość brzegu w stopniach ≈ jeden piksel maski.
  const edgeDeg = Math.max(0.05, (fovDeg / (2 * radius)) * GROUND_STEP)
  for (let j = 0; j < mh; j++) {
    const y = (j + 0.5) * GROUND_STEP
    const Y = -(y - proj.cy) * k
    for (let i = 0; i < mw; i++) {
      const X = ((i + 0.5) * GROUND_STEP - proj.cx) * k
      const rr = X * X + Y * Y
      const inv = 1 / (1 + rr)
      const vx = 2 * X * inv
      const vy = 2 * Y * inv
      const vz = (1 - rr) * inv
      // Widok → horyzontalny (transpozycja macierzy widoku).
      const hx = m[0] * vx + m[3] * vy + m[6] * vz
      const hy = m[1] * vx + m[4] * vy + m[7] * vz
      const hz = m[2] * vx + m[5] * vy + m[8] * vz
      const alt = Math.asin(Math.max(-1, Math.min(1, hz))) / DEG
      let az = Math.atan2(hy, hx) / DEG
      if (az < 0) az += 360
      const limit = table[Math.round(az * 2)]
      const a = Math.max(0, Math.min(1, (limit - alt) / edgeDeg + 0.5))
      if (a <= 0) continue
      const o = (j * mw + i) * 4
      // Ku dołowi ekranu ciemniej, jak wcześniejszy gradient.
      const shade = 1 - Math.min(1, (y / h) * 0.6)
      img.data[o] = 3 * shade
      img.data[o + 1] = 6 * shade
      img.data[o + 2] = 12 * shade
      img.data[o + 3] = a * (235 + 15 * (1 - shade))
    }
  }
  g.putImageData(img, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(groundCanvas, 0, 0, mw * GROUND_STEP, mh * GROUND_STEP)
}

// ---------- Droga Mleczna ----------

const mwCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
const MW_STEP = 4 // piksele CSS na próbkę

/** Smuga Drogi Mlecznej: dla każdej próbki ekranu kierunek J2000 → jasność z siatki RA/Dec (dwuliniowo), potem
 *  powiększenie z wygładzaniem i rysowanie w trybie „screen”. Ziemia rysowana później zakrywa część pod horyzontem. */
function drawMilkyWay(ctx: CanvasRenderingContext2D, proj: Projector, mw: MilkyWay, horizon: readonly HorizonPoint[], w: number, h: number, alpha: number) {
  if (!mwCanvas || alpha <= 0) return
  const table = new Float32Array(721)
  for (let i = 0; i <= 720; i++) table[i] = horizonAltitude(horizon, i / 2)
  const cw = Math.ceil(w / MW_STEP)
  const ch = Math.ceil(h / MW_STEP)
  if (mwCanvas.width !== cw || mwCanvas.height !== ch) {
    mwCanvas.width = cw
    mwCanvas.height = ch
  }
  const g = mwCanvas.getContext('2d')!
  const img = g.createImageData(cw, ch)
  const m = proj.eqToView
  const hm = proj.horToView
  const k = 1 / (2 * proj.scale)
  const { w: gw, h: gh, data } = mw
  for (let j = 0; j < ch; j++) {
    const Y = -((j + 0.5) * MW_STEP - proj.cy) * k
    for (let i = 0; i < cw; i++) {
      const X = ((i + 0.5) * MW_STEP - proj.cx) * k
      const rr = X * X + Y * Y
      const inv = 1 / (1 + rr)
      const vx = 2 * X * inv
      const vy = 2 * Y * inv
      const vz = (1 - rr) * inv
      // Tylko nad horyzontem (własnym, z wygaszaniem w 1°): ziemia przykrywa smugę niecałkowicie, a poza kręgiem
      // kopuły nie ma jej wcale.
      const hx = hm[0] * vx + hm[3] * vy + hm[6] * vz
      const hy = hm[1] * vx + hm[4] * vy + hm[7] * vz
      const alt = Math.asin(Math.max(-1, Math.min(1, hm[2] * vx + hm[5] * vy + hm[8] * vz))) / DEG
      let az = Math.atan2(hy, hx) / DEG
      if (az < 0) az += 360
      const fade = Math.min(1, alt - table[Math.round(az * 2)])
      if (fade <= 0) continue
      // Widok → J2000 (transpozycja macierzy).
      const ex = m[0] * vx + m[3] * vy + m[6] * vz
      const ey = m[1] * vx + m[4] * vy + m[7] * vz
      const ez = m[2] * vx + m[5] * vy + m[8] * vz
      let ra = Math.atan2(ey, ex) / DEG
      if (ra < 0) ra += 360
      const dec = Math.asin(Math.max(-1, Math.min(1, ez))) / DEG
      const fx = (ra / 360) * gw - 0.5
      const fy = ((90 - dec) / 180) * gh - 0.5
      const x0 = Math.floor(fx)
      const y0 = Math.max(0, Math.min(gh - 2, Math.floor(fy)))
      const tx = fx - x0
      const ty = Math.max(0, Math.min(1, fy - y0))
      const xa = (x0 + gw) % gw
      const xb = (x0 + 1) % gw
      const v =
        (data[y0 * gw + xa] * (1 - tx) + data[y0 * gw + xb] * tx) * (1 - ty) +
        (data[(y0 + 1) * gw + xa] * (1 - tx) + data[(y0 + 1) * gw + xb] * tx) * ty
      if (v < 1) continue
      const o = (j * cw + i) * 4
      img.data[o] = 190
      img.data[o + 1] = 205
      img.data[o + 2] = 255
      img.data[o + 3] = v * alpha * fade
    }
  }
  g.putImageData(img, 0, 0)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(mwCanvas, 0, 0, cw * MW_STEP, ch * MW_STEP)
  ctx.restore()
}

// ---------- Komponent ----------

interface Props {
  /** Animacja czasu (odtwarzanie): wyłącza ciężkie elementy pośrednie. */
  playing?: boolean
}

export function SkyDome({ playing = false }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const glRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const [sky, setSky] = useState<SkyData | null>(null)
  const [milkyWay, setMilkyWay] = useState<MilkyWay | null>(null)
  const [outlines, setOutlines] = useState<Outline[] | null>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [view, setView] = useState<View>(FULL_DOME)
  const [hoverOutline, setHoverOutline] = useState<number | null>(null)
  const [hoverDepth, setHoverDepth] = useState<DSO | null>(null)
  // Obiekt pod kursorem (to samo, co wybrałoby kliknięcie): podświetlenie zwłaszcza małych obiektów bez konturu.
  const [hoverObj, setHoverObj] = useState<DSO | null>(null)
  const depthHits = useRef<{ dso: DSO; c: [number, number]; r: number }[]>([])
  const outlineHits = useRef<{ k: number; pts: [number, number][]; area: number }[]>([])
  const [hoverCon, setHoverCon] = useState<{ abbr: string; x: number; y: number; since: number } | null>(null)
  const [, setFrame] = useState(0)
  const anim = useRef<{ from: View; to: View; start: number; dur: number } | null>(null)
  const lockStart = useRef(0)
  const artCache = useRef(new Map<string, HTMLImageElement>())
  const starGL = useRef<StarGL | null>(null)
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null)

  const site = useSite()
  const time = useTime()
  const night = useNight()
  const { catalog } = useCatalog()
  const selected = useSelected()
  const horizon = useStore((s) => s.horizon)
  const showLines = useStore((s) => s.showLines)
  const showTracks = useStore((s) => s.showTracks)
  const showArt = useStore((s) => s.showArt)
  const showOutlines = useStore((s) => s.showOutlines)
  const annotationDepth = Math.min(3, useStore((s) => s.annotationDepth))
  const setDepth = useStore((s) => s.setAnnotationDepth)
  const showLabels = useStore((s) => s.showLabels)
  const showAnnotations = useStore((s) => s.showAnnotations)
  const findPulse = useStore((s) => s.findPulse)
  const plan = useStore((s) => s.plan)
  const select = useStore((s) => s.select)
  const tz = useStore((s) => s.location.timeZone)

  useEffect(() => {
    loadSky().then(setSky).catch(() => setSky(null))
    loadMilkyWay().then(setMilkyWay).catch((e) => console.error('Kopuła: Droga Mleczna', e))
  }, [])

  useEffect(() => {
    if (showOutlines && !outlines) loadOutlines().then(setOutlines).catch((e) => console.error('Kopuła: kontury mgławic', e))
  }, [showOutlines, outlines])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.max(200, e.contentRect.width), h: Math.max(200, e.contentRect.height) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!sky || !glRef.current) return
    try {
      starGL.current = createStarGL(glRef.current, sky)
    } catch (e) {
      console.error('Kopuła: WebGL niedostępny', e)
      starGL.current = null
    }
    setFrame((f) => f + 1)
    return () => {
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
  const messier = useMemo(() => (catalog ? catalog.filter((o) => o.catalogs.includes('M')) : []), [catalog])
  // Obiekty katalogu po oznaczeniu głównym, potem po aliasach.
  const catalogById = useMemo(() => {
    if (!catalog) return null
    const byId = new Map<string, DSO>()
    for (const o of catalog) byId.set(o.id, o)
    for (const o of catalog) for (const a of o.aliases) if (!byId.has(a)) byId.set(a, o)
    return byId
  }, [catalog])
  // Obiekt katalogu dla każdego konturu; regiony nie mają obiektu.
  const outlineObjects = useMemo(
    () => (outlines && catalogById ? outlines.map((o) => (o.region ? null : catalogById.get(o.id) ?? null)) : null),
    [outlines, catalogById],
  )
  // Obiekty dla suwaka głębi: z wymiarem, bez Messiera (ma własne znaczniki), z wektorem liczonym raz.
  const depthObjects = useMemo(
    () => (catalog ?? []).filter((o) => o.majArcmin > 0 && !o.catalogs.includes('M')).map((o) => ({ o, v: unitVector(o.raDeg, o.decDeg), depth: annotationDepthOf(o) })),
    [catalog],
  )
  // Kolory typów z tokenów CSS (canvas nie czyta zmiennych CSS).
  const typeColors = useMemo(() => {
    const cs = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null
    const out = {} as Record<ObjectType, string>
    for (const [type, info] of Object.entries(TYPE_INFO) as [ObjectType, { color: string }][]) {
      out[type] = cs?.getPropertyValue(info.color.slice(4, -1)).trim() || '#a0afc8'
    }
    return out
  }, [])
  /** Klucz obiektu konturu: wspólny dla poziomów 1 i 2 tego samego obiektu. */
  const outlineKey = (k: number) => outlineObjects?.[k]?.id ?? outlines?.[k].id ?? ''
  const planObjects = useMemo(() => (catalog ? plan.map((p) => catalog[p.objectIndex]).filter(Boolean) : []), [catalog, plan])

  // Animacja „znajdź obiekt”: przelot widoku do obiektu i namierzanie.
  useEffect(() => {
    if (!selected || findPulse === 0) return
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
        setView({
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
  }, [findPulse, hoverCon?.abbr])

  const dpr = Math.min(2, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1)
  const radius = Math.min(size.w, size.h) / 2 - 18
  const proj = useMemo(() => makeProjector(horMatrix, view, size.w / 2, size.h / 2, radius), [horMatrix, view, size, radius])
  const moonPoint = moon.altDeg > -2 ? proj.hor(horizontalToVec({ altDeg: moon.altDeg, azDeg: moon.azDeg })) : null

  // ---------- Rysowanie ----------
  useEffect(() => {
    const overlay = overlayRef.current
    const glCanvas = glRef.current
    if (!overlay || !glCanvas) return
    for (const c of [overlay, glCanvas]) {
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
    const fullDome = view.fovDeg > 150
    const zen: Vec3 = [horMatrix[6], horMatrix[7], horMatrix[8]]
    // Jasność nieba ze Słońca: dzień przygasza gwiazdy.
    const sunAlt = sun.altDeg
    const bright = sunAlt > 0 ? 0.08 : sunAlt > -6 ? 0.25 : sunAlt > -12 ? 0.6 : sunAlt > -18 ? 0.85 : 1
    const magLimit = Math.min(6.6, 4.6 + (184 - view.fovDeg) / 50)
    starGL.current?.draw(proj.eqToView, zen, proj, size.w, size.h, dpr, magLimit, bright)

    // Tło kopuły: kolor nieba zależny od Słońca (rysowany pod gwiazdami jako tło sceny).
    const stage = stageRef.current
    if (stage) {
      const sky1 = sunAlt > 0 ? '#16325a' : sunAlt > -6 ? '#0f2547' : sunAlt > -12 ? '#0a1934' : sunAlt > -18 ? '#071226' : '#040a18'
      stage.style.background = `radial-gradient(circle at 50% 50%, ${sky1} 0%, #02050d ${fullDome ? 62 : 120}%, #000 100%)`
    }

    // Smuga Drogi Mlecznej pod siatką i liniami; w dzień i zmierzchu słabsza razem z gwiazdami.
    if (milkyWay) drawMilkyWay(ctx, proj, milkyWay, horizon, size.w, size.h, 0.3 * bright * bright)

    const toScreenHor = (alt: number, az: number) => proj.hor(horizontalToVec({ altDeg: alt, azDeg: az }))

    // Siatka wysokości (pierścienie co 20°) i kierunki świata.
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(120, 150, 200, 0.16)'
    ctx.font = '11px ui-monospace, Consolas, monospace'
    ctx.fillStyle = 'rgba(160, 180, 210, 0.55)'
    for (const alt of [0, 20, 40, 60, 80]) {
      ctx.beginPath()
      polyline(ctx, Array.from({ length: 121 }, (_, i) => toScreenHor(alt, i * 3)), size)
      ctx.stroke()
      if (alt > 0) {
        const p = toScreenHor(alt, 315)
        if (p) ctx.fillText(`${alt}°`, p[0] + 4, p[1] - 4)
      }
    }
    for (let az = 0; az < 360; az += 45) {
      ctx.beginPath()
      const a = toScreenHor(0, az)
      const b = toScreenHor(80, az)
      if (a && b) {
        ctx.moveTo(a[0], a[1])
        ctx.lineTo(b[0], b[1])
        ctx.strokeStyle = 'rgba(120, 150, 200, 0.07)'
        ctx.stroke()
      }
    }
    // Południk (N–zenit–S) przerywaną linią.
    ctx.setLineDash([3, 6])
    ctx.strokeStyle = 'rgba(0, 224, 255, 0.22)'
    ctx.beginPath()
    polyline(ctx, Array.from({ length: 91 }, (_, i) => (i * 2 <= 90 ? toScreenHor(i * 2, 180) : toScreenHor(180 - i * 2, 0))), size)
    ctx.stroke()
    ctx.setLineDash([])

    // Linie gwiazdozbiorów.
    if (sky && showLines) {
      ctx.lineWidth = 1
      for (const c of sky.constellations) {
        const hovered = hoverCon?.abbr === c.abbr
        ctx.strokeStyle = hovered ? 'rgba(0, 224, 255, 0.75)' : 'rgba(150, 190, 230, 0.28)'
        ctx.lineWidth = hovered ? 1.4 : 1
        ctx.beginPath()
        for (const line of c.lines) {
          let prev: [number, number] | null = null
          for (const [ra, dec] of line) {
            const p = proj.eq(unitVector(ra, dec))
            if (p && prev && Math.hypot(p[0] - prev[0], p[1] - prev[1]) < size.w) {
              ctx.moveTo(prev[0], prev[1])
              ctx.lineTo(p[0], p[1])
            }
            prev = p
          }
        }
        ctx.stroke()
      }
    }

    // Kontury mgławic (OpenNGC): poziom 1 (słaby zasięg) jako delikatna poświata, pozostałe z obrysem, kontur
    // wybranego obiektu na cyjan, pod kursorem jaśniej. Pierścienie mniejsze niż 2 px i poza ekranem pomijane;
    // wypełnienie (i trafienie kursorem) tylko dla pierścieni widocznych w całości.
    outlineHits.current = []
    depthHits.current = []
    const pxPerDeg = proj.scale * DEG
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
      outlines.forEach((o, k) => {
        const key = outlineKey(k)
        const sel = selIds ? selIds.has(o.id) || o.also.some((a) => selIds.has(a)) : false
        const hov = key === hoverKey
        const faint = o.level === 1 && !sel && !hov
        // Mgławice ciemne w kolorze typu DN, pozostałe kontury w kolorze mgławic emisyjnych.
        const tint = typeColors[o.dark ? 'DN' : 'EN']
        ctx.fillStyle = sel ? 'rgba(0, 224, 255, 0.08)' : withAlpha(tint, hov ? 0.13 : faint ? 0.05 : 0.08)
        ctx.strokeStyle = sel ? 'rgba(0, 224, 255, 0.85)' : withAlpha(tint, hov ? 0.9 : faint ? 0.25 : 0.45)
        for (const ring of o.rings) {
          const r = ring.radiusDeg * pxPerDeg
          if (r < 2) continue
          const c = proj.eq(ring.centre)
          if (c ? c[0] < -2 * r || c[1] < -2 * r || c[0] > size.w + 2 * r || c[1] > size.h + 2 * r : ring.radiusDeg < 60) continue
          const pts = ring.points.map((v) => proj.eq(v))
          ctx.beginPath()
          polyline(ctx, pts, size)
          if (pts.every((q) => q !== null)) {
            ctx.closePath()
            ctx.fill()
            const full = pts as [number, number][]
            outlineHits.current.push({ k, pts: full, area: polygonArea(full) })
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
      for (const [key, l] of best) {
        const dso = outlineObjects![l.k]!
        // Obiekty Messiera przy polu < 90° mają już własną etykietę przy znaczniku.
        if (view.fovDeg < 90 && dso.catalogs.includes('M')) continue
        const hov = key === hoverKey
        const ol = outlines[l.k]
        labelList.push({
          dso, c: l.c, top: l.top, r: l.r, prio: 1, minR: fullDome ? 8 : 5, hov, name: ol.name ?? undefined,
          color: ol.dark ? withAlpha(typeColors.DN, hov ? 0.95 : 0.7) : hov ? 'rgba(255, 210, 220, 0.95)' : 'rgba(255, 178, 192, 0.62)',
        })
      }
    }

    // Głębia adnotacji: elipsy obiektów katalogu (wymiary i kąt pozycyjny), od NGC/IC po LBN/LDN według suwaka.
    // Elipsy mniejsze niż 1,5 px pomijane, więc przy oddaleniu zostają tylko duże obiekty.
    if (annotationDepth > 0) {
      for (const d of depthObjects) {
        if (d.depth > annotationDepth || outlined.has(d.o.id)) continue
        const a0 = (d.o.majArcmin / 120) * pxPerDeg
        if (a0 < 1.5) continue
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
        const sel = selected?.i === d.o.i
        const hov = hoverDepth?.i === d.o.i
        const color = typeColors[d.o.type]
        ctx.strokeStyle = sel ? 'rgba(0, 224, 255, 0.85)' : withAlpha(color, hov ? 0.95 : 0.5)
        ctx.setLineDash(sel || hov ? [] : [3, 3])
        ctx.beginPath()
        ctx.ellipse(c[0], c[1], a, b, rot, 0, Math.PI * 2)
        ctx.stroke()
        depthHits.current.push({ dso: d.o, c, r: a })
        if (!sel) {
          const top: [number, number] = [c[0], c[1] - Math.hypot(a * Math.sin(rot), b * Math.cos(rot))]
          labelList.push({ dso: d.o, c, top, r: a, prio: 2, minR: fullDome ? 10 : 3.5, hov, color: withAlpha(color, hov ? 0.95 : 0.7) })
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
      const name = l.r >= 40 ? displayName(l.dso) || l.name || '' : ''
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
        ctx.font = hovered ? '600 13px system-ui, sans-serif' : '12px system-ui, sans-serif'
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
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.55)'
        ctx.beginPath()
        ctx.arc(p[0], p[1], 3.5, 0, Math.PI * 2)
        ctx.stroke()
        if (showAnnotations && view.fovDeg < 90) {
          ctx.fillStyle = 'rgba(200, 190, 255, 0.6)'
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
      for (const { p, t } of moonPoints) {
        const local = new Date(t).toLocaleTimeString('pl-PL', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
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
      for (const { p, t } of pts) {
        const local = new Date(t).toLocaleTimeString('pl-PL', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
        if (Number(local.slice(3, 5)) >= 10) continue
        ctx.fillStyle = 'rgba(0, 224, 255, 0.9)'
        ctx.beginPath()
        ctx.arc(p[0], p[1], 2.2, 0, Math.PI * 2)
        ctx.fill()
        if (Number(local.slice(0, 2)) % 2 === 0) {
          ctx.fillStyle = 'rgba(160, 220, 240, 0.65)'
          ctx.fillText(local.slice(0, 2), p[0] + 5, p[1] - 4)
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
            if (c.art.mask) {
              // Część ilustracji (np. Wąż z rysunku Wężownika): maska w pikselach ilustracji.
              lc.beginPath()
              for (const poly of c.art.mask) {
                poly.forEach(([x, y], i) => (i ? lc.lineTo(x, y) : lc.moveTo(x, y)))
                lc.closePath()
              }
              lc.clip()
            }
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

    // Kierunki świata.
    ctx.font = '600 14px system-ui, sans-serif'
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
        ctx.shadowColor = '#00e0ff'
        ctx.shadowBlur = 10
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(p[0], p[1], r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
    }

    // Wybrany obiekt: celownik i animacja namierzania.
    if (selected) {
      const p = proj.eq(unitVector(selected.raDeg, selected.decDeg))
      if (p) {
        const now = performance.now()
        const k = Math.max(0, Math.min(1, (now - lockStart.current) / 900))
        const e = 1 - (1 - k) ** 3
        const r = 9 + (1 - e) * 40
        ctx.save()
        ctx.strokeStyle = '#00e0ff'
        ctx.shadowColor = '#00e0ff'
        ctx.shadowBlur = 12
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.4 + 0.6 * e
        ctx.beginPath()
        ctx.arc(p[0], p[1], r, 0, Math.PI * 2)
        ctx.stroke()
        // Kreski celownika.
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + (1 - e) * Math.PI
          ctx.beginPath()
          ctx.moveTo(p[0] + Math.cos(a) * (r + 4), p[1] + Math.sin(a) * (r + 4))
          ctx.lineTo(p[0] + Math.cos(a) * (r + 12), p[1] + Math.sin(a) * (r + 12))
          ctx.stroke()
        }
        if (k > 0 && k < 1) {
          ctx.globalAlpha = 1 - k
          ctx.beginPath()
          ctx.arc(p[0], p[1], 9 + k * 60, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.restore()
        ctx.font = '600 13px ui-monospace, Consolas, monospace'
        ctx.fillStyle = '#e6fbff'
        ctx.fillText(selected.id, p[0] + 16, p[1] + 26)
        const h = vecToHorizontal(mulVec(horMatrix, unitVector(selected.raDeg, selected.decDeg)))
        if (h.altDeg < horizonAltitude(horizon, h.azDeg)) {
          ctx.font = '11px system-ui, sans-serif'
          ctx.fillStyle = 'rgba(245, 165, 36, 0.9)'
          ctx.fillText('pod horyzontem', p[0] + 16, p[1] + 41)
        }
      }
    }
  })

  // ---------- Interakcja ----------

  const pick = (x: number, y: number): DSO | null => {
    if (!catalog) return null
    let best: DSO | null = null
    let bestD = 14
    const candidates = view.fovDeg < 150 ? messier : []
    for (const o of [...planObjects, ...candidates, ...(selected ? [selected] : [])]) {
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
      if ((!best || h.area < best.area) && pointInPolygon(h.pts, x, y)) best = h
    }
    return best?.k ?? null
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (drag.current) {
      const dx = x - drag.current.x
      const dy = y - drag.current.y
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true
      if (drag.current.moved && view.fovDeg < 180) {
        const degPerPx = drag.current.view.fovDeg / (radius * 2)
        setView({
          ...drag.current.view,
          azDeg: (drag.current.view.azDeg - dx * degPerPx / Math.max(0.2, Math.cos(drag.current.view.altDeg * DEG)) + 360) % 360,
          altDeg: Math.max(-20, Math.min(89.9, drag.current.view.altDeg + dy * degPerPx)),
        })
      }
      return
    }
    const v = proj.unprojectHor(x, y)
    const h = vecToHorizontal(v)
    if (h.altDeg < -5 || Math.hypot(x - proj.cx, y - proj.cy) > radius * 1.02 && view.fovDeg > 150) {
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
    else if (hoverCon) setHoverCon({ ...hoverCon, x, y })
    const hit = visible ? pick(x, y) : null
    if (hit !== hoverObj) setHoverObj(hit)
    overlayRef.current!.style.cursor = hit ? 'pointer' : view.fovDeg < 180 ? 'grab' : 'crosshair'
  }

  // Przybliżanie suwakiem albo rolką nad kopułą.
  const setFov = (target: number) =>
    setView((v) => {
      const fovDeg = Math.max(MIN_FOV, Math.min(184, target))
      if (fovDeg >= 184) return FULL_DOME
      // Przybliżenie do środka bieżącego widoku, bez zmiany kierunku i obrotu.
      return { ...v, fovDeg }
    })

  // Rolka myszy przybliża tylko nad kopułą: nasłuch nie-pasywny, żeby zablokować przewijanie strony.
  const setFovRef = useRef(setFov)
  setFovRef.current = setFov
  const viewRef = useRef(view)
  viewRef.current = view
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setFovRef.current(viewRef.current.fovDeg * Math.exp(e.deltaY * 0.0015))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const hovered = hoverCon && sky ? sky.byAbbr.get(hoverCon.abbr) : null
  const hoveredOutline: { dso: DSO | null; region: string | null; outline?: Outline } | null = hoverObj
    ? { dso: hoverObj, region: null }
    : hoverDepth
    ? { dso: hoverDepth, region: null }
    : hoverOutline !== null && outlines?.[hoverOutline]
      ? { dso: outlineObjects?.[hoverOutline] ?? null, region: outlines[hoverOutline].region, outline: outlines[hoverOutline] }
      : null

  return (
    <div ref={stageRef} className="sky-stage">
      <canvas ref={glRef} aria-hidden />
      <canvas
        ref={overlayRef}
        className="overlay"
        role="img"
        aria-label={`Kopuła nieba${selected ? `, wybrany obiekt ${selected.id}` : ''}`}
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          setHoverCon(null)
          setHoverOutline(null)
          setHoverDepth(null)
          setHoverObj(null)
          drag.current = null
        }}
        onPointerDown={(e) => {
          const rect = overlayRef.current!.getBoundingClientRect()
          drag.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, view, moved: false }
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerUp={(e) => {
          const d = drag.current
          drag.current = null
          if (d && !d.moved) {
            const rect = overlayRef.current!.getBoundingClientRect()
            const o = pick(e.clientX - rect.left, e.clientY - rect.top)
            if (o) select(o.i, true)
          }
        }}
        onDoubleClick={() => {
          anim.current = { from: view, to: FULL_DOME, start: performance.now(), dur: 900 }
          setFrame((f) => f + 1)
          setHoverCon((h) => (h ? { ...h } : h))
        }}
      />
      {moonPoint && (
        <div
          style={{
            position: 'absolute',
            left: moonPoint[0] - moonMarkerSize / 2,
            top: moonPoint[1] - moonMarkerSize / 2,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            pointerEvents: 'none',
          }}
        >
          <MoonDisc phaseIndex={moonPhaseImageIndex(moon.info.phaseDeg)} phaseName={moon.info.name} size={moonMarkerSize} />
          <span style={{ color: 'rgba(220, 225, 235, 0.7)', font: '11px system-ui, sans-serif', whiteSpace: 'nowrap' }}>Księżyc</span>
        </div>
      )}
      {hoverCon && !drag.current && (hoveredOutline ? (
        <div className="const-tip" style={{ left: hoverCon.x, top: hoverCon.y }}>
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
        <div className="const-tip" style={{ left: hoverCon.x, top: hoverCon.y }}>
          <b>{hovered.pl}</b> <span className="dim">· {hovered.la}</span>
        </div>
      ))}
      <div className="sky-hud tl">
        {view.fovDeg > 150 ? 'KOPUŁA · ZENIT' : `POLE ${Math.round(view.fovDeg)}° · AZ ${Math.round(view.azDeg)}° · H ${Math.round(view.altDeg)}°`}
      </div>
      <div className="sky-hud tr">
        {selected ? `${selected.id} ${displayName(selected) ? '· ' + displayName(selected) : ''}` : 'Wybierz obiekt'}
      </div>
      <div className="sky-hud br hud-stack">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
        {view.fovDeg < 180 && (
          <button className="hud-icon hud-reset" onClick={() => setView(FULL_DOME)} title="Cała kopuła" aria-label="Cała kopuła">
            <RefreshCw size={14} />
          </button>
        )}
        <div className="zoom-slider">
          <ZoomOut size={14} aria-hidden />
          <Range
            min={0}
            max={100}
            step={1}
            value={Math.round(fovToSlider(view.fovDeg))}
            onChange={(e) => setFov(sliderToFov(Number(e.target.value)))}
            aria-label="Powiększenie kopuły"
          />
          <ZoomIn size={14} aria-hidden />
        </div>
        </div>
        <label className="zoom-slider" title={DEPTH_TITLES[annotationDepth]}>
          <LayersIcon filled={false} />
          <Range
            min={0}
            max={3}
            step={1}
            value={annotationDepth}
            onChange={(e) => setDepth(Number(e.target.value))}
            aria-label="Głębia adnotacji kopuły"
            aria-valuetext={DEPTH_TITLES[annotationDepth]}
          />
          <LayersIcon filled />
        </label>
      </div>
    </div>
  )
}
