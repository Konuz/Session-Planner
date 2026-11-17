// Scena three.js obserwatorium: płaszczyzna zdjęcia, gwiazdy Gaia jako punkty, wycinki jako karty z teksturą,
// oś odległości (log.) z Ziemią i ostrosłupem pola. Renderowanie na żądanie; podpisy w nakładce DOM.
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { AXIS_DASH, AXIS_LENGTH, EARTH_Z, OBSERVATORY_FOV as FOV, PLANE_WIDTH, byDistance, depthFraction, earthViewPose, fitDistance, observatoryPosition, orbitOffset, starColor, starSize, structureViewPose, type LogDomain, type ObservatoryItem } from '../../lib/observatory'
import { DEFAULT_ANNOTATION_COLORS, type ObjectType } from '../../lib/catalog'
import { fmtDistance, fmtDistanceRange } from '../../lib/format'
import { objectCount, overlapGroups, type LabelBox } from '../../lib/labelGroups'
import { photoCropSquare } from '../../lib/photo'
import { GALACTIC_LIMIT_LY } from '../../lib/space3d'
import { openLabelFan, type LabelFan } from '../labelFan'
import { createEarthAssets, createEarthMesh, setEarthOpacity, type EarthAssets } from '../space3d/earthModel'
import { glyphSprite, glyphTexture } from '../space3d/markerGlyphs'
import { MARK, MARK_PROJECTION_Y } from '../space3d/photoGuide'

export type ObservatoryView = 'structure' | 'earth' | 'top' | 'side'
/** Krycia części sceny w nurkowaniu z Drogi Mlecznej (1: bez zmian). */
export interface ObservatoryFade { earth: number; pyramid: number; axis: number; photo: number; grid: number }
type Vec3 = [number, number, number]
const FLY_MS = 900
const GRID_WIDTH = PLANE_WIDTH * 2.4
const GRID_DEPTH = AXIS_LENGTH + EARTH_Z + 40
const GRID_FRONT = EARTH_Z + 20
/** Podpis wycinka (.obs-card): dwa wiersze 13,5 px z ramką, lewy górny róg względem punktu, szerokość znaku kroju 10 px. */
const LABEL_HEIGHT = 37
const LABEL_DX = 8
const LABEL_DY = -46
const CHAR_PX = 6.1

interface Options {
  reducedMotion: boolean
  onSelect(id: string | null): void
  /** Start bez własnej pętli (scena powstaje w trakcie nurkowania, klatki rysuje sterujący). */
  external?: boolean
}

const cssColor = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
const smooth = (t: number) => t * t * (3 - 2 * t)
const isGalactic = (item: ObservatoryItem) => item.distLy !== null && item.distLy < GALACTIC_LIMIT_LY

function cutTexture(image: HTMLImageElement, item: ObservatoryItem, color: string): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')!
  g.save()
  g.beginPath()
  g.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2)
  g.clip()
  g.fillStyle = '#060b14'
  g.fillRect(0, 0, size, size)
  if (isGalactic(item)) g.filter = 'brightness(1.45)'
  // Canvas skraca także prostokąt docelowy, gdy obszar źródłowy wychodzi poza zdjęcie.
  const { x, y, side } = photoCropSquare(item, image.naturalWidth, image.naturalHeight)
  g.drawImage(image, x, y, side, side, 0, 0, size, size)
  g.restore()
  g.lineWidth = 4
  g.strokeStyle = color
  g.beginPath()
  g.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
  g.stroke()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function ringTexture(color: string, highlight = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const g = canvas.getContext('2d')!
  if (highlight) {
    g.beginPath()
    g.arc(64, 64, 53, 0, Math.PI * 2)
    g.strokeStyle = '#060b14'
    g.lineWidth = 4
    g.stroke()
  }
  g.beginPath()
  g.arc(64, 64, 52, 0, Math.PI * 2)
  g.strokeStyle = color
  g.lineWidth = highlight ? 2 : 6
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
  private layoutDirty = true
  private sizedWidth = 0
  private sizedHeight = 0
  /** Rozmiar bufora rysowania (setSize) i liczba kolejnych klatek bez zmiany rozmiaru płótna. */
  private bufferWidth = 0
  private bufferHeight = 0
  private steadyFrames = 0
  private disposables: { dispose(): void }[] = []
  /** Obiekty i zasoby danych zdjęcia: podmieniane przy setData bez nowego kontekstu WebGL (utrata kontekstu
   *  w trakcie pracy okna daje na D3D11 białą klatkę wszystkich płócien WebGL strony). */
  private data = new THREE.Group()
  private dataDisposables: { dispose(): void }[] = []
  private photoTexture: THREE.Texture | null = null
  private photoImage: HTMLImageElement | null = null
  private earthAssets: EarthAssets | null = null
  private items: ObservatoryItem[] = []
  private visible = new Set<string>()
  private selected: string | null = null
  private progress = 1
  private arrival = 1
  private domain: LogDomain = { minLy: 10, maxLy: 1e4 }
  private image = { width: 1, height: 1 }
  private photo: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null
  private frame: THREE.LineLoop | null = null
  private grid: THREE.GridHelper
  private earth: THREE.Mesh | null = null
  private pyramid: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null
  private axisLine: THREE.Line<THREE.BufferGeometry, THREE.LineDashedMaterial> | null = null
  private tickMaterial: THREE.MeshBasicMaterial | null = null
  private fade: ObservatoryFade = { earth: 1, pyramid: 1, axis: 1, photo: 1, grid: 1 }
  /** Klatki z zewnątrz (nurkowanie): własna pętla stoi, pozę i krycia ustawia sterujący. */
  private external = false
  private stars: THREE.Points | null = null
  /** Stan, z którego policzono bufory gwiazd (null: do przeliczenia). */
  private starState: { progress: number; photo: number; visible: Set<string> } | null = null
  private starIndex: number[] = []
  private cards = new Map<string, THREE.Sprite>()
  private anchors = new Map<string, THREE.Sprite>()
  private ring: THREE.Sprite
  private cutPreview: THREE.Sprite
  private axis = new THREE.Group()
  private ticks: { ly: number; mesh: THREE.Mesh; label: HTMLDivElement }[] = []
  private itemLabels = new Map<string, HTMLDivElement>()
  private labelWidths = new Map<string, number>()
  /** Plakietki grup nakładających się podpisów (pula) i skład grupy każdej z nich w bieżącej klatce. */
  private badges: { el: HTMLButtonElement; text: string; ids: string[]; x: number; y: number }[] = []
  /** Otwarty wachlarz nazw grupy; ramię pod kursorem podświetla kartę w scenie. */
  private fan: LabelFan | null = null
  private hovered: string | null = null
  private earthLabel: HTMLDivElement
  /** t0: czas pierwszej klatki lotu z requestAnimationFrame (nie performance.now() z chwili kliknięcia, wcześniejszej lub późniejszej). */
  private flight: { offset: [THREE.Vector3Tuple, THREE.Vector3Tuple]; target: [THREE.Vector3, THREE.Vector3]; t0: number | null; resolve?: () => void } | null = null
  private keys = new Set<string>()
  private lastTick = performance.now()
  private resizeObserver: ResizeObserver
  private accent: string

  constructor(private host: HTMLElement, private options: Options) {
    this.accent = cssColor('--accent', '#00e0ff')
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.domElement.tabIndex = 0
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.renderer.domElement.setAttribute('aria-label', 'Scena 3D obserwatorium: przeciągnij, aby obrócić; klawisze WASD przesuwają kamerę')
    host.appendChild(this.renderer.domElement)
    this.labels.className = 'obs-labels'
    host.appendChild(this.labels)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = !options.reducedMotion
    this.controls.dampingFactor = 0.12
    this.controls.screenSpacePanning = true
    this.controls.addEventListener('start', () => { this.flight = null; this.closeFan() })
    this.controls.addEventListener('change', () => { this.dirty = true })

    const grid = this.grid = new THREE.GridHelper(1, 24, cssColor('--border-strong', '#232942'), cssColor('--border', '#15192b'))
    ;(grid.material as THREE.LineBasicMaterial).transparent = true
    grid.scale.set(GRID_WIDTH, 1, GRID_DEPTH)
    grid.position.set(0, -PLANE_WIDTH * 0.62, GRID_FRONT - GRID_DEPTH / 2)
    this.scene.add(grid)
    this.disposables.push(grid.geometry, grid.material as THREE.Material)

    const ringMap = ringTexture(this.accent, true)
    const ringMaterial = new THREE.SpriteMaterial({ map: ringMap, depthTest: false, depthWrite: false, transparent: true, sizeAttenuation: false })
    this.ring = new THREE.Sprite(ringMaterial)
    this.ring.scale.setScalar(0.05)
    this.ring.renderOrder = 10
    this.ring.visible = false
    const previewMaterial = new THREE.SpriteMaterial({ depthTest: false, depthWrite: false, transparent: true, sizeAttenuation: false })
    this.cutPreview = new THREE.Sprite(previewMaterial)
    // Obraz zachodzi pod kreskę pierścienia, bez szczeliny przy jego krawędzi.
    this.cutPreview.scale.setScalar(this.ring.scale.x * 0.82)
    this.cutPreview.renderOrder = 9
    this.cutPreview.visible = false
    this.scene.add(this.ring, this.cutPreview)
    this.disposables.push(ringMap, ringMaterial, previewMaterial)

    this.scene.add(this.axis, this.data)
    const earthLight = new THREE.DirectionalLight(0xfff8ee, 2.1)
    earthLight.position.set(12, 16, EARTH_Z + 18)
    earthLight.target.position.set(0, 0, EARTH_Z)
    this.scene.add(new THREE.AmbientLight(0xcfe4ff, 0.65), earthLight, earthLight.target)
    this.earthLabel = this.label('obs-label obs-earth', 'Ziemia')

    const pointer = { x: 0, y: 0 }
    // Kliknięcie obok otwartego wachlarza tylko go zamyka (bez zmiany zaznaczenia).
    let dismissed = false
    this.renderer.domElement.addEventListener('pointerdown', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; dismissed = !!this.fan; this.closeFan() })
    this.renderer.domElement.addEventListener('pointerup', (e) => {
      if (!dismissed && Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) < 4) this.options.onSelect(this.pick(e.clientX, e.clientY))
    })
    this.renderer.domElement.addEventListener('keydown', this.onKeyDown)
    this.renderer.domElement.addEventListener('keyup', this.onKeyUp)
    this.renderer.domElement.addEventListener('blur', () => this.keys.clear())
    // Po rAF obserwator nie czyści ponownie już dopasowanego bufora. Zmiana po rAF nadal dostaje klatkę przed odmalowaniem.
    // Klatki z zewnątrz (nurkowanie) same dopasowują rozmiar w step(): obserwator rysowałby drugą klatkę w tej samej.
    this.resizeObserver = new ResizeObserver(() => { if (!this.external && this.resize()) this.render() })
    this.resizeObserver.observe(host)
    this.resize()
    this.external = options.external ?? false
    if (!this.external) this.loop(performance.now())
  }

  private label(className: string, text: string): HTMLDivElement {
    const el = document.createElement('div')
    el.className = className
    el.textContent = text
    this.labels.appendChild(el)
    return el
  }

  /**
   * Dopasowanie do rozmiaru płótna. W przejściu (defer) panele okna zmieniają go co klatkę: wtedy tylko proporcje kamery
   * (CSS zmniejsza bieżący bufor), a dokładny bufor rysowania dopiero po dwóch klatkach bez zmiany. Rosnące płótno
   * (zwijanie paneli w powrocie) dostaje bufor z zapasem 25 %, żeby nie było rozmyte do końca przejścia. setSize
   * co klatkę przydzielał bufor od nowa przez całe wsuwanie paneli.
   */
  private resize(defer = false) {
    const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight)
    const changed = width !== this.sizedWidth || height !== this.sizedHeight
    this.steadyFrames = changed ? 0 : this.steadyFrames + 1
    if (changed) {
      this.sizedWidth = width
      this.sizedHeight = height
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
      this.closeFan()
      this.dirty = true
    }
    if ((width !== this.bufferWidth || height !== this.bufferHeight) && (!defer || this.steadyFrames >= 2)) {
      this.bufferWidth = width
      this.bufferHeight = height
      this.renderer.setSize(width, height, false)
      this.dirty = true
      return true
    }
    if (defer && (width > this.bufferWidth || height > this.bufferHeight)) {
      if (width > this.bufferWidth) this.bufferWidth = Math.ceil(width * 1.25)
      if (height > this.bufferHeight) this.bufferHeight = Math.ceil(height * 1.25)
      this.renderer.setSize(this.bufferWidth, this.bufferHeight, false)
      this.dirty = true
      return true
    }
    return changed
  }

  /** Zdjęcie jako płaszczyzna oraz karty wycinków i punkty gwiazd. */
  /** Scena gotowa do pokazania: dane wczytane, tekstury na GPU, shadery skompilowane (bez blokowania klatki). */
  ready = false

  setData(image: HTMLImageElement, size: { width: number; height: number }, items: ObservatoryItem[], domain: LogDomain, plane: ImageBitmap | null = null, colors: Partial<Record<ObjectType, string>> = {}) {
    this.clearData()
    this.image = size
    this.items = items
    this.domain = domain
    // Ta sama klatka zdjęcia (np. po pobraniu gwiazd Gaia) nie wysyła tekstury na GPU drugi raz.
    if (this.photoImage !== image) {
      this.photoTexture?.dispose()
      this.photoTexture = new THREE.Texture(plane ?? image)
      // Bitmapa jest już odwrócona (imageOrientation: 'flipY'); WebGL nie odwraca bitmap przy wysyłce.
      if (plane) this.photoTexture.flipY = false
      this.photoTexture.colorSpace = THREE.SRGBColorSpace
      this.photoTexture.needsUpdate = true
      this.photoImage = image
    }
    const texture = this.photoTexture!
    const planeHeight = PLANE_WIDTH * size.height / size.width
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    this.photo = new THREE.Mesh(new THREE.PlaneGeometry(PLANE_WIDTH, planeHeight), material)
    this.photo.renderOrder = -1
    this.data.add(this.photo)
    const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([x, y]) => new THREE.Vector3(x * PLANE_WIDTH / 2, y * planeHeight / 2, 0))
    const frameMaterial = new THREE.LineBasicMaterial({ color: this.accent, transparent: true, opacity: 0.55 })
    this.frame = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(corners), frameMaterial)
    this.data.add(this.frame)
    this.dataDisposables.push(material, this.photo.geometry, frameMaterial, this.frame.geometry)

    // Ziemia i ostrosłup pola: od Ziemi do narożników kadru.
    const earthPos = new THREE.Vector3(0, 0, EARTH_Z)
    const assets = this.earthAssets ??= createEarthAssets(import.meta.env.BASE_URL, this.renderer.capabilities.getMaxAnisotropy(), () => { this.dirty = true })
    const rig = createEarthMesh(1.5, assets)
    const earth = this.earth = rig.mesh
    earth.position.copy(earthPos)
    const pyramidMaterial = new THREE.LineBasicMaterial({ color: this.accent, transparent: true, opacity: 0.35 })
    const pyramid = this.pyramid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(corners.flatMap((c) => [earthPos, c])), pyramidMaterial)
    this.data.add(earth, pyramid)
    this.dataDisposables.push(...rig.disposables, pyramidMaterial, pyramid.geometry)

    // Oś linii widzenia z podziałką dekad.
    const axisMaterial = new THREE.LineDashedMaterial({ color: this.accent, dashSize: AXIS_DASH, gapSize: AXIS_DASH, transparent: true, opacity: 0.7 })
    const axisLine = this.axisLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([earthPos, new THREE.Vector3(0, 0, -AXIS_LENGTH)]), axisMaterial)
    axisLine.computeLineDistances()
    this.axis.add(axisLine)
    const tickGeometry = new THREE.RingGeometry(1.2, 1.6, 24)
    const tickMaterial = this.tickMaterial = new THREE.MeshBasicMaterial({ color: this.accent, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
    this.dataDisposables.push(axisMaterial, axisLine.geometry, tickGeometry, tickMaterial)
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
      this.data.add(this.stars)
      this.dataDisposables.push(geometry, material)
    }

    const anchorTextures = new Map<ObjectType, THREE.CanvasTexture>()
    for (const item of items) {
      if (item.kind !== 'object' || !item.type) continue
      const color = colors[item.type] ?? DEFAULT_ANNOTATION_COLORS[item.type]
      const texture = cutTexture(image, item, color)
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
      const sprite = new THREE.Sprite(material)
      // Jasne punkty Gaia rysujemy przed wycinkami leżącymi w tym samym polu Drogi Mlecznej.
      if (isGalactic(item)) sprite.renderOrder = 1
      this.cards.set(item.id, sprite)
      this.data.add(sprite)
      if (item.distLy !== null && Number.isFinite(item.distLy) && item.distLy > 0) {
        let anchorMap = anchorTextures.get(item.type)
        if (!anchorMap) {
          anchorMap = glyphTexture(item.type, color)
          anchorTextures.set(item.type, anchorMap)
          this.dataDisposables.push(anchorMap)
        }
        const anchor = glyphSprite(anchorMap)
        this.dataDisposables.push(anchor.material)
        this.anchors.set(item.id, anchor)
        this.data.add(anchor)
      }
      const distance = `≈ ${fmtDistance(item.distLy)}`
      this.itemLabels.set(item.id, this.label('obs-label obs-card', `${item.id}\n${distance}`))
      this.labelWidths.set(item.id, Math.max(item.id.length, distance.length) * CHAR_PX + 16)
      this.dataDisposables.push(texture, material)
    }
    for (const item of items) this.visible.add(item.id)
    this.layout()
    // Wysyłka tekstur (zdjęcie ma kilka megapikseli) i kompilacja shaderów od razu, przy budowie sceny: inaczej
    // dzieje się to w pierwszej klatce, w której zdjęcie staje się widoczne (w nurkowaniu ok. 100 ms w ruchu).
    this.renderer.initTexture(texture)
    for (const card of this.cards.values()) if (card.material.map) this.renderer.initTexture(card.material.map)
    for (const anchorMap of anchorTextures.values()) this.renderer.initTexture(anchorMap)
    this.ready = false
    const token = ++this.dataToken
    void this.renderer.compileAsync(this.scene, this.camera).catch(() => {}).then(() => { if (token === this.dataToken) { this.ready = true; this.dirty = true } })
  }

  private dataToken = 0

  /** Usunięcie danych poprzedniego zdjęcia (obiekty, zasoby, podpisy); renderer i kontekst zostają. */
  private clearData() {
    this.closeFan()
    for (const badge of this.badges) badge.el.remove()
    this.badges = []
    this.labelWidths.clear()
    this.data.clear()
    this.axis.clear()
    for (const d of this.dataDisposables) d.dispose()
    this.dataDisposables = []
    for (const tick of this.ticks) tick.label.remove()
    for (const label of this.itemLabels.values()) label.remove()
    this.labels.querySelector('.obs-star')?.remove()
    this.ticks = []
    this.itemLabels.clear()
    this.cards.clear()
    this.cutPreview.visible = false
    this.cutPreview.material.map = null
    this.anchors.clear()
    this.visible.clear()
    this.stars = null
    this.starState = null
    this.starIndex = []
    this.photo = this.frame = this.earth = this.pyramid = this.axisLine = null
    this.tickMaterial = null
  }

  setProgress(progress: number) {
    const next = Math.max(0, Math.min(1, progress))
    if (next === this.progress) return
    this.progress = next
    this.closeFan()
    this.layoutDirty = this.dirty = true
  }

  setVisible(ids: Set<string>) {
    this.visible = ids
    this.closeFan()
    this.layoutDirty = this.dirty = true
  }

  setSelected(id: string | null) {
    this.selected = id
    this.layoutDirty = this.dirty = true
  }

  private position(item: ObservatoryItem): THREE.Vector3 {
    return new THREE.Vector3(...observatoryPosition(item, this.image, item.distLy, this.domain, this.progress))
  }

  /** Położenia wszystkich elementów zależne od postępu, filtra i zaznaczenia. */
  private layout() {
    this.layoutDirty = false
    const e = smooth(this.progress)
    const arrival = smooth(this.arrival)
    const f = this.fade
    if (this.photo) {
      this.photo.material.opacity = (1 - 0.82 * e * arrival) * f.photo
      this.photo.visible = this.frame!.visible = f.photo > 0
      ;(this.frame!.material as THREE.LineBasicMaterial).opacity = 0.55 * f.photo
    }
    ;(this.grid.material as THREE.LineBasicMaterial).opacity = f.grid
    this.grid.visible = f.grid > 0
    if (this.earth) { setEarthOpacity(this.earth, f.earth); this.earth.visible = f.earth > 0 }
    if (this.pyramid) { this.pyramid.material.opacity = 0.35 * f.pyramid; this.pyramid.visible = f.pyramid > 0 }
    if (this.axisLine) this.axisLine.material.opacity = 0.7 * f.axis
    if (this.tickMaterial) this.tickMaterial.opacity = 0.6 * f.axis
    // Krycia nurkowania zmieniają się co klatkę przy stałym postępie: pozycje gwiazd tylko po zmianie postępu.
    const stars = this.starState
    const moved = stars?.progress !== this.progress
    if (this.stars && (moved || stars?.photo !== f.photo || stars?.visible !== this.visible)) {
      const position = this.stars.geometry.getAttribute('position') as THREE.BufferAttribute
      const alpha = this.stars.geometry.getAttribute('alpha') as THREE.BufferAttribute
      this.starIndex.forEach((itemIndex, i) => {
        const item = this.items[itemIndex]
        if (moved) position.setXYZ(i, ...observatoryPosition(item, this.image, item.distLy, this.domain, this.progress))
        // Na płaszczyźnie gwiazdy są już na zdjęciu; jasny punkt pojawia się wraz z rozkładaniem.
        alpha.setX(i, this.visible.has(item.id) ? (0.25 + 0.75 * e) * f.photo : 0)
      })
      position.needsUpdate ||= moved
      alpha.needsUpdate = true
      this.starState = { progress: this.progress, photo: f.photo, visible: this.visible }
    }
    const pixelScale = PLANE_WIDTH / this.image.width
    const anchorOpacity = (1 - arrival) * f.photo
    const anchorScale = MARK * MARK_PROJECTION_Y / this.camera.projectionMatrix.elements[5]
    for (const item of this.items) {
      const card = this.cards.get(item.id)
      if (!card) continue
      // Przy 0 % zdjęcie pokazuje płaszczyzna; karta pojawia się wraz z rozkładaniem, a rozległe obiekty
      // (często większe od kadru) mają ograniczony rozmiar, by nie zasłaniać sceny.
      const photoSize = Math.min(item.radius * 2 * pixelScale, PLANE_WIDTH * 0.3)
      const destination = this.position(item)
      const anchor = this.anchors.get(item.id)
      if (anchor) {
        anchor.position.copy(destination)
        anchor.scale.setScalar(anchorScale)
        anchor.material.opacity = anchorOpacity
        anchor.visible = this.visible.has(item.id) && this.arrival < 1 && anchorOpacity > 0
      }
      card.position.copy(destination)
      // Lecąca tekstura jest obrazem wycinka. Pozycję obiektu wskazuje nieruchomy znacznik.
      card.position.z *= arrival
      card.scale.setScalar(photoSize + (Math.min(photoSize, 14) - photoSize) * e * arrival)
      card.material.opacity = Math.min(1, e * (isGalactic(item) ? 4 : 2.5)) * smooth(Math.min(1, this.arrival * 3)) * f.photo
      card.visible = this.visible.has(item.id) && e > 0 && card.material.opacity > 0
    }
    for (const tick of this.ticks) tick.mesh.position.set(0, 0, -depthFraction(tick.ly, this.domain) * AXIS_LENGTH * e)
    // Oś zostaje po przejęciu linii widzenia, także przy płaskim zdjęciu. Podziałka pojawia się po rozłożeniu.
    this.axis.visible = f.axis > 0
    for (const tick of this.ticks) tick.mesh.visible = e > 0.02
    // Pierścień wskazuje zaznaczenie, a przy otwartym wachlarzu obiekt ramienia pod kursorem.
    const marked = this.hovered ?? this.selected
    const selected = this.items.find((item) => item.id === marked)
    this.ring.material.opacity = f.photo
    this.ring.visible = f.photo > 0 && !!selected && this.visible.has(selected.id)
    if (selected) this.ring.position.copy(this.position(selected))
    const preview = this.cutPreview
    const map = this.ring.visible && selected && (this.hovered !== null || isGalactic(selected))
      ? this.cards.get(selected.id)?.material.map ?? null
      : null
    preview.visible = map !== null
    if (map) {
      if (!preview.material.map) preview.material.needsUpdate = true
      preview.material.map = map
      preview.material.opacity = f.photo
      preview.position.copy(this.ring.position)
    }
    this.dirty = true
  }

  /** Najbliższy widoczny obiekt w promieniu 12 px od kursora. */
  pick(clientX: number, clientY: number): string | null {
    if (this.layoutDirty) this.layout()
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

  /** Granice zawartości po pełnym rozłożeniu (widoczne obiekty, płaszczyzna zdjęcia i Ziemia): kadr nie zależy
   *  od suwaka, więc rozkładanie po ustawieniu widoku nie wynosi obiektów poza kadr. */
  private bounds(includeEarth = true): THREE.Box3 {
    const box = new THREE.Box3()
    const h = PLANE_WIDTH * this.image.height / this.image.width
    box.expandByPoint(new THREE.Vector3(-PLANE_WIDTH / 2, -h / 2, 0)).expandByPoint(new THREE.Vector3(PLANE_WIDTH / 2, h / 2, 0))
    if (includeEarth) box.expandByPoint(new THREE.Vector3(0, 0, EARTH_Z))
    for (const item of this.items) if (this.visible.has(item.id) && item.distLy !== null) box.expandByPoint(new THREE.Vector3(...observatoryPosition(item, this.image, item.distLy, this.domain, 1)))
    return box
  }

  private fitDistance(width: number, height: number): number {
    return fitDistance(width, height, this.camera.aspect)
  }

  setView(view: ObservatoryView, animate = true) {
    const pose = this.viewPose(view)
    this.fly(new THREE.Vector3(...pose.position), new THREE.Vector3(...pose.target), animate)
  }

  /** Poza kamery widoku (bez przelotu). */
  viewPose(view: ObservatoryView): { position: Vec3; target: Vec3 } {
    const box = this.bounds(view !== 'earth')
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    let position: THREE.Vector3, target: THREE.Vector3
    if (view === 'earth') {
      const pose = earthViewPose(this.image, this.camera.aspect, size.z)
      target = new THREE.Vector3(...pose.target)
      position = new THREE.Vector3(...pose.position)
    } else if (view === 'top') {
      target = center
      position = center.clone().add(new THREE.Vector3(0, this.fitDistance(size.x, size.z) + size.y / 2, 0.001))
    } else if (view === 'side') {
      target = center
      position = center.clone().add(new THREE.Vector3(this.fitDistance(size.z, size.y) + size.x / 2, 0, 0))
    } else {
      // Ta sama poza co szew nurkowania z Drogi Mlecznej (widoczne obiekty, pełne rozłożenie).
      return structureViewPose(this.items.filter((item) => this.visible.has(item.id)), this.image, this.domain)
    }
    return { position: position.toArray() as Vec3, target: target.toArray() as Vec3 }
  }

  /** Punkt sceny na ekranie (piksele płótna). */
  screenPoint(p: Vec3): [number, number] {
    const v = new THREE.Vector3(...p).project(this.camera)
    return [(v.x + 1) / 2 * this.renderer.domElement.clientWidth, (1 - v.y) / 2 * this.renderer.domElement.clientHeight]
  }

  get aspect(): number {
    return this.camera.aspect
  }

  getProgress(): number {
    return this.progress
  }

  getPose(): { position: Vec3; target: Vec3 } {
    return { position: this.camera.position.toArray() as Vec3, target: this.controls.target.toArray() as Vec3 }
  }

  /** Poza ustawiana z zewnątrz (nurkowanie), bez przelotu i tłumienia. */
  setPose(position: Vec3, target: Vec3, up: Vec3 = [0, 1, 0], fov = FOV) {
    this.flight = null
    this.camera.up.set(...up)
    this.setFov(fov)
    this.camera.position.set(...position)
    this.controls.target.set(...target)
    this.camera.lookAt(this.controls.target)
    this.dirty = true
  }

  private setFov(fov: number) {
    if (fov === this.camera.fov) return
    this.camera.fov = fov
    this.camera.updateProjectionMatrix()
  }

  setFade(fade: Partial<ObservatoryFade>, arrival = 1, gridScale = 1) {
    this.arrival = arrival
    const depth = GRID_DEPTH * gridScale
    this.grid.scale.set(GRID_WIDTH * Math.sqrt(gridScale), 1, depth)
    this.grid.position.z = GRID_FRONT - depth / 2
    this.fade = { ...this.fade, ...fade }
    this.layoutDirty = this.dirty = true
  }

  setInteractive(on: boolean) {
    if (!on) this.closeFan()
    this.labels.classList.toggle('inert', !on)
    this.controls.enabled = on
    this.renderer.domElement.style.pointerEvents = on ? '' : 'none'
  }

  /** Klatki z zewnątrz: własna pętla stoi, klatkę rysuje step(now) z czasem requestAnimationFrame sterującego. */
  setExternal(on: boolean) {
    if (on === this.external) return
    this.external = on
    this.closeFan()
    cancelAnimationFrame(this.raf)
    this.layoutDirty = this.dirty = true
    if (!on) {
      this.camera.up.set(0, 1, 0)
      this.setFov(FOV)
      this.raf = requestAnimationFrame(this.loop)
    }
  }

  /** Liczba narysowanych klatek (pomiar renderowania na żądanie). */
  get frames(): number {
    return this.renderer.info.render.frame
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
    this.closeFan()
    // Bezwładność obrotu sprzed lotu zerowana bez ruchu kamery: inaczej tłumienie dokładałoby ją do toru lotu.
    const from = this.camera.position.clone(), fromTarget = this.controls.target.clone()
    const damping = this.controls.enableDamping
    this.controls.enableDamping = false
    this.controls.update()
    this.controls.enableDamping = damping
    this.camera.position.copy(from)
    this.controls.target.copy(fromTarget)
    return new Promise((resolve) => {
      this.flight?.resolve?.()
      const offset = (p: THREE.Vector3, t: THREE.Vector3) => p.clone().sub(t).toArray([0, 0, 0])
      this.flight = { offset: [offset(from, fromTarget), offset(position, target)], target: [fromTarget, target], t0: null, resolve }
    })
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code) || e.altKey || e.ctrlKey || e.metaKey) return
    e.preventDefault()
    this.flight = null
    this.closeFan()
    this.keys.add(e.code)
  }
  private onKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.code) }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop)
    this.step(now)
  }

  step(now: number, foreground?: { object: THREE.Object3D; camera: THREE.Camera }) {
    this.resize(this.external)
    if (this.external) {
      if (this.dirty || foreground) this.render()
      if (foreground) {
        const autoClear = this.renderer.autoClear
        this.renderer.autoClear = false
        try {
          this.renderer.render(foreground.object, foreground.camera)
        } finally {
          this.renderer.autoClear = autoClear
        }
      }
      return
    }
    const delta = Math.min(Math.max(0, now - this.lastTick) / 1000, 0.05)
    this.lastTick = now
    if (this.flight) {
      this.flight.t0 ??= now
      const k = Math.min(1, Math.max(0, now - this.flight.t0) / FLY_MS)
      const e = 1 - (1 - k) ** 3
      // Kamera po sferze wokół przesuwanego celu: obrót i zmiana wysokości kończą się razem.
      this.controls.target.lerpVectors(this.flight.target[0], this.flight.target[1], e)
      this.camera.position.set(...orbitOffset(this.flight.offset[0], this.flight.offset[1], e)).add(this.controls.target)
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
    if (this.layoutDirty) this.layout()
    this.dirty = false
    this.renderer.render(this.scene, this.camera)
    this.placeLabels()
  }

  private placeLabels() {
    const width = this.renderer.domElement.clientWidth, height = this.renderer.domElement.clientHeight
    const v = new THREE.Vector3()
    const place = (el: HTMLElement, world: THREE.Vector3, show: boolean): [number, number] | null => {
      v.copy(world).project(this.camera)
      const on = show && v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2
      el.style.display = on ? '' : 'none'
      if (!on) return null
      const x = (v.x + 1) / 2 * width, y = (1 - v.y) / 2 * height
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
      return [x, y]
    }
    const e = smooth(this.progress)
    this.earthLabel.style.opacity = String(this.fade.earth)
    this.labels.style.setProperty('--obs-photo-fade', String(this.fade.photo))
    place(this.earthLabel, new THREE.Vector3(0, -4.5, EARTH_Z), this.fade.earth > 0)
    for (const tick of this.ticks) {
      tick.label.style.opacity = String(this.fade.axis)
      place(tick.label, tick.mesh.position, e > 0.3 && this.fade.axis > 0)
    }
    const shown: { item: ObservatoryItem; el: HTMLDivElement; x: number; y: number }[] = []
    const boxes: LabelBox[] = []
    for (const item of this.items) {
      const el = this.itemLabels.get(item.id)
      const isSelected = item.id === this.selected
      if (!el) continue
      const card = this.cards.get(item.id)!
      el.classList.toggle('selected', isSelected)
      // W scenie są tylko obiekty z ustaloną odległością (observatoryItems).
      const anchor = this.anchors.get(item.id)
      const labelPosition = anchor?.visible ? anchor.position : card.position
      const at = place(el, labelPosition.clone().add(new THREE.Vector3(0, card.scale.y / 2, 0)), this.visible.has(item.id))
      if (!at) continue
      const left = at[0] + LABEL_DX, top = at[1] + LABEL_DY
      shown.push({ item, el, x: at[0], y: at[1] })
      boxes.push({ left, top, right: left + (this.labelWidths.get(item.id) ?? 0), bottom: top + LABEL_HEIGHT })
    }
    // Stos nakładających się podpisów zastępuje jedna plakietka grupy; podpis zaznaczonego obiektu zostaje.
    const groups = overlapGroups(boxes).filter((group) => group.length > 1)
    groups.forEach((group, i) => {
      const members = group.map((index) => shown[index])
      for (const { item, el } of members) if (item.id !== this.selected) el.style.display = 'none'
      const badge = this.badges[i] ??= this.badge(i)
      const distances = members.map(({ item }) => item.distLy).filter((d): d is number => d !== null)
      const text = `${objectCount(members.length)}\n${distances.length ? fmtDistanceRange(Math.min(...distances), Math.max(...distances)) : ''}`
      if (text !== badge.text) badge.el.textContent = badge.text = text
      badge.ids = members.map(({ item }) => item.id)
      badge.x = members.reduce((sum, m) => sum + m.x, 0) / members.length
      badge.y = members.reduce((sum, m) => sum + m.y, 0) / members.length
      // Tuż nad środkiem grupy (nad najwyższym podpisem bywałaby daleko od kart, gdy grupa jest rozciągnięta w pionie).
      badge.el.style.display = ''
      badge.el.style.transform = `translate(${badge.x.toFixed(1)}px, ${(badge.y + LABEL_DY + LABEL_HEIGHT).toFixed(1)}px) translate(-50%, -100%)`
    })
    for (let i = groups.length; i < this.badges.length; i++) this.badges[i].el.style.display = 'none'
    this.fan?.setSelected(this.selected)
    let starLabel = this.labels.querySelector<HTMLDivElement>('.obs-star')
    const selected = this.items.find((item) => item.id === this.selected && item.kind === 'star')
    if (selected) {
      starLabel ??= this.label('obs-label obs-card obs-star selected', '')
      starLabel.textContent = `${selected.id.replace('Gaia DR3 ', 'Gaia ')}\n≈ ${fmtDistance(selected.distLy)}`
      place(starLabel, this.position(selected), this.visible.has(selected.id))
    } else if (starLabel) starLabel.style.display = 'none'
  }

  private badge(index: number) {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'obs-label obs-group'
    el.title = 'Pokaż obiekty grupy'
    el.addEventListener('click', () => { const badge = this.badges[index]; this.openFan(badge.ids, badge.x, badge.y) })
    this.labels.appendChild(el)
    return { el, text: '', ids: [] as string[], x: 0, y: 0 }
  }

  /** Wachlarz nazw grupy wokół punktu ekranu: ramiona wg odległości, zgodnie z ruchem wskazówek zegara. */
  private openFan(ids: string[], x: number, y: number) {
    this.closeFan()
    const image = this.photoImage?.src
    const { width, height } = this.image
    const entries = this.items.filter((item) => ids.includes(item.id)).sort(byDistance)
      .map((item) => ({
        id: item.id,
        text: `${item.id} · ${fmtDistance(item.distLy)}`,
        cutout: image && item.kind === 'object' ? { image, width, height, x: item.x, y: item.y, radius: item.radius } : undefined,
      }))
    this.fan = openLabelFan(this.labels, entries, x, y, this.sizedWidth, this.sizedHeight, {
      hover: (id) => { this.hovered = id; this.layoutDirty = this.dirty = true },
      pick: (id) => this.options.onSelect(id),
      closed: () => { this.fan = null; this.layoutDirty = this.dirty = true },
    })
    this.fan.setSelected(this.selected)
    this.dirty = true
  }

  private closeFan() { this.fan?.close() }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.clearData()
    this.photoTexture?.dispose()
    this.earthAssets?.dispose()
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
