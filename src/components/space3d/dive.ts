// Sterownik nurkowania: jedna pętla requestAnimationFrame ustawia w tej samej klatce pozę i krycia obu scen
// (Droga Mleczna lub Wszechświat lokalny pod spodem, przezroczyste Obserwatorium nad nią) i rysuje je jedną po drugiej.
// Dwa płótna zostawiają każdej scenie jej renderer i render na żądanie; wspólny znacznik czasu klatki usuwa drganie na szwie.
import * as THREE from 'three'
import type { Vec3 } from '../../lib/astro'
import { EARTH_Z, PLANE_WIDTH } from '../../lib/observatory'
import { SPACE_FAR, SPACE_FOV } from '../../lib/spaceCamera'
import {
  ALIGN_K, coneLength, coneTan, diveFades, diveFrame, diveGridScale, diveMarkerPosition, diveScale, divePose, diveTotalMs, ease, guideAlignment, guideRollWeight, lerpPose, makeBridge, nearFar, startScale, turnWeight, unbridgePoint, unbridgeVector, uprightRoll,
  type Bridge, type DiveDirection, type DiveFrame, type DivePhase, type Pose,
} from '../../lib/spaceDive'
import type { ObservatoryScene } from '../observatory/scene'
import type { Space3DHandle } from '../Space3D'
import type { PhotoGuide } from './photoGuide'
import { setEarthOpacity } from './earthModel'

/** Na końcu nurkowania 1 jednostka Obserwatorium ≈ 1 lś: sąsiednie obiekty rozlatują się poza kadr. */
const END_SCALE = 0.001
/** Najdłuższy krok czasu przejścia w jednej klatce (ok. 30 kl./s). */
const MAX_STEP_MS = 33
const OBSERVATORY_FOV = 40
const UP: Vec3 = [0, 1, 0]
/** Promień Ziemi Obserwatorium (jednostki sceny). */
const EARTH_RADIUS = 1.5
type SpacePose = Pose & { fov?: number; near?: number }

export interface DiveOptions {
  direction: DiveDirection
  space: Space3DHandle
  guide: PhotoGuide | null
  /** Scena Obserwatorium; null, dopóki nie powstanie (nurkowanie czeka wtedy na starcie). */
  observatory(): ObservatoryScene | null
  /** Poza szwu: widok Obserwatorium „Struktura”, w który wchodzi most z Drogi Mlecznej. */
  seam: { position: Vec3; target: Vec3 }
  markerTargets: ReadonlyMap<string, Vec3>
  seamProgress: number
  /** Proporcje zdjęcia (wysokość / szerokość) dla kąta ostrosłupa. */
  imageAspect: number
  /** Powrót: poza sceny 3D sprzed wejścia. */
  spacePose?: SpacePose
  onPhase(phase: DivePhase): void
  /** Pierwsza gotowa klatka Obserwatorium ma już pozę i krycia przejścia; można odsłonić płótno. */
  onObservatoryFrame(): void
  onDone(): void
}

export interface DiveDev {
  /** Zatrzymanie przejścia w chwili t (0–1 czasu przejścia w jego kierunku); null wznawia. */
  freeze(t: number | null): void
  /** Szew: środek i promień Ziemi oraz kierunek linii widzenia na ekranie w obu scenach (piksele, stopnie). */
  seam(): { space: [number, number]; observatory: [number, number]; spaceAngle: number; observatoryAngle: number; spaceEarthPx: number; observatoryEarthPx: number } | null
  /** Promień Ziemi Drogi Mlecznej na ekranie (piksele) w bieżącej klatce. */
  earthPx(): number
  /** Odległość kamery Drogi Mlecznej od Ziemi (tys. lś). */
  distance(): number
}

export class SpaceDive {
  private raf = 0
  /** Czas przejścia w ms: suma kroków klatek, każdy najwyżej MAX_STEP_MS (zacięcie zatrzymuje ruch zamiast przeskoku). */
  private elapsed = 0
  private last: number | null = null
  private phase: DivePhase | null = null
  private frozen: number | null = null
  private skipping = false
  private finished = false
  private observatoryStarted = false
  private readonly bridge: Bridge | null
  private readonly roll: number
  private readonly real: [number, number]
  private readonly pyramid: [number, number]
  /** Poza sceny 3D na krańcu ustawienia (naprzód: bieżąca; wstecz: zapamiętana przy wejściu). */
  readonly spacePose: SpacePose
  private obsEnd: { position: Vec3; target: Vec3 } | null = null

  constructor(private o: DiveOptions) {
    const { space, guide } = o
    this.real = guide?.fieldTan ?? [1, 1]
    this.pyramid = [PLANE_WIDTH / 2 / EARTH_Z, PLANE_WIDTH * o.imageAspect / 2 / EARTH_Z]
    this.spacePose = o.spacePose ?? { position: space.camera.position.toArray() as Vec3, target: space.controls.target.toArray() as Vec3, up: space.camera.up.toArray() as Vec3, fov: space.camera.fov, near: space.camera.near }
    this.roll = guide ? uprightRoll(guide.basis, this.spacePose.up) : 0
    this.bridge = guide ? makeBridge(space.sunPos.toArray() as Vec3, guide.basis, [0, 0, EARTH_Z], this.roll) : null
    guide?.setVisible(true)
    space.stopIntro()
    space.setExternal(true)
    space.override.camera = true
    space.controls.enabled = false
    if (import.meta.env.DEV) (window as unknown as { __spaceDive?: DiveDev }).__spaceDive = { freeze: (t) => { this.frozen = t }, seam: () => this.seamCheck(), earthPx: () => this.spaceEarthPx(), distance: () => this.o.space.camera.position.distanceTo(this.o.space.sunPos) }
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
    const { guide } = this.o
    if (!obs || !guide) return null
    const { camera, mount, sunPos } = this.o.space
    const obsCamera = obs.getPose().position
    const obsEarthPx = EARTH_RADIUS / (Math.hypot(obsCamera[0], obsCamera[1], obsCamera[2] - EARTH_Z) * Math.tan(THREE.MathUtils.degToRad(OBSERVATORY_FOV) / 2)) * mount.clientHeight / 2
    const screen = (p: THREE.Vector3): [number, number] => { const v = p.clone().project(camera); return [(v.x + 1) / 2 * mount.clientWidth, (1 - v.y) / 2 * mount.clientHeight] }
    // Punkt 100 jednostek Obserwatorium przed Ziemią na osi i jego odpowiednik w skali końca nurkowania.
    const ahead = sunPos.clone().addScaledVector(new THREE.Vector3(...guide.basis.center), 100 * END_SCALE)
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
    const step = Math.min(MAX_STEP_MS, Math.max(0, now - (this.last ?? now)))
    this.last = now
    // Scena Obserwatorium musi stać przed nurkowaniem: do tego czasu kamera sceny 3D stoi.
    if (this.o.direction === 'in' && !obs?.ready) this.elapsed = 0
    else this.elapsed += step
    const total = diveTotalMs(this.o.direction)
    const elapsed = this.skipping ? total : this.frozen !== null ? this.frozen * total : this.elapsed
    const f = diveFrame(elapsed, this.o.direction)
    const seam: Pose = { ...this.o.seam, up: UP }
    if (f.phase !== this.phase) {
      this.phase = f.phase
      // Naprzód kamera Obserwatorium zostaje w widoku Struktura (wsuwają się tylko panele); wstecz wraca do niego z bieżącej pozy.
      if (f.phase === 'enter' && obs) this.obsEnd = this.o.direction === 'in' ? seam : obs.getPose()
      // W fazie wejścia scena 3D nie rysuje klatek: zostaje w stanie końca nurkowania (wszystko wygaszone),
      // także po przeskoku lub zgubionych klatkach.
      if (f.phase === 'enter') this.fadeSpace(1)
      this.o.onPhase(f.phase)
    }
    const spaceView = f.phase === 'dive' ? this.applySpace(f, seam, now) : null
    if (obs?.ready) {
      this.applyObservatory(obs, f, seam, now, spaceView)
      if (!this.observatoryStarted) {
        this.observatoryStarted = true
        this.o.onObservatoryFrame()
      }
    }
    if (f.done && !this.finished && (obs?.ready || this.o.direction === 'out')) this.finish(obs)
  }

  private applySpace({ e, k }: DiveFrame, seam: Pose, now: number) {
    const { space, guide } = this.o
    if (!guide || !this.bridge) {
      this.fadeSpace(k)
      space.invalidate()
      space.step(now)
      return null
    }
    const { camera, controls } = space
    // Start z bieżącej kamery: skala mostu daje tę samą odległość od Ziemi, więc nie ma oddalania na początku.
    const u0 = startScale(this.spacePose, this.bridge, seam, END_SCALE)
    const pose = divePose(this.spacePose, this.bridge, seam, { e, k }, u0, END_SCALE)
    // Ten sam obrót (z k) dla pozy, pola widzenia, Ziemi i stożka: inaczej sceny rozjadą się po ALIGN_K.
    const w = turnWeight(k)
    const fov = THREE.MathUtils.lerp(this.spacePose.fov ?? SPACE_FOV, OBSERVATORY_FOV, w)
    const u = diveScale(e, u0, END_SCALE)
    // Ziemia przechodzi płynnie od znacznika (do 16 px) do Ziemi Obserwatorium w skali mostu: na szwie oba się pokrywają.
    space.override.earthRadius = EARTH_RADIUS * u
    space.override.earthBlend = w
    this.fadeSpace(k)
    const [tx, ty] = coneTan(k, this.real, this.pyramid)
    const depthScale = coneLength(k, guide.length, u) / guide.length
    guide.cone.scale.set(tx * depthScale, ty * depthScale, depthScale)
    guide.setConeRoll(this.roll * guideRollWeight(k))
    guide.alignSightLine(guideAlignment(k), u)
    guide.placeMarkers((id, position) => {
      const target = this.o.markerTargets.get(id)
      return target ? diveMarkerPosition(this.bridge!, position, target, k, u0, u) : position
    })
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
    if (k >= ALIGN_K || guideAlignment(k) === 0) return null
    // Przed wyrównaniem scen siatkę rysujemy z tej samej kamery co stożek.
    return {
      position: unbridgePoint(this.bridge, pose.position, u),
      target: unbridgePoint(this.bridge, pose.target, u),
      up: unbridgeVector(this.bridge, pose.up),
      fov,
    }
  }

  /** Krycia warstw sceny 3D (k: liniowy czas nurkowania) bez rysowania klatki (na wejściu: wszystko wygaszone,
   *  także podpisy w DOM). */
  private fadeSpace(k: number) {
    const { space, guide } = this.o
    const fades = diveFades(k)
    space.override.layerFade = fades.layers
    // Warstwy wygaszane w Space3D z odległości kamery mnożą swoje krycie przez te dwa (podpisy gasną szybciej).
    space.override.labelFade = Math.min(fades.layers, fades.labels)
    fadeLayers(space, guide, fades.layers, fades.labels)
    if (space.earth) {
      setEarthOpacity(space.earth, fades.spaceEarth)
      space.earth.visible = fades.spaceEarth > 0
    }
    guide?.setOpacity(fades.guide, fades.cone, fades.coneFaces, fades.spaceAxis)
  }

  private applyObservatory(obs: ObservatoryScene, { phase, k, photoProgress }: DiveFrame, seam: Pose, now: number, spaceView: (Pose & { fov: number }) | null) {
    obs.setExternal(true)
    obs.setInteractive(false)
    obs.setProgress(this.o.seamProgress * photoProgress)
    if (phase === 'enter') {
      const end = this.obsEnd ?? seam
      const t = ease(k)
      const pose = lerpPose(seam, { ...end, up: UP }, t)
      obs.setPose(pose.position, pose.target)
      obs.setFade({ earth: 1, pyramid: 1, axis: 1, photo: 1, grid: 1 }, k)
    } else {
      const fades = diveFades(k)
      const view = spaceView ?? seam
      obs.setPose(view.position, view.target, view.up, spaceView?.fov)
      const grid = this.o.guide ? fades.grid : fades.earth
      const gridScale = this.o.guide ? diveGridScale(k) : 1
      obs.setFade({ earth: fades.earth, pyramid: fades.pyramid, axis: fades.axis, photo: fades.photo, grid }, 0, gridScale)
    }
    obs.step(now)
  }

  private finish(obs: ObservatoryScene | null) {
    this.finished = true
    this.cancel()
    const { space, guide } = this.o
    if (this.o.direction === 'in') {
      // Scena 3D zostaje wstrzymana pod spodem (stan zdjęcia: bez klatek).
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

/** Krycie warstw tła sceny 3D (bez znaczników/wycinków zdjęcia i Ziemi) i osobno napisów; bazowe krycie zapamiętane w materiale. */
function fadeLayers(space: Space3DHandle, guide: PhotoGuide | null, fade: number, labels = fade) {
  space.scene.traverse((object) => {
    if ((space.earth && (object === space.earth || isInside(object, space.earth))) || (guide && (object === guide.group || isInside(object, guide.group)))) return
    const material = (object as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
    const f = object instanceof THREE.Sprite ? Math.min(fade, labels) : fade
    for (const m of Array.isArray(material) ? material : material ? [material] : []) {
      if (m instanceof THREE.ShaderMaterial && m.uniforms.opacity) {
        m.uniforms.opacity.value = f
        continue
      }
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

/** Stan sceny 3D sprzed nurkowania: poza, pole widzenia, płaszczyzny, krycia i własna pętla. */
export function restoreSpace(space: Space3DHandle, guide: PhotoGuide | null, pose: SpacePose | null) {
  const { camera, controls } = space
  space.override.camera = false
  space.override.earthRadius = null
  space.override.earthBlend = 0
  space.override.layerFade = 1
  space.override.labelFade = 1
  fadeLayers(space, guide, 1)
  if (guide) {
    guide.setOpacity(1, 1, 1)
    guide.cone.scale.set(guide.fieldTan[0], guide.fieldTan[1], 1)
    guide.alignSightLine(0, 1)
    guide.setConeRoll(0)
    guide.placeMarkers()
  }
  if (space.earth) {
    setEarthOpacity(space.earth, 1)
    space.earth.visible = true
  }
  camera.up.set(...(pose?.up ?? UP))
  if (pose) {
    // Usuń ruch bezwładny sprzed nurkowania, zanim ustawisz zapamiętaną kamerę.
    const damping = controls.enableDamping
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = damping
    camera.position.set(...pose.position)
    controls.target.set(...pose.target)
  }
  camera.fov = pose?.fov ?? SPACE_FOV
  camera.near = pose?.near ?? 0.1
  camera.far = SPACE_FAR
  camera.updateProjectionMatrix()
  camera.lookAt(controls.target)
  controls.enabled = true
  controls.update()
  space.invalidate()
  space.setExternal(false)
}
