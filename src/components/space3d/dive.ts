// Sterownik nurkowania: jedna pętla requestAnimationFrame ustawia w tej samej klatce pozę i krycia obu scen
// (Droga Mleczna pod spodem, przezroczyste Obserwatorium nad nią) i rysuje je jedną po drugiej. Dwa płótna
// zostawiają każdej scenie jej renderer i render na żądanie; wspólny znacznik czasu klatki usuwa drganie na szwie.
import * as THREE from 'three'
import type { Vec3 } from '../../lib/astro'
import { EARTH_Z, PLANE_WIDTH } from '../../lib/observatory'
import {
  DIVE_PHASE_MS, DIVE_TOTAL_MS, bridgePose, coneTan, diveFades, diveFrame, diveScale, ease, lerpPose, makeBridge, nearFar,
  type DiveDirection, type DivePhase, type Pose,
} from '../../lib/spaceDive'
import type { ObservatoryScene } from '../observatory/scene'
import type { Space3DHandle } from '../Space3D'
import type { PhotoGuide } from './photoGuide'

/** Kamera Drogi Mlecznej na początku nurkowania: ok. 40 tys. lś za Ziemią (widać dysk). */
const START_DISTANCE_KLY = 40
/** Na końcu nurkowania 1 jednostka Obserwatorium ≈ 1 lś: sąsiednie obiekty rozlatują się poza kadr. */
const END_SCALE = 0.001
const SPACE_FOV = 50
const OBSERVATORY_FOV = 40
const UP: Vec3 = [0, 1, 0]
/** Promień Ziemi Obserwatorium (jednostki sceny). */
const EARTH_RADIUS = 1.5

export interface DiveOptions {
  direction: DiveDirection
  space: Space3DHandle
  guide: PhotoGuide
  /** Scena Obserwatorium; null, dopóki nie powstanie (kamera czeka wtedy w pozie szwu na końcu ustawienia). */
  observatory(): ObservatoryScene | null
  /** Poza szwu: widok Obserwatorium „Struktura” (płaskie zdjęcie, Ziemia, oś), w który wchodzi most z Drogi Mlecznej. */
  seam: { position: Vec3; target: Vec3 }
  /** Proporcje zdjęcia (wysokość / szerokość) dla kąta ostrosłupa. */
  imageAspect: number
  /** Powrót: poza Drogi Mlecznej sprzed wejścia i postęp rozkładania zwijany do 0. */
  spacePose?: Pose
  progress?: number
  onPhase(phase: DivePhase): void
  onDone(): void
}

export interface DiveDev {
  /** Zatrzymanie przejścia w chwili t (0–1 czasu przejścia w jego kierunku); null wznawia. */
  freeze(t: number | null): void
  /** Szew: środek i promień Ziemi oraz kierunek linii widzenia na ekranie w obu scenach (piksele, stopnie). */
  seam(): { space: [number, number]; observatory: [number, number]; spaceAngle: number; observatoryAngle: number; spaceEarthPx: number; observatoryEarthPx: number } | null
  /** Promień Ziemi Drogi Mlecznej na ekranie (piksele) w bieżącej klatce. */
  earthPx(): number
}

export class SpaceDive {
  private raf = 0
  private t0: number | null = null
  private phase: DivePhase | null = null
  private frozen: number | null = null
  private skipping = false
  private finished = false
  private readonly bridge
  private readonly real: [number, number]
  private readonly pyramid: [number, number]
  /** Poza Drogi Mlecznej na krańcu ustawienia (naprzód: bieżąca; wstecz: zapamiętana przy wejściu). */
  readonly spacePose: Pose
  private obsEnd: { position: Vec3; target: Vec3 } | null = null
  private obsProgress: number
  private earthMaterial: THREE.Material | null

  constructor(private o: DiveOptions) {
    const { space, guide } = o
    this.bridge = makeBridge(space.sunPos.toArray() as Vec3, guide.basis, [0, 0, EARTH_Z])
    this.real = guide.fieldTan
    this.pyramid = [PLANE_WIDTH / 2 / EARTH_Z, PLANE_WIDTH * o.imageAspect / 2 / EARTH_Z]
    this.spacePose = o.spacePose ?? { position: space.camera.position.toArray() as Vec3, target: space.controls.target.toArray() as Vec3, up: space.camera.up.toArray() as Vec3 }
    this.obsProgress = o.progress ?? 0
    this.earthMaterial = space.earth ? space.earth.material as THREE.Material : null
    space.stopIntro()
    space.setExternal(true)
    space.override.camera = true
    space.controls.enabled = false
    if (this.earthMaterial) this.earthMaterial.transparent = true
    if (import.meta.env.DEV) (window as unknown as { __spaceDive?: DiveDev }).__spaceDive = { freeze: (t) => { this.frozen = t }, seam: () => this.seamCheck(), earthPx: () => this.spaceEarthPx() }
    this.raf = requestAnimationFrame(this.loop)
  }

  /** Klik lub klawisz w trakcie przejścia: od razu stan końcowy. */
  skip() { this.skipping = true }

  /** Esc (zamknięcie okna) albo przebudowa sceny: przerwanie bez przywracania (sceny i tak znikają lub wracają). */
  cancel() {
    cancelAnimationFrame(this.raf)
    if (import.meta.env.DEV) delete (window as unknown as { __spaceDive?: DiveDev }).__spaceDive
  }

  private spaceEarthPx(): number {
    const { camera, mount, sunPos, earth } = this.o.space
    if (!earth) return 0
    const radius = (earth.geometry as THREE.SphereGeometry).parameters.radius * earth.scale.x
    return radius / (camera.position.distanceTo(sunPos) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) * mount.clientHeight / 2
  }

  private seamCheck(): ReturnType<DiveDev['seam']> {
    const obs = this.o.observatory()
    if (!obs) return null
    const { camera, mount, sunPos } = this.o.space
    const obsCamera = obs.getPose().position
    const obsEarthPx = EARTH_RADIUS / (Math.hypot(obsCamera[0], obsCamera[1], obsCamera[2] - EARTH_Z) * Math.tan(THREE.MathUtils.degToRad(OBSERVATORY_FOV) / 2)) * mount.clientHeight / 2
    const screen = (p: THREE.Vector3): [number, number] => { const v = p.clone().project(camera); return [(v.x + 1) / 2 * mount.clientWidth, (1 - v.y) / 2 * mount.clientHeight] }
    // Punkt 100 jednostek Obserwatorium przed Ziemią na osi i jego odpowiednik w skali końca nurkowania.
    const ahead = sunPos.clone().addScaledVector(new THREE.Vector3(...this.o.guide.basis.center), 100 * END_SCALE)
    const space = screen(sunPos), spaceAhead = screen(ahead)
    const observatory = obs.screenPoint([0, 0, EARTH_Z]), obsAhead = obs.screenPoint([0, 0, EARTH_Z - 100])
    const angle = (a: [number, number], b: [number, number]) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI
    return { space, observatory, spaceAngle: angle(space, spaceAhead), observatoryAngle: angle(observatory, obsAhead), spaceEarthPx: this.spaceEarthPx(), observatoryEarthPx: obsEarthPx }
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop)
    this.frame(now)
  }

  private frame(now: number) {
    const obs = this.o.observatory()
    this.t0 ??= now
    let elapsed = this.skipping ? DIVE_TOTAL_MS : this.frozen !== null ? this.frozen * DIVE_TOTAL_MS : now - this.t0
    // Scena Obserwatorium musi stać przed nurkowaniem: do tego czasu kamera czeka w pozie szwu.
    if (this.o.direction === 'in' && !obs && elapsed > DIVE_PHASE_MS.setup) {
      elapsed = DIVE_PHASE_MS.setup
      this.t0 = now - elapsed
    }
    const f = diveFrame(elapsed, this.o.direction)
    const seam: Pose = { ...this.o.seam, up: UP }
    if (f.phase !== this.phase) {
      this.phase = f.phase
      // Naprzód kamera Obserwatorium zostaje w widoku Struktura (wsuwają się tylko panele); wstecz wraca do niego z bieżącej pozy.
      if (f.phase === 'enter' && obs) this.obsEnd = this.o.direction === 'in' ? seam : obs.getPose()
      // W fazie wejścia Droga Mleczna nie rysuje klatek: zostaje w stanie końca nurkowania (wszystko wygaszone),
      // także po przeskoku lub zgubionych klatkach.
      if (f.phase === 'enter') this.fadeSpace(1)
      this.o.onPhase(f.phase)
    }
    if (f.phase !== 'enter') this.applySpace(f.phase, f.k, f.e, seam, now)
    if (obs) this.applyObservatory(obs, f.phase, f.k, f.e, seam, now)
    if (f.done && !this.finished && (obs || this.o.direction === 'out')) this.finish(obs)
  }

  private applySpace(phase: DivePhase, k: number, e: number, seam: Pose, now: number) {
    const { space, guide } = this.o
    const { camera, controls } = space
    const u0 = START_DISTANCE_KLY / Math.hypot(seam.position[0], seam.position[1], seam.position[2] - EARTH_Z)
    let pose: Pose
    let fov = OBSERVATORY_FOV
    if (phase === 'setup') {
      const t = ease(k)
      pose = lerpPose(this.spacePose, bridgePose(this.bridge, seam, u0), t)
      fov = SPACE_FOV + (OBSERVATORY_FOV - SPACE_FOV) * t
    } else pose = bridgePose(this.bridge, seam, diveScale(e, u0, END_SCALE))
    const u = diveScale(e, u0, END_SCALE)
    // W nurkowaniu Ziemia ma promień Ziemi Obserwatorium w skali mostu (na szwie oba znaczniki się pokrywają);
    // w ustawieniu wielkość przechodzi płynnie od znacznika (do 16 px) do tej wartości.
    space.override.earthRadius = EARTH_RADIUS * u
    space.override.earthBlend = phase === 'dive' ? 1 : ease(k)
    this.fadeSpace(e)
    const [tx, ty] = coneTan(e, this.real, this.pyramid)
    guide.cone.scale.set(tx, ty, 1)
    camera.up.set(...pose.up)
    camera.position.set(...pose.position)
    controls.target.set(...pose.target)
    camera.lookAt(controls.target)
    const { near, far } = nearFar(camera.position.distanceTo(space.sunPos))
    camera.near = near
    camera.far = far
    camera.fov = fov
    camera.updateProjectionMatrix()
    space.invalidate()
    space.step(now)
  }

  /** Krycia warstw Drogi Mlecznej bez rysowania klatki (na wejściu: wszystko wygaszone, także podpisy w DOM). */
  private fadeSpace(e: number) {
    const { space, guide } = this.o
    const fades = diveFades(e)
    space.override.layerFade = fades.layers
    fadeLayers(space, guide, fades.layers, fades.labels)
    if (this.earthMaterial) this.earthMaterial.opacity = fades.spaceEarth
    if (space.earth) space.earth.visible = fades.spaceEarth > 0
    guide.setOpacity(fades.guide, fades.cone)
  }

  private applyObservatory(obs: ObservatoryScene, phase: DivePhase, k: number, e: number, seam: Pose, now: number) {
    obs.setExternal(true)
    obs.setInteractive(false)
    if (phase === 'enter') {
      const end = this.obsEnd ?? seam
      const t = ease(k)
      const pose = lerpPose(seam, { ...end, up: UP }, t)
      obs.setPose(pose.position, pose.target)
      obs.setFade({ earth: 1, pyramid: 1, axis: 1, photo: 1, grid: 1 })
      if (this.o.direction === 'out') obs.setProgress(this.obsProgress * t)
    } else {
      const fades = diveFades(e)
      obs.setPose(seam.position, seam.target)
      obs.setFade({ earth: fades.earth, pyramid: fades.pyramid, axis: fades.axis, photo: fades.photo, grid: fades.grid })
      obs.setProgress(0)
    }
    obs.step(now)
  }

  private finish(obs: ObservatoryScene | null) {
    this.finished = true
    this.cancel()
    const { space, guide } = this.o
    if (this.o.direction === 'in') {
      // Droga Mleczna zostaje wstrzymana pod spodem (stan zdjęcia: bez klatek).
      if (obs) {
        obs.setFade({ earth: 1, pyramid: 1, axis: 1, photo: 1, grid: 1 })
        obs.setInteractive(true)
        obs.setExternal(false)
      }
    } else {
      restoreSpace(space, guide, this.spacePose)
    }
    this.o.onDone()
  }
}

/** Krycie warstw tła Drogi Mlecznej (bez znaczników zdjęcia i Ziemi) i osobno napisów; bazowe krycie zapamiętane w materiale. */
function fadeLayers(space: Space3DHandle, guide: PhotoGuide, fade: number, labels = fade) {
  space.scene.traverse((object) => {
    if (object === guide.group || object === space.earth || isInside(object, guide.group)) return
    const material = (object as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
    const f = object instanceof THREE.Sprite ? Math.min(fade, labels) : fade
    for (const m of Array.isArray(material) ? material : material ? [material] : []) {
      if (!m.transparent) continue
      m.userData.layerBase ??= m.opacity
      m.opacity = (m.userData.layerBase as number) * f
    }
  })
  space.overlay.style.opacity = String(fade)
}

function isInside(object: THREE.Object3D, group: THREE.Object3D): boolean {
  for (let p = object.parent; p; p = p.parent) if (p === group) return true
  return false
}

/** Stan Drogi Mlecznej sprzed nurkowania: poza, pole widzenia, płaszczyzny, krycia i własna pętla. */
export function restoreSpace(space: Space3DHandle, guide: PhotoGuide | null, pose: Pose | null) {
  const { camera, controls } = space
  space.override.camera = false
  space.override.earthRadius = null
  space.override.earthBlend = 0
  space.override.layerFade = 1
  if (guide) {
    fadeLayers(space, guide, 1)
    guide.setOpacity(1, 1)
    guide.cone.scale.set(guide.fieldTan[0], guide.fieldTan[1], 1)
  }
  if (space.earth) {
    const material = space.earth.material as THREE.Material
    material.opacity = 1
    material.transparent = false
    space.earth.visible = true
  }
  camera.up.set(...UP)
  if (pose) {
    camera.position.set(...pose.position)
    controls.target.set(...pose.target)
  }
  camera.fov = SPACE_FOV
  camera.near = 0.1
  camera.far = 5000
  camera.updateProjectionMatrix()
  camera.lookAt(controls.target)
  controls.enabled = true
  controls.update()
  space.invalidate()
  space.setExternal(false)
}
