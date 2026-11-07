// Zdjęcie w skali Drogi Mlecznej: linia widzenia od Ziemi, stożek pola (cztery promienie do narożników kadru)
// i znaczniki wycinków z ustaloną odległością według photoAnchorKind(…, 'galaxy'); obiektów bez odległości nie ma.
// Podpisy w DOM nad sceną Space3D.
import { useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { Vec3 } from '../../lib/astro'
import { DEFAULT_ANNOTATION_COLORS, type ObjectType } from '../../lib/catalog'
import { frameBasis, halfFieldTan } from '../../lib/frameBasis'
import { fmtDistance } from '../../lib/format'
import { AXIS_DASH, AXIS_LENGTH, EARTH_Z } from '../../lib/observatory'
import { cutsInThreeD, photoAnchorKind, type PhotoProject } from '../../lib/photo'
import { GALACTIC_LIMIT_LY, scenePosition } from '../../lib/space3d'
import { diveScale } from '../../lib/spaceDive'
import { useStore } from '../../state/store'
import type { Space3DHandle } from '../Space3D'

const DISK_RADIUS_KLY = 50

export interface PhotoGuide {
  group: THREE.Group
  /** Stożek pola: grupa w Ziemi, osie bazy kadru; skala (tg x, tg y, 1) daje kąt otwarcia. */
  cone: THREE.Group
  /** Prawdziwe tangensy połowy pola. */
  fieldTan: [number, number]
  basis: NonNullable<ReturnType<typeof frameBasis>>
  /** Długość linii widzenia w jednostkach sceny (tys. lś). */
  length: number
  /** Kamera na Ziemię i zmierzone wycinki (jak kadr wybranego obiektu w Space3D). */
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

function ringTexture(color: string, dashed: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const g = canvas.getContext('2d')!
  g.strokeStyle = color
  g.lineWidth = 5
  if (dashed) g.setLineDash([9, 7])
  g.beginPath()
  g.arc(32, 32, 24, 0, Math.PI * 2)
  g.stroke()
  g.setLineDash([])
  g.fillStyle = color
  g.beginPath()
  g.arc(32, 32, 6, 0, Math.PI * 2)
  g.fill()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** Odległość od Słońca wzdłuż kierunku do sfery o promieniu r wokół centrum Galaktyki. */
function toSphere(sun: THREE.Vector3, dir: THREE.Vector3, radius: number): number {
  const b = sun.dot(dir)
  return -b + Math.sqrt(Math.max(0, b * b - sun.lengthSq() + radius * radius))
}

export function createPhotoGuide(handle: Space3DHandle, project: PhotoProject, colors: Partial<Record<ObjectType, string>>, accent: string): PhotoGuide | null {
  const basis = frameBasis(project.astrometry, project.width, project.height)
  if (!basis) return null
  const { sunPos } = handle
  const dir = new THREE.Vector3(...basis.center)
  const cuts = cutsInThreeD(project.cuts).map((cut) => ({ cut, kind: photoAnchorKind(cut.distLy, 'galaxy') }))
  const positions = cuts.filter((c) => c.kind === 'position').map(({ cut }) => new THREE.Vector3(...scenePosition(cut, cut.distLy!, 'galaxy')))
  const farthest = Math.max(0, ...positions.map((p) => p.distanceTo(sunPos)))
  const outside = cuts.some((c) => c.kind === 'outside')
  const length = Math.max(toSphere(sunPos, dir, outside ? GALACTIC_LIMIT_LY / 1000 : DISK_RADIUS_KLY), farthest * 1.15)
  // Kadr jak dla wybranego obiektu: Ziemia i zmierzone wycinki, rozmiar co najmniej 8 tys. lś (k: skala kresek).
  const box = new THREE.Box3().setFromPoints([sunPos, ...(positions.length ? positions : [sunPos.clone().addScaledVector(dir, 4)])])
  const focus = box.getCenter(new THREE.Vector3())
  const span = Math.max(8, box.getSize(new THREE.Vector3()).length() * 2.2)
  const k = span / 40
  const group = new THREE.Group()
  group.name = 'photo-guide'
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
  const back = dir.clone().negate()
  cone.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...basis.x), new THREE.Vector3(...basis.y), back))
  const coneOrientation = cone.quaternion.clone()
  const rays: number[] = []
  for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) rays.push(0, 0, 0, sx * length, sy * length, -length)
  const coneGeometry = new THREE.BufferGeometry()
  coneGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rays, 3))
  const coneMaterial = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.45, depthWrite: false })
  cone.add(new THREE.LineSegments(coneGeometry, coneMaterial))
  const fieldTan = halfFieldTan(basis, project.width, project.height)
  cone.scale.set(fieldTan[0], fieldTan[1], 1)
  group.add(cone)
  // Półprzezroczyste ścianki: cztery trójkąty od Ziemi do sąsiednich narożników kadru.
  const faces: number[] = []
  const corner = (i: number) => [[1, 1], [-1, 1], [-1, -1], [1, -1]][i % 4]
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = corner(i), [bx, by] = corner(i + 1)
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

  // Znaczniki i podpisy.
  const labels = document.createElement('div')
  labels.className = 'obs-labels space-photo-labels'
  handle.mount.appendChild(labels)
  const marks: { id: string | null; position: Vec3; sprite: THREE.Sprite; label: HTMLDivElement; width: number; height: number }[] = []
  // Wycinki poza skalą leżą w jednym punkcie linii: jeden znacznik i jeden podpis na grupę.
  const groups = new Map<string, typeof cuts>()
  for (const entry of cuts) {
    const key = entry.kind === 'position' ? entry.cut.id : entry.kind
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }
  for (const members of groups.values()) {
    const { cut, kind } = members[0]
    const world = kind === 'position' ? new THREE.Vector3(...scenePosition(cut, cut.distLy!, 'galaxy')) : sunPos.clone().addScaledVector(dir, length)
    const texture = ringTexture(members.length > 1 ? accent : colors[cut.type] ?? DEFAULT_ANNOTATION_COLORS[cut.type], kind !== 'position')
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false, sizeAttenuation: false })
    const sprite = new THREE.Sprite(material)
    sprite.scale.setScalar(0.026)
    sprite.position.copy(world)
    sprite.renderOrder = 5
    group.add(sprite)
    disposables.push(texture, material)
    materials.push(material)
    const ids = members.map((m) => m.cut.id)
    const lines = Array.from({ length: Math.ceil(ids.length / 3) }, (_, i) => ids.slice(i * 3, i * 3 + 3).join(', '))
    const label = document.createElement('div')
    label.className = `obs-label space-photo-label${kind === 'position' ? '' : ' dashed'}`
    const text = [...lines, kind === 'outside' ? 'poza skalą' : `≈ ${fmtDistance(cut.distLy!)}`]
    label.textContent = text.join('\n')
    labels.appendChild(label)
    // Wymiary podpisu w pikselach (krój 10 px ≈ 6,1 px na znak, wiersze po 13,5 px, obramowanie) do rozmieszczania.
    marks.push({ id: kind === 'position' ? cut.id : null, position: world.toArray(), sprite, label, width: Math.max(...text.map((line) => line.length)) * 6.1 + 16, height: text.length * 13.5 + 8 })
  }
  handle.scene.add(group)

  // Podpisy przesuwamy tylko przy zmianie kamery lub rozmiaru. Każdy stoi przy swoim znaczniku: z prawej, z lewej,
  // nad nim albo pod nim, w pierwszym miejscu bez nakładania; gdy wszystkie są zajęte, zostaje z prawej.
  const lastCamera = new THREE.Matrix4()
  const lastProjection = new THREE.Matrix4()
  let lastW = 0, lastH = 0
  const v = new THREE.Vector3()
  const place = () => {
    const { camera, mount } = handle
    const w = mount.clientWidth, h = mount.clientHeight
    if (w === lastW && h === lastH && lastCamera.equals(camera.matrixWorld) && lastProjection.equals(camera.projectionMatrix)) return
    lastW = w; lastH = h
    lastCamera.copy(camera.matrixWorld)
    lastProjection.copy(camera.projectionMatrix)
    const boxes: { left: number; top: number; right: number; bottom: number }[] = []
    for (const mark of marks) {
      v.copy(mark.sprite.position).project(camera)
      const on = group.visible && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1
      mark.label.style.display = on ? '' : 'none'
      if (!on) continue
      const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h
      const { width: lw, height: lh } = mark
      const spots: [number, number][] = [[x + 13, y - 9], [x - 13 - lw, y - 9], [x - lw / 2, y - 14 - lh], [x - lw / 2, y + 14], [x + 13, y - lh - 4], [x + 13, y + 4]]
      const free = (sx: number, sy: number) => !boxes.some((b) => sx < b.right && sx + lw > b.left && sy < b.bottom && sy + lh > b.top)
      const [lx, ly] = spots.find(([sx, sy]) => free(sx, sy)) ?? spots[0]
      boxes.push({ left: lx, top: ly, right: lx + lw, bottom: ly + lh })
      mark.label.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`
    }
  }
  handle.hooks.add(place)
  handle.invalidate()

  return {
    group, cone, fieldTan, basis, length, labels,
    frameCamera() {
      const { camera, controls } = handle
      handle.stopIntro()
      camera.position.copy(focus).add(new THREE.Vector3(span * 0.55, span * 0.55, span * 0.75))
      controls.target.copy(focus)
      camera.lookAt(focus)
      controls.update()
      handle.invalidate()
    },
    setOpacity(opacity, cone = opacity, faces = cone, axis = opacity) {
      lineMaterial.opacity = 0.85 * axis
      line.visible = axis > 0
      for (const m of materials) {
        m.userData.base ??= m.opacity
        m.opacity = (m.userData.base as number) * (m.userData.faces ? faces : m.userData.cone ? cone : opacity)
      }
      labels.style.opacity = String(opacity)
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
    placeMarkers(project) {
      for (const mark of marks) {
        if (mark.id !== null) mark.sprite.position.set(...(project?.(mark.id, mark.position) ?? mark.position))
      }
    },
    setVisible(visible) {
      group.visible = visible
      labels.style.display = visible ? '' : 'none'
      handle.invalidate()
    },
    dispose() {
      handle.hooks.delete(place)
      handle.scene.remove(group)
      for (const d of disposables) d.dispose()
      labels.remove()
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
