// Pozycja obiektu w przestrzeni 3D (three.js, ładowane leniwie). Odległości z Wikidata (mediana podanych wartości),
// kierunek ze współrzędnych galaktycznych. Dwie skale: Droga Mleczna (liniowa, 1 j. = 1000 lś) i Wszechświat
// lokalny (logarytmiczna). W tle wszystkie obiekty katalogu z odległością.
import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { galacticVector } from '../lib/astro'
import { DEFAULT_ANNOTATION_COLORS, TYPE_INFO, type DSO, type ObjectType } from '../lib/catalog'
import { useCatalog, useSelected } from '../state/data'
import { useStore } from '../state/store'
import { fmtDistance } from '../lib/format'
import { CONSTELLATION_PL } from '../lib/constellations'
import { Range } from './Range'
import { LayersIcon } from './SkyDome'
import { useOutside } from './TopBar'
import { PhotoExplorer } from './PhotoExplorer'
import { photoAnchorKind, photoStageHeight, type PhotoProject, type PhotoSceneFrame } from '../lib/photo'

const SUN_TO_GC_KLY = 26.7
const GALACTIC_LIMIT_LY = 150_000
const MILKY_WAY_DIAMETER_LY = 100_000
const UNIVERSE_GALAXY_SCALE = 0.12
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
type ConstellationStar = { raDeg: number; decDeg: number; distLy: number; name: string }
type StarNameLayout = { group: THREE.Group; anchors: { position: THREE.Vector3; sprite: THREE.Sprite }[]; connectors: THREE.BufferAttribute }
type Constellations3D = { constellations: { abbr: string; lines: ([number, number, number] | null)[][]; stars?: ConstellationStar[] }[] }

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
  // Minimum próbek zachowuje czytelność karłów przy zbliżeniu; M33 ma rozległy, rozproszony dysk.
  const count = o.id === 'M 31' ? 36000 : o.id === 'M 33' ? 8800 : Math.max(600, Math.round(18000 * (diameterLy / MILKY_WAY_DIAMETER_LY) ** 1.8))
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
        // M31: klasyczne zgrubienie i wydłużona składowa poprzeczki. M33: bez dużego zgrubienia.
        // https://www.aanda.org/articles/aa/pdf/2018/10/aa32517-17.pdf
        const r = radius(2.5)
        const a = rnd() * Math.PI * 2
        const h = rnd() * 2 - 1
        x = r * Math.sqrt(1 - h * h) * Math.cos(a)
        y = r * Math.sqrt(1 - h * h) * Math.sin(a)
        z = r * h * 0.65
        if (rnd() < 0.35) {
          // PA poprzeczki 55,7° rzutujemy z powrotem do płaszczyzny dysku nachylonego o 77°.
          const barAngle = -Math.atan(Math.tan((55.7 - (o.paDeg ?? 35)) * Math.PI / 180) / Math.cos(77 * Math.PI / 180))
          x *= 1.6
          y *= 0.65
          ;[x, y] = [x * Math.cos(barAngle) - y * Math.sin(barAngle), x * Math.sin(barAngle) + y * Math.cos(barAngle)]
        }
        color = [1, 0.8, 0.58]
      } else {
        const disk = part < profile.core + (flocculent ? 0.45 : 0.48)
        // Pierścień M31: ok. 10 kpc od centrum (NASA/Spitzer), na tle dysku i ramion.
        // https://science.nasa.gov/asset/webb/infrared-universe-andromeda-galaxy/
        const ring = !flocculent && part > 0.96
        const arm = Math.floor(rnd() * 2)
        let r = ring ? 14.8 + gauss() * 2.4 : radius(flocculent ? 18 : 11)
        // M33: dwa słabe, niesymetryczne ramiona ze skupiskami zamiast jednolitych wstęg.
        // https://www.aanda.org/articles/aa/pdf/2024/05/aa48910-23.pdf
        if (flocculent && !disk && rnd() < 0.6) {
          r = Math.max(2, Math.min(48, 8 + Math.floor(rnd() * 4) * 10 + arm * 3 + gauss() * 2))
        }
        const pitch = (flocculent ? 22 + arm * 6 : 12) * Math.PI / 180
        const spiralAngle = Math.log(1 + r / 3) / Math.tan(pitch) + arm * Math.PI
        const a = disk || ring ? rnd() * Math.PI * 2 : spiralAngle + gauss() * (flocculent ? 0.5 : 0.35) + (flocculent ? 0.45 * Math.sin(r * 0.35 + arm * 2) : 0)
        if (ring) r += 1.5 * Math.sin(a) + 0.8 * Math.sin(3 * a)
        x = Math.cos(a) * r
        y = Math.sin(a) * r
        z = gauss() * (0.35 + r * 0.012)
        const hii = !disk && rnd() < (flocculent ? 0.09 : 0.035)
        color = disk ? (flocculent ? [0.56, 0.58, 0.64] : [0.42, 0.4, 0.37]) : hii ? [0.95, 0.42, 0.55] : ring ? [0.4, 0.45, 0.55] : [0.63, 0.76, 1]
        if (!flocculent) {
          // Poglądowe pasma pyłu: osłabienie światła w dysku, bez jasnego obrysu pierścienia.
          const lane = Math.exp(-((Math.sin(a - Math.log(1 + r / 3) / Math.tan(pitch) - 0.18) / 0.13) ** 2))
          const dim = 1 - 0.7 * lane * THREE.MathUtils.smoothstep(r, 4, 9)
          color = [color[0] * dim, color[1] * dim, color[2] * dim]
        }
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
        color = [0.44, 0.49, 0.56]
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
    // Orientacja dysków z badań, nie z elipsy całej galaktyki obejmującej zgrubienie.
    // M31: https://academic.oup.com/mnras/article/366/3/996/994137
    // M33: https://www.aanda.org/articles/aa/pdf/2025/08/aa55408-25.pdf
    const inclination = (flocculent ? 54 : 77) * Math.PI / 180
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

function textSprite(text: string, color = '#e6edf7', scale = 1, outlined = false): THREE.Sprite {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')!
  ctx.font = '600 44px ui-monospace, Consolas, monospace'
  const w = Math.ceil(ctx.measureText(text).width) + 20
  c.width = w
  c.height = 64
  ctx.font = '600 44px ui-monospace, Consolas, monospace'
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  if (outlined) {
    ctx.strokeStyle = '#02050d'
    ctx.lineWidth = 8
    ctx.lineJoin = 'round'
    ctx.strokeText(text, 10, 34)
  }
  ctx.fillText(text, 10, 34)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }))
  s.scale.set((w / 64) * 2.2 * scale, 2.2 * scale, 1)
  return s
}

function fixedSizeTextSprite(sprite: THREE.Sprite, sprites: THREE.Sprite[]) {
  sprite.userData.fixedPixelHeight = 14
  sprite.userData.aspectRatio = sprite.scale.x / sprite.scale.y
  sprites.push(sprite)
}

function addStarNameLabels(group: THREE.Group, stars: ConstellationStar[], sprites: THREE.Sprite[]): StarNameLayout {
  const anchors: StarNameLayout['anchors'] = []
  const points = new Float32Array(stars.length * 6)
  const geometry = new THREE.BufferGeometry()
  const connectors = new THREE.BufferAttribute(points, 3)
  connectors.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', connectors)
  const leaderLines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x858b93, transparent: true, opacity: 0.7, depthWrite: false }))
  leaderLines.frustumCulled = false
  leaderLines.renderOrder = 1
  leaderLines.userData.starNameConnector = true
  group.add(leaderLines)
  for (const star of stars) {
    const sprite = textSprite(star.name, '#e6edf7', 1, true)
    fixedSizeTextSprite(sprite, sprites)
    sprite.userData.fixedPixelHeight = 20
    sprite.renderOrder = 2
    const starPosition = position(star, star.distLy, 'galaxy')
    sprite.position.copy(starPosition)
    group.add(sprite)
    anchors.push({ position: starPosition, sprite })
  }
  return { group, anchors, connectors }
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
  const [photo, setPhoto] = useState<PhotoProject | null>(null)
  const photoRef = useRef(photo)
  photoRef.current = photo
  const photoFrameRef = useRef<((frame: PhotoSceneFrame) => void) | null>(null)
  const photoFitRef = useRef<(() => void) | null>(null)
  const mountRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  // Punkty tła posortowane wg odległości: suwak zmienia tylko zakres rysowania, bez przebudowy sceny.
  const bgRef = useRef<{ geometry: THREE.BufferGeometry; counts: number[]; types: ObjectType[]; pos: Float32Array; col: Float32Array } | null>(null)
  const [galaxyLevel, setGalaxyLevel] = useState(0)
  const galaxyLevelRef = useRef(galaxyLevel)
  galaxyLevelRef.current = galaxyLevel
  // Filtr rodzajów obiektów tła w skali Drogi Mlecznej (lista rozwijana z polami wyboru).
  const [hiddenTypes, setHiddenTypes] = useState<ObjectType[]>([])
  const hiddenTypesRef = useRef(hiddenTypes)
  hiddenTypesRef.current = hiddenTypes
  const [filterOpen, setFilterOpen] = useState(false)
  const [showConstellations, setShowConstellations] = useState(false)
  const showConstellationsRef = useRef(showConstellations)
  showConstellationsRef.current = showConstellations
  const [showStarNames, setShowStarNames] = useState(false)
  const constellationGroupRef = useRef<THREE.Group | null>(null)
  const screenTextSpritesRef = useRef<THREE.Sprite[]>([])
  const starNameLayoutsRef = useRef<StarNameLayout[]>([])
  const [constellations, setConstellations] = useState<Constellations3D | null>(null)
  const [constellationError, setConstellationError] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  useOutside(filterRef, () => setFilterOpen(false))
  const showAnnotations = useStore((s) => s.showAnnotations)
  const annotationsRef = useRef(showAnnotations)
  annotationsRef.current = showAnnotations
  const annotationColors = useStore((s) => s.annotationColors)
  const typeRGB = useMemo(() => Object.fromEntries(
    (Object.keys(TYPE_INFO) as ObjectType[]).map((type) => [type, Number.parseInt((annotationColors[type] ?? DEFAULT_ANNOTATION_COLORS[type]).slice(1), 16)]),
  ) as Record<ObjectType, number>, [annotationColors])
  const o = useSelected()
  const [constellationChoice, setConstellationChoice] = useState(o?.con ?? 'Ori')
  const constellationChoiceRef = useRef(constellationChoice)
  constellationChoiceRef.current = constellationChoice
  const { catalog } = useCatalog()
  const select = useStore((s) => s.select)
  const dist = o?.distLy ?? null
  const auto: Scale = dist !== null && dist > GALACTIC_LIMIT_LY ? 'universe' : 'galaxy'
  const [scaleChoice, setScaleChoice] = useState<Scale | null>(null)
  const scale = scaleChoice ?? auto
  const [scaleInfoOpen, setScaleInfoOpen] = useState(false)
  const outOfScale = scale === 'galaxy' && dist !== null && dist > GALACTIC_LIMIT_LY
  const withDistance = useMemo(() => (catalog ? catalog.filter((c) => c.distLy !== null) : []), [catalog])

  useEffect(() => {
    if (!photo) return
    const distances = photo.cuts.map((c) => c.distLy).filter((d): d is number => d !== null)
    setScaleChoice(distances.length && distances.every((d) => d >= GALACTIC_LIMIT_LY) ? 'universe' : 'galaxy')
  }, [photo?.id])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/constellations3d.json', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<Constellations3D>
      })
      .then(setConstellations)
      .catch((e: Error) => { if (e.name !== 'AbortError') setConstellationError(true) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    setScaleChoice(null)
  }, [o?.i])

  useEffect(() => {
    if (!scaleInfoOpen) return
    const timeout = window.setTimeout(() => setScaleInfoOpen(false), 10_000)
    return () => window.clearTimeout(timeout)
  }, [scaleInfoOpen])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !o) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(1.5, devicePixelRatio))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.domElement.tabIndex = 0
    renderer.domElement.setAttribute('aria-label', 'Widok 3D. Użyj WASD lub strzałek, aby poruszać kamerą.')
    mount.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 5000)
    const controls = new OrbitControls(camera, renderer.domElement)
    // PPM jest przechwytywany jako swobodne rozglądanie, bez obiegania celu przez OrbitControls.
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    }
    renderer.domElement.addEventListener('mousedown', onMouseDown)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.autoRotate = !reduced
    controls.autoRotateSpeed = 0.35
    const disposables: { dispose(): void }[] = [renderer, controls]
    constellationGroupRef.current = null
    screenTextSpritesRef.current = []
    starNameLayoutsRef.current = []
    const stars = galaxyTexture()
    disposables.push(stars)

    const sunPos = scale === 'galaxy' ? toThree([-SUN_TO_GC_KLY, 0, 0]) : new THREE.Vector3()
    // Obiekt dalszy niż zasięg skali Drogi Mlecznej pokazany jak bez odległości: tylko kierunek, bez oddalania kadru.
    const placed = dist !== null && !outOfScale
    const target0 = placed ? position(o, dist, scale) : sunPos.clone()
    // Rozmiar sceny wokół celu: etykiety i znaczniki skalują się z nim, punkty mają stały rozmiar w pikselach.
    const sep = sunPos.distanceTo(target0)
    // Kadr dopasowany do odległości Słońce–obiekt (bliskie obiekty: zbliżenie na okolicę Słońca).
    // Obiekt Galaktyki bez odległości w skali Wszechświata: zbliżenie na Drogę Mleczną, w której kończy się jego kierunek.
    const insideMilkyWay = dist === null && o.type !== 'G' && o.type !== 'GG'
    const span = Math.max(scale === 'galaxy' ? 8 : insideMilkyWay ? 16 : 70, sep * 2.2)
    const k = span / 40
    // Promień znaczników: najwyżej 15% odległości Słońce–obiekt, żeby kule i pierścień nigdy na siebie nie nachodziły.
    const mr = sep > 0 ? Math.min(0.5 * k, sep * 0.15) : 0.5 * k
    const label = (text: string, color: string, size: number) => {
      const sprite = textSprite(text, color, size * k)
      fixedSizeTextSprite(sprite, screenTextSpritesRef.current)
      sprite.renderOrder = 2
      return sprite
    }
    // Kreski w skali kadru (jak etykiety): na ekranie podobnej wielkości przy każdej odległości.
    const dashes = { dashSize: 0.25 * k, gapSize: 0.18 * k }

    // Tło: obiekty katalogu z odległością.
    const bg = withDistance
      .filter((c) => (scale === 'galaxy' ? c.distLy! < GALACTIC_LIMIT_LY : c.distLy! > GALACTIC_LIMIT_LY && !LOCAL_GROUP_SHAPES[c.id]))
      .sort((a, b) => a.distLy! - b.distLy!)
    const localGroup = scale === 'universe' ? withDistance.filter((c) => LOCAL_GROUP_SHAPES[c.id]) : []
    {
      const pos = new Float32Array(bg.length * 3)
      const col = new Float32Array(bg.length * 3)
      const tmp = new THREE.Color()
      bg.forEach((c, i) => {
        const p = position(c, c.distLy!, scale)
        pos.set([p.x, p.y, p.z], i * 3)
        tmp.setHex(typeRGB[c.type])
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
    const constellationPoints: { group: THREE.Group; position: THREE.Vector3 }[] = []
    if (scale === 'galaxy') {
      if (constellations) {
        const group = new THREE.Group()
        const material = new LineMaterial({ color: 0x00e0ff, linewidth: 1.6, transparent: true, opacity: 0.9, depthWrite: false })
        const dot = dotTexture()
        const starMaterial = new THREE.PointsMaterial({ color: 0xc5f7ff, size: 5, sizeAttenuation: false, map: dot, transparent: true, depthWrite: false })
        disposables.push(material, starMaterial, dot)
        for (const c of constellations.constellations) {
          const segments: number[] = []
          const points = new Map<string, THREE.Vector3>()
          for (const line of c.lines) {
            for (let i = 1; i < line.length; i++) {
              const a = line[i - 1], b = line[i]
              // Brak pomiaru przerywa linię; nie łączymy sąsiadów ponad brakującą gwiazdą.
              if (!a || !b) continue
              for (const s of [a, b]) {
                const p = position({ raDeg: s[0], decDeg: s[1] }, s[2], 'galaxy')
                segments.push(p.x, p.y, p.z)
                points.set(s.join(','), p)
              }
            }
          }
          const figure = new THREE.Group()
          figure.name = c.abbr
          figure.visible = constellationChoiceRef.current === 'all' || constellationChoiceRef.current === c.abbr
          for (const point of points.values()) constellationPoints.push({ group: figure, position: point })
          const geometry = new LineSegmentsGeometry().setPositions(segments)
          figure.add(new LineSegments2(geometry, material))
          const starGeometry = new THREE.BufferGeometry().setFromPoints([...points.values()])
          figure.add(new THREE.Points(starGeometry, starMaterial))
          const nameGroup = new THREE.Group()
          nameGroup.name = 'star-names'
          nameGroup.visible = showStarNames
          nameGroup.userData.stars = c.stars ?? []
          nameGroup.userData.labelsAdded = false
          if (showStarNames) {
            starNameLayoutsRef.current.push(addStarNameLabels(nameGroup, c.stars ?? [], screenTextSpritesRef.current))
            nameGroup.userData.labelsAdded = true
          }
          figure.add(nameGroup)
          group.add(figure)
          disposables.push(geometry, starGeometry)
        }
        group.visible = showConstellationsRef.current
        scene.add(group)
        constellationGroupRef.current = group
      }
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
      localGroup.forEach((c) => {
        const model = localGroupGalaxy(c, LOCAL_GROUP_SHAPES[c.id], stars)
        model.position.copy(position(c, c.distLy!, 'universe'))
        localGalaxyModels.push(model)
        scene.add(model)
        disposables.push(model.geometry, model.material as THREE.Material)
      })
    }

    // Ziemia jako umowny znacznik naszego położenia (rozmiar poza skalą).
    let earth: THREE.Mesh | undefined
    if (scale === 'galaxy') {
      // Tekstura: https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg
      const map = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/earth.webp`)
      map.colorSpace = THREE.SRGBColorSpace
      earth = new THREE.Mesh(new THREE.SphereGeometry(mr * 0.7, 48, 32), new THREE.MeshPhongMaterial({ map, shininess: 12, specular: 0x233344 }))
      const axis = new THREE.Group()
      axis.position.copy(sunPos)
      // Biegun ziemski J2000: l = 122,932°, b = 27,128°; płaszczyzna Galaktyki to XZ.
      // https://asc.harvard.edu/ciao/ahelp/prop-coords.html
      axis.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), toThree(galacticVector({ raDeg: 0, decDeg: 90 })).normalize())
      axis.add(earth)
      scene.add(axis)
      scene.add(new THREE.AmbientLight(0xffffff, 1.5))
      const light = new THREE.DirectionalLight(0xffffff, 2)
      light.position.copy(sunPos).add(new THREE.Vector3(10, 15, 10))
      light.target.position.copy(sunPos)
      scene.add(light, light.target)
      disposables.push(earth.geometry, earth.material as THREE.Material, map)
    }
    const sunLabel = label(scale === 'galaxy' ? 'Ziemia' : 'Droga Mleczna', scale === 'galaxy' ? '#93cfff' : '#e6edf7', 0.55)
    sunLabel.position.copy(sunPos).add(new THREE.Vector3(0, -2.4 * k, 0))
    scene.add(sunLabel)

    // Obiekt.
    const objectGuide = new THREE.Group()
    scene.add(objectGuide)
    let target = sunPos.clone()
    if (placed) {
      target = target0.clone()
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([sunPos, target]), new THREE.LineDashedMaterial({ color: 0x00e0ff, ...dashes, transparent: true, opacity: 0.8 }))
      line.computeLineDistances()
      objectGuide.add(line)
      if (scale === 'universe') {
        // Pion obiektu do płaszczyzny Drogi Mlecznej i linia w płaszczyźnie do Słońca: z przerywaną tworzą trójkąt.
        const foot = new THREE.Vector3(target.x, 0, target.z)
        const drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([target, foot, sunPos]), new THREE.LineBasicMaterial({ color: 0x00e0ff, transparent: true, opacity: 0.6 }))
        objectGuide.add(drop)
        disposables.push(drop.geometry, drop.material as THREE.Material)
      }
      const objLabel = label(o.id, '#00e0ff', 0.65)
      objLabel.position.copy(target).add(new THREE.Vector3(0, 2.4 * k, 0))
      objectGuide.add(objLabel)
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
      objectGuide.add(line)
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
    let lastTick = performance.now()
    const pressedKeys = new Set<string>()
    let rightLook: { pointerId: number; x: number; y: number; distance: number; yaw: number; pitch: number; position: THREE.Vector3 } | null = null
    const moveKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'])
    const stopFly = () => (flying = false)
    let photoSpan = span
    photoFitRef.current = () => {
      const points = [sunPos.clone()]
      for (const cut of photoRef.current?.cuts ?? []) {
        if (cut.enabled && photoAnchorKind(cut.distLy, scale) === 'position') points.push(position(cut, cut.distLy!, scale))
      }
      const bounds = new THREE.Box3().setFromPoints(points)
      const center = bounds.getCenter(new THREE.Vector3())
      photoSpan = Math.max(scale === 'galaxy' ? 80 : 35, bounds.getSize(new THREE.Vector3()).length() * 2.4)
      flying = false
      controls.autoRotate = false
      camera.position.copy(center).add(new THREE.Vector3(photoSpan * 0.55, photoSpan * 0.55, photoSpan * 0.75))
      controls.target.copy(center)
      camera.lookAt(center)
      controls.update()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement
      if ((active !== renderer.domElement && active !== filterRef.current?.querySelector('.constellation-select')) || !moveKeys.has(e.code) || e.altKey || e.ctrlKey || e.metaKey) return
      e.preventDefault()
      renderer.domElement.focus({ preventScroll: true })
      pressedKeys.add(e.code)
      stopFly()
      controls.autoRotate = false
    }
    const onKeyUp = (e: KeyboardEvent) => pressedKeys.delete(e.code)
    const clearPressedKeys = () => pressedKeys.clear()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearPressedKeys)
    const textWorldPosition = new THREE.Vector3()
    const textCameraPosition = new THREE.Vector3()
    const nameScreenPosition = new THREE.Vector3()
    const earthScreenPosition = new THREE.Vector3()
    const starScreenPosition = new THREE.Vector3()
    const cameraUp = new THREE.Vector3()
    const leaderEnd = new THREE.Vector3()
    controls.addEventListener('start', () => {
      stopFly()
      controls.autoRotate = false
    })
    let projectedPhoto: PhotoProject | null | undefined
    let projectedReceiver: typeof photoFrameRef.current = null
    let photoWidth = 0, photoHeight = 0, projectedSpan = 0, lastPhotoFrame = 0
    const photoCameraMatrix = new THREE.Matrix4()
    const photoProjectionMatrix = new THREE.Matrix4()
    const tick = () => {
      const now = performance.now()
      const delta = Math.min((now - lastTick) / 1000, 0.05)
      lastTick = now
      // Powolny obrót poglądowy: jeden obrót na trzy minuty, niezależnie od liczby klatek.
      if (earth && !reduced) earth.rotation.y = ((performance.now() - t0) / 180_000) * Math.PI * 2
      if (flying) {
        const k = Math.min(1, (now - t0) / 2200)
        const e = 1 - (1 - k) ** 3
        camera.position.lerpVectors(startCam, endCam, e)
        controls.target.lerpVectors(new THREE.Vector3(), focus, e)
        if (k >= 1) flying = false
      }
      if (!flying && pressedKeys.size) {
        const forward = camera.getWorldDirection(new THREE.Vector3())
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
        const movement = new THREE.Vector3()
        if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) movement.add(forward)
        if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) movement.sub(forward)
        if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) movement.add(right)
        if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) movement.sub(right)
        if (movement.lengthSq()) {
          const speed = Math.max(camera.position.distanceTo(controls.target) * 0.2, 0.1)
          movement.normalize().multiplyScalar(speed * delta)
          camera.position.add(movement)
          controls.target.add(movement)
          rightLook?.position.add(movement)
        }
      }
      if (!rightLook) controls.update()
      if (photoRef.current) controls.autoRotate = false
      if (earth) {
        camera.updateMatrixWorld()
        textCameraPosition.copy(sunPos).applyMatrix4(camera.matrixWorldInverse)
        const depth = -textCameraPosition.z
        const width = renderer.domElement.clientWidth
        const height = Math.max(1, renderer.domElement.clientHeight)
        const unitsPerPixel = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()) / 2) / height
        earthScreenPosition.copy(sunPos).project(camera)
        // Ziemia jest znacznikiem: promień do 16 px, z odstępem od widocznych gwiazd.
        let radiusPixels = 16
        if (showConstellationsRef.current) {
          for (const star of constellationPoints) {
            if (!star.group.visible) continue
            starScreenPosition.copy(star.position).project(camera)
            if (starScreenPosition.z < -1 || starScreenPosition.z > 1) continue
            const gap = Math.hypot((starScreenPosition.x - earthScreenPosition.x) * width / 2, (starScreenPosition.y - earthScreenPosition.y) * height / 2)
            radiusPixels = Math.min(radiusPixels, Math.max(0, gap - 7))
          }
        }
        earth.scale.setScalar(depth > 0 ? Math.min(1, radiusPixels * unitsPerPixel / (mr * 0.7)) : 1)
      }
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
      const textViewportHeight = renderer.domElement.clientHeight
      if (textViewportHeight > 0 && screenTextSpritesRef.current.length) {
        camera.updateMatrixWorld()
        const fovScale = Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()) / 2)
        for (const sprite of screenTextSpritesRef.current) {
          let visible = sprite.visible
          for (let parent = sprite.parent; visible && parent; parent = parent.parent) visible = parent.visible
          if (!visible) continue
          textCameraPosition.copy(sprite.getWorldPosition(textWorldPosition)).applyMatrix4(camera.matrixWorldInverse)
          const depth = -textCameraPosition.z
          if (depth <= 0) continue
          const height = 2 * depth * fovScale * (sprite.userData.fixedPixelHeight as number) / textViewportHeight
          sprite.scale.set(height * (sprite.userData.aspectRatio as number), height, 1)
        }
        cameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize()
        const nameBoxes: { left: number; right: number; top: number; bottom: number }[] = []
        for (const layout of starNameLayoutsRef.current) {
          if (!layout.group.visible || !layout.group.parent?.visible || !layout.group.parent.parent?.visible) continue
          for (let i = 0; i < layout.anchors.length; i++) {
            const anchor = layout.anchors[i]
            textCameraPosition.copy(anchor.position).applyMatrix4(camera.matrixWorldInverse)
            const depth = -textCameraPosition.z
            if (depth <= 0) continue
            nameScreenPosition.copy(anchor.position).project(camera)
            const height = 2 * depth * fovScale * (anchor.sprite.userData.fixedPixelHeight as number) / textViewportHeight
            const pixelHeight = anchor.sprite.userData.fixedPixelHeight as number
            const halfWidth = pixelHeight * (anchor.sprite.userData.aspectRatio as number) / 2
            const x = (nameScreenPosition.x + 1) * renderer.domElement.clientWidth / 2
            const y = (1 - nameScreenPosition.y) * textViewportHeight / 2
            const box = { left: x - halfWidth - 2, right: x + halfWidth + 2, top: y - pixelHeight - 6, bottom: y - 4 }
            const overlaps = () => nameBoxes.some((b) => box.left < b.right && box.right > b.left && box.top < b.bottom && box.bottom > b.top)
            while (y - box.bottom < 48 && overlaps()) {
              box.top -= pixelHeight + 2
              box.bottom -= pixelHeight + 2
            }
            anchor.sprite.visible = box.top >= 0 && box.bottom <= textViewportHeight && box.right >= 0 && box.left <= renderer.domElement.clientWidth && !overlaps()
            if (anchor.sprite.visible) nameBoxes.push(box)
            anchor.sprite.scale.set(height * (anchor.sprite.userData.aspectRatio as number), height, 1)
            const gap = 2 * depth * fovScale * (y - box.bottom) / textViewportHeight
            leaderEnd.copy(anchor.position).addScaledVector(cameraUp, anchor.sprite.visible ? gap : 0)
            anchor.sprite.position.copy(leaderEnd).addScaledVector(cameraUp, height / 2)
            layout.connectors.setXYZ(i * 2, anchor.position.x, anchor.position.y, anchor.position.z)
            layout.connectors.setXYZ(i * 2 + 1, leaderEnd.x, leaderEnd.y, leaderEnd.z)
          }
          layout.connectors.needsUpdate = true
        }
      }
      objectGuide.visible = !photoRef.current
      renderer.render(scene, camera)
      if (photoFrameRef.current) {
        const width = mount.clientWidth
        const height = mount.clientHeight
        const photo = photoRef.current
        const changed = photo !== projectedPhoto || width !== photoWidth || height !== photoHeight
          || projectedReceiver !== photoFrameRef.current || projectedSpan !== photoSpan
          || (photo !== null && (!photoCameraMatrix.equals(camera.matrixWorld) || !photoProjectionMatrix.equals(camera.projectionMatrix)))
        if (changed && now - lastPhotoFrame >= 32) {
          const origin = photo ? sunPos.clone().project(camera) : { x: 0, y: 0 }
          const anchors = (photo?.cuts ?? []).filter((c) => c.enabled).map((cut) => {
            const kind = photoAnchorKind(cut.distLy, scale)
            const world = kind === 'position' ? position(cut, cut.distLy!, scale)
              : kind === 'local' ? sunPos.clone()
                : sunPos.clone().add(toThree(galacticVector(cut)).multiplyScalar(photoSpan * 0.35))
            const p = world.project(camera)
            return { id: cut.id, x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2, visible: p.z >= -1 && p.z <= 1 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1, kind, originX: (origin.x + 1) * width / 2, originY: (1 - origin.y) * height / 2 }
          })
          photoFrameRef.current({ width, height, anchors })
          projectedPhoto = photo
          projectedReceiver = photoFrameRef.current
          photoWidth = width
          photoHeight = height
          projectedSpan = photoSpan
          photoCameraMatrix.copy(camera.matrixWorld)
          photoProjectionMatrix.copy(camera.projectionMatrix)
          lastPhotoFrame = now
        }
      }
      drawLabels()
      // Pinezka obiektu (HTML nad sceną) przypięta do rzutu jego położenia.
      const pin = pinRef.current
      if (pin) {
        const v = target.clone().project(camera)
        pin.style.display = !photoRef.current && placed && v.z < 1 ? '' : 'none'
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
      const candidates: { c: DSO; x: number; y: number; d: number; localGroup: boolean }[] = []
      for (let i = 0; i < limit; i++) {
        const c = bg[i]
        if (c.i === o!.i || (scale === 'galaxy' && hidden.includes(c.type))) continue
        projected.copy(bgPos[i]).project(camera)
        if (projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) continue
        candidates.push({ c, x: ((projected.x + 1) / 2) * w, y: ((1 - projected.y) / 2) * h, d: camera.position.distanceToSquared(bgPos[i]), localGroup: false })
      }
      for (const c of localGroup) {
        if (c.i === o!.i) continue
        const p = position(c, c.distLy!, 'universe')
        projected.copy(p).project(camera)
        if (projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) continue
        candidates.push({ c, x: ((projected.x + 1) / 2) * w, y: ((1 - projected.y) / 2) * h, d: camera.position.distanceToSquared(p), localGroup: true })
      }
      candidates.sort((a, b) => Number(b.localGroup) - Number(a.localGroup) || a.d - b.d)
      for (const l of candidates) hits.push({ c: l.c, x: l.x, y: l.y, box: null })
      if (!annotationsRef.current) return
      labelCtx.font = '10px ui-monospace, Consolas, monospace'
      labelCtx.lineJoin = 'round'
      labelCtx.lineWidth = 3
      const boxes: [number, number, number, number][] = []
      for (const l of candidates) {
        if (boxes.length >= 120) break
        const tw = labelCtx.measureText(l.c.id).width
        const boxAt = (x: number, y: number): [number, number, number, number] => [x - 2, y - 11, x + tw + 2, y + 3]
        const overlaps = (b: [number, number, number, number]) => boxes.some((x) => b[0] < x[2] && b[2] > x[0] && b[1] < x[3] && b[3] > x[1])
        let labelX = l.x + 6
        let labelY = l.y + 3
        let b = boxAt(labelX, labelY)
        if (l.localGroup) {
          const placements = [
            [l.x + 7, l.y + 3], [l.x + 7, l.y - 12], [l.x + 7, l.y + 18],
            [l.x - tw - 7, l.y + 3], [l.x - tw - 7, l.y - 12], [l.x - tw - 7, l.y + 18],
            [l.x + 18, l.y - 25], [l.x + 18, l.y + 31],
            [l.x - tw - 18, l.y - 25], [l.x - tw - 18, l.y + 31],
          ]
          const inBounds = ([x, y]: number[]) => {
            const candidate = boxAt(x, y)
            return candidate[0] >= 2 && candidate[1] >= 2 && candidate[2] <= w - 2 && candidate[3] <= h - 2
          }
          const placement = placements.find(([x, y]) => inBounds([x, y]) && !overlaps(boxAt(x, y))) ?? placements.find(inBounds)
          if (placement) [labelX, labelY] = placement
          b = boxAt(labelX, labelY)
        } else if (overlaps(b)) continue
        boxes.push(b)
        hits.push({ c: l.c, x: l.x, y: l.y, box: [Math.min(l.x - 6, b[0]), b[1], Math.max(l.x + 6, b[2]), b[3]] })
        labelCtx.strokeStyle = 'rgba(2, 5, 13, 0.85)'
        labelCtx.strokeText(l.c.id, labelX, labelY)
        labelCtx.fillStyle = `#${typeRGB[l.c.type].toString(16).padStart(6, '0')}c0`
        labelCtx.fillText(l.c.id, labelX, labelY)
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
    const onDown = (e: PointerEvent) => {
      down = [e.clientX, e.clientY]
      renderer.domElement.focus({ preventScroll: true })
    }
    const onUp = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) {
        const c = hitAt(e)
        if (c) select(c.i, false)
      }
      down = null
    }
    const lookEuler = new THREE.Euler(0, 0, 0, 'YXZ')
    const onRightLookDown = (e: PointerEvent) => {
      if (e.button !== 2) return
      e.preventDefault()
      e.stopImmediatePropagation()
      stopFly()
      controls.autoRotate = false
      renderer.domElement.focus({ preventScroll: true })
      lookEuler.setFromQuaternion(camera.quaternion, 'YXZ')
      rightLook = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        distance: camera.position.distanceTo(controls.target),
        yaw: lookEuler.y,
        pitch: lookEuler.x,
        position: camera.position.clone(),
      }
      renderer.domElement.setPointerCapture(e.pointerId)
    }
    const onRightLookMove = (e: PointerEvent) => {
      if (!rightLook || e.pointerId !== rightLook.pointerId) return
      e.preventDefault()
      e.stopImmediatePropagation()
      rightLook.yaw -= (e.clientX - rightLook.x) * 0.003
      rightLook.pitch = THREE.MathUtils.clamp(rightLook.pitch - (e.clientY - rightLook.y) * 0.003, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01)
      rightLook.x = e.clientX
      rightLook.y = e.clientY
      lookEuler.set(rightLook.pitch, rightLook.yaw, 0, 'YXZ')
      camera.position.copy(rightLook.position)
      camera.quaternion.setFromEuler(lookEuler)
      controls.target.copy(rightLook.position).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), rightLook.distance)
    }
    const onRightLookEnd = (e: PointerEvent) => {
      if (!rightLook || e.pointerId !== rightLook.pointerId) return
      e.preventDefault()
      e.stopImmediatePropagation()
      const look = rightLook
      rightLook = null
      const damping = controls.enableDamping
      controls.enableDamping = false
      controls.update()
      camera.position.copy(look.position)
      lookEuler.set(look.pitch, look.yaw, 0, 'YXZ')
      camera.quaternion.setFromEuler(lookEuler)
      controls.target.copy(look.position).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), look.distance)
      controls.update()
      controls.enableDamping = damping
    }
    const onContextMenu = (e: MouseEvent) => e.preventDefault()
    const onMove = (e: PointerEvent) => (renderer.domElement.style.cursor = !e.buttons && hitAt(e) ? 'pointer' : '')
    renderer.domElement.addEventListener('pointerdown', onRightLookDown, true)
    renderer.domElement.addEventListener('pointermove', onRightLookMove, true)
    renderer.domElement.addEventListener('pointerup', onRightLookEnd, true)
    renderer.domElement.addEventListener('pointercancel', onRightLookEnd, true)
    renderer.domElement.addEventListener('contextmenu', onContextMenu)
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
      photoFitRef.current = null
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearPressedKeys)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('pointerdown', onRightLookDown, true)
      renderer.domElement.removeEventListener('pointermove', onRightLookMove, true)
      renderer.domElement.removeEventListener('pointerup', onRightLookEnd, true)
      renderer.domElement.removeEventListener('pointercancel', onRightLookEnd, true)
      renderer.domElement.removeEventListener('contextmenu', onContextMenu)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Sprite) {
          obj.material.map?.dispose()
          obj.material.dispose()
        }
        if (obj instanceof THREE.LineSegments && obj.userData.starNameConnector) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) obj.material.forEach((material) => material.dispose())
          else obj.material.dispose()
        }
      })
      screenTextSpritesRef.current = []
      starNameLayoutsRef.current = []
      disposables.forEach((d) => d.dispose())
      renderer.domElement.remove()
      labels.remove()
    }
  }, [o, dist, scale, outOfScale, withDistance, select, constellations, typeRGB])

  useEffect(() => {
    if (constellationGroupRef.current) constellationGroupRef.current.visible = showConstellations
  }, [showConstellations])

  useEffect(() => {
    constellationGroupRef.current?.children.forEach((c) => { c.visible = constellationChoice === 'all' || constellationChoice === c.name })
  }, [constellationChoice])

  useEffect(() => {
    constellationGroupRef.current?.children.forEach((c) => {
      const names = c.getObjectByName('star-names')
      if (!names) return
      if (showStarNames && !names.userData.labelsAdded) {
        starNameLayoutsRef.current.push(addStarNameLabels(names as THREE.Group, names.userData.stars as ConstellationStar[], screenTextSpritesRef.current))
        names.userData.labelsAdded = true
      }
      names.visible = showStarNames
    })
  }, [showStarNames])

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
    <div className={`sky-stage space-stage${photo ? ' has-photo' : ''}`} style={{ background: 'radial-gradient(circle at 50% 40%, #071022, #000 75%)', minHeight: photo ? photoStageHeight(photo.cuts, photo.width) : undefined }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      <PhotoExplorer project={photo} onProject={setPhoto} frameRef={photoFrameRef} fitRef={photoFitRef} />
      <div ref={pinRef} className="pin" style={{ display: 'none' }} aria-hidden>
        {scale === 'universe' && LOCAL_GROUP_SHAPES[o.id] ? (
          <span style={{ width: 28, height: 28, border: '1px dashed var(--accent)', background: 'transparent' }} />
        ) : <><span className="pin-ring" /><span className="pin-ring" /><span className="pin-dot" /></>}
      </div>
      <div className="sky-hud tr" style={{ pointerEvents: 'auto', display: 'flex', gap: 6 }}>
        <button className={`toggle-chip${scale === 'galaxy' ? ' on' : ''}`} onClick={() => setScaleChoice('galaxy')}>Droga Mleczna</button>
        <button className={`toggle-chip${scale === 'universe' ? ' on' : ''}`} onClick={() => setScaleChoice('universe')}>Wszechświat lokalny</button>
      </div>
      <div className="scale-info-control">
        <button
          className="scale-info-button"
          title="Informacje o skali"
          aria-label="Informacje o skali"
          aria-expanded={scaleInfoOpen}
          aria-controls="scale-info-popover"
          onClick={() => setScaleInfoOpen((open) => !open)}
        >i</button>
        {scaleInfoOpen && (
          <div id="scale-info-popover" className="scale-info-popover" role="note" aria-label="Opis skali i źródła danych">
            <p>{dist === null
              ? 'Wikidata nie podaje odległości tego obiektu - pokazany jest tylko kierunek ze Słońca.'
              : outOfScale
                ? `Obiekt (${fmtDistance(dist)}) leży poza zasięgiem tej skali - pokazany jest tylko kierunek ze Słońca. Jego położenie: Wszechświat lokalny.`
                : scale === 'galaxy'
                  ? `Skala liniowa, 1 j. = 1000 lś. Punkty: ${withDistance.filter((c) => c.distLy! < GALACTIC_LIMIT_LY).length} obiektów katalogu z odległością.`
                  : 'Skala odległości logarytmiczna. Modele Grupy Lokalnej zachowują proporcje rozmiarów względem Drogi Mlecznej; pozostałe galaktyki to punkty w kolorach typów obiektów.'}</p>
            <p>Odległości: Wikidata (mediana wartości). Morfologia: NED, NASA, NAOJ. Modele poglądowe.{scale === 'galaxy' && ' Ziemia poza skalą; orientacja osi J2000, obrót poglądowy.'}</p>
            {scale === 'galaxy' && showConstellations && <p>Cyjanowe linie: gwiazdozbiory (Stellarium). Odległości gwiazd: szacunki z paralaks Hipparcosa (CDS I/239); brak dodatniej paralaksy przerywa linię.</p>}
          </div>
        )}
      </div>
      <div className="space-filters">
      {scale === 'galaxy' && (
        <div ref={filterRef} className="sky-hud br" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, maxWidth: '100%' }}>
          {showConstellations && (
            <>
              <select className="control constellation-select" aria-label="Gwiazdozbiór w przestrzeni 3D" style={{ width: 'auto', maxWidth: '100%' }} value={constellationChoice} onChange={(e) => setConstellationChoice(e.target.value)}>
                <option value="all">Wszystkie gwiazdozbiory</option>
                {constellations?.constellations.slice().sort((a, b) => (CONSTELLATION_PL[a.abbr] ?? a.abbr).localeCompare(CONSTELLATION_PL[b.abbr] ?? b.abbr, 'pl')).map((c) => <option key={c.abbr} value={c.abbr}>{CONSTELLATION_PL[c.abbr] ?? c.abbr}</option>)}
              </select>
              <button className={`toggle-chip${showStarNames ? ' on' : ''}`} aria-pressed={showStarNames} onClick={() => setShowStarNames((v) => !v)} title="Pokaż nazwy gwiazd z widocznych gwiazdozbiorów">Nazwy gwiazd</button>
            </>
          )}
          <button
            className={`toggle-chip${showConstellations ? ' on' : ''}`}
            disabled={!constellations}
            aria-pressed={showConstellations}
            title={constellationError ? 'Nie udało się wczytać gwiazdozbiorów' : !constellations ? 'Ładowanie gwiazdozbiorów…' : 'Pokaż gwiazdy i cyjanowe linie w przestrzeni Drogi Mlecznej'}
            onClick={() => setShowConstellations((v) => !v)}
          >Gwiazdozbiory 3D{constellationError ? ' — błąd danych' : ''}</button>
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
                  <span className="dot" style={{ background: `#${typeRGB[type].toString(16).padStart(6, '0')}` }} />
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
    </div>
  )
}
