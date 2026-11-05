// Scena three.js obserwatorium: płaszczyzna zdjęcia, gwiazdy Gaia jako punkty, wycinki jako karty z teksturą,
// oś odległości (log.) z Ziemią i ostrosłupem pola. Renderowanie na żądanie; podpisy w nakładce DOM.
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { AXIS_LENGTH, PLANE_WIDTH, depthFraction, observatoryPosition, starColor, starSize, type LogDomain, type ObservatoryItem } from '../../lib/observatory'
import { DEFAULT_ANNOTATION_COLORS } from '../../lib/catalog'
import { fmtDistance } from '../../lib/format'

export type ObservatoryView = 'structure' | 'earth' | 'top' | 'side'
/** Ziemia przed płaszczyzną zdjęcia (umownie: oś jest logarytmiczna, zero nie ma na niej miejsca). */
export const EARTH_Z = 70
const FOV = 40
const FLY_MS = 900

interface Options {
  reducedMotion: boolean
  onSelect(id: string | null): void
}

const cssColor = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
const smooth = (t: number) => t * t * (3 - 2 * t)

function cutTexture(image: HTMLImageElement, item: ObservatoryItem, color: string): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')!
  g.save()
  g.beginPath()
  g.arc(size / 2, size / 2, size / 2 - 3, 0, Math.PI * 2)
  g.clip()
  g.drawImage(image, item.x - item.radius, item.y - item.radius, item.radius * 2, item.radius * 2, 0, 0, size, size)
  g.restore()
  g.lineWidth = 4
  g.strokeStyle = color
  if (item.category === 'galaxies') {
    // Romb jak znacznik galaktyki w legendzie, na tle okrągłego wycinka.
    g.beginPath()
    g.moveTo(size / 2, 3); g.lineTo(size - 3, size / 2); g.lineTo(size / 2, size - 3); g.lineTo(3, size / 2); g.closePath()
    g.stroke()
  }
  g.beginPath()
  g.arc(size / 2, size / 2, size / 2 - 3, 0, Math.PI * 2)
  g.stroke()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function ringTexture(color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const g = canvas.getContext('2d')!
  g.strokeStyle = color
  g.lineWidth = 6
  g.beginPath()
  g.arc(64, 64, 52, 0, Math.PI * 2)
  g.stroke()
  return new THREE.CanvasTexture(canvas)
}

const starVertex = `
attribute float size;
attribute float alpha;
attribute vec3 tint;
varying vec3 vTint;
varying float vAlpha;
varying float vScale;
uniform float pixelRatio;
uniform float refDistance;
void main() {
  vTint = tint;
  vAlpha = alpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  // Z daleka punkty maleją (do 30 %) i tracą poświatę, żeby gęste pola się nie zlewały.
  vScale = clamp(refDistance / max(-mv.z, 1.0), 0.3, 1.0);
  gl_PointSize = max(1.5, size * vScale) * pixelRatio;
}`
const starFragment = `
varying vec3 vTint;
varying float vAlpha;
varying float vScale;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float core = smoothstep(1.0, 0.0, d);
  float a = pow(core, mix(3.5, 2.2, vScale)) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(mix(vTint, vec3(1.0), pow(core, 6.0)), a);
}`

export class ObservatoryScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 5000)
  private controls: OrbitControls
  private labels = document.createElement('div')
  private raf = 0
  private dirty = true
  private disposables: { dispose(): void }[] = []
  private items: ObservatoryItem[] = []
  private visible = new Set<string>()
  private selected: string | null = null
  private progress = 1
  private domain: LogDomain = { minLy: 10, maxLy: 1e4 }
  private image = { width: 1, height: 1 }
  private photo: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null
  private frame: THREE.LineLoop | null = null
  private stars: THREE.Points | null = null
  private starIndex: number[] = []
  private cards = new Map<string, THREE.Sprite>()
  private ring: THREE.Sprite
  private axis = new THREE.Group()
  private ticks: { ly: number; mesh: THREE.Mesh; label: HTMLDivElement }[] = []
  private itemLabels = new Map<string, HTMLDivElement>()
  private earthLabel: HTMLDivElement
  private flight: { from: [THREE.Vector3, THREE.Vector3]; to: [THREE.Vector3, THREE.Vector3]; t0: number; resolve?: () => void } | null = null
  private keys = new Set<string>()
  private lastTick = performance.now()
  private resizeObserver: ResizeObserver
  private accent: string

  constructor(private host: HTMLElement, private options: Options) {
    this.accent = cssColor('--accent', '#00e0ff')
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.domElement.tabIndex = 0
    this.renderer.domElement.setAttribute('aria-label', 'Scena 3D obserwatorium: przeciągnij, aby obrócić; klawisze WASD przesuwają kamerę')
    host.appendChild(this.renderer.domElement)
    this.labels.className = 'obs-labels'
    host.appendChild(this.labels)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = !options.reducedMotion
    this.controls.dampingFactor = 0.12
    this.controls.screenSpacePanning = true
    this.controls.addEventListener('start', () => { this.flight = null })
    this.controls.addEventListener('change', () => { this.dirty = true })

    const grid = new THREE.GridHelper(1, 24, cssColor('--border-strong', '#232942'), cssColor('--border', '#15192b'))
    grid.scale.set(PLANE_WIDTH * 2.4, 1, AXIS_LENGTH + EARTH_Z + 40)
    grid.position.set(0, -PLANE_WIDTH * 0.62, (EARTH_Z - AXIS_LENGTH) / 2)
    this.scene.add(grid)
    this.disposables.push(grid.geometry, grid.material as THREE.Material)

    const ringMap = ringTexture(this.accent)
    const ringMaterial = new THREE.SpriteMaterial({ map: ringMap, depthTest: false, transparent: true, sizeAttenuation: false })
    this.ring = new THREE.Sprite(ringMaterial)
    this.ring.scale.setScalar(0.05)
    this.ring.renderOrder = 10
    this.ring.visible = false
    this.scene.add(this.ring)
    this.disposables.push(ringMap, ringMaterial)

    this.scene.add(this.axis)
    this.earthLabel = this.label('obs-label obs-earth', 'Ziemia')

    const pointer = { x: 0, y: 0 }
    this.renderer.domElement.addEventListener('pointerdown', (e) => { pointer.x = e.clientX; pointer.y = e.clientY })
    this.renderer.domElement.addEventListener('pointerup', (e) => {
      if (Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) < 4) this.options.onSelect(this.pick(e.clientX, e.clientY))
    })
    this.renderer.domElement.addEventListener('keydown', this.onKeyDown)
    this.renderer.domElement.addEventListener('keyup', this.onKeyUp)
    this.renderer.domElement.addEventListener('blur', () => this.keys.clear())
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(host)
    this.resize()
    this.loop()
  }

  private label(className: string, text: string): HTMLDivElement {
    const el = document.createElement('div')
    el.className = className
    el.textContent = text
    this.labels.appendChild(el)
    return el
  }

  private resize() {
    const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight)
    this.renderer.setSize(width, height, false)
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.dirty = true
  }

  /** Zdjęcie jako płaszczyzna oraz karty wycinków i punkty gwiazd. */
  setData(image: HTMLImageElement, size: { width: number; height: number }, items: ObservatoryItem[], domain: LogDomain) {
    this.image = size
    this.items = items
    this.domain = domain
    const texture = new THREE.Texture(image)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    const planeHeight = PLANE_WIDTH * size.height / size.width
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    this.photo = new THREE.Mesh(new THREE.PlaneGeometry(PLANE_WIDTH, planeHeight), material)
    this.photo.renderOrder = -1
    this.scene.add(this.photo)
    const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, y]) => new THREE.Vector3(x * PLANE_WIDTH / 2, y * planeHeight / 2, 0))
    const frameMaterial = new THREE.LineBasicMaterial({ color: this.accent, transparent: true, opacity: 0.55 })
    this.frame = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(corners), frameMaterial)
    this.scene.add(this.frame)
    this.disposables.push(texture, material, this.photo.geometry, frameMaterial, this.frame.geometry)

    // Ziemia i ostrosłup pola: od Ziemi do narożników kadru.
    const earthPos = new THREE.Vector3(0, 0, EARTH_Z)
    const earthMaterial = new THREE.MeshBasicMaterial({ color: cssColor('--accent-2', '#155dfc') })
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 16), earthMaterial)
    earth.position.copy(earthPos)
    const halo = new THREE.Mesh(new THREE.SphereGeometry(2.4, 24, 16), new THREE.MeshBasicMaterial({ color: this.accent, transparent: true, opacity: 0.12 }))
    halo.position.copy(earthPos)
    const pyramidMaterial = new THREE.LineBasicMaterial({ color: this.accent, transparent: true, opacity: 0.35 })
    const pyramid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(corners.flatMap((c) => [earthPos, c])), pyramidMaterial)
    this.scene.add(earth, halo, pyramid)
    this.disposables.push(earthMaterial, earth.geometry, halo.geometry, halo.material as THREE.Material, pyramidMaterial, pyramid.geometry)

    // Oś linii widzenia z podziałką dekad.
    const axisMaterial = new THREE.LineDashedMaterial({ color: this.accent, dashSize: 2, gapSize: 2, transparent: true, opacity: 0.7 })
    const axisLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([earthPos, new THREE.Vector3(0, 0, -AXIS_LENGTH)]), axisMaterial)
    axisLine.computeLineDistances()
    this.axis.add(axisLine)
    const tickGeometry = new THREE.RingGeometry(1.2, 1.6, 24)
    const tickMaterial = new THREE.MeshBasicMaterial({ color: this.accent, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
    this.disposables.push(axisMaterial, axisLine.geometry, tickGeometry, tickMaterial)
    for (let k = Math.round(Math.log10(domain.minLy)); 10 ** k <= domain.maxLy * 1.0001; k++) {
      const mesh = new THREE.Mesh(tickGeometry, tickMaterial)
      this.axis.add(mesh)
      this.ticks.push({ ly: 10 ** k, mesh, label: this.label('obs-label obs-tick', fmtDistance(10 ** k)) })
    }

    // Gwiazdy: jeden obiekt Points; pozycje liczone na CPU przy zmianie postępu (≤ 1000 punktów).
    const starItems = items.map((item, i) => [item, i] as const).filter(([item]) => item.kind === 'star')
    this.starIndex = starItems.map(([, i]) => i)
    if (starItems.length) {
      const geometry = new THREE.BufferGeometry()
      const faintest = Math.max(...starItems.map(([s]) => s.gMag ?? 0))
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(starItems.length * 3), 3))
      geometry.setAttribute('tint', new THREE.BufferAttribute(new Float32Array(starItems.flatMap(([s]) => starColor(s.bpRp))), 3))
      geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(starItems.map(([s]) => starSize(s.gMag, faintest) * 1.8)), 1))
      geometry.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(starItems.length).fill(1), 1))
      const material = new THREE.ShaderMaterial({ vertexShader: starVertex, fragmentShader: starFragment, uniforms: { pixelRatio: { value: this.renderer.getPixelRatio() }, refDistance: { value: 150 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
      this.stars = new THREE.Points(geometry, material)
      this.stars.frustumCulled = false
      this.scene.add(this.stars)
      this.disposables.push(geometry, material)
    }

    for (const item of items) {
      if (item.kind !== 'object' || !item.type) continue
      // Kolor typu galaktyki (#38194c) ginie na ciemnym tle: obrys galaktyk jak znacznik w legendzie.
      const texture = cutTexture(image, item, item.category === 'galaxies' ? cssColor('--accent-dim', '#00e0ff') : DEFAULT_ANNOTATION_COLORS[item.type])
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
      const sprite = new THREE.Sprite(material)
      this.cards.set(item.id, sprite)
      this.scene.add(sprite)
      this.itemLabels.set(item.id, this.label('obs-label obs-card', `${item.id}\n${item.distLy ? `≈ ${fmtDistance(item.distLy)}` : 'odległość nieznana'}`))
      this.disposables.push(texture, material)
    }
    for (const item of items) this.visible.add(item.id)
    this.layout()
  }

  setProgress(progress: number) {
    this.progress = Math.max(0, Math.min(1, progress))
    this.layout()
  }

  setVisible(ids: Set<string>) {
    this.visible = ids
    this.layout()
  }

  setSelected(id: string | null) {
    this.selected = id
    this.layout()
  }

  private position(item: ObservatoryItem): THREE.Vector3 {
    return new THREE.Vector3(...observatoryPosition(item, this.image, item.distLy, this.domain, this.progress))
  }

  /** Położenia wszystkich elementów zależne od postępu, filtra i zaznaczenia. */
  private layout() {
    const e = smooth(this.progress)
    if (this.photo) this.photo.material.opacity = 1 - 0.82 * e
    if (this.stars) {
      const position = this.stars.geometry.getAttribute('position') as THREE.BufferAttribute
      const alpha = this.stars.geometry.getAttribute('alpha') as THREE.BufferAttribute
      this.starIndex.forEach((itemIndex, i) => {
        const item = this.items[itemIndex]
        position.setXYZ(i, ...observatoryPosition(item, this.image, item.distLy, this.domain, this.progress))
        // Na płaszczyźnie gwiazdy są już na zdjęciu; jasny punkt pojawia się wraz z rozkładaniem.
        alpha.setX(i, this.visible.has(item.id) ? 0.25 + 0.75 * e : 0)
      })
      position.needsUpdate = alpha.needsUpdate = true
    }
    const pixelScale = PLANE_WIDTH / this.image.width
    for (const item of this.items) {
      const card = this.cards.get(item.id)
      if (!card) continue
      // Przy 0 % zdjęcie pokazuje płaszczyzna; karta pojawia się wraz z rozkładaniem, a rozległe obiekty
      // (często większe od kadru) mają ograniczony rozmiar, by nie zasłaniać sceny.
      const photoSize = Math.min(item.radius * 2 * pixelScale, PLANE_WIDTH * 0.3)
      card.position.copy(this.position(item))
      card.scale.setScalar(photoSize + (Math.min(photoSize, 14) - photoSize) * e)
      card.material.opacity = Math.min(1, e * 2.5)
      card.visible = this.visible.has(item.id) && e > 0
    }
    for (const tick of this.ticks) tick.mesh.position.set(0, 0, -depthFraction(tick.ly, this.domain) * AXIS_LENGTH * e)
    this.axis.visible = e > 0.02
    const selected = this.items.find((item) => item.id === this.selected)
    this.ring.visible = !!selected && this.visible.has(selected.id)
    if (selected) this.ring.position.copy(this.position(selected))
    this.dirty = true
  }

  /** Najbliższy widoczny obiekt w promieniu 12 px od kursora. */
  pick(clientX: number, clientY: number): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const v = new THREE.Vector3()
    let best: string | null = null
    let bestScore = 1
    for (const item of this.items) {
      if (!this.visible.has(item.id)) continue
      v.copy(this.position(item)).project(this.camera)
      if (v.z > 1) continue
      const d = Math.hypot((v.x + 1) / 2 * rect.width - (clientX - rect.left), (1 - v.y) / 2 * rect.height - (clientY - rect.top))
      // Karty wycinków można trafić w całym ich obrysie; wygrywa obiekt najbliższy względem swojego zasięgu.
      const card = this.cards.get(item.id)
      const score = d / (card ? Math.max(12, this.screenRadius(card)) : 12)
      if (score < bestScore) { best = item.id; bestScore = score }
    }
    return best
  }

  private screenRadius(sprite: THREE.Sprite): number {
    const distance = this.camera.position.distanceTo(sprite.position)
    return sprite.scale.x / 2 / (2 * distance * Math.tan(THREE.MathUtils.degToRad(FOV) / 2)) * this.renderer.domElement.clientHeight
  }

  /** Granice zawartości (widoczne obiekty, płaszczyzna zdjęcia i Ziemia). */
  private bounds(includeEarth = true): THREE.Box3 {
    const box = new THREE.Box3()
    const h = PLANE_WIDTH * this.image.height / this.image.width
    box.expandByPoint(new THREE.Vector3(-PLANE_WIDTH / 2, -h / 2, 0)).expandByPoint(new THREE.Vector3(PLANE_WIDTH / 2, h / 2, 0))
    if (includeEarth) box.expandByPoint(new THREE.Vector3(0, 0, EARTH_Z))
    for (const item of this.items) if (this.visible.has(item.id) && item.distLy !== null) box.expandByPoint(this.position(item))
    return box
  }

  /** Odległość kamery, przy której prostokąt (szerokość × wysokość w płaszczyźnie ekranu) mieści się w kadrze. */
  private fitDistance(width: number, height: number): number {
    const v = THREE.MathUtils.degToRad(FOV) / 2
    const h = Math.atan(Math.tan(v) * this.camera.aspect)
    return Math.max(height / 2 / Math.tan(v), width / 2 / Math.tan(h)) * 1.12
  }

  setView(view: ObservatoryView, animate = true) {
    const box = this.bounds(view !== 'earth')
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    let position: THREE.Vector3, target: THREE.Vector3
    if (view === 'earth') {
      // Zza Ziemi, lekko nad osią: widać Ziemię, ostrosłup pola i zdjęcie w całości.
      const h = PLANE_WIDTH * this.image.height / this.image.width
      target = new THREE.Vector3(0, h * 0.08, -Math.min(size.z, AXIS_LENGTH) * 0.15)
      position = new THREE.Vector3(0, h * 0.42, EARTH_Z + this.fitDistance(PLANE_WIDTH, h) * 0.75)
    } else if (view === 'top') {
      target = center
      position = center.clone().add(new THREE.Vector3(0, this.fitDistance(size.x, size.z) + size.y / 2, 0.001))
    } else if (view === 'side') {
      target = center
      position = center.clone().add(new THREE.Vector3(this.fitDistance(size.z, size.y) + size.x / 2, 0, 0))
    } else {
      target = center
      const radius = size.length() / 2
      position = center.clone().add(new THREE.Vector3(1.05, 0.62, 0.9).normalize().multiplyScalar(radius / Math.sin(THREE.MathUtils.degToRad(FOV) / 2) * 0.9))
    }
    this.fly(position, target, animate)
  }

  flyTo(id: string) {
    const item = this.items.find((i) => i.id === id)
    if (!item) return
    const target = this.position(item)
    const direction = this.camera.position.clone().sub(this.controls.target).normalize()
    this.fly(target.clone().add(direction.multiplyScalar(PLANE_WIDTH * 0.45)), target, true)
  }

  private fly(position: THREE.Vector3, target: THREE.Vector3, animate: boolean): Promise<void> {
    if (!animate || this.options.reducedMotion) {
      this.camera.position.copy(position)
      this.controls.target.copy(target)
      this.controls.update()
      this.dirty = true
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      this.flight?.resolve?.()
      this.flight = { from: [this.camera.position.clone(), this.controls.target.clone()], to: [position, target], t0: performance.now(), resolve }
    })
  }

  /** Oddalenie przed przejściem do skali Drogi Mlecznej. */
  zoomOut(): Promise<void> {
    const target = this.controls.target.clone()
    const position = target.clone().add(this.camera.position.clone().sub(target).multiplyScalar(4))
    return this.fly(position, target, true)
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code) || e.altKey || e.ctrlKey || e.metaKey) return
    e.preventDefault()
    this.flight = null
    this.keys.add(e.code)
  }
  private onKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.code) }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop)
    const now = performance.now()
    const delta = Math.min((now - this.lastTick) / 1000, 0.05)
    this.lastTick = now
    if (this.flight) {
      const k = Math.min(1, (now - this.flight.t0) / FLY_MS)
      const e = 1 - (1 - k) ** 3
      this.camera.position.lerpVectors(this.flight.from[0], this.flight.to[0], e)
      this.controls.target.lerpVectors(this.flight.from[1], this.flight.to[1], e)
      this.dirty = true
      if (k >= 1) { this.flight.resolve?.(); this.flight = null }
    }
    if (this.keys.size) {
      const forward = this.camera.getWorldDirection(new THREE.Vector3())
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion)
      const move = new THREE.Vector3()
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) move.add(forward)
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) move.sub(forward)
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) move.add(right)
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) move.sub(right)
      if (move.lengthSq()) {
        move.normalize().multiplyScalar(Math.max(this.camera.position.distanceTo(this.controls.target) * 0.6, 5) * delta)
        this.camera.position.add(move)
        this.controls.target.add(move)
        this.dirty = true
      }
    }
    // update() zwraca true, gdy tłumienie nadal porusza kamerą.
    if (this.controls.update() || this.dirty) this.render()
  }

  private render() {
    this.dirty = false
    this.renderer.render(this.scene, this.camera)
    this.placeLabels()
  }

  private placeLabels() {
    const width = this.renderer.domElement.clientWidth, height = this.renderer.domElement.clientHeight
    const v = new THREE.Vector3()
    const place = (el: HTMLElement, world: THREE.Vector3, show: boolean) => {
      v.copy(world).project(this.camera)
      const on = show && v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2
      el.style.display = on ? '' : 'none'
      if (on) el.style.transform = `translate(${((v.x + 1) / 2 * width).toFixed(1)}px, ${((1 - v.y) / 2 * height).toFixed(1)}px)`
    }
    const e = smooth(this.progress)
    place(this.earthLabel, new THREE.Vector3(0, -4.5, EARTH_Z), true)
    for (const tick of this.ticks) place(tick.label, tick.mesh.position, e > 0.3)
    for (const item of this.items) {
      const el = this.itemLabels.get(item.id)
      const isSelected = item.id === this.selected
      if (!el) continue
      const card = this.cards.get(item.id)!
      el.classList.toggle('selected', isSelected)
      // Obiekty bez odległości zostają na zdjęciu; w przestrzeni ich podpis tylko po zaznaczeniu.
      place(el, card.position.clone().add(new THREE.Vector3(0, card.scale.y / 2, 0)), this.visible.has(item.id) && (item.distLy !== null || e < 0.3 || isSelected))
    }
    let starLabel = this.labels.querySelector<HTMLDivElement>('.obs-star')
    const selected = this.items.find((item) => item.id === this.selected && item.kind === 'star')
    if (selected) {
      starLabel ??= this.label('obs-label obs-card obs-star selected', '')
      starLabel.textContent = `${selected.id.replace('Gaia DR3 ', 'Gaia ')}\n${selected.distLy ? `≈ ${fmtDistance(selected.distLy)}` : 'brak odległości'}`
      place(starLabel, this.position(selected), this.visible.has(selected.id))
    } else if (starLabel) starLabel.style.display = 'none'
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    for (const d of this.disposables) d.dispose()
    this.renderer.dispose()
    // dispose() nie zwalnia kontekstu WebGL; bez tego kolejne otwarcia wypierałyby kontekst Space3D.
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
    this.labels.remove()
  }
}
