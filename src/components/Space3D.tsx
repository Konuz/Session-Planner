// Pozycja obiektu w przestrzeni 3D (three.js, ładowane leniwie z okna „Pozycja 3D”). Odległości z Wikidata (mediana
// podanych wartości), kierunek ze współrzędnych galaktycznych. Jedna scena: Droga Mleczna liniowo (1 j. = 1000 lś),
// dalsze obiekty w skali logarytmicznej. Zakładki Droga Mleczna i Wszechświat lokalny przelatują kamerą bliżej lub dalej;
// warstwy drugiej skali wygasza odległość kamery. W tle wszystkie obiekty katalogu z odległością. Ustawienia z paska okna.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { galacticVector, type Vec3 } from '../lib/astro'
import { measureSince, perfNow } from '../lib/perf'
import { DEFAULT_ANNOTATION_COLORS, TYPE_INFO, type DSO, type ObjectType } from '../lib/catalog'
import { useCatalog, useSelected } from '../state/data'
import { useStore } from '../state/store'
import type { PhotoProject } from '../lib/photo'
import { GALACTIC_LIMIT_LY, LOG_UNIT, UNIVERSE_GALAXY_SCALE, layerFades, mixFades, sunPosition, type SpaceScale } from '../lib/space3d'
import { constellationView, framePose, sideView, SPACE_FAR, SPACE_FOV, type CameraPose } from '../lib/spaceCamera'
import { ease, lerpPose, zoomPose, type Pose } from '../lib/spaceDive'
import {
  LOCAL_GROUP_SHAPES, MILKY_WAY_DIAMETER_LY, addStarNameLabels, domeMaterial, dotTexture, fixedSizeTextSprite,
  galaxyTexture, localGroupGalaxy, milkyWay, position, textSprite, toThree, type StarNameLayout,
} from './space3d/galaxyModels'
import { GALAXY_LEVELS, type ConstellationStar, type SpaceSettings } from './space3d/spaceSettings'
import { createEarthAssets, createEarthMesh } from './space3d/earthModel'

interface Props {
  settings: SpaceSettings
  photo: PhotoProject | null
  /** Dostęp do sceny dla znaczników zdjęcia i nurkowania (null przy przebudowie i odmontowaniu). */
  onHandle?(handle: Space3DHandle | null): void
}

/** Scena Space3D dla modułów okna: znaczniki zdjęcia i nurkowanie do Obserwatorium. Uchwyt nie zmienia się przy zmianie zakładki. */
export interface Space3DHandle {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  renderer: THREE.WebGLRenderer
  mount: HTMLDivElement
  /** Płótno podpisów obiektów tła nad sceną. */
  overlay: HTMLCanvasElement
  sunPos: THREE.Vector3
  earth: THREE.Mesh | null
  /** Wywoływane na początku każdej klatki z czasem requestAnimationFrame. */
  hooks: Set<(now: number) => void>
  /** Elementy modułów zdjęcia pod wskaźnikiem (piksele sceny): trafienie ma pierwszeństwo przed obiektami tła;
   *  click = true oznacza kliknięcie, które moduł sam obsługuje. */
  claims: Set<(x: number, y: number, click: boolean) => boolean>
  /** Wywoływane w każdej klatce po ustawieniu kamery: rzuty podpisów w DOM liczone z kamery tej klatki, nie poprzedniej. */
  layout: Set<(now: number) => void>
  /** Punkty zdjęcia w scenie (żywe referencje): prędkość lotu i przesuwania kamery zależy od odległości do najbliższego. */
  anchors: Set<THREE.Vector3>
  invalidate(): void
  /** Koniec przelotu kamery i obrotu poglądowego. */
  stopIntro(): void
  /** Płynny przelot kamery z bieżącej pozy (cięcie przy ograniczonym ruchu). */
  flyTo(pose: CameraPose, ms?: number, zoom?: boolean): void
  viewConstellation(abbr: string): void
  /** Klatki z zewnątrz: własna pętla stoi, a klatkę liczy step(now) (nurkowanie; w stanie zdjęcia brak klatek). */
  setExternal(on: boolean): void
  step(now: number): void
  /** Nadpisania nurkowania: kamera bez OrbitControls, krycie warstw tła i promień Ziemi w jednostkach sceny
   *  (earthBlend: 0 – znacznik do 7 px, 1 – earthRadius; pośrednie wartości dają płynną zmianę wielkości). */
  override: { camera: boolean; layerFade: number; labelFade: number; earthRadius: number | null; earthBlend: number }
}

/**
 * Ta sama klatka z dokładnością do niewidocznych zmian (1e-6 względnie, ok. 0,002 px). Tłumienie OrbitControls
 * przesuwa kamerę o coraz mniejsze ułamki jeszcze przez kilka sekund, więc dokładne `equals` nigdy nie odpoczywa.
 */
function sameMatrix(a: THREE.Matrix4, b: THREE.Matrix4): boolean {
  for (let i = 0; i < 16; i++) if (Math.abs(a.elements[i] - b.elements[i]) > 1e-6 * Math.max(1, Math.abs(b.elements[i]))) return false
  return true
}

type BackgroundPoints = { geometry: THREE.BufferGeometry; material: THREE.PointsMaterial; counts: number[]; types: ObjectType[]; pos: Float32Array; col: Float32Array }

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

const UP: Vec3 = [0, 1, 0]
/** Przelot kamery: startowy znad Galaktyki i krótszy przy zmianie obiektu lub kadru. */
const INTRO_MS = 2200
const FLY_MS = 900
/** Przelot przy zmianie zakładki (zbliżenie albo oddalenie ok. 8 razy). */
const SWITCH_MS = 1600
/** Krycie modelu Drogi Mlecznej z daleka: 52 tys. punktów sumuje się jak dawne 12 tys. we Wszechświecie lokalnym. */
const MW_FAR_OPACITY = 0.14
const easeOut = (t: number) => 1 - (1 - t) ** 3

export default function Space3D({ settings, photo, onHandle }: Props) {
  const { scale, galaxyLevel, hiddenTypes, showConstellations, showStarNames, constellationChoice, constellations } = settings
  // Zakładka nie przebudowuje sceny: przy budowie wyznacza kadr startowy, potem zmienia ją efekt [o, scale].
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const photoRef = useRef(photo)
  photoRef.current = photo
  const onHandleRef = useRef(onHandle)
  onHandleRef.current = onHandle
  const mountRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  // OrbitControls zdejmuje listener klawisza Ctrl z getRootNode() płótna. React odłącza DOM przed sprzątaniem
  // useEffect, więc wtedy trafiłby w odłączony fragment i listener na document trzymałby całą scenę (audyt C01).
  useLayoutEffect(() => () => controlsRef.current?.disconnect(), [])
  const pinRef = useRef<HTMLDivElement>(null)
  // Punkty tła posortowane wg odległości: obiekty Galaktyki (filtr rodzajów) i galaktyki (suwak zmienia tylko zakres rysowania).
  const galacticRef = useRef<BackgroundPoints | null>(null)
  const extragalacticRef = useRef<BackgroundPoints | null>(null)
  const galaxyLevelRef = useRef(galaxyLevel)
  galaxyLevelRef.current = galaxyLevel
  const hiddenTypesRef = useRef(hiddenTypes)
  hiddenTypesRef.current = hiddenTypes
  const showConstellationsRef = useRef(showConstellations)
  showConstellationsRef.current = showConstellations
  const constellationGroupRef = useRef<THREE.Group | null>(null)
  const addConstellationsRef = useRef<(() => void) | null>(null)
  const constellationsRef = useRef(constellations)
  constellationsRef.current = constellations
  const showStarNamesRef = useRef(showStarNames)
  showStarNamesRef.current = showStarNames
  const screenTextSpritesRef = useRef<THREE.Sprite[]>([])
  const starNameLayoutsRef = useRef<StarNameLayout[]>([])
  const starNamesOverlayRef = useRef<HTMLDivElement>(null)
  const textLayoutDirty = useRef(true)
  /** Zmiana sceny poza pętlą (warstwy, filtry): następna klatka musi zostać wyrenderowana. */
  const sceneDirty = useRef(true)
  const showAnnotations = useStore((s) => s.show3DAnnotations)
  const annotationsRef = useRef(showAnnotations)
  annotationsRef.current = showAnnotations
  const annotationColors = useStore((s) => s.annotationColors)
  const typeRGB = useMemo(() => Object.fromEntries(
    (Object.keys(TYPE_INFO) as ObjectType[]).map((type) => [type, Number.parseInt((annotationColors[type] ?? DEFAULT_ANNOTATION_COLORS[type]).slice(1), 16)]),
  ) as Record<ObjectType, number>, [annotationColors])
  const o = useSelected()
  const objectRef = useRef(o)
  objectRef.current = o
  const hasObject = !!o
  /** Zmiana wybranego obiektu lub zakładki w istniejącej scenie (bez nowego renderera), jednym przelotem. */
  const showObjectRef = useRef<((object: DSO, scale: SpaceScale) => void) | null>(null)
  const constellationChoiceRef = useRef(constellationChoice)
  constellationChoiceRef.current = constellationChoice
  const { catalog } = useCatalog()
  const select = useStore((s) => s.select)
  const withDistance = useMemo(() => (catalog ? catalog.filter((c) => c.distLy !== null) : []), [catalog])

  useEffect(() => {
    const mount = mountRef.current
    const starNamesOverlay = starNamesOverlayRef.current
    if (!mount || !starNamesOverlay || !objectRef.current) return
    // Od budowy sceny (skala, obiekty tła, modele) do pierwszej narysowanej klatki.
    let sceneStart: number | null = perfNow()
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(1.5, devicePixelRatio))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.domElement.tabIndex = 0
    renderer.domElement.setAttribute('aria-label', 'Widok 3D. Lewy przycisk myszy: obrót wokół celu, prawy: rozglądanie, środkowy: przesuwanie, kółko: zbliżenie do kursora, WASD lub strzałki: lot, Q i E: w dół i w górę, Shift: szybciej.')
    mount.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(SPACE_FOV, mount.clientWidth / mount.clientHeight, 0.1, SPACE_FAR)
    const controls = new OrbitControls(camera, renderer.domElement)
    controlsRef.current = controls
    // PPM jest przechwytywany jako swobodne rozglądanie, bez obiegania celu przez OrbitControls.
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    }
    renderer.domElement.addEventListener('mousedown', onMouseDown)
    // Kółko zbliża do miejsca pod kursorem (jak w grach i edytorach 3D), nie do środka kadru.
    controls.zoomToCursor = true
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.autoRotate = !reduced
    controls.autoRotateSpeed = 0.35
    // Zoom kółkiem kończy się, zanim najdalsze galaktyki wyjdą za płaszczyznę far.
    controls.maxDistance = 6000
    const disposables: { dispose(): void }[] = [renderer, controls]
    constellationGroupRef.current = null
    addConstellationsRef.current = null
    screenTextSpritesRef.current = []
    starNameLayoutsRef.current = []
    const stars = galaxyTexture()
    disposables.push(stars)

    const sunPos = new THREE.Vector3(...sunPosition())
    // Podpisy mają stałą wielkość na ekranie; podpis punktu (anchor) trzyma też stały odstęp w pikselach od niego.
    const label = (text: string, color: string, anchor?: THREE.Vector3, offsetPx = 0) => {
      const sprite = textSprite(text, color)
      fixedSizeTextSprite(sprite, screenTextSpritesRef.current)
      sprite.renderOrder = 2
      if (anchor) {
        sprite.userData.anchor = anchor
        sprite.userData.offsetPx = offsetPx
        sprite.position.copy(anchor)
      }
      return sprite
    }

    // Zakładka sceny (zmienia ją showObjectRef) i krycia warstw z odległości kamery, liczone w każdej klatce.
    let tab: SpaceScale = scaleRef.current
    let fades = layerFades(Infinity, tab)
    // Tło: obiekty katalogu z odległością. Obiekty Galaktyki i galaktyki to osobne warstwy (filtr rodzajów, suwak galaktyk).
    const galactic = withDistance.filter((c) => c.distLy! < GALACTIC_LIMIT_LY).sort((a, b) => a.distLy! - b.distLy!)
    const extragalactic = withDistance.filter((c) => c.distLy! > GALACTIC_LIMIT_LY && !LOCAL_GROUP_SHAPES[c.id]).sort((a, b) => a.distLy! - b.distLy!)
    const localGroup = withDistance.filter((c) => LOCAL_GROUP_SHAPES[c.id])
    const backgroundPoints = (list: DSO[], size: number, counts: number[]): BackgroundPoints => {
      const pos = new Float32Array(list.length * 3)
      const col = new Float32Array(list.length * 3)
      const tmp = new THREE.Color()
      list.forEach((c, i) => {
        const p = position(c, c.distLy!)
        pos.set([p.x, p.y, p.z], i * 3)
        tmp.setHex(typeRGB[c.type])
        col.set([tmp.r, tmp.g, tmp.b], i * 3)
      })
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      g.setAttribute('color', new THREE.BufferAttribute(col, 3))
      // Okrągłe kropki: tekstura koła zamiast domyślnego kwadratu.
      const dot = dotTexture()
      const m = new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, map: dot, transparent: true, opacity: 0.8, depthWrite: false })
      scene.add(new THREE.Points(g, m))
      disposables.push(g, m, dot)
      return { geometry: g, material: m, counts, types: list.map((c) => c.type), pos: pos.slice(), col: col.slice() }
    }
    galacticRef.current = backgroundPoints(galactic, 5, GALAXY_LEVELS.map(() => galactic.length))
    showTypes(galacticRef.current, hiddenTypesRef.current)
    extragalacticRef.current = backgroundPoints(extragalactic, 2.5, GALAXY_LEVELS.map(({ maxLy }) => extragalactic.filter((c) => c.distLy! <= maxLy).length))
    extragalacticRef.current.geometry.setDrawRange(0, extragalacticRef.current.counts[galaxyLevelRef.current])
    const galacticPoints = galacticRef.current
    const extragalacticPoints = extragalacticRef.current

    const localGalaxyModels: THREE.Points[] = []
    /** Warstwy Wszechświata lokalnego (pierścienie, kopuły, ich podpisy): krycie z odległości kamery. */
    const extragalacticFaders: ((fade: number, labelFade: number) => void)[] = []
    const constellationPoints: { group: THREE.Group; position: THREE.Vector3 }[] = []
    const constellationFigures = new Map<string, { group: THREE.Group; lines: LineSegments2; dots: THREE.Points; segments: number[]; stars: THREE.Vector3[] }>()
    let skyView: { group: THREE.Group; forward: THREE.Vector3; amount: number; update(amount: number): void; project(star: Vec3): Vec3; restore(): void } | null = null
    let constellationReturn: { abbr: string; pose: CameraPose; fov: number; near: number } | null = null
    const clearSkyView = () => {
      if (!skyView) return
      skyView.restore()
      skyView = null
      controls.zoomToCursor = true
      textLayoutDirty.current = sceneDirty.current = true
    }
    {
      // Dane mogą nadejść już w trakcie przelotu startowego: dołącz je bez nowego renderera i resetu kamery.
      addConstellationsRef.current = () => {
        const constellations = constellationsRef.current
        if (!constellations || constellationGroupRef.current) return
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
                const p = position({ raDeg: s[0], decDeg: s[1] }, s[2])
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
          const lines = new LineSegments2(geometry, material)
          const stars = [...points.values()]
          const starGeometry = new THREE.BufferGeometry().setFromPoints(stars)
          const dots = new THREE.Points(starGeometry, starMaterial)
          figure.add(lines, dots)
          constellationFigures.set(c.abbr, { group: figure, lines, dots, segments, stars })
          const nameGroup = new THREE.Group()
          nameGroup.name = 'star-names'
          nameGroup.visible = showStarNamesRef.current
          nameGroup.userData.stars = c.stars ?? []
          nameGroup.userData.labelsAdded = false
          if (showStarNamesRef.current) {
            starNameLayoutsRef.current.push(addStarNameLabels(nameGroup, c.stars ?? [], starNamesOverlay))
            nameGroup.userData.labelsAdded = true
          }
          figure.add(nameGroup)
          group.add(figure)
          disposables.push(geometry, starGeometry)
        }
        group.visible = showConstellationsRef.current && tab === 'galaxy'
        scene.add(group)
        constellationGroupRef.current = group
        textLayoutDirty.current = true
        sceneDirty.current = true
      }
      addConstellationsRef.current()
    }
    const mw = milkyWay(52000, stars)
    const milkyWayMaterial = mw.material as THREE.PointsMaterial
    scene.add(mw)
    disposables.push(mw.geometry, mw.material as THREE.Material)
    const gcLabel = label('Centrum Galaktyki', '#ffd9a0')
    gcLabel.position.set(0, 3, 0)
    scene.add(gcLabel)
    {
      // Pierścienie odległości (skala logarytmiczna) z kopułami; wymiary dawnej sceny Wszechświata × 1/0,12.
      const u = 1 / UNIVERSE_GALAXY_SCALE
      for (const [ly, text] of [[1e6, '1 mln lś'], [1e7, '10 mln lś'], [1e8, '100 mln lś'], [1e9, '1 mld lś']] as const) {
        const r = Math.log10(ly / 1e4) * LOG_UNIT
        const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x00e0ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
        const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.08 * u, r + 0.08 * u, 128), ringMaterial)
        ring.rotation.x = -Math.PI / 2
        scene.add(ring)
        disposables.push(ring.geometry, ringMaterial)
        // Półprzezroczysta kopuła nad pierścieniem: odległość czytelna także dla wysokości nad płaszczyzną.
        const domeShader = domeMaterial()
        const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeShader)
        scene.add(dome)
        disposables.push(dome.geometry, domeShader)
        const t = label(text, '#6fdcf0')
        t.position.set(r + 2 * u, u, 0)
        scene.add(t)
        extragalacticFaders.push((fade, labelFade) => {
          ring.visible = dome.visible = fade > 0
          t.visible = labelFade > 0
          ringMaterial.opacity = 0.18 * fade
          domeShader.uniforms.opacity.value = fade
          t.material.opacity = labelFade
        })
      }
      localGroup.forEach((c) => {
        const model = localGroupGalaxy(c, LOCAL_GROUP_SHAPES[c.id], stars)
        model.position.copy(position(c, c.distLy!))
        localGalaxyModels.push(model)
        scene.add(model)
        disposables.push(model.geometry, model.material as THREE.Material)
      })
    }

    // Ziemia jako umowny znacznik naszego położenia (rozmiar poza skalą).
    let earth: THREE.Mesh
    let earthClouds: THREE.Mesh
    {
      const assets = createEarthAssets(import.meta.env.BASE_URL, renderer.capabilities.getMaxAnisotropy())
      // Kula jednostkowa: promień w scenie ustawia skala (znacznik do 7 px, nie więcej niż earthCap).
      const rig = createEarthMesh(1, assets)
      earth = rig.mesh
      earthClouds = rig.clouds
      const axis = new THREE.Group()
      axis.position.copy(sunPos)
      // Biegun ziemski J2000: l = 122,932°, b = 27,128°; płaszczyzna Galaktyki to XZ.
      // https://asc.harvard.edu/ciao/ahelp/prop-coords.html
      axis.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), toThree(galacticVector({ raDeg: 0, decDeg: 90 })).normalize())
      axis.add(earth)
      scene.add(axis)
      scene.add(new THREE.AmbientLight(0xcfe4ff, 0.65))
      const light = new THREE.DirectionalLight(0xfff8ee, 2.1)
      light.position.copy(sunPos).add(new THREE.Vector3(10, 15, 10))
      light.target.position.copy(sunPos)
      scene.add(light, light.target)
      disposables.push(assets, ...rig.disposables)
    }
    const earthLabel = label('Ziemia', '#93cfff', sunPos, -30)
    const mwLabel = label('Droga Mleczna', '#e6edf7')
    mwLabel.position.set(0, -4.2 / UNIVERSE_GALAXY_SCALE, 0)
    scene.add(earthLabel, mwLabel)
    // Warstwy z przełącznikami jednej zakładki: gwiazdozbiory i podpisy Ziemi, centrum Galaktyki albo Drogi Mlecznej.
    const applyScale = () => {
      if (constellationGroupRef.current) constellationGroupRef.current.visible = showConstellationsRef.current && tab === 'galaxy'
      earthLabel.visible = gcLabel.visible = tab === 'galaxy'
      mwLabel.visible = tab === 'universe'
      textLayoutDirty.current = sceneDirty.current = true
    }
    applyScale()
    // Krycia warstw: zakładka ma swoje warstwy w pełni, druga skala zależy od odległości kamery od początku układu, a w przelocie
    // zakładek krycia obu zakładek się przenikają. Nurkowanie mnoży je przez swoje wygaszanie (podpisy gasną szybciej).
    const applyFades = () => {
      const distance = camera.position.length()
      fades = flight?.fromScale && flight.fromScale !== tab
        ? mixFades(layerFades(distance, flight.fromScale), layerFades(distance, tab), flight.progress)
        : layerFades(distance, tab)
      const layer = override.layerFade, labels = override.labelFade
      galacticPoints.material.opacity = 0.8 * fades.galactic * layer
      galacticPoints.material.visible = fades.galactic * layer > 0
      extragalacticPoints.material.opacity = 0.8 * fades.extragalactic * layer
      extragalacticPoints.material.visible = fades.extragalactic * layer > 0
      for (const fader of extragalacticFaders) fader(fades.extragalactic * layer, fades.extragalactic * labels)
      earthLabel.material.opacity = gcLabel.material.opacity = fades.galactic * labels
      mwLabel.material.opacity = fades.extragalactic * labels
    }

    // Przelot kamery: jedna interpolacja pozy (cel liniowo, kamera po sferze wokół celu), startowa znad Galaktyki.
    camera.position.set(0, tab === 'galaxy' ? 120 : 200 / UNIVERSE_GALAXY_SCALE, 0.01)
    // Zakładka sprzed ostatniej zmiany: przelot zakładek przenika krycia warstw od niej do bieżącej (fromScale, progress).
    let previousTab: SpaceScale = tab
    let flight: { from: Pose; to: Pose; start: number | null; ms: number; easing(t: number): number; zoom: boolean; fromScale: SpaceScale | null; progress: number; fromFov: number; toFov: number; fromNear: number; toNear: number; fromSky: number; toSky: number } | null = null
    const setProjection = (fov: number, near: number) => {
      if (fov === camera.fov && near === camera.near) return
      camera.fov = fov
      camera.near = near
      camera.updateProjectionMatrix()
    }
    /** zoom: przelot zakładek, odległość od celu zmienia się geometrycznie (zoomPose). */
    const fly = (pose: CameraPose, ms: number, fov = SPACE_FOV, near = 0.1, toSky = 0, easing = easeOut, zoom = false) => {
      // Wyzeruj bezwładność, zachowując pozę ostatniej widocznej klatki.
      const position = camera.position.toArray() as Vec3
      const target = controls.target.toArray() as Vec3
      const damping = controls.enableDamping
      controls.enableDamping = false
      controls.update()
      controls.enableDamping = damping
      camera.position.set(...position)
      controls.target.set(...target)
      camera.lookAt(controls.target)
      sceneDirty.current = true
      if (reduced) {
        flight = null
        camera.position.set(...pose.position)
        controls.target.set(...pose.target)
        setProjection(fov, near)
        if (toSky === 0) clearSkyView()
        else skyView?.update(toSky)
        return
      }
      flight = { from: { position, target, up: UP }, to: { ...pose, up: UP }, start: null, ms, easing, zoom, fromScale: zoom ? previousTab : null, progress: 0, fromFov: camera.fov, toFov: fov, fromNear: camera.near, toNear: near, fromSky: skyView?.amount ?? 0, toSky }
    }

    // Wybrany obiekt: linia od Ziemi, pion do płaszczyzny Galaktyki i podpis. Zmiana obiektu przebudowuje tylko
    // tę grupę i przestawia kamerę przelotem; scena, renderer i kontekst WebGL zostają.
    const objectGuide = new THREE.Group()
    scene.add(objectGuide)
    let current = objectRef.current!
    let target = sunPos.clone()
    let placed = false
    // Największy promień znacznika Ziemi: nie zasłania bliskiego obiektu.
    let earthCap = 0.35
    const showObject = (object: DSO, ms: number, zoom = false) => {
      constellationReturn = null
      clearSkyView()
      for (const child of [...objectGuide.children]) {
        objectGuide.remove(child)
        if (child instanceof THREE.Sprite) {
          screenTextSpritesRef.current = screenTextSpritesRef.current.filter((sprite) => sprite !== child)
          child.material.map?.dispose()
          child.material.dispose()
        } else {
          const line = child as THREE.Line
          line.geometry.dispose()
          ;(line.material as THREE.Material).dispose()
        }
      }
      current = object
      const dist = object.distLy ?? null
      // Obiekt dalszy niż zasięg skali Drogi Mlecznej pokazany jak bez odległości: tylko kierunek, bez oddalania kadru.
      placed = dist !== null && !(tab === 'galaxy' && dist > GALACTIC_LIMIT_LY)
      // Obiekt Galaktyki bez odległości w skali Wszechświata: zbliżenie na Drogę Mleczną, w której kończy się jego kierunek.
      const insideMilkyWay = dist === null && object.type !== 'G' && object.type !== 'GG'
      const minSpan = tab === 'galaxy' ? 8 : (insideMilkyWay ? 16 : 70) / UNIVERSE_GALAXY_SCALE
      const dir = toThree(galacticVector(object)).normalize()
      target = placed ? position(object, dist!) : sunPos.clone()
      // Rozmiar kadru wokół celu: kreski linii skalują się z nim, punkty i podpisy mają stały rozmiar w pikselach.
      const sep = sunPos.distanceTo(target)
      const k = Math.max(minSpan, sep * 2.2) / 40
      earthCap = (sep > 0 ? Math.min(0.5 * k, sep * 0.15) : 0.5 * k) * 0.7
      const dashes = { dashSize: 0.25 * k, gapSize: 0.18 * k }
      if (placed) {
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([sunPos, target]), new THREE.LineDashedMaterial({ color: 0x00e0ff, ...dashes, transparent: true, opacity: 0.8 }))
        line.computeLineDistances()
        // Pion obiektu do płaszczyzny Galaktyki i linia w płaszczyźnie do Słońca: z przerywaną tworzą trójkąt,
        // który w obu skalach pokazuje wysokość nad dyskiem i kierunek w jego płaszczyźnie.
        const foot = new THREE.Vector3(target.x, sunPos.y, target.z)
        const drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([target, foot, sunPos]), new THREE.LineBasicMaterial({ color: 0x00e0ff, transparent: true, opacity: tab === 'universe' ? 0.6 : 0.35 }))
        objectGuide.add(line, drop, label(object.id, '#00e0ff', target, 26))
      } else {
        // Tylko kierunek ze Słońca. Ta sama informacja w obu skalach: obiekt Galaktyki leży w Drodze Mlecznej
        // (promień kończy się na jej krawędzi), galaktyka poza nią (promień wychodzi poza Drogę Mleczną).
        // Przecięcie promienia ze sferą wokół centrum Galaktyki: krawędź dysku albo granica danej skali.
        const radius = insideMilkyWay ? MILKY_WAY_DIAMETER_LY / 2000 : tab === 'galaxy' ? GALACTIC_LIMIT_LY / 1000 : Math.log10(1e9 / 1e4) * LOG_UNIT
        const b = sunPos.dot(dir)
        const length = -b + Math.sqrt(b * b - sunPos.lengthSq() + radius * radius)
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([sunPos, sunPos.clone().addScaledVector(dir, length)]), new THREE.LineDashedMaterial({ color: 0x00e0ff, ...dashes }))
        line.computeLineDistances()
        objectGuide.add(line)
      }
      textLayoutDirty.current = true
      sceneDirty.current = true
      lastLabelW = 0
      // Kadr zdjęcia ustawiają jego moduły (linia widzenia w Drodze Mlecznej, okno we Wszechświecie lokalnym).
      if (photoRef.current) return
      // Kamera z boku linii Ziemia–obiekt; w Drodze Mlecznej po zewnętrznej stronie, żeby dysk Galaktyki był tłem.
      const reach = placed ? target : sunPos.clone().addScaledVector(dir, minSpan * 0.4)
      const middle = sunPos.clone().lerp(reach, 0.5)
      const sight = reach.clone().sub(sunPos)
      fly(framePose([sunPos.toArray() as Vec3, reach.toArray() as Vec3], sideView(sight.toArray() as Vec3, tab === 'galaxy' ? [middle.x, 0, middle.z] : undefined),
        { fovDeg: SPACE_FOV, aspect: camera.aspect, room: [0.42, 0.42], minDistance: minSpan * 1.08 }), ms, SPACE_FOV, 0.1, 0, zoom ? ease : easeOut, zoom)
    }
    // Zmiana zakładki (także razem z obiektem) to jeden przelot ze zmianą skali; sama zmiana obiektu – zwykły przelot.
    showObjectRef.current = (object, scale) => {
      if (scale !== tab) {
        previousTab = tab
        tab = scale
        applyScale()
        showObject(object, SWITCH_MS, true)
      } else if (object !== current) showObject(object, FLY_MS)
    }
    const t0 = performance.now()
    let raf = 0
    let lastTick = performance.now()
    const pressedKeys = new Set<string>()
    let rightLook: { pointerId: number; x: number; y: number; distance: number; yaw: number; pitch: number; position: THREE.Vector3 } | null = null
    const moveKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'])
    let fast = false
    const anchors: Space3DHandle['anchors'] = new Set()
    const origin = new THREE.Vector3()
    /** Odległość kamery od najbliższego obiektu sceny: Ziemi, wybranego obiektu, środka skali i punktów zdjęcia.
     *  Od niej zależy prędkość lotu i przesuwania: przy obiekcie ruch jest precyzyjny, z daleka szybki. */
    const nearest = () => {
      let d = Math.min(camera.position.distanceTo(sunPos), camera.position.distanceTo(origin))
      if (placed) d = Math.min(d, camera.position.distanceTo(target))
      for (const anchor of anchors) d = Math.min(d, camera.position.distanceTo(anchor))
      return Math.max(d, 0.02)
    }
    const stopFly = () => { flight = null }
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement
      if ((active !== renderer.domElement && !active?.classList.contains('constellation-select')) || !moveKeys.has(e.code) || e.altKey || e.ctrlKey || e.metaKey) return
      e.preventDefault()
      renderer.domElement.focus({ preventScroll: true })
      pressedKeys.add(e.code)
      fast = e.shiftKey
      stopFly()
      controls.autoRotate = false
    }
    const onKeyUp = (e: KeyboardEvent) => { pressedKeys.delete(e.code); fast = e.shiftKey }
    const clearPressedKeys = () => pressedKeys.clear()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearPressedKeys)
    const textWorldPosition = new THREE.Vector3()
    const textCameraPosition = new THREE.Vector3()
    const nameScreenPosition = new THREE.Vector3()
    const earthScreenPosition = new THREE.Vector3()
    const starScreenPosition = new THREE.Vector3()
    const projectedAnchor = new THREE.Vector3()
    const constellationDirection = new THREE.Vector3()
    const cameraUp = new THREE.Vector3()
    const leaderEnd = new THREE.Vector3()
    controls.addEventListener('start', () => {
      stopFly()
      controls.autoRotate = false
    })
    const moveForward = new THREE.Vector3()
    const moveRight = new THREE.Vector3()
    const moveDelta = new THREE.Vector3()
    const pinProjected = new THREE.Vector3()
    const labelCameraMatrix = new THREE.Matrix4()
    const labelProjMatrix = new THREE.Matrix4()
    const textCameraMatrix = new THREE.Matrix4()
    const textProjMatrix = new THREE.Matrix4()
    let lastTextWidth = 0, lastTextHeight = 0, lastTextGuideVisible = false
    let lastLabelW = 0, lastLabelH = 0, lastLabelAnnotations: boolean | null = null, lastLabelLevel = -1
    let lastLabelHidden: readonly ObjectType[] | null = null, lastLabelScale: SpaceScale | null = null
    // Renderowanie na żądanie: bez ruchu kamery i zmian sceny nie rysujemy co klatkę (GPU, bateria).
    const renderedCamera = new THREE.Matrix4()
    const renderedProjection = new THREE.Matrix4()
    let renderedWidth = 0, renderedHeight = 0, renderedGuide: boolean | null = null, lastRender = -Infinity
    sceneDirty.current = true
    const hooks = new Set<(now: number) => void>()
    const claims: Space3DHandle['claims'] = new Set()
    const layout: Space3DHandle['layout'] = new Set()
    const override: Space3DHandle['override'] = { camera: false, layerFade: 1, labelFade: 1, earthRadius: null, earthBlend: 0 }
    let external = false
    let sizedW = mount.clientWidth, sizedH = mount.clientHeight
    const fitSize = () => {
      if (mount.clientWidth === sizedW && mount.clientHeight === sizedH) return
      sizedW = mount.clientWidth
      sizedH = mount.clientHeight
      sizeLabels()
      camera.aspect = sizedW / Math.max(1, sizedH)
      camera.updateProjectionMatrix()
      renderer.setSize(sizedW, sizedH)
    }
    const step = (now: number) => {
      fitSize()
      for (const hook of hooks) hook(now)
      const delta = Math.min((now - lastTick) / 1000, 0.05)
      lastTick = now
      // Powolny obrót poglądowy: jeden obrót na trzy minuty, niezależnie od liczby klatek; chmury dryfują nieco szybciej.
      if (!reduced) {
        const spin = ((performance.now() - t0) / 180_000) * Math.PI * 2
        earth.rotation.y = spin
        earthClouds.rotation.y = spin * 0.25
      }
      if (flight && !override.camera) {
        flight.start ??= now
        const t = Math.min(1, (now - flight.start) / flight.ms)
        const eased = flight.easing(t)
        flight.progress = eased
        const pose = (flight.zoom ? zoomPose : lerpPose)(flight.from, flight.to, eased)
        skyView?.update(THREE.MathUtils.lerp(flight.fromSky, flight.toSky, eased))
        setProjection(THREE.MathUtils.lerp(flight.fromFov, flight.toFov, eased), THREE.MathUtils.lerp(flight.fromNear, flight.toNear, eased))
        camera.position.set(...pose.position)
        controls.target.set(...pose.target)
        if (t >= 1) {
          if (flight.toSky === 0) clearSkyView()
          flight = null
        }
      }
      if (!flight && !override.camera && pressedKeys.size) {
        const forward = camera.getWorldDirection(moveForward)
        const right = moveRight.set(1, 0, 0).applyQuaternion(camera.quaternion)
        const movement = moveDelta.set(0, 0, 0)
        if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) movement.add(forward)
        if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) movement.sub(forward)
        if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) movement.add(right)
        if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) movement.sub(right)
        if (pressedKeys.has('KeyE')) movement.y += 1
        if (pressedKeys.has('KeyQ')) movement.y -= 1
        if (movement.lengthSq()) {
          // 60% odległości do najbliższego obiektu na sekundę; z Shiftem cztery razy szybciej.
          const speed = nearest() * 0.6 * (fast ? 4 : 1)
          movement.normalize().multiplyScalar(speed * delta)
          camera.position.add(movement)
          controls.target.add(movement)
          rightLook?.position.add(movement)
        }
      }
      if (!rightLook && !override.camera) controls.update()
      if (photoRef.current) controls.autoRotate = false
      camera.updateMatrixWorld()
      applyFades()
      if (skyView && (tab !== 'galaxy' || !showConstellationsRef.current || constellationChoiceRef.current !== skyView.group.name ||
        (!flight && !override.camera && camera.getWorldDirection(constellationDirection).dot(skyView.forward) < 0.999999))) clearSkyView()
      for (const hook of layout) hook(now)
      {
        textCameraPosition.copy(sunPos).applyMatrix4(camera.matrixWorldInverse)
        const depth = -textCameraPosition.z
        const width = renderer.domElement.clientWidth
        const height = Math.max(1, renderer.domElement.clientHeight)
        const unitsPerPixel = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()) / 2) / height
        earthScreenPosition.copy(sunPos).project(camera)
        // Ziemia jest znacznikiem: promień do 7 px, z odstępem od widocznych gwiazd.
        let radiusPixels = 7
        const skyAmount = skyView?.amount ?? 0
        // Gwiazdozbiory 3D są tylko w zakładce Droga Mleczna: ukryte nie zmniejszają znacznika Ziemi.
        if (showConstellationsRef.current && tab === 'galaxy' && skyAmount < 1) {
          for (const star of constellationPoints) {
            if (!star.group.visible) continue
            if (skyView?.group === star.group) starScreenPosition.set(...skyView.project(star.position.toArray() as Vec3))
            else starScreenPosition.copy(star.position)
            starScreenPosition.project(camera)
            if (starScreenPosition.z < -1 || starScreenPosition.z > 1) continue
            const gap = Math.hypot((starScreenPosition.x - earthScreenPosition.x) * width / 2, (starScreenPosition.y - earthScreenPosition.y) * height / 2)
            radiusPixels = Math.min(radiusPixels, Math.max(0, gap - 7))
          }
        }
        radiusPixels = THREE.MathUtils.lerp(radiusPixels, 8, skyAmount)
        // Z daleka (Wszechświat lokalny) znacznik Ziemi maleje do zera razem z warstwami Galaktyki.
        const marker = (depth > 0 ? Math.min(earthCap, radiusPixels * unitsPerPixel) : earthCap) * fades.galactic
        const earthScale = override.earthRadius === null ? marker : marker + (override.earthRadius - marker) * override.earthBlend
        earth.scale.setScalar(earthScale)
        if (!override.camera) earth.visible = earthScale > 1e-6
      }
      {
        // Przy zbliżeniu gwiazdy pozostają widoczne, a z daleka nie zlewają się w jasną plamę.
        const close = 1 - THREE.MathUtils.smoothstep(camera.position.distanceTo(controls.target), 20, 100)
        milkyWayMaterial.size = 2.4 + close * 0.8
        // Gaśnie razem z warstwami Galaktyki: w Drodze Mlecznej pełna, we Wszechświecie z daleka jak dawne 12 tys. punktów.
        milkyWayMaterial.opacity = (0.17 + close * 0.13) * override.layerFade * THREE.MathUtils.lerp(1, MW_FAR_OPACITY, 1 - fades.galactic)
      }
      for (const model of localGalaxyModels) {
        // Zbliżenie względem promienia modelu: także małe galaktyki zachowują czytelne gwiazdy.
        const distance = camera.position.distanceTo(model.position) / (50 * model.scale.x)
        const close = 1 - THREE.MathUtils.smoothstep(distance, 2, 10)
        const material = model.material as THREE.PointsMaterial
        material.size = 2.4 + close * 0.8
        material.opacity = (0.1 + close * 0.18) * fades.extragalactic
        material.visible = fades.extragalactic > 0
      }
      objectGuide.visible = !photoRef.current
      const textViewportHeight = renderer.domElement.clientHeight
      const textViewportWidth = renderer.domElement.clientWidth
      starNamesOverlay.style.opacity = String(override.layerFade)
      if (textViewportHeight > 0 && screenTextSpritesRef.current.length && (
        textLayoutDirty.current || textViewportWidth !== lastTextWidth || textViewportHeight !== lastTextHeight
        || objectGuide.visible !== lastTextGuideVisible || !sameMatrix(textCameraMatrix, camera.matrixWorld)
        || !sameMatrix(textProjMatrix, camera.projectionMatrix)
      )) {
        textLayoutDirty.current = false
        textCameraMatrix.copy(camera.matrixWorld)
        textProjMatrix.copy(camera.projectionMatrix)
        lastTextWidth = textViewportWidth
        lastTextHeight = textViewportHeight
        lastTextGuideVisible = objectGuide.visible
        const fovScale = Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()) / 2)
        cameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize()
        for (const sprite of screenTextSpritesRef.current) {
          let visible = sprite.visible
          for (let parent = sprite.parent; visible && parent; parent = parent.parent) visible = parent.visible
          if (!visible) continue
          const anchor = sprite.userData.anchor as THREE.Vector3 | undefined
          textCameraPosition.copy(anchor ?? sprite.getWorldPosition(textWorldPosition)).applyMatrix4(camera.matrixWorldInverse)
          const depth = -textCameraPosition.z
          if (depth <= 0) continue
          const unitsPerPixel = 2 * depth * fovScale / textViewportHeight
          const height = unitsPerPixel * (sprite.userData.fixedPixelHeight as number)
          sprite.scale.set(height * (sprite.userData.aspectRatio as number), height, 1)
          if (anchor) sprite.position.copy(anchor).addScaledVector(cameraUp, (sprite.userData.offsetPx as number) * unitsPerPixel)
        }
        const nameBoxes: { left: number; right: number; top: number; bottom: number }[] = []
        for (const layout of starNameLayoutsRef.current) {
          layout.root.hidden = !layout.group.visible || !layout.group.parent?.visible || !layout.group.parent.parent?.visible
          if (layout.root.hidden) continue
          for (let i = 0; i < layout.anchors.length; i++) {
            const anchor = layout.anchors[i]
            const position = skyView?.group === layout.group.parent
              ? projectedAnchor.set(...skyView.project(anchor.position.toArray() as Vec3))
              : anchor.position
            textCameraPosition.copy(position).applyMatrix4(camera.matrixWorldInverse)
            const depth = -textCameraPosition.z
            nameScreenPosition.copy(position).project(camera)
            const pixelHeight = anchor.height
            const halfWidth = anchor.width / 2
            const x = (nameScreenPosition.x + 1) * textViewportWidth / 2
            const y = (1 - nameScreenPosition.y) * textViewportHeight / 2
            const box = { left: x - halfWidth - 2, right: x + halfWidth + 2, top: y - pixelHeight - 6, bottom: y - 4 }
            const overlaps = () => nameBoxes.some((b) => box.left < b.right && box.right > b.left && box.top < b.bottom && box.bottom > b.top)
            while (y - box.bottom < 48 && overlaps()) {
              box.top -= pixelHeight + 2
              box.bottom -= pixelHeight + 2
            }
            anchor.el.hidden = depth <= 0 || Math.abs(nameScreenPosition.z) > 1 ||
              box.top < 0 || box.bottom > textViewportHeight || box.right < 0 || box.left > textViewportWidth || overlaps()
            if (!anchor.el.hidden) {
              nameBoxes.push(box)
              anchor.el.style.transform = `translate(${Math.round(x - halfWidth)}px, ${Math.round(box.bottom - pixelHeight)}px)`
            }
            const gap = anchor.el.hidden ? 0 : 2 * depth * fovScale * (y - box.bottom) / textViewportHeight
            leaderEnd.copy(position).addScaledVector(cameraUp, gap)
            layout.connectors.setXYZ(i * 2, position.x, position.y, position.z)
            layout.connectors.setXYZ(i * 2 + 1, leaderEnd.x, leaderEnd.y, leaderEnd.z)
          }
          layout.connectors.needsUpdate = true
        }
      }
      // Ziemia obraca się raz na 3 min (2°/s), więc dla niej wystarcza 10 klatek/s; co sekundę klatka kontrolna.
      const canvas = renderer.domElement
      if (sceneDirty.current || !sameMatrix(renderedCamera, camera.matrixWorld) || !sameMatrix(renderedProjection, camera.projectionMatrix)
        || canvas.width !== renderedWidth || canvas.height !== renderedHeight || objectGuide.visible !== renderedGuide
        || (earth && !reduced && now - lastRender >= 100) || now - lastRender >= 1000) {
        renderer.render(scene, camera)
        if (sceneStart !== null) {
          measureSince('space3d:scene→first-frame', sceneStart)
          sceneStart = null
        }
        sceneDirty.current = false
        renderedCamera.copy(camera.matrixWorld)
        renderedProjection.copy(camera.projectionMatrix)
        renderedWidth = canvas.width
        renderedHeight = canvas.height
        renderedGuide = objectGuide.visible
        lastRender = now
      }
      drawLabels()
      // Pinezka obiektu (HTML nad sceną) przypięta do rzutu jego położenia.
      const pin = pinRef.current
      if (pin) {
        const v = pinProjected.copy(target).project(camera)
        pin.style.display = !photoRef.current && placed && v.z < 1 ? '' : 'none'
        pin.style.transform = `translate(${((v.x + 1) / 2) * mount.clientWidth}px, ${((1 - v.y) / 2) * mount.clientHeight}px)`
      }
    }
    const tick = (now = performance.now()) => {
      step(now)
      raf = requestAnimationFrame(tick)
    }
    // Podpisy obiektów tła (przełącznik „Opisy”): najbliższe kamerze najpierw, bez nakładania się.
    const labels = document.createElement('canvas')
    labels.style.cssText = 'position:absolute;inset:0;pointer-events:none'
    mount.appendChild(labels)
    const labelCtx = labels.getContext('2d')!
    const galacticPos = galactic.map((c) => position(c, c.distLy!))
    const extragalacticPos = extragalactic.map((c) => position(c, c.distLy!))
    const localGroupPos = localGroup.map((c) => position(c, c.distLy!))
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
      if (
        w === lastLabelW &&
        h === lastLabelH &&
        annotationsRef.current === lastLabelAnnotations &&
        galaxyLevelRef.current === lastLabelLevel &&
        hiddenTypesRef.current === lastLabelHidden &&
        tab === lastLabelScale &&
        sameMatrix(labelCameraMatrix, camera.matrixWorld) &&
        sameMatrix(labelProjMatrix, camera.projectionMatrix)
      ) {
        return
      }
      lastLabelW = w
      lastLabelH = h
      lastLabelAnnotations = annotationsRef.current
      lastLabelLevel = galaxyLevelRef.current
      lastLabelHidden = hiddenTypesRef.current
      lastLabelScale = tab
      labelCameraMatrix.copy(camera.matrixWorld)
      labelProjMatrix.copy(camera.projectionMatrix)
      labelCtx.clearRect(0, 0, w, h)
      hits = []
      const hidden = hiddenTypesRef.current
      // Podpisy i kliknięcia warstwy bieżącej zakładki: obiekty Galaktyki albo galaktyki z Grupą Lokalną.
      // Wygaszona warstwa (oddalenie z Drogi Mlecznej, zbliżenie we Wszechświecie) nie ma podpisów.
      const galaxy = tab === 'galaxy'
      const fade = galaxy ? fades.galactic : fades.extragalactic
      const list = galaxy ? galactic : extragalactic
      const listPos = galaxy ? galacticPos : extragalacticPos
      const limit = fade === 0 ? 0 : galaxy ? galactic.length : extragalacticPoints.counts[galaxyLevelRef.current]
      const candidates: { c: DSO; x: number; y: number; d: number; localGroup: boolean }[] = []
      for (let i = 0; i < limit; i++) {
        const c = list[i]
        if (c.i === current.i || (galaxy && hidden.includes(c.type))) continue
        projected.copy(listPos[i]).project(camera)
        if (projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) continue
        candidates.push({ c, x: ((projected.x + 1) / 2) * w, y: ((1 - projected.y) / 2) * h, d: camera.position.distanceToSquared(listPos[i]), localGroup: false })
      }
      for (let i = 0; i < localGroup.length && !galaxy && fade > 0; i++) {
        const c = localGroup[i]
        if (c.i === current.i) continue
        const p = localGroupPos[i]
        projected.copy(p).project(camera)
        if (projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) continue
        candidates.push({ c, x: ((projected.x + 1) / 2) * w, y: ((1 - projected.y) / 2) * h, d: camera.position.distanceToSquared(p), localGroup: true })
      }
      candidates.sort((a, b) => Number(b.localGroup) - Number(a.localGroup) || a.d - b.d)
      for (const l of candidates) hits.push({ c: l.c, x: l.x, y: l.y, box: null })
      if (!annotationsRef.current) return
      labelCtx.globalAlpha = fade
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
    const claimed = (e: PointerEvent, click: boolean) => {
      const r = renderer.domElement.getBoundingClientRect()
      for (const claim of claims) if (claim(e.clientX - r.left, e.clientY - r.top, click)) return true
      return false
    }
    const onUp = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5 && !claimed(e, true)) {
        const c = hitAt(e)
        if (c) select(c.i, false)
      }
      down = null
    }
    const lookEuler = new THREE.Euler(0, 0, 0, 'YXZ')
    const lookDirection = new THREE.Vector3()
    const onRightLookDown = (e: PointerEvent) => {
      if (e.button === 1 && !override.camera) {
        // Środkowy przycisk przesuwa kamerę w płaszczyźnie ekranu. OrbitControls skaluje to odległością do celu obrotu,
        // więc na czas przesuwania cel staje przed kamerą w odległości najbliższego obiektu.
        stopFly()
        controls.autoRotate = false
        controls.target.copy(camera.position).addScaledVector(camera.getWorldDirection(lookDirection), nearest())
        return
      }
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
      controls.target.copy(rightLook.position).addScaledVector(camera.getWorldDirection(lookDirection), rightLook.distance)
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
      controls.target.copy(look.position).addScaledVector(camera.getWorldDirection(lookDirection), look.distance)
      controls.update()
      controls.enableDamping = damping
    }
    const onContextMenu = (e: MouseEvent) => e.preventDefault()
    const onMove = (e: PointerEvent) => (renderer.domElement.style.cursor = !e.buttons && (claimed(e, false) || hitAt(e)) ? 'pointer' : '')
    renderer.domElement.addEventListener('pointerdown', onRightLookDown, true)
    renderer.domElement.addEventListener('pointermove', onRightLookMove, true)
    renderer.domElement.addEventListener('pointerup', onRightLookEnd, true)
    renderer.domElement.addEventListener('pointercancel', onRightLookEnd, true)
    renderer.domElement.addEventListener('contextmenu', onContextMenu)
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)
    renderer.domElement.addEventListener('pointermove', onMove)
    showObject(current, INTRO_MS)
    tick()
    // Wstrzymana scena (klatki z zewnątrz) dopasowuje rozmiar dopiero w step(): panele okna zmieniają go co klatkę.
    const ro = new ResizeObserver(() => { if (!external) fitSize() })
    ro.observe(mount)
    // Inny monitor albo powiększenie strony zmienia devicePixelRatio bez zmiany rozmiaru CSS (ResizeObserver milczy).
    let dprQuery = matchMedia(`(resolution: ${devicePixelRatio}dppx)`)
    const onDpr = () => {
      renderer.setPixelRatio(Math.min(1.5, devicePixelRatio))
      sizeLabels()
      lastLabelW = 0
      sceneDirty.current = true
      dprQuery.removeEventListener('change', onDpr)
      dprQuery = matchMedia(`(resolution: ${devicePixelRatio}dppx)`)
      dprQuery.addEventListener('change', onDpr)
    }
    dprQuery.addEventListener('change', onDpr)
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden && !external) tick()
    }
    document.addEventListener('visibilitychange', onVis)
    onHandleRef.current?.({
      scene, camera, controls, renderer, mount, overlay: labels, sunPos, earth, hooks, claims, layout, anchors, override, step,
      invalidate: () => { sceneDirty.current = true },
      stopIntro: () => { flight = null; controls.autoRotate = false },
      flyTo: (pose, ms, zoom = false) => {
        constellationReturn = null
        controls.autoRotate = false
        fly(pose, ms ?? (zoom ? SWITCH_MS : FLY_MS), SPACE_FOV, 0.1, 0, zoom ? ease : easeOut, zoom)
      },
      viewConstellation: (abbr) => {
        if (constellationReturn?.abbr === abbr) {
          const { pose, fov, near } = constellationReturn
          constellationReturn = null
          controls.autoRotate = false
          fly(pose, FLY_MS, fov, near, 0, ease)
          return
        }
        const figure = constellationFigures.get(abbr)
        if (!figure) return
        const { group, lines, dots, segments, stars } = figure
        const view = constellationView(stars.map((star) => star.toArray() as Vec3), sunPos.toArray() as Vec3, camera.aspect)
        if (!view) return
        constellationReturn = constellationReturn ? { ...constellationReturn, abbr } : {
          abbr,
          pose: flight?.to ?? { position: camera.position.toArray() as Vec3, target: controls.target.toArray() as Vec3 },
          fov: flight?.toFov ?? camera.fov,
          near: flight?.toNear ?? camera.near,
        }
        if (skyView?.group !== group) {
          clearSkyView()
          const lineGeometry = new LineSegmentsGeometry().setPositions(segments)
          const dotGeometry = new THREE.BufferGeometry().setFromPoints(stars)
          const originalLines = lines.geometry, originalDots = dots.geometry
          const lineBuffer = (lineGeometry.attributes.instanceStart as THREE.InterleavedBufferAttribute).data
          const dotsBuffer = dotGeometry.getAttribute('position')
          const dotPositions = stars.flatMap((star) => star.toArray())
          const projectBuffer = (source: number[]) => {
            const projected: number[] = []
            for (let i = 0; i < source.length; i += 3) projected.push(...view.project([source[i], source[i + 1], source[i + 2]]))
            return projected
          }
          const projectedSegments = projectBuffer(segments), projectedDots = projectBuffer(dotPositions)
          lines.geometry = lineGeometry
          dots.geometry = dotGeometry
          skyView = { group, forward: new THREE.Vector3(...view.forward), amount: 0,
            project(star) {
              const target = view.project(star)
              return [THREE.MathUtils.lerp(star[0], target[0], this.amount), THREE.MathUtils.lerp(star[1], target[1], this.amount), THREE.MathUtils.lerp(star[2], target[2], this.amount)]
            },
            update(amount) {
              if (amount === this.amount) return
              this.amount = amount
              for (let i = 0; i < segments.length; i++) lineBuffer.array[i] = THREE.MathUtils.lerp(segments[i], projectedSegments[i], amount)
              for (let i = 0; i < dotPositions.length; i++) dotsBuffer.array[i] = THREE.MathUtils.lerp(dotPositions[i], projectedDots[i], amount)
              lineBuffer.needsUpdate = dotsBuffer.needsUpdate = true
              lineGeometry.computeBoundingBox()
              lineGeometry.computeBoundingSphere()
              dotGeometry.computeBoundingSphere()
              textLayoutDirty.current = sceneDirty.current = true
            },
            restore() {
              lines.geometry = originalLines
              dots.geometry = originalDots
              lineGeometry.dispose()
              dotGeometry.dispose()
            },
          }
        }
        controls.zoomToCursor = false
        controls.autoRotate = false
        fly(view, FLY_MS, view.fov, 0.001, 1, ease)
      },
      setExternal: (on) => {
        if (on === external) return
        external = on
        cancelAnimationFrame(raf)
        if (!on && !document.hidden) tick()
      },
    })
    return () => {
      clearSkyView()
      addConstellationsRef.current = null
      onHandleRef.current?.(null)
      showObjectRef.current = null
      cancelAnimationFrame(raf)
      ro.disconnect()
      dprQuery.removeEventListener('change', onDpr)
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
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      renderer.domElement.removeEventListener('pointermove', onMove)
      for (const child of objectGuide.children) {
        if (child instanceof THREE.Sprite) continue
        const line = child as THREE.Line
        line.geometry.dispose()
        ;(line.material as THREE.Material).dispose()
      }
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
      starNamesOverlay.replaceChildren()
      disposables.forEach((d) => d.dispose())
      // Bez tego kontekst WebGL żyje do odśmiecenia płótna; szybkie przeglądanie obiektów wyczerpuje limit kontekstów.
      renderer.forceContextLoss()
      renderer.domElement.remove()
      labels.remove()
    }
  }, [hasObject, withDistance, select, typeRGB])

  useEffect(() => { if (o) showObjectRef.current?.(o, scale) }, [o, scale])

  useEffect(() => { addConstellationsRef.current?.() }, [constellations])

  useEffect(() => {
    if (constellationGroupRef.current) constellationGroupRef.current.visible = showConstellations && scaleRef.current === 'galaxy'
    textLayoutDirty.current = true
    sceneDirty.current = true
  }, [showConstellations])

  useEffect(() => {
    constellationGroupRef.current?.children.forEach((c) => { c.visible = constellationChoice === 'all' || constellationChoice === c.name })
    textLayoutDirty.current = true
    sceneDirty.current = true
  }, [constellationChoice])

  useEffect(() => {
    const overlay = starNamesOverlayRef.current
    if (!overlay) return
    constellationGroupRef.current?.children.forEach((c) => {
      const names = c.getObjectByName('star-names')
      if (!names) return
      if (showStarNames && !names.userData.labelsAdded) {
        starNameLayoutsRef.current.push(addStarNameLabels(names as THREE.Group, names.userData.stars as ConstellationStar[], overlay))
        names.userData.labelsAdded = true
      }
      names.visible = showStarNames
    })
    textLayoutDirty.current = true
    sceneDirty.current = true
  }, [showStarNames])

  useEffect(() => {
    const bg = extragalacticRef.current
    if (bg) bg.geometry.setDrawRange(0, bg.counts[galaxyLevel])
    sceneDirty.current = true
  }, [galaxyLevel])

  useEffect(() => {
    if (galacticRef.current) showTypes(galacticRef.current, hiddenTypes)
    sceneDirty.current = true
  }, [hiddenTypes])

  if (!o) return <div className="space-layer space-empty">Wybierz obiekt.</div>
  return (
    <div className="space-layer">
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }}>
        <div ref={starNamesOverlayRef} className="obs-labels space-star-labels" aria-hidden />
      </div>
      <div className="obs-hint space-hint faint" aria-hidden>LPM: obrót · PPM: rozglądanie · ŚPM: przesuwanie · kółko: zbliżenie do kursora · WASD + Q/E: lot · Shift: szybciej</div>
      <div ref={pinRef} className="pin" style={{ display: 'none' }} aria-hidden>
        {scale === 'universe' && LOCAL_GROUP_SHAPES[o.id] ? (
          <span style={{ width: 28, height: 28, border: '1px dashed var(--accent)', background: 'transparent' }} />
        ) : <span className="pin-reticle" />}
      </div>
    </div>
  )
}
