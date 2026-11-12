// Okno zdjęcia we Wszechświecie lokalnym (three.js): fotografia jako płaszczyzna w prawdziwym kierunku, na odległości
// głównego planu, powiększona względem prawdziwego pola (cienka igła od Drogi Mlecznej). Obiekty głównego planu są
// obrysami na zdjęciu; pierwszy plan wysuwa się przed okno, tło za nie, jako okrągłe wycinki na nitkach. Układ kadru
// zostaje 1:1, więc każdy obiekt w 3D ma swoje miejsce na fotografii. Wszystkie obiekty to jedna siatka i jeden
// materiał: liczba galaktyk nie zmienia liczby wywołań rysowania. Matematyka w src/lib/spacePhoto.ts.
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import type { Vec3 } from '../../lib/astro'
import { fmtDistance, fmtNum } from '../../lib/format'
import { frameBasis, halfFieldTan } from '../../lib/frameBasis'
import { cutsInThreeD, type PhotoCut, type PhotoProject } from '../../lib/photo'
import { scenePoint } from '../../lib/space3d'
import { frameDistance, framePose, sideView, type CameraPose } from '../../lib/spaceCamera'
import { uprightRoll } from '../../lib/spaceDive'
import { LAYER_LABELS, depthLayers, layerLifts, windowPoint, windowSize, type DepthLayer, type DepthLayers } from '../../lib/spacePhoto'
import type { Space3DHandle } from '../Space3D'
import { createSightCone, type PhotoGuide } from './photoGuide'
import { createLabelLayer, setLabelText, type SceneLabel } from './sceneLabels'

/** Położenie: Droga Mleczna, igła i okno; Kadr: okno z wysuniętymi planami; Z Ziemi: wzdłuż linii widzenia (płaska fotografia). */
export type WindowView = 'position' | 'frame' | 'earth'
export type WindowColors = Record<DepthLayer, string> & { accent: string }

export interface PhotoWindow {
  layers: DepthLayers
  /** Ile razy okno jest większe od prawdziwego pola zdjęcia w scenie. */
  magnification: number
  /** Prawdziwe pole zdjęcia w stopniach. */
  fieldDeg: [number, number]
  view(view: WindowView, ms?: number): void
  focus(id: string): void
  setSelected(id: string | null): void
  setHover(id: string | null): void
  /** Linia widzenia i stożek pola od Ziemi do okna: nimi steruje nurkowanie do Obserwatorium, jak w Drodze Mlecznej. */
  guide: PhotoGuide
  /** Wysunięcie planów: 0 płaska fotografia, 1 pełne rozłożenie. */
  setLift(progress: number): void
  /** Nurkowanie (progress 1 → 0): plany składają się w płaską fotografię, okno gaśnie przed pojawieniem się zdjęcia
   *  Obserwatorium, a kadr wraca na środek sceny (tam Obserwatorium ma oś optyczną). */
  setDive(progress: number, fade: number): void
  setVisible(visible: boolean): void
  /** Część sceny zasłonięta przez panel (z prawej) i pasek zdjęcia (u dołu), w pikselach: kadr centruje się w reszcie. */
  setInsets(right: number, bottom: number): void
  dispose(): void
}

interface Item {
  cut: PhotoCut
  layer: DepthLayer
  lift: number
  /** Promień w układzie okna przy płaskim zdjęciu: wycinek pokrywa wtedy dokładnie swoje miejsce na fotografii. */
  radius: number
  /** Pierwszy wierzchołek czworokąta obiektu. */
  vertex: number
  /** Położenie i promień w układzie okna przy bieżącym wysunięciu. */
  center: THREE.Vector3
  size: number
  world: THREE.Vector3
  labelled: boolean
}

const UP: Vec3 = [0, 1, 0]
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const
/** Jasność wycinka tła: sygnał, że leży za oknem. */
const FAR_DIM = 0.72

const vertexShader = `
  attribute vec2 local;
  attribute vec3 tint;
  attribute vec2 look;
  varying vec2 vUv;
  varying vec2 vLocal;
  varying vec3 vTint;
  varying vec2 vLook;
  void main() {
    vUv = uv;
    vLocal = local;
    vTint = tint;
    vLook = look;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`
// Koło z obrysem o stałej grubości w pikselach (fwidth); look.x: wypełnienie wycinkiem zdjęcia, look.y: jego jasność.
const fragmentShader = `
  uniform sampler2D map;
  uniform float opacity;
  varying vec2 vUv;
  varying vec2 vLocal;
  varying vec3 vTint;
  varying vec2 vLook;
  void main() {
    float r = length(vLocal);
    if (r > 1.0) discard;
    float w = max(fwidth(r), 1e-4);
    float ring = smoothstep(1.0 - 2.1 * w, 1.0 - 1.2 * w, r);
    float alpha = max(ring, vLook.x) * (1.0 - smoothstep(1.0 - w, 1.0, r)) * opacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(mix(texture2D(map, vUv).rgb * vLook.y, vTint, ring), alpha);
    #include <colorspace_fragment>
  }`

/** Cztery klamry L kwadratu o boku 2 (w płaszczyźnie XY). */
function bracketPositions(arm: number): number[] {
  const out: number[] = []
  for (const [x, y] of CORNERS) out.push(x, y, 0, x - x * arm, y, 0, x, y, 0, x, y - y * arm, 0)
  return out
}

export function createPhotoWindow(handle: Space3DHandle, project: PhotoProject, colors: WindowColors, onPick: (id: string) => void): PhotoWindow | null {
  const basis = frameBasis(project.astrometry, project.width, project.height)
  const cuts = cutsInThreeD(project.cuts)
  const layerCuts = cuts.map((c) => ({ id: c.id, distLy: c.distLy!, radius: c.radius }))
  const layers = depthLayers(layerCuts)
  if (!basis || !layers) return null
  const lifts = layerLifts(layerCuts, layers)
  const { camera, scene, mount, sunPos } = handle
  const dir = new THREE.Vector3(...basis.center)
  const back = dir.clone().negate()
  // Okno stoi na linii widzenia od Ziemi, w odległości głównego planu (skala sceny): igła trafia dokładnie w jego środek.
  const reach = new THREE.Vector3(...scenePoint(basis.center, layers.center, 'universe')).distanceTo(sunPos)
  const center = sunPos.clone().addScaledVector(dir, reach)
  const fieldTan = halfFieldTan(basis, project.width, project.height)
  const size = windowSize(reach, project, fieldTan[0])
  // Obrót wokół linii widzenia: góra kadru ku górze sceny (pogląd, jak w Obserwatorium); kierunek i odległość bez zmian.
  const roll = uprightRoll(basis, UP)
  const axisX = new THREE.Vector3(...basis.x).multiplyScalar(Math.cos(roll)).addScaledVector(new THREE.Vector3(...basis.y), Math.sin(roll))
  const axisY = new THREE.Vector3(...basis.y).multiplyScalar(Math.cos(roll)).addScaledVector(new THREE.Vector3(...basis.x), -Math.sin(roll))

  const group = new THREE.Group()
  // Nazwa, po której nurkowanie (fadeLayers) omija własne krycie okna.
  group.name = 'universe-photo-fragments'
  // Układ okna: x w prawo kadru, y w górę, z ku Ziemi.
  const frame = new THREE.Group()
  frame.position.copy(center)
  frame.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(axisX, axisY, back))
  group.add(frame)
  scene.add(group)
  frame.updateMatrixWorld(true)
  const toWorld = (x: number, y: number, z: number) => frame.localToWorld(new THREE.Vector3(x, y, z))
  const disposables: { dispose(): void }[] = []
  const faded: { material: THREE.Material & { opacity: number }; base: number }[] = []
  const fade = <M extends THREE.Material & { opacity: number }>(material: M) => { faded.push({ material, base: material.opacity }); disposables.push(material); return material }
  const hw = size.width / 2, hh = size.height / 2

  // Fotografia.
  const texture = new THREE.TextureLoader().load(project.image, () => handle.invalidate())
  texture.colorSpace = THREE.SRGBColorSpace
  const photoGeometry = new THREE.PlaneGeometry(size.width, size.height)
  const photo = new THREE.Mesh(photoGeometry, fade(new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.94, side: THREE.DoubleSide, depthWrite: false, depthTest: false })))
  photo.renderOrder = 10
  frame.add(photo)
  disposables.push(texture, photoGeometry)

  // Ramka okna z klamrami L w narożnikach.
  const rectangle = (x: number, y: number) => CORNERS.flatMap(([ax, ay], i) => { const [bx, by] = CORNERS[(i + 1) % 4]; return [ax * x, ay * y, 0, bx * x, by * y, 0] })
  const borderGeometry = new THREE.BufferGeometry()
  borderGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rectangle(hw, hh), 3))
  const border = new THREE.LineSegments(borderGeometry, fade(new THREE.LineBasicMaterial({ color: colors.accent, transparent: true, opacity: 0.45, depthWrite: false, depthTest: false })))
  border.renderOrder = 11
  frame.add(border)
  const bracketGeometry = new LineSegmentsGeometry().setPositions(bracketPositions(0.09).map((v, i) => i % 3 === 0 ? v * (hw + size.width * 0.012) : i % 3 === 1 ? v * (hh + size.width * 0.012) : 0))
  const cornerBrackets = new LineSegments2(bracketGeometry, fade(new LineMaterial({ color: colors.accent, linewidth: 2, transparent: true, opacity: 0.95, depthWrite: false, depthTest: false })))
  cornerBrackets.renderOrder = 11
  frame.add(cornerBrackets)
  disposables.push(borderGeometry, bracketGeometry)

  // Igła: linia widzenia i stożek prawdziwego pola od Ziemi do środka okna (ten sam co w Drodze Mlecznej).
  const sight = createSightCone(handle, basis, project, reach, colors.accent, 4.4)
  group.add(sight.group)
  disposables.push(...sight.disposables)

  // Obiekty: kolejność rysowania od najdalszego; pod spodem obrysy miejsc, z których wysunięto pierwszy plan i tło.
  const k = size.width / project.width
  const minRadius = size.width * 0.006
  // Wysunięty wycinek drobnej galaktyki rośnie do medalionu czytelnego z daleka (obraz w nim jest wtedy powiększony);
  // ma zapas tła wokół obiektu, żeby było widać, skąd pochodzi.
  const medallion = size.width * 0.034
  const flatRadius = (cut: PhotoCut, layer: DepthLayer) => Math.max(minRadius, cut.radius * k) * (layer === 'main' ? 1 : 1.15)
  const sorted = [...cuts].sort((a, b) => b.distLy! - a.distLy! || a.id.localeCompare(b.id))
  const liftedCount = sorted.filter((c) => layers.layer.get(c.id) !== 'main').length
  const quads = liftedCount + sorted.length
  const positions = new Float32Array(quads * 12)
  const uvs = new Float32Array(quads * 8), locals = new Float32Array(quads * 8), tints = new Float32Array(quads * 12), looks = new Float32Array(quads * 8)
  const indices = new Uint32Array(quads * 6)
  const tint = new THREE.Color()
  const writeQuad = (q: number, x: number, y: number, z: number, r: number) => {
    CORNERS.forEach(([cx, cy], i) => positions.set([x + cx * r, y + cy * r, z], (q * 4 + i) * 3))
  }
  const describeQuad = (q: number, cut: PhotoCut, radius: number, color: string, fill: number, brightness: number) => {
    const rpx = radius / k
    tint.set(color)
    CORNERS.forEach(([cx, cy], i) => {
      const v = q * 4 + i
      uvs.set([(cut.x + cx * rpx) / project.width, 1 - (cut.y - cy * rpx) / project.height], v * 2)
      locals.set([cx, cy], v * 2)
      tints.set([tint.r, tint.g, tint.b], v * 3)
      looks.set([fill, brightness], v * 2)
    })
    indices.set([q * 4, q * 4 + 1, q * 4 + 2, q * 4, q * 4 + 2, q * 4 + 3], q * 6)
  }
  const items: Item[] = []
  const lifted: Item[] = []
  let quad = 0
  // Miejsca na zdjęciu obiektów spoza głównego planu (sam obrys, bez wypełnienia).
  for (const cut of sorted) {
    const layer = layers.layer.get(cut.id)!
    if (layer === 'main') continue
    const radius = flatRadius(cut, layer)
    const flat = windowPoint(cut.x, cut.y, 0, project, size)
    describeQuad(quad, cut, radius, colors[layer], 0, 1)
    writeQuad(quad++, flat.x, flat.y, 0, radius)
  }
  for (const cut of sorted) {
    const layer = layers.layer.get(cut.id)!
    const radius = flatRadius(cut, layer)
    const item: Item = { cut, layer, lift: lifts.get(cut.id) ?? 0, radius, vertex: quad * 4, center: new THREE.Vector3(), size: radius, world: new THREE.Vector3(), labelled: false }
    describeQuad(quad++, cut, radius, colors[layer], layer === 'main' ? 0 : 1, layer === 'far' ? FAR_DIM : 1)
    items.push(item)
    if (layer !== 'main') lifted.push(item)
  }
  const byId = new Map(items.map((item) => [item.cut.id, item]))
  const discGeometry = new THREE.BufferGeometry()
  const positionAttribute = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)
  discGeometry.setAttribute('position', positionAttribute)
  discGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  discGeometry.setAttribute('local', new THREE.BufferAttribute(locals, 2))
  discGeometry.setAttribute('tint', new THREE.BufferAttribute(tints, 3))
  discGeometry.setAttribute('look', new THREE.BufferAttribute(looks, 2))
  discGeometry.setIndex(new THREE.BufferAttribute(indices, 1))
  const discMaterial = new THREE.ShaderMaterial({ uniforms: { map: { value: texture }, opacity: { value: 1 } }, vertexShader, fragmentShader, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide })
  const discs = new THREE.Mesh(discGeometry, discMaterial)
  discs.frustumCulled = false
  discs.renderOrder = 13
  frame.add(discs)
  disposables.push(discGeometry, discMaterial)

  // Nitki: od miejsca na zdjęciu do wysuniętego wycinka, w kolorze planu.
  const threadPositions = new Float32Array(lifted.length * 6), threadColors = new Float32Array(lifted.length * 6)
  lifted.forEach((item, i) => {
    tint.set(colors[item.layer])
    threadColors.set([tint.r, tint.g, tint.b, tint.r, tint.g, tint.b], i * 6)
  })
  const threadAttribute = new THREE.BufferAttribute(threadPositions, 3).setUsage(THREE.DynamicDrawUsage)
  const threadColorAttribute = new THREE.BufferAttribute(threadColors, 3)
  const threadMaterial = fade(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false, depthTest: false }))
  // Nitki tła (pierwsze w kolejności rysowania) leżą za zdjęciem, więc rysują się pod nim: w obszarze fotografii
  // prześwitują tak słabo jak linie stożka, a obok niej są pełne. Nitki pierwszego planu rysują się nad zdjęciem.
  const farCount = lifted.filter((item) => item.layer === 'far').length
  for (const [start, count, order] of [[0, farCount, 9], [farCount, lifted.length - farCount, 12]]) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', threadAttribute)
    geometry.setAttribute('color', threadColorAttribute)
    geometry.setDrawRange(start * 2, count * 2)
    const threads = new THREE.LineSegments(geometry, threadMaterial)
    threads.frustumCulled = false
    threads.renderOrder = order
    frame.add(threads)
    disposables.push(geometry)
  }

  // Zaznaczenie i wskazanie: klamry L wokół obiektu.
  const markGeometry = new LineSegmentsGeometry().setPositions(bracketPositions(0.42))
  disposables.push(markGeometry)
  const mark = (color: string, opacity: number) => {
    const brackets = new LineSegments2(markGeometry, fade(new LineMaterial({ color, linewidth: 2, transparent: true, opacity, depthWrite: false, depthTest: false })))
    brackets.renderOrder = 14
    brackets.visible = false
    frame.add(brackets)
    return brackets
  }
  const hoverMark = mark(colors.accent, 0.75), selectedMark = mark('#ffffff', 1)

  // Podpisy w DOM: okno, główny plan, wysunięte obiekty (wszystkie, gdy jest ich kilka; inaczej skrajne) i zaznaczenie.
  const labelLayer = createLabelLayer(handle, 'space-photo-labels')
  labelLayer.add(toWorld(-hw, hh, 0), [`KADR ×${fmtNum(size.magnification, size.magnification < 10 ? 1 : 0)}`, `${fmtNum(Math.atan(fieldTan[0]) * 360 / Math.PI, 2)}° × ${fmtNum(Math.atan(fieldTan[1]) * 360 / Math.PI, 2)}°`], { color: colors.accent, gap: 6 })
  const mainIds = items.filter((item) => item.layer === 'main').map((item) => item.cut.id)
  const range = fmtDistance(layers.lo) === fmtDistance(layers.hi) ? `≈ ${fmtDistance(layers.center)}` : `≈ ${fmtDistance(layers.lo)} – ${fmtDistance(layers.hi)}`
  labelLayer.add(toWorld(-hw, -hh, 0), [mainIds.length <= 3 ? mainIds.join(', ') : `${LAYER_LABELS.main} · ${mainIds.length} ob.`, range], { color: colors.main, gap: 6 })
  // Kolejność rysowania jest od najdalszego: pierwszy to najdalszy obiekt tła, ostatni to najbliższy pierwszego planu.
  const extremes = lifted.length <= 8 ? lifted : [...new Set([lifted[0], lifted[lifted.length - 1]])]
  // Podpis obiektu trzyma odstęp równy promieniowi jego koła na ekranie (przy zbliżeniu koło rośnie).
  const itemLabels: { label: SceneLabel; item(): Item | null }[] = []
  for (const item of extremes) {
    item.labelled = true
    itemLabels.push({ label: labelLayer.add(item.world, [item.cut.id, `≈ ${fmtDistance(item.cut.distLy)}`], { color: colors[item.layer] }), item: () => item })
  }
  const selectedLabel = labelLayer.add(new THREE.Vector3(), [''], { className: 'selected', color: '#ffffff' })
  const hoverLabel = labelLayer.add(new THREE.Vector3(), [''], { color: colors.accent })
  selectedLabel.hidden = hoverLabel.hidden = true

  let selected: Item | null = null, hovered: Item | null = null
  itemLabels.push({ label: selectedLabel, item: () => selected }, { label: hoverLabel, item: () => hovered })
  const placeMark = (brackets: LineSegments2, item: Item | null) => {
    brackets.visible = !!item
    if (!item) return
    brackets.position.copy(item.center)
    brackets.scale.setScalar(Math.max(item.size * 1.3, size.width * 0.012))
  }
  /** Podpis zaznaczenia albo wskazania; obiekt ze stałym podpisem nie dostaje drugiego. */
  const describe = (label: typeof selectedLabel, item: Item | null) => {
    label.hidden = !item || item.labelled || (label === hoverLabel && item === selected)
    if (item && !label.hidden) {
      label.position.copy(item.world)
      setLabelText(label, [item.cut.id, `${LAYER_LABELS[item.layer]} · ≈ ${fmtDistance(item.cut.distLy)}`])
    }
    labelLayer.invalidate()
  }
  const applyLift = (progress: number) => {
    lifted.forEach((item, i) => {
      const p = windowPoint(item.cut.x, item.cut.y, item.lift * progress, project, size)
      const flat = windowPoint(item.cut.x, item.cut.y, 0, project, size)
      item.center.set(p.x, p.y, p.z)
      item.size = item.radius * p.scale + Math.max(0, medallion - item.radius * p.scale) * progress
      writeQuad(item.vertex / 4, p.x, p.y, p.z, item.size)
      threadPositions.set([flat.x, flat.y, 0, p.x, p.y, p.z], i * 6)
    })
    for (const item of items) {
      if (item.layer === 'main') {
        const flat = windowPoint(item.cut.x, item.cut.y, 0, project, size)
        item.center.set(flat.x, flat.y, 0)
        writeQuad(item.vertex / 4, flat.x, flat.y, 0, item.radius)
      }
      frame.localToWorld(item.world.copy(item.center))
    }
    positionAttribute.needsUpdate = true
    threadAttribute.needsUpdate = true
    placeMark(selectedMark, selected)
    placeMark(hoverMark, hovered)
    describe(selectedLabel, selected)
    describe(hoverLabel, hovered)
    handle.invalidate()
  }
  applyLift(1)

  // Kadr: środek obrazu przesunięty do części sceny wolnej od panelu i paska (setViewOffset przesuwa oś optyczną,
  // nie kamerę, więc widok „Z Ziemi” dalej leży dokładnie na linii widzenia).
  let insets = { right: 0, bottom: 0 }
  // Waga przesunięcia: w nurkowaniu schodzi do zera, bo scena Obserwatorium ma oś optyczną w środku.
  let visible = true, offsetKey = '', offsetWeight = 1
  const applyOffset = () => {
    const w = mount.clientWidth, h = mount.clientHeight
    const key = visible ? `${w}:${h}:${insets.right}:${insets.bottom}:${offsetWeight}` : ''
    if (key === offsetKey) return
    offsetKey = key
    if (key && w > 0 && h > 0) camera.setViewOffset(w, h, insets.right / 2 * offsetWeight, insets.bottom / 2 * offsetWeight, w, h)
    else camera.clearViewOffset()
    handle.invalidate()
  }
  const eye = new THREE.Vector3()
  const update = (now: number) => {
    const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
    for (const { label, item } of itemLabels) {
      const target = item()
      if (!target) continue
      const depth = -eye.copy(target.world).applyMatrix4(camera.matrixWorldInverse).z
      label.gap = depth > 0 ? Math.max(13, target.size / (depth * tanY) * mount.clientHeight / 2 + 5) : 13
    }
    labelLayer.update(now)
  }
  handle.hooks.add(applyOffset)
  handle.layout.add(update)
  handle.anchors.add(center)

  const guide: PhotoGuide = {
    group: sight.group, cone: sight.cone, fieldTan: sight.fieldTan, basis, length: reach, labels: labelLayer.root,
    frameCamera: () => handle.flyTo(pose('position')),
    setOpacity: sight.setOpacity, alignSightLine: sight.alignSightLine, setConeRoll: sight.setConeRoll,
    placeMarkers() {},
    setVisible(next) { sight.group.visible = next; handle.invalidate() },
    dispose() {},
  }

  // Punkty, które kadr ma objąć: narożniki okna i skrajne wysunięcia planów.
  const extent = (): Vec3[] => {
    const points: Vec3[] = []
    const reach = [0, Math.min(0, ...lifted.map((item) => item.lift)), Math.max(0, ...lifted.map((item) => item.lift))]
    for (const lift of new Set(reach)) {
      for (const [x, y] of CORNERS) {
        const p = windowPoint(project.width * (x + 1) / 2, project.height * (1 - y) / 2, lift, project, size)
        points.push(toWorld(p.x, p.y, p.z).toArray() as Vec3)
      }
    }
    return points
  }
  const pose = (view: WindowView): CameraPose => {
    const w = Math.max(1, mount.clientWidth), h = Math.max(1, mount.clientHeight)
    const options = { fovDeg: 50, aspect: camera.aspect, room: [Math.max(0.3, (w - insets.right) / w) * 0.88, Math.max(0.3, (h - insets.bottom) / h) * 0.84] as [number, number] }
    const target = center.toArray() as Vec3
    const at = (v: THREE.Vector3, distance: number): CameraPose => ({ target, position: center.clone().addScaledVector(v, distance).toArray() as Vec3 })
    if (view === 'earth') {
      // Oko na linii widzenia. Przy kierunku prawie dokładnie ku biegunowi Galaktyki kamera patrzyłaby pionowo
      // (nieokreślony obrót wokół osi), więc odchylamy ją o ok. 1° w stronę góry kadru.
      const v = Math.abs(back.y) > 0.99985 ? back.clone().addScaledVector(axisY, 0.02).normalize() : back
      return at(v, Math.max(size.eye, frameDistance(CORNERS.map(([x, y]) => toWorld(x * hw, y * hh, 0).toArray() as Vec3), target, v.toArray() as Vec3, options)))
    }
    if (view === 'frame') {
      // Znad linii widzenia, w płaszczyźnie góry kadru: fotografia stoi prosto, a plany rozchodzą się w pionie ekranu.
      const v = back.clone().multiplyScalar(Math.cos(0.56)).addScaledVector(axisY, Math.sin(0.56))
      return at(v, frameDistance(extent(), target, v.toArray() as Vec3, options))
    }
    // Położenie: od strony Ziemi i z boku linii widzenia, żeby widać było przód okna i całą igłę.
    const side = new THREE.Vector3(...sideView(basis.center))
    const v = back.clone().multiplyScalar(0.8).addScaledVector(side, 0.6).normalize()
    return framePose([sunPos.toArray() as Vec3, [0, 0, 0], ...extent()], v.toArray() as Vec3, options)
  }

  // Wskazanie i kliknięcie: obiekt narysowany najwyżej, którego koło obejmuje wskaźnik (nie mniej niż 9 px).
  const projected = new THREE.Vector3(), viewPosition = new THREE.Vector3()
  const hit = (x: number, y: number): Item | null => {
    if (!visible) return null
    const w = mount.clientWidth, h = mount.clientHeight
    const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i]
      const depth = -viewPosition.copy(item.world).applyMatrix4(camera.matrixWorldInverse).z
      if (depth <= 0) continue
      projected.copy(item.world).project(camera)
      const reach = Math.max(9, item.size / (depth * tanY) * h / 2)
      if (Math.hypot((projected.x + 1) / 2 * w - x, (1 - projected.y) / 2 * h - y) <= reach) return item
    }
    return null
  }
  const setHover = (item: Item | null) => {
    if (item === hovered) return
    hovered = item
    placeMark(hoverMark, item)
    describe(hoverLabel, item)
    handle.invalidate()
  }
  const claim = (x: number, y: number, click: boolean) => {
    const item = hit(x, y)
    if (item && click) onPick(item.cut.id)
    return !!item
  }
  handle.claims.add(claim)
  const onMove = (event: PointerEvent) => {
    if (event.buttons) return
    const rect = mount.getBoundingClientRect()
    setHover(hit(event.clientX - rect.left, event.clientY - rect.top))
  }
  const onLeave = () => setHover(null)
  mount.addEventListener('pointermove', onMove)
  mount.addEventListener('pointerleave', onLeave)
  handle.invalidate()

  return {
    layers, magnification: size.magnification,
    fieldDeg: [Math.atan(fieldTan[0]) * 360 / Math.PI, Math.atan(fieldTan[1]) * 360 / Math.PI],
    view(view, ms) { handle.flyTo(pose(view), ms) },
    focus(id) {
      const item = byId.get(id)
      if (!item) return
      const v = camera.position.clone().sub(handle.controls.target).normalize()
      handle.flyTo({ target: item.world.toArray() as Vec3, position: item.world.clone().addScaledVector(v, Math.max(item.size * 9, size.width * 0.3)).toArray() as Vec3 })
    },
    setSelected(id) {
      selected = id ? byId.get(id) ?? null : null
      placeMark(selectedMark, selected)
      describe(selectedLabel, selected)
      describe(hoverLabel, hovered)
      handle.invalidate()
    },
    setHover(id) { setHover(id ? byId.get(id) ?? null : null) },
    guide,
    setLift: applyLift,
    setDive(progress, value) {
      offsetWeight = progress
      // Okno widziane z boku Ziemi nie pokrywa się ze zdjęciem Obserwatorium, więc znika, zanim tamto się pojawi.
      const opacity = value * progress * (2 - progress)
      for (const { material, base } of faded) material.opacity = base * opacity
      discMaterial.uniforms.opacity.value = opacity
      labelLayer.root.style.opacity = String(Math.min(value, progress * progress))
      applyLift(progress)
    },
    setVisible(next) {
      visible = next
      group.visible = next
      labelLayer.setVisible(next)
      if (!next) setHover(null)
      applyOffset()
      handle.invalidate()
    },
    setInsets(right, bottom) { insets = { right, bottom } },
    dispose() {
      visible = false
      applyOffset()
      handle.anchors.delete(center)
      handle.hooks.delete(applyOffset)
      handle.layout.delete(update)
      handle.claims.delete(claim)
      mount.removeEventListener('pointermove', onMove)
      mount.removeEventListener('pointerleave', onLeave)
      scene.remove(group)
      for (const d of disposables) d.dispose()
      labelLayer.dispose()
      handle.invalidate()
    },
  }
}
