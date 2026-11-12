// Zdjęcie w skali Drogi Mlecznej: linia widzenia od Ziemi, stożek pola (cztery promienie do narożników kadru)
// i znaczniki wycinków z ustaloną odległością według photoAnchorKind(…, 'galaxy'); obiektów bez odległości nie ma.
// Stożek kończy się tuż za najdalszym obiektem zdjęcia w Drodze Mlecznej (milkyWayCone); obiekty spoza skali
// mają jeden grot za jego końcem. Znaczniki to symbole atlasowe z pionem do płaszczyzny Galaktyki, podpisy w DOM.
import { useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { Vec3 } from '../../lib/astro'
import { DEFAULT_ANNOTATION_COLORS, type ObjectType } from '../../lib/catalog'
import { frameBasis, halfFieldTan } from '../../lib/frameBasis'
import { fmtDistance } from '../../lib/format'
import { AXIS_DASH, AXIS_LENGTH, EARTH_Z } from '../../lib/observatory'
import { cutsInThreeD, photoAnchorKind, type PhotoCut, type PhotoProject } from '../../lib/photo'
import { scenePosition } from '../../lib/space3d'
import { framePose, sideView } from '../../lib/spaceCamera'
import { diveScale } from '../../lib/spaceDive'
import { milkyWayCone } from '../../lib/spacePhoto'
import { useStore } from '../../state/store'
import type { Space3DHandle } from '../Space3D'
import { beyondTexture, glyphSprite, glyphTexture } from './markerGlyphs'
import { createLabelLayer } from './sceneLabels'

/** Grot obiektów spoza skali: tyle długości stożka od Ziemi. */
const BEYOND = 1.22
/** Wycinki bliżej siebie niż ten ułamek długości stożka dzielą jeden podpis. */
const SHARED_LABEL = 0.04

export interface PhotoGuide {
  group: THREE.Group
  /** Stożek pola: grupa w Ziemi, osie bazy kadru; skala (tg x, tg y, 1) daje kąt otwarcia. */
  cone: THREE.Group
  /** Prawdziwe tangensy połowy pola. */
  fieldTan: [number, number]
  basis: NonNullable<ReturnType<typeof frameBasis>>
  /** Długość linii widzenia w jednostkach sceny (tys. lś). */
  length: number
  /** Przelot kamery na Ziemię, stożek i znaczniki, z boku linii widzenia. Kadr obejmuje sam stożek (bez stałego
   *  oddalenia na dysk Galaktyki), żeby obiekty zdjęcia nie zbijały się w jeden punkt. */
  frameCamera(): void
  labels: HTMLDivElement
  setOpacity(opacity: number, cone?: number, faces?: number, axis?: number): void
  /** Dopasowanie końca i kresek linii do osi Obserwatorium podczas nurkowania. */
  alignSightLine(amount: number, bridgeScale: number): void
  setConeRoll(angle: number): void
  placeMarkers(project?: (id: string, position: Vec3) => Vec3): void
  /** Ukrycie na czas edycji okręgów (płaskie zdjęcie nad sceną). */
  setVisible(visible: boolean): void
  dispose(): void
}

/** Podpis grupy: oznaczenia po trzy w wierszu i odległość albo jej zakres. */
function groupLines(cuts: PhotoCut[]): string[] {
  const ids = cuts.map((c) => c.id)
  const lines = Array.from({ length: Math.ceil(ids.length / 3) }, (_, i) => ids.slice(i * 3, i * 3 + 3).join(', '))
  const near = fmtDistance(Math.min(...cuts.map((c) => c.distLy!))), far = fmtDistance(Math.max(...cuts.map((c) => c.distLy!)))
  return [...lines, near === far ? `≈ ${near}` : `≈ ${near} – ${far}`]
}

export interface SightCone {
  group: THREE.Group
  cone: THREE.Group
  /** Linia widzenia od Ziemi; jej dzieci skalują się z nią w nurkowaniu. */
  line: THREE.Line
  fieldTan: [number, number]
  /** Materiały gasnące ze znacznikami (userData.cone i userData.faces wybierają krycie stożka i ścianek). */
  materials: THREE.Material[]
  disposables: { dispose(): void }[]
  setOpacity(opacity: number, cone?: number, faces?: number, axis?: number): void
  alignSightLine(amount: number, bridgeScale: number): void
  setConeRoll(angle: number): void
}

/**
 * Linia widzenia i stożek pola od Ziemi, wspólne dla obu skal (w Drodze Mlecznej ze znacznikami, we Wszechświecie
 * lokalnym jako igła do okna zdjęcia). Nurkowanie steruje nimi przez PhotoGuide. k: skala kresek linii.
 */
export function createSightCone(handle: Space3DHandle, basis: NonNullable<ReturnType<typeof frameBasis>>, image: { width: number; height: number }, length: number, accent: string, k: number): SightCone {
  const { sunPos } = handle
  const dir = new THREE.Vector3(...basis.center)
  const group = new THREE.Group()
  const disposables: { dispose(): void }[] = []
  const materials: THREE.Material[] = []

  // Linia widzenia: przerywana jak linia wybranego obiektu.
  const dashSize = 0.25 * k, gapSize = 0.18 * k
  const lineMaterial = new THREE.LineDashedMaterial({ color: accent, dashSize, gapSize, transparent: true, opacity: 0.85, depthWrite: false })
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), dir.clone().multiplyScalar(length)]), lineMaterial)
  line.position.copy(sunPos)
  line.computeLineDistances()
  group.add(line)
  disposables.push(line.geometry, lineMaterial)

  // Stożek pola: promienie (±L, ±L, −L) w bazie kadru, skala (tg x, tg y, 1).
  const cone = new THREE.Group()
  cone.position.copy(sunPos)
  cone.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...basis.x), new THREE.Vector3(...basis.y), dir.clone().negate()))
  const coneOrientation = cone.quaternion.clone()
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]]
  const rays: number[] = []
  for (const [sx, sy] of corners) rays.push(0, 0, 0, sx * length, sy * length, -length)
  // Ramka kadru na końcu stożka domyka go w miejscu najdalszego obiektu.
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = corners[i], [bx, by] = corners[(i + 1) % 4]
    rays.push(ax * length, ay * length, -length, bx * length, by * length, -length)
  }
  const coneGeometry = new THREE.BufferGeometry()
  coneGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rays, 3))
  const coneMaterial = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.45, depthWrite: false })
  cone.add(new THREE.LineSegments(coneGeometry, coneMaterial))
  const fieldTan = halfFieldTan(basis, image.width, image.height)
  cone.scale.set(fieldTan[0], fieldTan[1], 1)
  group.add(cone)
  // Półprzezroczyste ścianki: cztery trójkąty od Ziemi do sąsiednich narożników kadru.
  const faces: number[] = []
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = corners[i], [bx, by] = corners[(i + 1) % 4]
    faces.push(0, 0, 0, ax * length, ay * length, -length, bx * length, by * length, -length)
  }
  const faceGeometry = new THREE.BufferGeometry()
  faceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(faces, 3))
  const faceMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false })
  const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial)
  faceMesh.renderOrder = -1
  cone.add(faceMesh)
  disposables.push(coneGeometry, coneMaterial, faceGeometry, faceMaterial)
  coneMaterial.userData.cone = true
  faceMaterial.userData.faces = true
  materials.push(coneMaterial, faceMaterial)

  return {
    group, cone, line, fieldTan, materials, disposables,
    setOpacity(opacity, cone = opacity, faces = cone, axis = opacity) {
      lineMaterial.opacity = 0.85 * axis
      line.visible = axis > 0
      for (const m of materials) {
        m.userData.base ??= m.opacity
        m.opacity = (m.userData.base as number) * (m.userData.faces ? faces : m.userData.cone ? cone : opacity)
      }
      handle.invalidate()
    },
    alignSightLine(amount, bridgeScale) {
      const depth = EARTH_Z + AXIS_LENGTH
      // Długość linii w shaderze jest lokalna. Po dopasowaniu odmierzamy kreski w jednostkach Obserwatorium.
      line.scale.setScalar(diveScale(amount, 1, depth * bridgeScale / length))
      lineMaterial.scale = THREE.MathUtils.lerp(1, depth / length, amount)
      lineMaterial.dashSize = THREE.MathUtils.lerp(dashSize, AXIS_DASH, amount)
      lineMaterial.gapSize = THREE.MathUtils.lerp(gapSize, AXIS_DASH, amount)
    },
    setConeRoll(angle) {
      cone.quaternion.copy(coneOrientation)
      cone.rotateZ(angle)
    },
  }
}

export function createPhotoGuide(handle: Space3DHandle, project: PhotoProject, colors: Partial<Record<ObjectType, string>>, accent: string): PhotoGuide | null {
  const basis = frameBasis(project.astrometry, project.width, project.height)
  if (!basis) return null
  const { sunPos } = handle
  const dir = new THREE.Vector3(...basis.center)
  const cuts = cutsInThreeD(project.cuts).map((cut) => ({ cut, kind: photoAnchorKind(cut.distLy, 'galaxy') }))
  const placed = cuts.filter((c) => c.kind === 'position').sort((a, b) => a.cut.distLy! - b.cut.distLy!)
  const outside = cuts.filter((c) => c.kind === 'outside')
  const { length } = milkyWayCone(cuts.map((c) => c.cut.distLy!))
  // Skala kresek i progów w jednostkach długości stożka.
  const k = Math.max(length, 2) / 16
  const sight = createSightCone(handle, basis, project, length, accent, k)
  const { group, cone, line, fieldTan, materials, disposables } = sight
  group.name = 'photo-guide'
  // Za końcem stożka słabsze przedłużenie linii widzenia do grotu „poza skalą”.
  if (outside.length) {
    const beyondMaterial = new THREE.LineDashedMaterial({ color: accent, dashSize: 0.09 * k, gapSize: 0.25 * k, transparent: true, opacity: 0.45, depthWrite: false })
    const beyond = new THREE.Line(new THREE.BufferGeometry().setFromPoints([dir.clone().multiplyScalar(length), dir.clone().multiplyScalar(length * BEYOND)]), beyondMaterial)
    beyond.computeLineDistances()
    // Dziecko linii: w nurkowaniu skaluje się razem z nią.
    line.add(beyond)
    disposables.push(beyond.geometry, beyondMaterial)
    materials.push(beyondMaterial)
  }

  // Znaczniki: symbol atlasowy typu w kolorze adnotacji, każdy wycinek osobno (w nurkowaniu leci do swojej karty).
  const layer = createLabelLayer(handle, 'space-photo-labels')
  const marks: { id: string; position: Vec3; sprite: THREE.Sprite }[] = []
  const textures = new Map<string, THREE.CanvasTexture>()
  const colorOf = (type: ObjectType) => colors[type] ?? DEFAULT_ANNOTATION_COLORS[type]
  const drops: number[] = []
  const end = sunPos.clone().addScaledVector(dir, length)
  // Cień linii widzenia na płaszczyźnie Galaktyki: razem z pionami znaczników pokazuje głębię i wysokość nad dyskiem.
  drops.push(sunPos.x, sunPos.y, sunPos.z, end.x, sunPos.y, end.z, end.x, sunPos.y, end.z, end.x, end.y, end.z)
  for (const { cut } of placed) {
    const world = new THREE.Vector3(...scenePosition(cut, cut.distLy!, 'galaxy'))
    let map = textures.get(cut.type)
    if (!map) {
      map = glyphTexture(cut.type, colorOf(cut.type))
      textures.set(cut.type, map)
      disposables.push(map)
    }
    const sprite = glyphSprite(map, 0.04)
    sprite.position.copy(world)
    group.add(sprite)
    disposables.push(sprite.material)
    materials.push(sprite.material)
    marks.push({ id: cut.id, position: world.toArray(), sprite })
    handle.anchors.add(sprite.position)
    drops.push(world.x, world.y, world.z, world.x, sunPos.y, world.z)
  }
  const dropGeometry = new THREE.BufferGeometry()
  dropGeometry.setAttribute('position', new THREE.Float32BufferAttribute(drops, 3))
  const dropMaterial = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.28, depthWrite: false })
  // Piony gasną razem ze ściankami stożka, zanim znaczniki ruszą do kart Obserwatorium.
  dropMaterial.userData.faces = true
  group.add(new THREE.LineSegments(dropGeometry, dropMaterial))
  disposables.push(dropGeometry, dropMaterial)
  materials.push(dropMaterial)
  // Podpisy: wycinki stojące prawie w tym samym miejscu dzielą jeden (kolejność po odległości).
  for (let i = 0; i < placed.length;) {
    let j = i + 1
    while (j < placed.length && marks[j].sprite.position.distanceTo(marks[i].sprite.position) < length * SHARED_LABEL) j++
    const members = placed.slice(i, j).map((m) => m.cut)
    layer.add(marks[i].sprite.position, groupLines(members), { color: colorOf(members[0].type) })
    i = j
  }
  // Obiekty spoza skali: jeden grot za końcem stożka, na przedłużeniu linii widzenia.
  let beyondSprite: THREE.Sprite | null = null
  if (outside.length) {
    const map = beyondTexture(accent)
    beyondSprite = glyphSprite(map, 0.034)
    beyondSprite.position.copy(sunPos).addScaledVector(dir, length * BEYOND)
    group.add(beyondSprite)
    disposables.push(map, beyondSprite.material)
    materials.push(beyondSprite.material)
    const ids = outside.map((o) => o.cut.id)
    const shown = ids.slice(0, 3).join(', ') + (ids.length > 3 ? ` +${ids.length - 3}` : '')
    layer.add(beyondSprite.position, [shown, 'poza Drogą Mleczną'], { className: 'dashed', color: accent })
  }
  handle.scene.add(group)
  handle.layout.add(layer.update)
  handle.invalidate()

  // Kadr: Ziemia, koniec stożka (z grotem) i znaczniki; kamera z boku linii widzenia, po zewnętrznej stronie Galaktyki.
  const reach = sunPos.clone().addScaledVector(dir, length * (outside.length ? BEYOND : 1))
  const framed: Vec3[] = [sunPos.toArray() as Vec3, reach.toArray() as Vec3, ...marks.map((m) => m.position)]
  const middle = sunPos.clone().lerp(reach, 0.5)

  return {
    group, cone, fieldTan, basis, length, labels: layer.root,
    frameCamera() {
      const { camera } = handle
      handle.flyTo(framePose(framed, sideView(dir.toArray() as Vec3, [middle.x, 0, middle.z]), { fovDeg: 50, aspect: camera.aspect, room: [0.5, 0.42], minDistance: Math.max(1, length * 0.6) }))
    },
    setOpacity(opacity, cone, faces, axis) {
      sight.setOpacity(opacity, cone, faces, axis)
      layer.root.style.opacity = String(opacity)
    },
    alignSightLine(amount, bridgeScale) {
      sight.alignSightLine(amount, bridgeScale)
      beyondSprite?.position.copy(sunPos).addScaledVector(dir, length * BEYOND * line.scale.x)
    },
    setConeRoll: sight.setConeRoll,
    placeMarkers(project) {
      for (const mark of marks) mark.sprite.position.set(...(project?.(mark.id, mark.position) ?? mark.position))
      layer.invalidate()
    },
    setVisible(visible) {
      group.visible = visible
      layer.setVisible(visible)
      handle.invalidate()
    },
    dispose() {
      handle.layout.delete(layer.update)
      for (const mark of marks) handle.anchors.delete(mark.sprite.position)
      handle.scene.remove(group)
      for (const d of disposables) d.dispose()
      layer.dispose()
      handle.invalidate()
    },
  }
}

/** Znaczniki zdjęcia w scenie Drogi Mlecznej: odbudowa przy zmianie wycinków lub sceny, kadr przy nowym zdjęciu i scenie. */
export function usePhotoGuide(handle: Space3DHandle | null, project: PhotoProject | null, visible: boolean): RefObject<PhotoGuide | null> {
  const colors = useStore((s) => s.annotationColors)
  const guideRef = useRef<PhotoGuide | null>(null)
  const framed = useRef<{ handle: Space3DHandle | null; id: string }>({ handle: null, id: '' })
  const visibleRef = useRef(visible)
  visibleRef.current = visible
  const projectRef = useRef(project)
  projectRef.current = project
  useEffect(() => {
    const project = projectRef.current
    if (!handle || handle.scale !== 'galaxy' || !project) return
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00e0ff'
    const guide = createPhotoGuide(handle, project, colors, accent)
    if (!guide) return
    guideRef.current = guide
    guide.setVisible(visibleRef.current)
    if (framed.current.handle !== handle || framed.current.id !== project.id) {
      framed.current = { handle, id: project.id }
      guide.frameCamera()
    }
    return () => { guide.dispose(); guideRef.current = null }
    // Gwiazdy Gaia zmieniają projekt, ale nie znaczniki: przebudowa tylko przy zmianie zdjęcia lub wycinków.
  }, [handle, project?.id, project?.cuts, colors])
  useEffect(() => { guideRef.current?.setVisible(visible) }, [visible])
  return guideRef
}
