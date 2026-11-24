// PROTOTYP (do usunięcia albo wchłonięcia): Wszechświat lokalny z płaszczyzną w stylu plakatu „The Closest Stars”.
// Nowe są tylko płaszczyzna (dysk, pierścienie, szprychy) i pionowe linie do płaszczyzny dla galaktyk Grupy Lokalnej
// (do 5 mln lś). Modele, punkty galaktyk i ich podpisy są te same co w oknie „Pozycja 3D” (te same moduły).
// Decyzja 23.11.2026: płaszczyzna galaktyczna jak w oknie; wariant z płaszczyzną supergalaktyczną odrzucony.
// Droga Mleczna: gęstość zależna od odległości kamery jak w oknie (milkyWayProgressive, milkyWayNearness).
// Uruchomienie: npm run dev, potem http://localhost:5173/prototype-plakat.html (strona nie trafia do npm run build).
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { DEFAULT_ANNOTATION_COLORS, TYPE_INFO, loadCatalog, type DSO, type ObjectType } from '../lib/catalog'
import { GALACTIC_LIMIT_LY, LOG_UNIT, sunPosition } from '../lib/space3d'
import {
  LOCAL_GROUP_SHAPES, fixedSizeTextSprite, galaxyTexture, localGroupGalaxy, milkyWayNearness, milkyWayPointCount, milkyWayProgressive, position, textSprite,
} from '../components/space3d/galaxyModels'
import { buildBackgroundPoints, drawBackgroundLabels } from '../components/space3d/backgroundOverlay'
import { GALAXY_LEVELS } from '../components/space3d/spaceSettings'
import '../styles/app.css'

/** Linie do płaszczyzny tylko w Grupie Lokalnej (poziom 0 suwaka galaktyk); dalej galaktyki są za gęsto. */
const LINE_MAX_LY = GALAXY_LEVELS[0].maxLy
const ringRadius = (ly: number) => Math.log10(ly / 1e4) * LOG_UNIT
/** Pierścienie jak dotychczasowe pierścienie z kopułami; ostatni jest krawędzią dysku. */
const RINGS = [[1e6, '1 mln lś'], [1e7, '10 mln lś'], [1e8, '100 mln lś'], [1e9, '1 mld lś']] as const
const DISC_R = ringRadius(1e9)

/** Kolory rodzajów jak w aplikacji: własne kolory opisów z zapisanego stanu (tylko odczyt), inaczej domyślne. */
function typeColors(): Record<ObjectType, number> {
  let saved: Partial<Record<ObjectType, string>> = {}
  try {
    saved = (JSON.parse(localStorage.getItem('konuzastro-tracker') ?? '{}') as { state?: { annotationColors?: typeof saved } }).state?.annotationColors ?? {}
  } catch { /* brak zapisu: kolory domyślne */ }
  return Object.fromEntries((Object.keys(TYPE_INFO) as ObjectType[]).map((t) => [t, Number.parseInt((saved[t] ?? DEFAULT_ANNOTATION_COLORS[t]).slice(1), 16)])) as Record<ObjectType, number>
}

const stage = document.getElementById('stage')!
const status = document.getElementById('status')!
const levelInput = document.getElementById('level') as HTMLInputElement
const levelNote = document.getElementById('level-note')!

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setClearColor(0x000000)
stage.append(renderer.domElement)
// Podpisy obiektów na płótnie 2D nad sceną, jak w oknie „Pozycja 3D”.
const labels = document.createElement('canvas')
labels.style.cssText = 'position:absolute;inset:0;pointer-events:none'
stage.append(labels)
const labelCtx = labels.getContext('2d')!

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(34, 1, 1, 20000)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.maxDistance = 6000
const lineMaterials: LineMaterial[] = []
const textSprites: THREE.Sprite[] = []

function fatLines(positions: number[], color: number, width: number, opacity: number): LineSegments2 {
  const material = new LineMaterial({ color, linewidth: width, transparent: true, opacity, depthWrite: false })
  lineMaterials.push(material)
  return new LineSegments2(new LineSegmentsGeometry().setPositions(positions), material)
}

function circle(r: number, n = 256): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2
    out.push(r * Math.cos(a0), 0, r * Math.sin(a0), r * Math.cos(a1), 0, r * Math.sin(a1))
  }
  return out
}

/** Podpis o stałej wysokości na ekranie (te same sprite'y co w oknie „Pozycja 3D”). */
function label(text: string, color: string, at: THREE.Vector3): THREE.Sprite {
  const sprite = textSprite(text, color)
  fixedSizeTextSprite(sprite, textSprites)
  sprite.position.copy(at)
  sprite.renderOrder = 2
  return sprite
}

/** NOWE: dysk, pierścienie, szprychy i podpisy pierścieni w płaszczyźnie galaktycznej przez Ziemię (y = 0). */
function buildPlane(): void {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(DISC_R, 192),
    new THREE.ShaderMaterial({
      uniforms: { radius: { value: DISC_R } },
      vertexShader: 'varying vec2 vPos; void main() { vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float radius; varying vec2 vPos;
        void main() {
          float d = length(vPos) / radius;
          vec3 col = mix(vec3(0.02, 0.05, 0.16), vec3(0.0, 0.32, 0.62), smoothstep(0.25, 1.0, d));
          gl_FragColor = vec4(col, 0.14 + 0.3 * smoothstep(0.55, 1.0, d));
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }),
  )
  disc.rotation.x = -Math.PI / 2
  scene.add(disc)
  scene.add(fatLines(circle(DISC_R), 0x00e0ff, 2.2, 0.95))
  for (const [ly] of RINGS.slice(0, -1)) scene.add(fatLines(circle(ringRadius(ly)), 0x3aa8ff, 1.2, 0.55))
  const spokes: number[] = []
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    spokes.push(110 * Math.cos(a), 0, 110 * Math.sin(a), DISC_R * Math.cos(a), 0, DISC_R * Math.sin(a))
  }
  scene.add(fatLines(spokes, 0x3aa8ff, 1, 0.32))
  // Podpisy pierścieni po lewej stronie dysku, jak „~15 light-years” na plakacie; kolor podpisów dawnych pierścieni.
  for (const [ly, text] of RINGS) scene.add(label(text, '#6fdcf0', new THREE.Vector3(-ringRadius(ly), 12, 0)))
}

/** Modele i punkty z aplikacji (scena okna przesunięta tak, że Ziemia jest w początku układu), linie i dane podpisów. */
let bg: ReturnType<typeof buildBackgroundPoints> | null = null
let mw: ReturnType<typeof milkyWayProgressive> | null = null
let labelData: { extragalactic: DSO[]; extragalacticPos: THREE.Vector3[]; localGroup: DSO[]; localGroupPos: THREE.Vector3[]; sun: THREE.Vector3 } | null = null
const sun = new THREE.Vector3(...sunPosition())
const toFrame = (p: THREE.Vector3) => p.clone().sub(sun)
/** Centrum Drogi Mlecznej w kadrze demo (początek układu sceny okna). */
const mwCenter = toFrame(new THREE.Vector3())

function buildContent(catalog: DSO[]): void {
  const typeRGB = typeColors()
  const stars = galaxyTexture()
  const world = new THREE.Scene()
  world.position.copy(mwCenter)
  scene.add(world)

  // Te same listy i modele co w Space3D: galaktyki tła za granicą Galaktyki bez modeli Grupy Lokalnej.
  const withDistance = catalog.filter((c) => c.distLy !== null)
  const extragalactic = withDistance.filter((c) => c.distLy! > GALACTIC_LIMIT_LY && !LOCAL_GROUP_SHAPES[c.id]).sort((a, b) => a.distLy! - b.distLy!)
  const localGroup = withDistance.filter((c) => LOCAL_GROUP_SHAPES[c.id])
  mw = milkyWayProgressive(stars, () => { dirty = true })
  world.add(mw.points)
  for (const c of localGroup) {
    const model = localGroupGalaxy(c, LOCAL_GROUP_SHAPES[c.id], stars)
    model.position.copy(position(c, c.distLy!))
    world.add(model)
  }
  bg = buildBackgroundPoints(world, [], typeRGB, extragalactic, 2.5, GALAXY_LEVELS.map(({ maxLy }) => extragalactic.filter((c) => c.distLy! <= maxLy).length))
  bg.geometry.setDrawRange(0, bg.counts[Number(levelInput.value)])
  // Podpis pod modelem jak w oknie, odsunięty za promień dysku (50 j.), żeby nie leżał na modelu.
  scene.add(label('Droga Mleczna', '#e6edf7', mwCenter.clone().add(new THREE.Vector3(0, -62, 0))))

  // NOWE: pionowe linie do płaszczyzny (z kropką u podstawy) tylko dla galaktyk Grupy Lokalnej: modele i punkty do 5 mln lś
  // (bez gromad kulistych halo, np. Palomar 4, które też leżą za granicą 150 tys. lś).
  const stalks: number[] = []
  const feet: number[] = []
  for (const c of [...localGroup, ...extragalactic.filter((c) => c.type === 'G' && c.distLy! <= LINE_MAX_LY)]) {
    const p = toFrame(position(c, c.distLy!))
    stalks.push(p.x, p.y, p.z, p.x, 0, p.z)
    feet.push(p.x, 0, p.z)
  }
  scene.add(fatLines(stalks, 0x00e0ff, 1, 0.55))
  const footGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(feet, 3))
  scene.add(new THREE.Points(footGeometry, new THREE.PointsMaterial({ color: 0x00e0ff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false })))

  labelData = {
    extragalactic, extragalacticPos: extragalactic.map((c) => toFrame(position(c, c.distLy!))),
    localGroup, localGroupPos: localGroup.map((c) => toFrame(position(c, c.distLy!))),
    sun: new THREE.Vector3(),
  }
  resize()
  ;(window as unknown as { __plakat: unknown }).__plakat = {
    ready: true, lines: feet.length / 3, models: localGroup.length,
    // Uchwyt testów: ustawienie kamery (kadr demo) i bieżąca liczba punktów Drogi Mlecznej.
    setCamera: (x: number, y: number, z: number, tx = 0, ty = 0, tz = 0) => { camera.position.set(x, y, z); controls.target.set(tx, ty, tz); dirty = true },
    mwPoints: () => mw?.points.geometry.drawRange.count,
    mwFilled: () => mw?.filled(),
    positionOf: (id: string) => labelData?.localGroupPos[labelData.localGroup.findIndex((c) => c.id === id)]?.toArray(),
  }
  status.textContent = ''
  dirty = true
}

const projected = new THREE.Vector3()
let typeRGBLabels: Record<ObjectType, number> | null = null
function drawLabels(): void {
  if (!labelData || !bg) return
  typeRGBLabels ??= typeColors()
  // Ta sama funkcja co w oknie „Pozycja 3D”, z przełącznikiem „Opisy” włączonym.
  drawBackgroundLabels({
    ctx: labelCtx, width: stage.clientWidth, height: stage.clientHeight, camera, projected,
    galaxy: false, fade: 1, list: labelData.extragalactic, listPos: labelData.extragalacticPos, limit: bg.counts[Number(levelInput.value)],
    localGroup: labelData.localGroup, localGroupPos: labelData.localGroupPos, hasPhoto: false, currentIndex: -1, hidden: [],
    annotations: true, regionAlpha: 0, sunPos: labelData.sun, anchors: [], target: labelData.sun, typeRGB: typeRGBLabels,
  })
}

/** Stała wysokość podpisów w pikselach (jak pętla tekstów w Space3D). */
const tmp = new THREE.Vector3()
function scaleTextSprites(): void {
  const fovScale = Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()) / 2)
  for (const sprite of textSprites) {
    const depth = -sprite.getWorldPosition(tmp).applyMatrix4(camera.matrixWorldInverse).z
    if (depth <= 0) continue
    const height = 2 * depth * fovScale / stage.clientHeight * (sprite.userData.fixedPixelHeight as number)
    sprite.scale.set(height * (sprite.userData.aspectRatio as number), height, 1)
  }
}

let dirty = true
function resize(): void {
  const w = stage.clientWidth, h = stage.clientHeight
  renderer.setSize(w, h, false)
  const r = Math.min(2, devicePixelRatio)
  labels.width = w * r
  labels.height = h * r
  labelCtx.setTransform(r, 0, 0, r, 0, 0)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  for (const m of lineMaterials) m.resolution.set(w, h)
  dirty = true
}

const last = new THREE.Matrix4()
function frame(): void {
  controls.update()
  if (dirty || !last.equals(camera.matrixWorld)) {
    camera.updateMatrixWorld()
    // Gęstość Drogi Mlecznej z odległości kamery od jej centrum.
    if (mw) {
      // Jak w Space3D: liczba, rozmiar i krycie punktów z odległości kamery od centrum Drogi Mlecznej.
      const distance = camera.position.distanceTo(mwCenter)
      const near = milkyWayNearness(distance)
      mw.points.geometry.setDrawRange(0, Math.min(milkyWayPointCount(distance), mw.filled()))
      mw.points.material.size = THREE.MathUtils.lerp(2.4, 2, near)
      mw.points.material.opacity = THREE.MathUtils.lerp(0.1, 0.16, near)
    }
    scaleTextSprites()
    renderer.render(scene, camera)
    drawLabels()
    last.copy(camera.matrixWorld)
    dirty = false
  }
  requestAnimationFrame(frame)
}

// Kadr jak na plakacie: dysk szeroko, kamera ok. 20° nad płaszczyzną.
const elevation = 20 * Math.PI / 180
camera.position.set(0, Math.sin(elevation), Math.cos(elevation)).multiplyScalar(2400)
controls.target.set(0, -40, 0)
addEventListener('resize', resize)
buildPlane()
resize()
frame()

// Suwak liczby galaktyk jak w „Warstwach” okna (poziomy GALAXY_LEVELS); demo startuje od poziomu 1.
const params = new URLSearchParams(location.search)
levelInput.max = String(GALAXY_LEVELS.length - 1)
levelInput.value = /^[0-3]$/.test(params.get('level') ?? '') ? params.get('level')! : '1'
const showLevel = () => {
  levelNote.textContent = GALAXY_LEVELS[Number(levelInput.value)].title.replace(/^Galaktyki \d+:\s*/, '')
  if (bg) bg.geometry.setDrawRange(0, bg.counts[Number(levelInput.value)])
  const url = new URL(location.href)
  url.searchParams.delete('variant')
  url.searchParams.set('level', levelInput.value)
  history.replaceState(null, '', url)
  dirty = true
}
levelInput.addEventListener('input', showLevel)
showLevel()
loadCatalog().then(buildContent).catch((e: Error) => { status.textContent = e.message })
