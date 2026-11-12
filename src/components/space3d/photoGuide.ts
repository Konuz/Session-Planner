// Zdjęcie w scenie „Pozycja 3D” (obie skale): linia widzenia od Ziemi, stożek pola (cztery promienie do narożników
// kadru) i znaczniki wycinków z ustaloną odległością na promieniu od Ziemi w swoim kierunku; obiektów bez odległości
// nie ma. W Drodze Mlecznej stożek kończy się tuż za najdalszym obiektem Galaktyki (milkyWayCone), a obiekty spoza
// skali mają jeden grot za jego końcem; we Wszechświecie lokalnym (odległości log.) sięga najdalszego obiektu
// (universeCone). Znaczniki to symbole atlasowe, podpisy w DOM (bliskie na ekranie łączą się w plakietki grup).
import { useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { galacticVector, type Vec3 } from '../../lib/astro'
import { DEFAULT_ANNOTATION_COLORS, type ObjectType } from '../../lib/catalog'
import { frameBasis, halfFieldTan } from '../../lib/frameBasis'
import { fmtDistance } from '../../lib/format'
import { AXIS_DASH, AXIS_LENGTH, EARTH_Z } from '../../lib/observatory'
import { cutsInThreeD, photoAnchorKind, type PhotoProject } from '../../lib/photo'
import { scenePoint, toScene, type SpaceScale } from '../../lib/space3d'
import { framePose, sideView, SPACE_FOV } from '../../lib/spaceCamera'
import { diveScale } from '../../lib/spaceDive'
import { milkyWayCone, universeCone } from '../../lib/spacePhoto'
import { useStore } from '../../state/store'
import type { Space3DHandle } from '../Space3D'
import { beyondTexture, glyphSprite, glyphTexture } from './markerGlyphs'
import { createLabelLayer, type SceneLabel } from './sceneLabels'

/** Grot obiektów spoza skali: tyle długości stożka od Ziemi. */
const BEYOND = 1.22
/** Wielkość znacznika (ułamek wysokości kadru): zwykła, w grupie i zaznaczonego albo wskazanego. */
const MARK = 0.04
const MARK_GROUPED = 0.024
const MARK_ACTIVE = 0.056
const MARK_BEYOND = 0.034
const MARK_PROJECTION_Y = 1 / Math.tan(THREE.MathUtils.degToRad(SPACE_FOV / 2))
/** Promień trafienia znacznika kursorem (px). */
const HIT_PX = 11

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
  /** Zaznaczony obiekt (powiększony znacznik i własny podpis poza grupami). */
  setSelected(id: string | null): void
  /** Obiekt wskazany na liście albo w wachlarzu (powiększony znacznik). */
  setHover(id: string | null): void
  /** Przelot kamery do znacznika obiektu. */
  focus(id: string): void
  dispose(): void
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

export function createPhotoGuide(handle: Space3DHandle, project: PhotoProject, scale: SpaceScale, colors: Partial<Record<ObjectType, string>>, accent: string, onPick: (id: string) => void): PhotoGuide | null {
  const basis = frameBasis(project.astrometry, project.width, project.height)
  if (!basis) return null
  const { sunPos, camera, controls, mount } = handle
  const dir = new THREE.Vector3(...basis.center)
  // Znacznik leży na promieniu od Ziemi w kierunku obiektu, w odległości punktu sceny od Ziemi. We Wszechświecie lokalnym
  // skala log. liczy się od centrum Galaktyki, więc scenePosition mijałoby wąski stożek pola o kilka jednostek.
  const cuts = cutsInThreeD(project.cuts).map((cut) => {
    const toward = new THREE.Vector3(...toScene(galacticVector(cut)))
    const reach = new THREE.Vector3(...scenePoint(toward.toArray() as Vec3, cut.distLy!, scale)).distanceTo(sunPos)
    return { cut, kind: photoAnchorKind(cut.distLy, scale), world: sunPos.clone().addScaledVector(toward, reach), reach }
  })
  const placed = cuts.filter((c) => c.kind === 'position' || c.kind === 'local').sort((a, b) => a.cut.distLy! - b.cut.distLy!)
  const outside = cuts.filter((c) => c.kind === 'outside')
  const length = scale === 'galaxy' ? milkyWayCone(cuts.map((c) => c.cut.distLy!)).length : universeCone(placed.map((c) => c.reach))
  // Skala kresek w jednostkach długości stożka.
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
  let selected: string | null = null, hovered: string | null = null
  const layer = createLabelLayer(handle, 'space-photo-labels', { onPick, onHover: (id) => setHover(id) })
  const marks: { id: string; position: Vec3; sprite: THREE.Sprite; label: SceneLabel; grouped: boolean }[] = []
  const textures = new Map<string, THREE.CanvasTexture>()
  const colorOf = (type: ObjectType) => colors[type] ?? DEFAULT_ANNOTATION_COLORS[type]
  let markerScale = 1
  const refresh = (mark: (typeof marks)[number]) => {
    const active = mark.id === selected || mark.id === hovered
    mark.label.pinned = mark.id === selected
    mark.label.el.classList.toggle('selected', mark.id === selected)
    mark.sprite.scale.setScalar(markerScale * (active ? MARK_ACTIVE : mark.grouped ? MARK_GROUPED : MARK))
    mark.sprite.renderOrder = active ? 6 : 5
  }
  for (const { cut, world } of placed) {
    let map = textures.get(cut.type)
    if (!map) {
      map = glyphTexture(cut.type, colorOf(cut.type))
      textures.set(cut.type, map)
      disposables.push(map)
    }
    const sprite = glyphSprite(map, MARK)
    sprite.position.copy(world)
    group.add(sprite)
    disposables.push(sprite.material)
    materials.push(sprite.material)
    handle.anchors.add(sprite.position)
    // Każdy wycinek ma swój podpis; bliskie na ekranie łączy warstwa podpisów (plakietka grupy i wachlarz).
    const mark = { id: cut.id, position: world.toArray() as Vec3, sprite, label: null as unknown as SceneLabel, grouped: false }
    mark.label = layer.add(sprite.position, [cut.id, `≈ ${fmtDistance(cut.distLy)}`], {
      color: colorOf(cut.type), id: cut.id, distLy: cut.distLy!,
      cutout: { image: project.image, width: project.width, height: project.height, x: cut.x, y: cut.y, radius: cut.radius },
      onGroup: (grouped) => { mark.grouped = grouped; refresh(mark); handle.invalidate() },
    })
    marks.push(mark)
  }
  const byId = new Map(marks.map((mark) => [mark.id, mark]))
  const setActive = (update: () => void) => {
    const before = [selected, hovered]
    update()
    for (const id of new Set([...before, selected, hovered])) { const mark = id ? byId.get(id) : undefined; if (mark) refresh(mark) }
    layer.invalidate()
    handle.invalidate()
  }
  function setHover(id: string | null) { if (id !== hovered) setActive(() => { hovered = id }) }
  // Obiekty spoza skali: jeden grot za końcem stożka, na przedłużeniu linii widzenia.
  let beyondSprite: THREE.Sprite | null = null
  if (outside.length) {
    const map = beyondTexture(accent)
    beyondSprite = glyphSprite(map, MARK_BEYOND)
    beyondSprite.position.copy(sunPos).addScaledVector(dir, length * BEYOND)
    group.add(beyondSprite)
    disposables.push(map, beyondSprite.material)
    materials.push(beyondSprite.material)
    const ids = outside.map((o) => o.cut.id)
    const shown = ids.slice(0, 3).join(', ') + (ids.length > 3 ? ` +${ids.length - 3}` : '')
    layer.add(beyondSprite.position, [shown, 'poza Drogą Mleczną'], { className: 'dashed', color: accent })
  }
  handle.scene.add(group)
  const updateLayout = (now: number) => {
    // Sprite bez tłumienia odległości nadal skaluje się razem z polem widzenia kamery.
    const nextScale = MARK_PROJECTION_Y / camera.projectionMatrix.elements[5]
    if (nextScale !== markerScale) {
      markerScale = nextScale
      for (const mark of marks) refresh(mark)
      beyondSprite?.scale.setScalar(markerScale * MARK_BEYOND)
    }
    layer.update(now)
  }
  handle.layout.add(updateLayout)

  // Wskazanie i kliknięcie znacznika: najbliższy na ekranie w promieniu HIT_PX.
  let visible = true
  const projected = new THREE.Vector3()
  const hit = (x: number, y: number): string | null => {
    if (!visible || !group.visible) return null
    let best: string | null = null, bestD = HIT_PX
    for (const mark of marks) {
      projected.copy(mark.sprite.position).project(camera)
      if (projected.z >= 1) continue
      const d = Math.hypot((projected.x + 1) / 2 * mount.clientWidth - x, (1 - projected.y) / 2 * mount.clientHeight - y)
      if (d < bestD) { best = mark.id; bestD = d }
    }
    return best
  }
  const claim = (x: number, y: number, click: boolean) => {
    const id = hit(x, y)
    if (id && click) onPick(id)
    return !!id
  }
  handle.claims.add(claim)
  const onMove = (event: PointerEvent) => {
    if (event.buttons) return
    const rect = mount.getBoundingClientRect()
    const id = hit(event.clientX - rect.left, event.clientY - rect.top)
    mount.style.cursor = id ? 'pointer' : ''
    if (id || marks.some((mark) => mark.id === hovered)) setHover(id)
  }
  const canvas = handle.renderer.domElement
  canvas.addEventListener('pointermove', onMove)
  handle.invalidate()

  // Kadr: Ziemia, koniec stożka (z grotem) i znaczniki; kamera z boku linii widzenia, po zewnętrznej stronie Galaktyki.
  // We Wszechświecie lokalnym (skala log.) obiekty zajmują końcowy odcinek linii, więc kadr zaczyna się tuż przed
  // najbliższym z nich (obiekty Drogi Mlecznej przy Ziemi go nie wydłużają), żeby nie zbijały się w jedną plakietkę.
  const reach = sunPos.clone().addScaledVector(dir, length * (outside.length ? BEYOND : 1))
  const nearest = Math.min(...placed.filter((c) => c.kind === 'position').map((c) => c.reach))
  const from = scale === 'universe' && Number.isFinite(nearest) ? sunPos.clone().addScaledVector(dir, nearest * 0.85) : sunPos.clone()
  const start = from.distanceTo(sunPos)
  const framed: Vec3[] = [from.toArray() as Vec3, reach.toArray() as Vec3, ...marks.filter((m) => new THREE.Vector3(...m.position).distanceTo(sunPos) >= start).map((m) => m.position)]
  const middle = from.clone().lerp(reach, 0.5)
  const span = scale === 'galaxy' ? length : from.distanceTo(reach)

  return {
    group, cone, fieldTan, basis, length, labels: layer.root,
    frameCamera() {
      handle.flyTo(framePose(framed, sideView(dir.toArray() as Vec3, [middle.x, 0, middle.z]), { fovDeg: 50, aspect: camera.aspect, room: [0.5, 0.42], minDistance: Math.max(1, span * 0.6) }))
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
    setVisible(next) {
      visible = next
      group.visible = next
      layer.setVisible(next)
      if (!next) setHover(null)
      handle.invalidate()
    },
    setSelected(id) { if (id !== selected) setActive(() => { selected = id }) },
    setHover,
    focus(id) {
      const mark = byId.get(id)
      if (!mark) return
      const v = camera.position.clone().sub(controls.target).normalize()
      const target = new THREE.Vector3(...mark.position)
      handle.flyTo({ target: mark.position, position: target.addScaledVector(v, Math.max(0.15, length * 0.03)).toArray() as Vec3 })
    },
    dispose() {
      handle.layout.delete(updateLayout)
      handle.claims.delete(claim)
      canvas.removeEventListener('pointermove', onMove)
      mount.style.cursor = ''
      for (const mark of marks) handle.anchors.delete(mark.sprite.position)
      handle.scene.remove(group)
      for (const d of disposables) d.dispose()
      layer.dispose()
      handle.invalidate()
    },
  }
}

/** Znaczniki zdjęcia w scenie bieżącej skali: odbudowa przy zmianie wycinków lub sceny, kadr przy nowym zdjęciu i scenie. */
export function usePhotoGuide(handle: Space3DHandle | null, project: PhotoProject | null, visible: boolean, selected: string | null, onPick: (id: string) => void): RefObject<PhotoGuide | null> {
  const colors = useStore((s) => s.annotationColors)
  const guideRef = useRef<PhotoGuide | null>(null)
  const framed = useRef<{ handle: Space3DHandle | null; id: string }>({ handle: null, id: '' })
  const visibleRef = useRef(visible)
  visibleRef.current = visible
  const projectRef = useRef(project)
  projectRef.current = project
  const pickRef = useRef(onPick)
  pickRef.current = onPick
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  useEffect(() => {
    const project = projectRef.current
    if (!handle || !project) return
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00e0ff'
    const guide = createPhotoGuide(handle, project, handle.scale, colors, accent, (id) => pickRef.current(id))
    if (!guide) return
    guideRef.current = guide
    guide.setVisible(visibleRef.current)
    guide.setSelected(selectedRef.current)
    if (framed.current.handle !== handle || framed.current.id !== project.id) {
      framed.current = { handle, id: project.id }
      guide.frameCamera()
    }
    return () => { guide.dispose(); guideRef.current = null }
    // Gwiazdy Gaia zmieniają projekt, ale nie znaczniki: przebudowa tylko przy zmianie zdjęcia lub wycinków.
  }, [handle, project?.id, project?.cuts, colors])
  useEffect(() => { guideRef.current?.setVisible(visible) }, [visible])
  useEffect(() => { guideRef.current?.setSelected(selected) }, [selected])
  return guideRef
}
