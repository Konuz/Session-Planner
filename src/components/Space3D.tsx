// Pozycja obiektu w przestrzeni 3D (three.js, ładowane leniwie). Odległości z Wikidata (mediana podanych wartości),
// kierunek ze współrzędnych galaktycznych. Dwie skale: Droga Mleczna (liniowa, 1 j. = 1000 lś) i Wszechświat
// lokalny (logarytmiczna). W tle wszystkie obiekty katalogu z odległością.
import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { galacticVector } from '../lib/astro'
import { TYPE_INFO, type DSO, type ObjectType } from '../lib/catalog'
import { useCatalog, useSelected } from '../state/data'
import { useStore } from '../state/store'
import { Range } from './Range'
import { LayersIcon } from './SkyDome'
import { useOutside } from './TopBar'

const SUN_TO_GC_KLY = 26.7
const GALACTIC_LIMIT_LY = 150_000
const MILKY_WAY_DIAMETER_LY = 100_000
const UNIVERSE_GALAXY_SCALE = 0.12
const TYPE_RGB: Record<ObjectType, number> = { G: 0xa78bfa, GG: 0xa78bfa, EN: 0xf43f5e, RN: 0x60a5fa, DN: 0xf59e0b, PN: 0x2dd4bf, SNR: 0xfb923c, OC: 0xfacc15, GC: 0xfacc15, CN: 0xf43f5e, X: 0x99a1af }
type GalaxyProfile = {
  kind: 'spiral' | 'flocculent' | 'elliptical' | 'irregular'
  label: string
  axisRatio: number
  core: number
  bar?: boolean
  knots?: number
}

// Typy: https://ned.ipac.caltech.edu/level5/Mateo/table1.html
// M33: https://www.nao.ac.jp/en/gallery/weekly/2017/20170307-subaru.html
// Parametry rozkładu gwiazd są ilustracją morfologii, nie rekonstrukcją pojedynczych gwiazd.
const LOCAL_GROUP_SHAPES: Record<string, GalaxyProfile> = {
  'M 31': { kind: 'spiral', label: 'Sb - spiralna, duże zgrubienie i pierścień', axisRatio: 1, core: 0.28 },
  'M 33': { kind: 'flocculent', label: 'Scd - spiralna, luźne i poszarpane ramiona', axisRatio: 1, core: 0 },
  'M 32': { kind: 'elliptical', label: 'cE2 - zwarta eliptyczna', axisRatio: 0.8, core: 0.65 },
  'M 110': { kind: 'elliptical', label: 'dE5 - karłowata eliptyczna', axisRatio: 0.5, core: 0.12 },
  'NGC 147': { kind: 'elliptical', label: 'dE5 - rozproszona eliptyczna', axisRatio: 0.5, core: 0 },
  'NGC 185': { kind: 'elliptical', label: 'dE3 - karłowata eliptyczna', axisRatio: 0.7, core: 0.2 },
  'NGC 292': { kind: 'irregular', label: 'SMC - nieregularna, poprzeczka i skrzydło', axisRatio: 0.5, core: 0, bar: true, knots: 7 },
  'NGC 6822': { kind: 'irregular', label: 'IBm - nieregularna z poprzeczką', axisRatio: 0.7, core: 0, bar: true, knots: 6 },
  'IC 10': { kind: 'irregular', label: 'dIrr - nieregularna, intensywne tworzenie gwiazd', axisRatio: 0.8, core: 0, knots: 16 },
  'IC 1613': { kind: 'irregular', label: 'dIrr - rozproszona nieregularna', axisRatio: 0.8, core: 0, knots: 5 },
}

type Scale = 'galaxy' | 'universe'

// Suwak liczby galaktyk (skala Wszechświat lokalny): górna granica odległości na każdym poziomie.
const GALAXY_LEVELS = [
  { maxLy: 5e6, title: 'Galaktyki 0: tylko Grupa Lokalna (do 5 mln lś)' },
  { maxLy: 5e7, title: 'Galaktyki 1: do 50 mln lś' },
  { maxLy: 5e8, title: 'Galaktyki 2: do 500 mln lś' },
  { maxLy: Infinity, title: 'Galaktyki 3: wszystkie z odległością' },
]

/** Galaktyczne (x ku centrum, y ku l = 90°, z ku biegunowi N) → three.js (y w górę). */
const toThree = (g: [number, number, number]) => new THREE.Vector3(g[0], g[2], -g[1])

/** Położenie w scenie: Droga Mleczna: tys. lś od centrum Galaktyki; Wszechświat: skala log. od Słońca. */
function position(o: Pick<DSO, 'raDeg' | 'decDeg'>, distLy: number, scale: Scale): THREE.Vector3 {
  const v = galacticVector(o)
  if (scale === 'galaxy') {
    const d = distLy / 1000
    return toThree([v[0] * d - SUN_TO_GC_KLY, v[1] * d, v[2] * d])
  }
  const r = Math.max(0, Math.log10(distLy / 1e4)) * 22
  return toThree([v[0] * r, v[1] * r, v[2] * r])
}

function milkyWay(count: number, texture: THREE.Texture): THREE.Points {
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const rnd = (() => {
    let s = 7
    return () => ((s = (s * 16807) % 2147483647) / 2147483647)
  })()
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd())
  for (let i = 0; i < count; i++) {
    let x: number, y: number, z: number, c: [number, number, number]
    if (i < count * 0.22) {
      // Zgrubienie centralne z poprzeczką.
      const r = Math.abs(gauss()) * 4.5
      const a = rnd() * Math.PI * 2
      x = Math.cos(a) * r * 1.6
      y = Math.sin(a) * r * 0.7
      const bar = 0.44
      ;[x, y] = [x * Math.cos(bar) - y * Math.sin(bar), x * Math.sin(bar) + y * Math.cos(bar)]
      z = gauss() * 1.6
      c = [1, 0.86, 0.62]
    } else if (i < count * 0.42) {
      // Słabszy dysk pomiędzy ramionami, bez pustych szczelin.
      const r = Math.min(50, -Math.log(Math.max(1e-9, rnd() * rnd())) * 10)
      const a = rnd() * Math.PI * 2
      x = Math.cos(a) * r
      y = Math.sin(a) * r
      z = gauss() * 0.65
      c = [0.45, 0.42, 0.39]
    } else {
      // Cztery ramiona spiralne (spirala logarytmiczna, nachylenie ok. 12°).
      const arm = Math.floor(rnd() * 4)
      const r = 4 + Math.pow(rnd(), 0.8) * 46
      const theta = Math.log(r / 4) / Math.tan((12 * Math.PI) / 180) + (arm * Math.PI) / 2 + gauss() * 0.28
      x = Math.cos(theta) * r + gauss() * 1.4
      y = Math.sin(theta) * r + gauss() * 1.4
      z = gauss() * 0.5
      const t = rnd()
      c = t < 0.15 ? [1, 0.55, 0.65] : t < 0.6 ? [0.62, 0.75, 1] : [0.85, 0.88, 1]
    }
    const p = toThree([x, y, z])
    pos.set([p.x, p.y, p.z], i * 3)
    col.set(c, i * 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const m = galaxyMaterial(texture)
  return new THREE.Points(g, m)
}

function galaxyMaterial(texture: THREE.Texture): THREE.PointsMaterial {
  return new THREE.PointsMaterial({ size: 2, map: texture, vertexColors: true, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false })
}

function localGroupGalaxy(o: DSO, profile: GalaxyProfile, texture: THREE.Texture): THREE.Points {
  // M31 i M33: średnice NASA; karły: średnica z rozmiaru kątowego i odległości katalogowej.
  const diameterLy = o.id === 'M 31' ? 220_000 : o.id === 'M 33' ? 50_000 : o.distLy! * o.majArcmin * Math.PI / 10_800
  const spiral = profile.kind === 'spiral' || profile.kind === 'flocculent'
  const count = o.id === 'M 31' ? 36000 : o.id === 'M 33' ? 4400 : Math.max(300, Math.round(12000 * (diameterLy / MILKY_WAY_DIAMETER_LY) ** 1.8))
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  let seed = [...o.id].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) >>> 0
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd())
  const flocculent = profile.kind === 'flocculent'
  // Rozproszona otoczka i odrębny układ skupisk dla każdej galaktyki nieregularnej.
  const knots = Array.from({ length: profile.knots ?? 0 }, () => {
    const r = 10 + rnd() * 26
    const a = rnd() * Math.PI * 2
    return [Math.cos(a) * r, Math.sin(a) * r * profile.axisRatio, 2 + rnd() * 4]
  })
  const radius = (length: number) => {
    let r: number
    do { r = -Math.log(Math.max(1e-9, rnd() * rnd())) * length } while (r > 49)
    return r
  }
  for (let i = 0; i < count; i++) {
    let x: number, y: number, z: number
    let color: [number, number, number]
    const part = rnd()
    if (spiral) {
      if (part < profile.core) {
        // M31: przestrzenne zgrubienie starych gwiazd. M33: brak dużego zgrubienia.
        const r = radius(2.5)
        const a = rnd() * Math.PI * 2
        const h = rnd() * 2 - 1
        x = r * Math.sqrt(1 - h * h) * Math.cos(a)
        y = r * Math.sqrt(1 - h * h) * Math.sin(a)
        z = r * h * 0.65
        color = [1, 0.8, 0.58]
      } else {
        const disk = part < profile.core + 0.35
        // Pierścień M31: ok. 10 kpc od centrum (NASA/Spitzer), na tle dysku i ramion.
        // https://science.nasa.gov/asset/webb/infrared-universe-andromeda-galaxy/
        const ring = !flocculent && part > 0.92
        const r = ring ? 14.8 + gauss() * 1.2 : radius(flocculent ? 18 : 11)
        const arm = Math.floor(rnd() * 2)
        const pitch = (flocculent ? 24 : 12) * Math.PI / 180
        const a = disk || ring ? rnd() * Math.PI * 2 : Math.log(1 + r / 3) / Math.tan(pitch) + arm * Math.PI + gauss() * (flocculent ? 0.4 : 0.25) + (flocculent ? 0.3 * Math.sin(r * 0.55 + arm) : 0)
        x = Math.cos(a) * r
        y = Math.sin(a) * r
        z = gauss() * (0.35 + r * 0.012)
        const hii = !disk && rnd() < (flocculent ? 0.09 : 0.035)
        color = disk ? [0.42, 0.4, 0.37] : hii ? [0.95, 0.42, 0.55] : ring ? [0.4, 0.45, 0.55] : [0.63, 0.76, 1]
      }
    } else if (profile.kind === 'elliptical') {
      const r = radius(part < profile.core ? 2.5 : 11)
      const a = rnd() * Math.PI * 2
      const h = rnd() * 2 - 1
      x = r * Math.sqrt(1 - h * h) * Math.cos(a)
      y = r * Math.sqrt(1 - h * h) * Math.sin(a) * profile.axisRatio
      z = r * h * profile.axisRatio
      color = part < profile.core ? [1, 0.83, 0.65] : [0.6, 0.53, 0.44]
    } else {
      if (part < 0.5) {
        const r = radius(12)
        const a = rnd() * Math.PI * 2
        x = Math.cos(a) * r
        y = Math.sin(a) * r * profile.axisRatio
        color = [0.34, 0.38, 0.43]
      } else if (profile.bar && part < 0.8) {
        x = (rnd() - 0.5) * 55
        y = gauss() * 3 + x * 0.12
        color = [0.65, 0.73, 0.86]
      } else {
        const [cx, cy, spread] = knots[Math.floor(rnd() * knots.length)]
        x = cx + gauss() * spread
        y = cy + gauss() * spread
        // W SMC młoda populacja rozciąga się w asymetryczne skrzydło.
        if (o.id === 'NGC 292') { x += 12; y += 8 }
        color = rnd() < 0.18 ? [0.94, 0.42, 0.55] : [0.6, 0.76, 1]
      }
      z = gauss() * 5
    }
    pos.set([x, y, z], i * 3)
    col.set(color, i * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const material = galaxyMaterial(texture)
  const points = new THREE.Points(geometry, material)
  points.scale.setScalar(UNIVERSE_GALAXY_SCALE * diameterLy / MILKY_WAY_DIAMETER_LY)
  // PA jest mierzone na niebie od północy ku wschodowi, nie względem osi sceny.
  const sight = toThree(galacticVector(o)).normalize()
  const north = toThree(galacticVector({ raDeg: o.raDeg, decDeg: o.decDeg + 0.01 }))
  north.addScaledVector(sight, -north.dot(sight)).normalize()
  const east = north.clone().cross(sight).normalize()
  const pa = (o.paDeg ?? 0) * Math.PI / 180
  const major = north.clone().multiplyScalar(Math.cos(pa)).addScaledVector(east, Math.sin(pa))
  const minor = sight.clone().cross(major).normalize()
  points.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(major, minor, sight))
  if (spiral) {
    const ratio = Math.min(1, o.minArcmin / o.majArcmin)
    const inclination = Math.acos(Math.sqrt(Math.max(0, (ratio * ratio - 0.15 ** 2) / (1 - 0.15 ** 2))))
    points.rotateX(inclination)
  }
  return points
}

function galaxyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  const ctx = canvas.getContext('2d')!
  const glow = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  glow.addColorStop(0, 'rgba(255,255,255,1)')
  glow.addColorStop(0.2, 'rgba(255,255,255,0.65)')
  glow.addColorStop(0.55, 'rgba(255,255,255,0.12)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(canvas)
}

function dotTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const ctx = c.getContext('2d')!
  // Miękka krawędź: przy kilku pikselach ostre koło zamienia się w plusik.
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  g.addColorStop(0, '#fff')
  g.addColorStop(0.6, '#fff')
  g.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(c)
}

/** Kopuła odległości: prawie przezroczysta, jaśniejsza przy krawędziach (efekt Fresnela), jak szklana bańka. */
function domeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(0x00e0ff) } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 color;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 3.0);
        gl_FragColor = vec4(color, 0.003 + f * 0.04);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
}

function textSprite(text: string, color = '#e6edf7', scale = 1): THREE.Sprite {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')!
  ctx.font = '600 44px ui-monospace, Consolas, monospace'
  const w = Math.ceil(ctx.measureText(text).width) + 20
  c.width = w
  c.height = 64
  ctx.font = '600 44px ui-monospace, Consolas, monospace'
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 10, 34)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }))
  s.scale.set((w / 64) * 2.2 * scale, 2.2 * scale, 1)
  return s
}

/** Przepisuje do bufora tylko punkty niewyłączonych rodzajów i ogranicza do nich zakres rysowania. */
function showTypes(bg: { geometry: THREE.BufferGeometry; types: ObjectType[]; pos: Float32Array; col: Float32Array }, hidden: ObjectType[]) {
  const pos = bg.geometry.getAttribute('position') as THREE.BufferAttribute
  const col = bg.geometry.getAttribute('color') as THREE.BufferAttribute
  let n = 0
  bg.types.forEach((t, i) => {
    if (hidden.includes(t)) return
    ;(pos.array as Float32Array).set(bg.pos.subarray(i * 3, i * 3 + 3), n * 3)
    ;(col.array as Float32Array).set(bg.col.subarray(i * 3, i * 3 + 3), n * 3)
    n++
  })
  pos.needsUpdate = true
  col.needsUpdate = true
  bg.geometry.setDrawRange(0, n)
}

export default function Space3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  // Punkty tła posortowane wg odległości: suwak zmienia tylko zakres rysowania, bez przebudowy sceny.
  const bgRef = useRef<{ geometry: THREE.BufferGeometry; counts: number[]; types: ObjectType[]; pos: Float32Array; col: Float32Array } | null>(null)
  const [galaxyLevel, setGalaxyLevel] = useState(GALAXY_LEVELS.length - 1)
  const galaxyLevelRef = useRef(galaxyLevel)
  galaxyLevelRef.current = galaxyLevel
  // Filtr rodzajów obiektów tła w skali Drogi Mlecznej (lista rozwijana z polami wyboru).
  const [hiddenTypes, setHiddenTypes] = useState<ObjectType[]>([])
  const hiddenTypesRef = useRef(hiddenTypes)
  hiddenTypesRef.current = hiddenTypes
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  useOutside(filterRef, () => setFilterOpen(false))
  const showAnnotations = useStore((s) => s.showAnnotations)
  const annotationsRef = useRef(showAnnotations)
  annotationsRef.current = showAnnotations
  const o = useSelected()
  const { catalog } = useCatalog()
  const select = useStore((s) => s.select)
  const dist = o?.distLy ?? null
  const auto: Scale = dist !== null && dist > GALACTIC_LIMIT_LY ? 'universe' : 'galaxy'
  const [scaleChoice, setScaleChoice] = useState<Scale | null>(null)
  const scale = scaleChoice ?? auto
  const withDistance = useMemo(() => (catalog ? catalog.filter((c) => c.distLy !== null) : []), [catalog])

  useEffect(() => {
    setScaleChoice(null)
  }, [o?.i])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !o) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(1.5, devicePixelRatio))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 5000)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.autoRotate = !reduced
    controls.autoRotateSpeed = 0.35
    const disposables: { dispose(): void }[] = [renderer, controls]
    const stars = galaxyTexture()
    disposables.push(stars)

    const sunPos = scale === 'galaxy' ? toThree([-SUN_TO_GC_KLY, 0, 0]) : new THREE.Vector3()
    const target0 = dist !== null ? position(o, dist, scale) : sunPos.clone()
    // Rozmiar sceny wokół celu: etykiety i znaczniki skalują się z nim, punkty mają stały rozmiar w pikselach.
    const sep = sunPos.distanceTo(target0)
    // Kadr dopasowany do odległości Słońce–obiekt (bliskie obiekty: zbliżenie na okolicę Słońca).
    // Obiekt Galaktyki bez odległości w skali Wszechświata: zbliżenie na Drogę Mleczną, w której kończy się jego kierunek.
    const insideMilkyWay = dist === null && o.type !== 'G' && o.type !== 'GG'
    const span = Math.max(scale === 'galaxy' ? 8 : insideMilkyWay ? 16 : 70, sep * 2.2)
    const k = span / 40
    // Promień znaczników: najwyżej 15% odległości Słońce–obiekt, żeby kule i pierścień nigdy na siebie nie nachodziły.
    const mr = sep > 0 ? Math.min(0.5 * k, sep * 0.15) : 0.5 * k
    const label = (text: string, color: string, size: number) => textSprite(text, color, size * k)
    // Kreski w skali kadru (jak etykiety): na ekranie podobnej wielkości przy każdej odległości.
    const dashes = { dashSize: 0.25 * k, gapSize: 0.18 * k }

    // Tło: obiekty katalogu z odległością.
    const bg = withDistance
      .filter((c) => (scale === 'galaxy' ? c.distLy! < GALACTIC_LIMIT_LY : c.distLy! > GALACTIC_LIMIT_LY && !LOCAL_GROUP_SHAPES[c.id]))
      .sort((a, b) => a.distLy! - b.distLy!)
    {
      const pos = new Float32Array(bg.length * 3)
      const col = new Float32Array(bg.length * 3)
      const tmp = new THREE.Color()
      bg.forEach((c, i) => {
        const p = position(c, c.distLy!, scale)
        pos.set([p.x, p.y, p.z], i * 3)
        tmp.setHex(scale === 'universe' ? 0xffffff : TYPE_RGB[c.type])
        col.set([tmp.r, tmp.g, tmp.b], i * 3)
      })
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      g.setAttribute('color', new THREE.BufferAttribute(col, 3))
      // Okrągłe kropki: tekstura koła zamiast domyślnego kwadratu.
      const dot = dotTexture()
      const m = new THREE.PointsMaterial({ size: scale === 'universe' ? 2.5 : 5, sizeAttenuation: false, vertexColors: true, map: dot, transparent: true, opacity: 0.8, depthWrite: false })
      scene.add(new THREE.Points(g, m))
      disposables.push(g, m, dot)
      const counts = GALAXY_LEVELS.map(({ maxLy }) => (scale === 'universe' ? bg.filter((c) => c.distLy! <= maxLy).length : bg.length))
      bgRef.current = { geometry: g, counts, types: bg.map((c) => c.type), pos: pos.slice(), col: col.slice() }
      if (scale === 'galaxy') showTypes(bgRef.current, hiddenTypesRef.current)
      else g.setDrawRange(0, counts[galaxyLevelRef.current])
    }

    let milkyWayMaterial: THREE.PointsMaterial | undefined
    const localGalaxyModels: THREE.Points[] = []
    if (scale === 'galaxy') {
      const mw = milkyWay(52000, stars)
      milkyWayMaterial = mw.material as THREE.PointsMaterial
      scene.add(mw)
      disposables.push(mw.geometry, mw.material as THREE.Material)
      const gc = label('Centrum Galaktyki', '#ffd9a0', 0.55)
      gc.position.set(0, 3 * k, 0)
      scene.add(gc)
    } else {
      // Pierścienie odległości (skala logarytmiczna) i Droga Mleczna w środku.
      for (const [ly, text] of [[1e6, '1 mln lś'], [1e7, '10 mln lś'], [1e8, '100 mln lś'], [1e9, '1 mld lś']] as const) {
        const r = Math.log10(ly / 1e4) * 22
        const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.08, r + 0.08, 128), new THREE.MeshBasicMaterial({ color: 0x00e0ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide }))
        ring.rotation.x = -Math.PI / 2
        scene.add(ring)
        disposables.push(ring.geometry, ring.material as THREE.Material)
        // Półprzezroczysta kopuła nad pierścieniem: odległość czytelna także dla wysokości nad płaszczyzną.
        const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMaterial())
        scene.add(dome)
        disposables.push(dome.geometry, dome.material as THREE.Material)
        const t = label(text, '#6fdcf0', 0.6)
        t.position.set(r + 2, 1, 0)
        scene.add(t)
      }
      const mw = milkyWay(12000, stars)
      mw.scale.setScalar(UNIVERSE_GALAXY_SCALE)
      localGalaxyModels.push(mw)
      scene.add(mw)
      disposables.push(mw.geometry, mw.material as THREE.Material)
      withDistance.filter((c) => LOCAL_GROUP_SHAPES[c.id]).forEach((c) => {
        const model = localGroupGalaxy(c, LOCAL_GROUP_SHAPES[c.id], stars)
        model.position.copy(position(c, c.distLy!, 'universe'))
        localGalaxyModels.push(model)
        scene.add(model)
        disposables.push(model.geometry, model.material as THREE.Material)
      })
    }

    // Słońce.
    if (scale === 'galaxy') {
      const sun = new THREE.Mesh(new THREE.SphereGeometry(mr * 0.9, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffd27a }))
      sun.position.copy(sunPos)
      scene.add(sun)
      disposables.push(sun.geometry, sun.material as THREE.Material)
    }
    const sunLabel = label(scale === 'galaxy' ? 'Słońce' : 'Droga Mleczna', scale === 'galaxy' ? '#ffd27a' : '#e6edf7', 0.55)
    sunLabel.position.copy(sunPos).add(new THREE.Vector3(0, -2.4 * k, 0))
    scene.add(sunLabel)

    // Obiekt.
    let target = sunPos.clone()
    if (dist !== null) {
      target = target0.clone()
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([sunPos, target]), new THREE.LineDashedMaterial({ color: 0x00e0ff, ...dashes, transparent: true, opacity: 0.8 }))
      line.computeLineDistances()
      scene.add(line)
      if (scale === 'universe') {
        // Pion obiektu do płaszczyzny Drogi Mlecznej i linia w płaszczyźnie do Słońca: z przerywaną tworzą trójkąt.
        const foot = new THREE.Vector3(target.x, 0, target.z)
        const drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([target, foot, sunPos]), new THREE.LineBasicMaterial({ color: 0x00e0ff, transparent: true, opacity: 0.6 }))
        scene.add(drop)
        disposables.push(drop.geometry, drop.material as THREE.Material)
      }
      const objLabel = label(o.id, '#00e0ff', 0.65)
      objLabel.position.copy(target).add(new THREE.Vector3(0, 2.4 * k, 0))
      scene.add(objLabel)
      disposables.push(line.geometry, line.material as THREE.Material)
    } else {
      // Tylko kierunek ze Słońca. Ta sama informacja w obu skalach: obiekt Galaktyki leży w Drodze Mlecznej
      // (promień kończy się na jej krawędzi), galaktyka poza nią (promień wychodzi poza Drogę Mleczną).
      const dir = toThree(galacticVector(o)).normalize()
      let length: number
      if (scale === 'galaxy') {
        // Przecięcie promienia ze sferą wokół centrum Galaktyki: krawędź dysku albo granica tej skali.
        const radius = insideMilkyWay ? MILKY_WAY_DIAMETER_LY / 2000 : GALACTIC_LIMIT_LY / 1000
        const b = sunPos.dot(dir)
        length = -b + Math.sqrt(b * b - sunPos.lengthSq() + radius * radius)
      } else {
        length = insideMilkyWay ? 50 * UNIVERSE_GALAXY_SCALE : Math.log10(1e9 / 1e4) * 22
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([sunPos, sunPos.clone().add(dir.multiplyScalar(length))]), new THREE.LineDashedMaterial({ color: 0x00e0ff, ...dashes }))
      line.computeLineDistances()
      scene.add(line)
      disposables.push(line.geometry, line.material as THREE.Material)
    }

    // Przelot kamery do celu.
    const focus = scale === 'galaxy' ? sunPos.clone().lerp(target, 0.5) : target.clone().multiplyScalar(0.5)
    const endCam = focus.clone().add(new THREE.Vector3(span * 0.55, span * 0.55, span * 0.75))
    const startCam = new THREE.Vector3(0, scale === 'galaxy' ? 120 : 200, 0.01)
    camera.position.copy(reduced ? endCam : startCam)
    controls.target.copy(reduced ? focus : new THREE.Vector3())
    const t0 = performance.now()
    let raf = 0
    let flying = !reduced
    const stopFly = () => (flying = false)
    controls.addEventListener('start', () => {
      stopFly()
      controls.autoRotate = false
    })
    const tick = () => {
      if (flying) {
        const k = Math.min(1, (performance.now() - t0) / 2200)
        const e = 1 - (1 - k) ** 3
        camera.position.lerpVectors(startCam, endCam, e)
        controls.target.lerpVectors(new THREE.Vector3(), focus, e)
        if (k >= 1) flying = false
      }
      controls.update()
      if (milkyWayMaterial) {
        // Przy zbliżeniu gwiazdy pozostają widoczne, a z daleka nie zlewają się w jasną plamę.
        const close = 1 - THREE.MathUtils.smoothstep(camera.position.distanceTo(controls.target), 20, 100)
        milkyWayMaterial.size = 2.4 + close * 0.8
        milkyWayMaterial.opacity = 0.17 + close * 0.13
      }
      for (const model of localGalaxyModels) {
        // Zbliżenie względem promienia modelu: także małe galaktyki zachowują czytelne gwiazdy.
        const distance = camera.position.distanceTo(model.position) / (50 * model.scale.x)
        const close = 1 - THREE.MathUtils.smoothstep(distance, 2, 10)
        const material = model.material as THREE.PointsMaterial
        material.size = 2.4 + close * 0.8
        material.opacity = 0.1 + close * 0.18
      }
      renderer.render(scene, camera)
      drawLabels()
      // Pinezka obiektu (HTML nad sceną) przypięta do rzutu jego położenia.
      const pin = pinRef.current
      if (pin) {
        const v = target.clone().project(camera)
        pin.style.display = dist !== null && v.z < 1 ? '' : 'none'
        pin.style.transform = `translate(${((v.x + 1) / 2) * mount.clientWidth}px, ${((1 - v.y) / 2) * mount.clientHeight}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    // Podpisy obiektów tła (przełącznik „Opisy”): najbliższe kamerze najpierw, bez nakładania się.
    const labels = document.createElement('canvas')
    labels.style.cssText = 'position:absolute;inset:0;pointer-events:none'
    mount.appendChild(labels)
    const labelCtx = labels.getContext('2d')!
    const bgPos = bg.map((c) => position(c, c.distLy!, scale))
    const projected = new THREE.Vector3()
    const sizeLabels = () => {
      const r = Math.min(2, devicePixelRatio)
      labels.width = mount.clientWidth * r
      labels.height = mount.clientHeight * r
      labelCtx.setTransform(r, 0, 0, r, 0, 0)
    }
    sizeLabels()
    // Obszary do kliknięcia: podpis z kropką albo sama kropka (gdy opisy wyłączone lub podpis pominięty).
    let hits: { c: DSO; x: number; y: number; box: [number, number, number, number] | null }[] = []
    function drawLabels() {
      const w = mount!.clientWidth
      const h = mount!.clientHeight
      labelCtx.clearRect(0, 0, w, h)
      hits = []
      const hidden = hiddenTypesRef.current
      const limit = scale === 'universe' ? bgRef.current!.counts[galaxyLevelRef.current] : bg.length
      const candidates: { c: DSO; x: number; y: number; d: number }[] = []
      for (let i = 0; i < limit; i++) {
        const c = bg[i]
        if (c.i === o!.i || (scale === 'galaxy' && hidden.includes(c.type))) continue
        projected.copy(bgPos[i]).project(camera)
        if (projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) continue
        candidates.push({ c, x: ((projected.x + 1) / 2) * w, y: ((1 - projected.y) / 2) * h, d: camera.position.distanceToSquared(bgPos[i]) })
      }
      candidates.sort((a, b) => a.d - b.d)
      for (const l of candidates) hits.push({ c: l.c, x: l.x, y: l.y, box: null })
      if (!annotationsRef.current) return
      labelCtx.font = '10px ui-monospace, Consolas, monospace'
      labelCtx.lineJoin = 'round'
      labelCtx.lineWidth = 3
      const boxes: [number, number, number, number][] = []
      for (const l of candidates) {
        if (boxes.length >= 120) break
        const tw = labelCtx.measureText(l.c.id).width
        const b: [number, number, number, number] = [l.x + 4, l.y - 8, l.x + 8 + tw, l.y + 5]
        if (boxes.some((x) => b[0] < x[2] && b[2] > x[0] && b[1] < x[3] && b[3] > x[1])) continue
        boxes.push(b)
        hits.push({ c: l.c, x: l.x, y: l.y, box: [l.x - 6, b[1], b[2], b[3]] })
        labelCtx.strokeStyle = 'rgba(2, 5, 13, 0.85)'
        labelCtx.strokeText(l.c.id, l.x + 6, l.y + 3)
        labelCtx.fillStyle = scale === 'universe' ? 'rgba(230, 237, 247, 0.7)' : `#${TYPE_RGB[l.c.type].toString(16).padStart(6, '0')}c0`
        labelCtx.fillText(l.c.id, l.x + 6, l.y + 3)
      }
    }
    // Kliknięcie (bez przeciągania) w podpis lub kropkę wybiera obiekt.
    const hitAt = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      const label = hits.findLast((t) => t.box && x >= t.box[0] && x <= t.box[2] && y >= t.box[1] && y <= t.box[3])
      if (label) return label.c
      let best: DSO | null = null
      let bestD = 8 * 8
      for (const t of hits) {
        const d = (t.x - x) ** 2 + (t.y - y) ** 2
        if (d < bestD) [best, bestD] = [t.c, d]
      }
      return best
    }
    let down: [number, number] | null = null
    const onDown = (e: PointerEvent) => (down = [e.clientX, e.clientY])
    const onUp = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) {
        const c = hitAt(e)
        if (c) select(c.i, false)
      }
      down = null
    }
    const onMove = (e: PointerEvent) => (renderer.domElement.style.cursor = !e.buttons && hitAt(e) ? 'pointer' : '')
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)
    renderer.domElement.addEventListener('pointermove', onMove)
    tick()
    const ro = new ResizeObserver(() => {
      sizeLabels()
      camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight)
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    })
    ro.observe(mount)
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Sprite) {
          obj.material.map?.dispose()
          obj.material.dispose()
        }
      })
      disposables.forEach((d) => d.dispose())
      renderer.domElement.remove()
      labels.remove()
    }
  }, [o, dist, scale, withDistance, select])

  useEffect(() => {
    const bg = bgRef.current
    if (bg && scale === 'universe') bg.geometry.setDrawRange(0, bg.counts[galaxyLevel])
  }, [galaxyLevel])

  useEffect(() => {
    if (bgRef.current && scale === 'galaxy') showTypes(bgRef.current, hiddenTypes)
  }, [hiddenTypes])

  // Liczba obiektów tła skali Drogi Mlecznej według rodzaju (tylko rodzaje obecne w tej skali).
  const typeCounts = useMemo(() => {
    const counts = new Map<ObjectType, number>()
    for (const c of withDistance) if (c.distLy! < GALACTIC_LIMIT_LY) counts.set(c.type, (counts.get(c.type) ?? 0) + 1)
    return (Object.keys(TYPE_INFO) as ObjectType[]).filter((t) => counts.has(t)).map((t) => ({ type: t, count: counts.get(t)! }))
  }, [withDistance])
  const shownCount = typeCounts.filter((t) => !hiddenTypes.includes(t.type)).length

  if (!o) return <div className="sky-stage empty" style={{ display: 'grid', placeItems: 'center' }}>Wybierz obiekt.</div>
  return (
    <div className="sky-stage" style={{ background: 'radial-gradient(circle at 50% 40%, #071022, #000 75%)' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      <div ref={pinRef} className="pin" style={{ display: 'none' }} aria-hidden>
        {scale === 'universe' && LOCAL_GROUP_SHAPES[o.id] ? (
          <span style={{ width: 28, height: 28, border: '1px dashed var(--accent)', background: 'transparent' }} />
        ) : <><span className="pin-ring" /><span className="pin-ring" /><span className="pin-dot" /></>}
      </div>
      <div className="sky-hud tr" style={{ pointerEvents: 'auto', display: 'flex', gap: 6 }}>
        <button className={`toggle-chip${scale === 'galaxy' ? ' on' : ''}`} onClick={() => setScaleChoice('galaxy')}>Droga Mleczna</button>
        <button className={`toggle-chip${scale === 'universe' ? ' on' : ''}`} onClick={() => setScaleChoice('universe')}>Wszechświat lokalny</button>
      </div>
      <div className="sky-hud bl" style={{ maxWidth: 520, lineHeight: 1.6, fontSize: 10 }}>
        {dist === null
          ? 'Wikidata nie podaje odległości tego obiektu - pokazany jest tylko kierunek ze Słońca.'
          : scale === 'galaxy'
            ? `Skala liniowa, 1 j. = 1000 lś. Punkty: ${withDistance.filter((c) => c.distLy! < GALACTIC_LIMIT_LY).length} obiektów katalogu z odległością.`
            : 'Skala odległości logarytmiczna. Modele Grupy Lokalnej zachowują proporcje rozmiarów względem Drogi Mlecznej; pozostałe galaktyki to białe punkty.'}
        <br />
        Odległości: Wikidata (mediana wartości). Morfologia: NED, NASA, NAOJ. Modele poglądowe.
      </div>
      {scale === 'galaxy' && (
        <div ref={filterRef} className="sky-hud br">
          <button className={`toggle-chip${filterOpen ? ' on' : ''}`} onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen}>
            Obiekty {shownCount}/{typeCounts.length} <ChevronDown size={12} />
          </button>
          {filterOpen && (
            <div className="popover type-filter">
              <label>
                <input type="checkbox" checked={hiddenTypes.length === 0} onChange={() => setHiddenTypes(hiddenTypes.length === 0 ? typeCounts.map((t) => t.type) : [])} />
                Wszystkie
              </label>
              {typeCounts.map(({ type, count }) => (
                <label key={type}>
                  <input type="checkbox" checked={!hiddenTypes.includes(type)} onChange={() => setHiddenTypes((h) => (h.includes(type) ? h.filter((t) => t !== type) : [...h, type]))} />
                  <span className="dot" style={{ background: `#${TYPE_RGB[type].toString(16).padStart(6, '0')}` }} />
                  {TYPE_INFO[type].plural}
                  <span className="faint">{count}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      {scale === 'universe' && (
        <div className="sky-hud br hud-stack">
          <label className="zoom-slider" title={GALAXY_LEVELS[galaxyLevel].title}>
            <LayersIcon filled={false} />
            <Range
              min={0}
              max={GALAXY_LEVELS.length - 1}
              step={1}
              value={galaxyLevel}
              onChange={(e) => setGalaxyLevel(Number(e.target.value))}
              aria-label="Liczba galaktyk"
              aria-valuetext={GALAXY_LEVELS[galaxyLevel].title}
            />
            <LayersIcon filled />
          </label>
        </div>
      )}
    </div>
  )
}
