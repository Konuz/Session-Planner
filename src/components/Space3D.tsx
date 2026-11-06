// Pozycja obiektu w przestrzeni 3D (three.js, ładowane leniwie z okna „Pozycja 3D”). Odległości z Wikidata (mediana
// podanych wartości), kierunek ze współrzędnych galaktycznych. Dwie skale: Droga Mleczna (liniowa, 1 j. = 1000 lś)
// i Wszechświat lokalny (logarytmiczna). W tle wszystkie obiekty katalogu z odległością. Ustawienia z paska narzędzi okna.
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { galacticVector } from '../lib/astro'
import { DEFAULT_ANNOTATION_COLORS, TYPE_INFO, type DSO, type ObjectType } from '../lib/catalog'
import { useCatalog, useSelected } from '../state/data'
import { useStore } from '../state/store'
import { photoAnchorKind, type PhotoProject, type PhotoSceneFrame } from '../lib/photo'
import { GALACTIC_LIMIT_LY, sunPosition } from '../lib/space3d'
import {
  LOCAL_GROUP_SHAPES, MILKY_WAY_DIAMETER_LY, UNIVERSE_GALAXY_SCALE, addStarNameLabels, domeMaterial, dotTexture, fixedSizeTextSprite,
  galaxyTexture, localGroupGalaxy, milkyWay, position, textSprite, toThree, type StarNameLayout,
} from './space3d/galaxyModels'
import { GALAXY_LEVELS, type ConstellationStar, type SpaceSettings } from './space3d/spaceSettings'

interface Props {
  settings: SpaceSettings
  photo: PhotoProject | null
  /** Stara nakładka zdjęcia (Wszechświat lokalny): rzut kotwic wycinków i dopasowanie kadru. */
  frameRef: RefObject<((frame: PhotoSceneFrame) => void) | null>
  fitRef: RefObject<(() => void) | null>
  /** Dostęp do sceny dla znaczników zdjęcia i nurkowania (null przy przebudowie i odmontowaniu). */
  onHandle?(handle: Space3DHandle | null): void
}

/** Scena Space3D dla modułów okna: znaczniki zdjęcia w Drodze Mlecznej i nurkowanie do Obserwatorium. */
export interface Space3DHandle {
  scale: 'galaxy' | 'universe'
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
  invalidate(): void
  /** Koniec przelotu startowego i obrotu poglądowego. */
  stopIntro(): void
  /** Klatki z zewnątrz: własna pętla stoi, a klatkę liczy step(now) (nurkowanie; w stanie zdjęcia brak klatek). */
  setExternal(on: boolean): void
  step(now: number): void
  /** Nadpisania nurkowania: kamera bez OrbitControls, krycie warstw tła i promień Ziemi w jednostkach sceny. */
  override: { camera: boolean; layerFade: number; earthRadius: number | null }
}

/** Przepisuje do bufora tylko punkty niewyłączonych rodzajów i ogranicza do nich zakres rysowania. */
/**
 * Ta sama klatka z dokładnością do niewidocznych zmian (1e-6 względnie, ok. 0,002 px). Tłumienie OrbitControls
 * przesuwa kamerę o coraz mniejsze ułamki jeszcze przez kilka sekund, więc dokładne `equals` nigdy nie odpoczywa.
 */
function sameMatrix(a: THREE.Matrix4, b: THREE.Matrix4): boolean {
  for (let i = 0; i < 16; i++) if (Math.abs(a.elements[i] - b.elements[i]) > 1e-6 * Math.max(1, Math.abs(b.elements[i]))) return false
  return true
}

function showTypes(bg:{ geometry: THREE.BufferGeometry; types: ObjectType[]; pos: Float32Array; col: Float32Array }, hidden: ObjectType[]) {
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

export default function Space3D({ settings, photo, frameRef: photoFrameRef, fitRef: photoFitRef, onHandle }: Props) {
  const { scale, galaxyLevel, hiddenTypes, showConstellations, showStarNames, constellationChoice, constellations } = settings
  const photoRef = useRef(photo)
  photoRef.current = photo
  const onHandleRef = useRef(onHandle)
  onHandleRef.current = onHandle
  const mountRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  // Punkty tła posortowane wg odległości: suwak zmienia tylko zakres rysowania, bez przebudowy sceny.
  const bgRef = useRef<{ geometry: THREE.BufferGeometry; counts: number[]; types: ObjectType[]; pos: Float32Array; col: Float32Array } | null>(null)
  const galaxyLevelRef = useRef(galaxyLevel)
  galaxyLevelRef.current = galaxyLevel
  const hiddenTypesRef = useRef(hiddenTypes)
  hiddenTypesRef.current = hiddenTypes
  const showConstellationsRef = useRef(showConstellations)
  showConstellationsRef.current = showConstellations
  const constellationGroupRef = useRef<THREE.Group | null>(null)
  const screenTextSpritesRef = useRef<THREE.Sprite[]>([])
  const starNameLayoutsRef = useRef<StarNameLayout[]>([])
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
  const constellationChoiceRef = useRef(constellationChoice)
  constellationChoiceRef.current = constellationChoice
  const { catalog } = useCatalog()
  const select = useStore((s) => s.select)
  const dist = o?.distLy ?? null
  const outOfScale = scale === 'galaxy' && dist !== null && dist > GALACTIC_LIMIT_LY
  const withDistance = useMemo(() => (catalog ? catalog.filter((c) => c.distLy !== null) : []), [catalog])

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

    const sunPos = new THREE.Vector3(...sunPosition(scale))
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
    // Dopasowanie kadru do starej nakładki zdjęcia: tylko Wszechświat lokalny (Droga Mleczna ma linię widzenia).
    photoFitRef.current = scale === 'galaxy' ? null : () => {
      const points = [sunPos.clone()]
      for (const cut of photoRef.current?.cuts ?? []) {
        if (cut.enabled && photoAnchorKind(cut.distLy, scale) === 'position') points.push(position(cut, cut.distLy!, scale))
      }
      const bounds = new THREE.Box3().setFromPoints(points)
      const center = bounds.getCenter(new THREE.Vector3())
      photoSpan = Math.max(35, bounds.getSize(new THREE.Vector3()).length() * 2.4)
      flying = false
      controls.autoRotate = false
      camera.position.copy(center).add(new THREE.Vector3(photoSpan * 0.55, photoSpan * 0.55, photoSpan * 0.75))
      controls.target.copy(center)
      camera.lookAt(center)
      controls.update()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement
      if ((active !== renderer.domElement && !active?.classList.contains('constellation-select')) || !moveKeys.has(e.code) || e.altKey || e.ctrlKey || e.metaKey) return
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
    const zeroVec = new THREE.Vector3()
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
    let lastLabelHidden: readonly ObjectType[] | null = null
    // Renderowanie na żądanie: bez ruchu kamery i zmian sceny nie rysujemy co klatkę (GPU, bateria).
    const renderedCamera = new THREE.Matrix4()
    const renderedProjection = new THREE.Matrix4()
    let renderedWidth = 0, renderedHeight = 0, renderedGuide: boolean | null = null, lastRender = -Infinity
    sceneDirty.current = true
    const hooks = new Set<(now: number) => void>()
    const override: Space3DHandle['override'] = { camera: false, layerFade: 1, earthRadius: null }
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
      // Powolny obrót poglądowy: jeden obrót na trzy minuty, niezależnie od liczby klatek.
      if (earth && !reduced) earth.rotation.y = ((performance.now() - t0) / 180_000) * Math.PI * 2
      if (flying && !override.camera) {
        const k = Math.min(1, (now - t0) / 2200)
        const e = 1 - (1 - k) ** 3
        camera.position.lerpVectors(startCam, endCam, e)
        controls.target.lerpVectors(zeroVec, focus, e)
        if (k >= 1) flying = false
      }
      if (!flying && !override.camera && pressedKeys.size) {
        const forward = camera.getWorldDirection(moveForward)
        const right = moveRight.set(1, 0, 0).applyQuaternion(camera.quaternion)
        const movement = moveDelta.set(0, 0, 0)
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
      if (!rightLook && !override.camera) controls.update()
      if (photoRef.current) controls.autoRotate = false
      camera.updateMatrixWorld()
      if (earth) {
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
        earth.scale.setScalar(override.earthRadius !== null ? override.earthRadius / (mr * 0.7) : depth > 0 ? Math.min(1, radiusPixels * unitsPerPixel / (mr * 0.7)) : 1)
      }
      if (milkyWayMaterial) {
        // Przy zbliżeniu gwiazdy pozostają widoczne, a z daleka nie zlewają się w jasną plamę.
        const close = 1 - THREE.MathUtils.smoothstep(camera.position.distanceTo(controls.target), 20, 100)
        milkyWayMaterial.size = 2.4 + close * 0.8
        milkyWayMaterial.opacity = (0.17 + close * 0.13) * override.layerFade
      }
      for (const model of localGalaxyModels) {
        // Zbliżenie względem promienia modelu: także małe galaktyki zachowują czytelne gwiazdy.
        const distance = camera.position.distanceTo(model.position) / (50 * model.scale.x)
        const close = 1 - THREE.MathUtils.smoothstep(distance, 2, 10)
        const material = model.material as THREE.PointsMaterial
        material.size = 2.4 + close * 0.8
        material.opacity = 0.1 + close * 0.18
      }
      objectGuide.visible = !photoRef.current
      const textViewportHeight = renderer.domElement.clientHeight
      const textViewportWidth = renderer.domElement.clientWidth
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
            const x = (nameScreenPosition.x + 1) * textViewportWidth / 2
            const y = (1 - nameScreenPosition.y) * textViewportHeight / 2
            const box = { left: x - halfWidth - 2, right: x + halfWidth + 2, top: y - pixelHeight - 6, bottom: y - 4 }
            const overlaps = () => nameBoxes.some((b) => box.left < b.right && box.right > b.left && box.top < b.bottom && box.bottom > b.top)
            while (y - box.bottom < 48 && overlaps()) {
              box.top -= pixelHeight + 2
              box.bottom -= pixelHeight + 2
            }
            anchor.sprite.visible = box.top >= 0 && box.bottom <= textViewportHeight && box.right >= 0 && box.left <= textViewportWidth && !overlaps()
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
      // Ziemia obraca się raz na 3 min (2°/s), więc dla niej wystarcza 10 klatek/s; co sekundę klatka kontrolna.
      const canvas = renderer.domElement
      if (sceneDirty.current || !sameMatrix(renderedCamera, camera.matrixWorld) || !sameMatrix(renderedProjection, camera.projectionMatrix)
        || canvas.width !== renderedWidth || canvas.height !== renderedHeight || objectGuide.visible !== renderedGuide
        || (earth && !reduced && now - lastRender >= 100) || now - lastRender >= 1000) {
        renderer.render(scene, camera)
        sceneDirty.current = false
        renderedCamera.copy(camera.matrixWorld)
        renderedProjection.copy(camera.projectionMatrix)
        renderedWidth = canvas.width
        renderedHeight = canvas.height
        renderedGuide = objectGuide.visible
        lastRender = now
      }
      if (scale === 'universe' && photoFrameRef.current) {
        const width = mount.clientWidth
        const height = mount.clientHeight
        const photo = photoRef.current
        const changed = photo !== projectedPhoto || width !== photoWidth || height !== photoHeight
          || projectedReceiver !== photoFrameRef.current || projectedSpan !== photoSpan
          || (photo !== null && (!sameMatrix(photoCameraMatrix, camera.matrixWorld) || !sameMatrix(photoProjectionMatrix, camera.projectionMatrix)))
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
      if (
        w === lastLabelW &&
        h === lastLabelH &&
        annotationsRef.current === lastLabelAnnotations &&
        galaxyLevelRef.current === lastLabelLevel &&
        hiddenTypesRef.current === lastLabelHidden &&
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
      labelCameraMatrix.copy(camera.matrixWorld)
      labelProjMatrix.copy(camera.projectionMatrix)
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
    const lookDirection = new THREE.Vector3()
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
      scale, scene, camera, controls, renderer, mount, overlay: labels, sunPos, earth: earth ?? null, hooks, override, step,
      invalidate: () => { sceneDirty.current = true },
      stopIntro: () => { flying = false; controls.autoRotate = false },
      setExternal: (on) => {
        if (on === external) return
        external = on
        cancelAnimationFrame(raf)
        if (!on && !document.hidden) tick()
      },
    })
    return () => {
      onHandleRef.current?.(null)
      photoFitRef.current = null
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
      // Bez tego kontekst WebGL żyje do odśmiecenia płótna; szybkie przeglądanie obiektów wyczerpuje limit kontekstów.
      renderer.forceContextLoss()
      renderer.domElement.remove()
      labels.remove()
    }
  }, [o, dist, scale, outOfScale, withDistance, select, constellations, typeRGB])

  useEffect(() => {
    if (constellationGroupRef.current) constellationGroupRef.current.visible = showConstellations
    textLayoutDirty.current = true
    sceneDirty.current = true
  }, [showConstellations])

  useEffect(() => {
    constellationGroupRef.current?.children.forEach((c) => { c.visible = constellationChoice === 'all' || constellationChoice === c.name })
    textLayoutDirty.current = true
    sceneDirty.current = true
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
    textLayoutDirty.current = true
    sceneDirty.current = true
  }, [showStarNames])

  useEffect(() => {
    const bg = bgRef.current
    if (bg && scale === 'universe') bg.geometry.setDrawRange(0, bg.counts[galaxyLevel])
    sceneDirty.current = true
  }, [galaxyLevel])

  useEffect(() => {
    if (bgRef.current && scale === 'galaxy') showTypes(bgRef.current, hiddenTypes)
    sceneDirty.current = true
  }, [hiddenTypes])

  if (!o) return <div className="space-layer space-empty">Wybierz obiekt.</div>
  return (
    <div className="space-layer">
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      <div ref={pinRef} className="pin" style={{ display: 'none' }} aria-hidden>
        {scale === 'universe' && LOCAL_GROUP_SHAPES[o.id] ? (
          <span style={{ width: 28, height: 28, border: '1px dashed var(--accent)', background: 'transparent' }} />
        ) : <><span className="pin-ring" /><span className="pin-ring" /><span className="pin-dot" /></>}
      </div>
    </div>
  )
}
