import * as THREE from 'three'
import { expect, it, vi } from 'vitest'
import { ObservatoryScene } from './scene'
import { OBSERVATORY_FOV, type ObservatoryItem } from '../../lib/observatory'
import { MARK, MARK_PROJECTION_Y } from '../space3d/photoGuide'

// Prawdziwe obiekty Three.js; pomijamy tylko konstruktor wymagający DOM i kontekstu WebGL.
function fixture() {
  const item: ObservatoryItem = {
    id: 'obiekt', kind: 'object', category: 'nebulae', type: 'EN', x: 750, y: 125, radius: 100,
    distLy: 10000, distLoLy: null, distHiLy: null, gMag: null, bpRp: null, parallaxOverError: null,
    raDeg: 0, decDeg: 0, source: '', method: '', ref: '', scope: 'object',
  }
  const star: ObservatoryItem = { ...item, id: 'gwiazda', kind: 'star', type: null, category: 'stars', x: 500, y: 250, distLy: 1000 }
  const geometry = new THREE.BufferGeometry()
  const positions = new THREE.BufferAttribute(new Float32Array(3), 3)
  const alphas = new THREE.BufferAttribute(new Float32Array(1), 1)
  geometry.setAttribute('position', positions)
  geometry.setAttribute('alpha', alphas)
  const card = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.Texture() }))
  const anchor = new THREE.Sprite(new THREE.SpriteMaterial())
  const ring = new THREE.Sprite(new THREE.SpriteMaterial())
  const cutPreview = new THREE.Sprite(new THREE.SpriteMaterial())
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial())
  const frame = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial())
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000)
  camera.position.set(100, 100, 300)
  camera.lookAt(0, 0, 0)
  const rendered: number[] = []
  const host = { clientWidth: 600, clientHeight: 600 }
  const sizes: number[][] = []
  const scene: ObservatoryScene = Object.create(ObservatoryScene.prototype)
  Object.assign(scene, {
    scene: new THREE.Scene(), camera, host, external: true, dirty: false, progress: 0, arrival: 1,
    items: [item, star], image: { width: 1000, height: 500 }, domain: { minLy: 100, maxLy: 10000 },
    visible: new Set([item.id, star.id]), selected: null, stars: new THREE.Points(geometry), starIndex: [1],
    cards: new Map([[item.id, card]]), anchors: new Map([[item.id, anchor]]), ring, cutPreview, photo, frame,
    grid: new THREE.GridHelper(), axis: new THREE.Group(), ticks: [],
    fade: { earth: 1, pyramid: 1, axis: 1, photo: 1, grid: 1 },
    labels: { style: { setProperty() {} }, querySelector: () => null }, itemLabels: new Map(), labelWidths: new Map(), badges: [], fans: new Map(), hovered: null, earthLabel: { style: {} },
    renderer: {
      setSize: (width: number, height: number) => sizes.push([width, height]),
      render: () => rendered.push(card.position.z),
      domElement: { clientWidth: 600, clientHeight: 600, style: {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 600 }) },
    },
  })
  return { scene, camera, positions, alphas, card, anchor, ring, cutPreview, photo, rendered, host, sizes, item }
}

it('odświeża nieruchomą scenę dla obrotu Ziemi, z uwzględnieniem ograniczenia ruchu', () => {
  const { scene, rendered } = fixture()
  const mesh = new THREE.Mesh()
  const options = { reducedMotion: false }
  Object.assign(scene, {
    external: false, controls: { update: () => false }, keys: new Set(), options, lastTick: 0, lastRender: -Infinity,
    sizedWidth: 600, sizedHeight: 600, bufferWidth: 600, bufferHeight: 600,
    earth: { mesh, spin: (now: number) => { mesh.rotation.y = now / 1000 } },
  })

  scene.step(100)
  scene.step(150)
  expect(rendered).toHaveLength(2)
  expect(mesh.rotation.y).toBe(0.15)

  options.reducedMotion = true
  scene.step(200)
  expect(rendered).toHaveLength(2)
  expect(mesh.rotation.y).toBe(0.15)
})

it('pokazuje wycinek w pierścieniu zaznaczenia w Drodze Mlecznej i po wskazaniu obiektu spoza niej', () => {
  const { scene, item, card, ring, cutPreview } = fixture()
  scene.setSelected(item.id)
  scene.step(100)
  expect(cutPreview.visible).toBe(true)
  expect(cutPreview.material.map).toBe(card.material.map)
  expect(cutPreview.position.toArray()).toEqual(ring.position.toArray())

  item.distLy = 10e6
  scene.setProgress(0.5)
  scene.step(116)
  expect(cutPreview.visible).toBe(false)

  Reflect.set(scene, 'hovered', item.id)
  scene.setProgress(1)
  scene.step(132)
  expect(cutPreview.visible).toBe(true)
  expect(cutPreview.material.map).toBe(card.material.map)

  Reflect.set(scene, 'hovered', null)
  scene.setVisible(new Set([item.id]))
  scene.step(148)
  expect(cutPreview.visible).toBe(false)
})

it('łączy zmiany postępu, krycia i zaznaczenia w jedną aktualizację buforów przed rysowaniem', () => {
  const { scene, camera, positions, alphas, card, anchor, ring, photo, rendered } = fixture()
  scene.setProgress(0.25)
  scene.setProgress(0.5)
  scene.setFade({ photo: 0.7 }, 0.3)
  scene.setSelected('obiekt')
  expect(positions.version).toBe(0)
  scene.step(100)
  expect(positions.version).toBe(1)
  expect(alphas.version).toBe(1)
  expect(Array.from(positions.array)).toEqual([0, 0, -100])
  expect(alphas.getX(0)).toBeCloseTo(0.4375)
  expect(card.position.toArray()).toEqual([25, 12.5, expect.closeTo(-43.2, 9)])
  expect(anchor.position.toArray()).toEqual([25, 12.5, -200])
  expect(anchor.scale.x).toBeCloseTo(MARK * MARK_PROJECTION_Y / camera.projectionMatrix.elements[5])
  expect(ring.position.toArray()).toEqual([25, 12.5, -200])
  expect(card.scale.x).toBeCloseTo(19.352)
  expect(card.material.opacity).toBeCloseTo(0.6804)
  expect(photo.material.opacity).toBeCloseTo(0.638008)
  expect(rendered).toEqual([expect.closeTo(-43.2, 9)])
  scene.step(116)
  expect(positions.version).toBe(1)
  expect(rendered).toHaveLength(1)
  // Krycia nurkowania co klatkę przy stałym postępie: tylko bufor krycia gwiazd, bez przeliczania pozycji.
  scene.setFade({ photo: 0.35 }, 0.3)
  scene.step(132)
  expect(positions.version).toBe(1)
  expect(alphas.version).toBe(2)
  expect(alphas.getX(0)).toBeCloseTo(0.21875)
})

it('pokazuje znaczniki z wejścia z DM i WL także przy odtwarzaniu i przewijaniu zdjęcia', () => {
  const { scene: dive, anchor: diveAnchor } = fixture()
  const { scene, anchor, item } = fixture()
  Object.assign(scene, { external: false, controls: { update: () => false }, keys: new Set() })
  dive.setProgress(0.5)
  dive.setFade({ photo: 1 }, 0.5)
  dive.step(100)

  scene.setProgress(0.5)
  scene.step(100)
  expect(anchor.visible).toBe(true)
  expect(anchor.material.opacity).toBe(diveAnchor.material.opacity)
  expect(anchor.position.toArray()).toEqual(diveAnchor.position.toArray())

  scene.setProgress(1)
  scene.step(116)
  expect(anchor.visible).toBe(false)
  scene.setProgress(0)
  scene.step(132)
  expect(anchor.visible).toBe(true)
  scene.setVisible(new Set())
  scene.step(148)
  expect(anchor.visible).toBe(false)
  scene.setVisible(new Set([item.id]))
  scene.step(164)
  expect(anchor.visible).toBe(true)
})

it('wybór kursorem uwzględnia aktualną widoczność i pozycję przed następną klatką', () => {
  const { scene, camera } = fixture()
  scene.setProgress(1)
  scene.setFade({ photo: 1 }, 1)
  scene.setVisible(new Set(['obiekt']))
  const screen = new THREE.Vector3(25, 12.5, -400).project(camera)
  expect(scene.pick((screen.x + 1) * 300, (1 - screen.y) * 300)).toBe('obiekt')
  scene.setVisible(new Set())
  expect(scene.pick((screen.x + 1) * 300, (1 - screen.y) * 300)).toBeNull()
})

it('wcześniej zwiększa krycie wycinka Drogi Mlecznej podczas rozkładania zdjęcia', () => {
  const { scene, item, card } = fixture()
  scene.setProgress(0.25)
  scene.step(100)
  expect(card.material.opacity).toBeCloseTo(0.625)

  item.distLy = 10e6
  scene.setProgress(0.2)
  scene.step(116)
  expect(card.material.opacity).toBeCloseTo(0.26)
})

it('w przejściu zmienia co klatkę tylko proporcje kamery, a bufor rysowania po ustaniu zmian rozmiaru', () => {
  const { scene, host, sizes, camera, rendered } = fixture()
  // Stan po konstruktorze: bufor dopasowany do płótna.
  Object.assign(scene, { sizedWidth: 600, sizedHeight: 600, bufferWidth: 600, bufferHeight: 600, steadyFrames: 0 })
  scene.setProgress(0.5)
  scene.step(100)
  expect(rendered).toHaveLength(1)
  // Panele wsuwają się: płótno zwęża się w kolejnych klatkach, kamera nadąża bez nowego bufora.
  host.clientWidth = 420
  scene.step(116)
  expect(camera.aspect).toBe(0.7)
  host.clientWidth = 400
  scene.step(132)
  expect(camera.aspect).toBeCloseTo(400 / 600, 12)
  expect(sizes).toEqual([])
  expect(rendered).toHaveLength(3)
  // Dwie klatki bez zmiany: jeden nowy bufor i klatka w nim.
  scene.step(148)
  expect(sizes).toEqual([])
  scene.step(164)
  expect(sizes).toEqual([[400, 600]])
  expect(rendered).toHaveLength(4)
  scene.step(180)
  expect(sizes).toHaveLength(1)
  expect(rendered).toHaveLength(4)
  // Panele zwijają się (powrót): rosnące płótno dostaje od razu bufor z zapasem, potem jeden dokładny.
  host.clientWidth = 480
  scene.step(196)
  expect(sizes).toEqual([[400, 600], [600, 600]])
  host.clientWidth = 560
  scene.step(212)
  expect(sizes).toHaveLength(2)
  host.clientWidth = 640
  scene.step(228)
  expect(sizes).toEqual([[400, 600], [600, 600], [800, 600]])
  scene.step(244)
  scene.step(260)
  expect(sizes).toEqual([[400, 600], [600, 600], [800, 600], [640, 600]])
  // Poza przejściem (ResizeObserver, własna pętla) bufor nadąża od razu; ten sam rozmiar nie wymaga nowego rysowania.
  const resize = Reflect.get(scene, 'resize') as (defer?: boolean) => boolean
  expect(resize.call(scene)).toBe(false)
  host.clientWidth = 500
  expect(resize.call(scene)).toBe(true)
  expect(sizes.at(-1)).toEqual([500, 600])
})

it('viewPose earth daje identyczną kamerę i stałe pole widzenia dla zdjęć pionowych, kwadratowych i poziomych', () => {
  const { scene, camera } = fixture()
  camera.aspect = 1.6
  camera.updateProjectionMatrix()
  const poses = [
    { width: 3540, height: 5270 },
    { width: 2944, height: 2956 },
    { width: 1720, height: 1000 },
  ].map((image) => {
    Reflect.set(scene, 'image', image)
    return scene.viewPose('earth')
  })
  expect(poses[0]).toEqual(poses[1])
  expect(poses[2]).toEqual(poses[1])
  expect(camera.fov).toBe(OBSERVATORY_FOV)
})

it('toggleFan oznacza aria-expanded wyłącznie na klikniętej plakietce i cofa je po zamknięciu', () => {
  const makeEl = () => {
    const classes = new Set<string>()
    const attrs: Record<string, string> = {}
    let cls = ''
    const el = {
      get className() { return cls },
      set className(v: string) {
        cls = v
        classes.clear()
        for (const name of v.split(/\s+/).filter(Boolean)) classes.add(name)
      },
      textContent: '',
      title: '',
      offsetWidth: 120,
      style: {} as Record<string, string>,
      children: [] as unknown[],
      parent: null as unknown,
      attrs,
      classList: {
        add: (...names: string[]) => names.forEach((n) => classes.add(n)),
        remove: (...names: string[]) => names.forEach((n) => classes.delete(n)),
        toggle: (name: string, force?: boolean) => { if (force ?? !classes.has(name)) classes.add(name); else classes.delete(name) },
        contains: (name: string) => classes.has(name),
      },
      appendChild(child: { parent: unknown }) { child.parent = el; el.children.push(child); return child },
      remove() {
        const p = el.parent as { children: unknown[] } | null
        if (p) p.children = p.children.filter((c) => c !== el)
        el.parent = null
      },
      setAttribute(k: string, v: string) { attrs[k] = v },
      getAttribute(k: string) { return attrs[k] ?? null },
      addEventListener() {},
      querySelector: () => el.children.find((c) => (c as { classList: { contains: (n: string) => boolean } }).classList.contains('obs-fan')) ?? null,
    }
    return el
  }
  vi.stubGlobal('document', { createElement: makeEl })
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() })
  try {
    const { scene } = fixture()
    const labels = makeEl()
    Reflect.set(scene, 'labels', labels)
    Reflect.set(scene, 'sizedWidth', 1200)
    Reflect.set(scene, 'sizedHeight', 800)
    const createBadge = Reflect.get(scene, 'createBadge') as () => { el: ReturnType<typeof makeEl>; ids: string[]; x: number; y: number }
    const toggleFan = Reflect.get(scene, 'toggleFan') as (badge: ReturnType<typeof createBadge>) => void
    const b1 = createBadge.call(scene)
    const b2 = createBadge.call(scene)
    b1.ids = ['obiekt']
    b1.x = 400; b1.y = 300
    b2.ids = ['gwiazda']
    b2.x = 700; b2.y = 400

    toggleFan.call(scene, b1)
    expect(b1.el.getAttribute('aria-expanded')).toBe('true')
    expect(b2.el.getAttribute('aria-expanded')).toBe('false')

    toggleFan.call(scene, b1)
    expect(b1.el.getAttribute('aria-expanded')).toBe('false')
    expect(b2.el.getAttribute('aria-expanded')).toBe('false')
  } finally {
    vi.unstubAllGlobals()
  }
})

it('przy zbliżeniu pierścień otacza wycinek, ukrywa miniaturę i trzyma ramkę nazwy na zewnątrz', () => {
  const { scene, camera, item, card, ring, cutPreview } = fixture()
  Object.assign(scene, { external: false, controls: { update: () => false }, keys: new Set(), lastTick: 0, lastRender: -Infinity })
  const classes = new Set<string>()
  const labelEl = {
    style: {} as Record<string, string>,
    classList: {
      toggle: (name: string, force?: boolean) => { if (force ?? !classes.has(name)) classes.add(name); else classes.delete(name) },
    },
  }
  Reflect.set(scene, 'itemLabels', new Map([[item.id, labelEl]]))
  Reflect.set(scene, 'labelWidths', new Map([[item.id, 96]]))
  scene.setSelected(item.id)

  const assertOutside = () => {
    const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(labelEl.style.transform)!
    const tx = Number(match[1]), ty = Number(match[2])
    const byMarker = classes.has('space-photo-label')
    const left = tx + (byMarker ? 13 : 8)
    const top = ty + (byMarker ? -9 : -46)
    const box = { left, top, right: left + 96, bottom: top + 37 }
    const v = card.position.clone().project(camera)
    const cx = (v.x + 1) / 2 * 600, cy = (1 - v.y) / 2 * 600
    const depth = -card.position.clone().applyMatrix4(camera.matrixWorldInverse).z
    const cardRadiusPx = (card.scale.x / depth) * camera.projectionMatrix.elements[5] * 600 / 4
    const ringRadiusPx = ring.scale.x * camera.projectionMatrix.elements[5] * 600 / 4 * (216 / 256)
    const r = Math.max(cardRadiusPx, ringRadiusPx)
    const px = Math.max(box.left, Math.min(cx, box.right))
    const py = Math.max(box.top, Math.min(cy, box.bottom))
    expect(Math.hypot(px - cx, py - cy)).toBeGreaterThanOrEqual(r)
    return card.scale.x / depth
  }

  // 1. Zbliżenie z przodu przy progress = 1.
  scene.setProgress(1)
  camera.position.set(25, 12.5, -360)
  camera.lookAt(25, 12.5, -400)
  scene.step(100)
  let cardScale = assertOutside()
  expect(ring.scale.x).toBeGreaterThan(cardScale)
  expect(ring.scale.x).toBeGreaterThanOrEqual(cardScale * 1.25)
  expect(cutPreview.visible).toBe(false)

  // 2. Zbliżenie z góry (jak „Z góry”), gdzie wektor +Y świata patrzy wzdłuż linii widzenia.
  camera.position.set(25, 42.5, -400.001)
  camera.lookAt(25, 12.5, -400)
  Reflect.set(scene, 'dirty', true)
  scene.step(116)
  cardScale = assertOutside()
  expect(ring.scale.x).toBeGreaterThanOrEqual(cardScale * 1.25)
  expect(cutPreview.visible).toBe(false)

  // 3. Zbliżenie podczas częściowego rozłożenia (byMarker = true).
  scene.setProgress(0.6)
  scene.step(132)
  const target = card.position.clone()
  camera.position.copy(target).add(new THREE.Vector3(0, 0, 35))
  camera.lookAt(target)
  Reflect.set(scene, 'dirty', true)
  scene.step(148)
  expect(classes.has('space-photo-label')).toBe(true)
  cardScale = assertOutside()
  expect(ring.scale.x).toBeGreaterThanOrEqual(cardScale * 1.25)
  expect(cutPreview.visible).toBe(false)

  // 4. Oddalenie przywraca bazowy pierścień i miniaturę podglądu.
  scene.setProgress(1)
  camera.position.set(100, 100, 400)
  camera.lookAt(0, 0, 0)
  Reflect.set(scene, 'dirty', true)
  scene.step(164)
  expect(ring.scale.x).toBe(0.05)
  expect(cutPreview.visible).toBe(true)
})
