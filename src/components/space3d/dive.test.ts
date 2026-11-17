import * as THREE from 'three'
import { expect, it } from 'vitest'
import { ALIGN_K, DIVE_PHASE_MS, diveFades } from '../../lib/spaceDive'
import { SpaceDive, collectLayers, restoreSpace } from './dive'

it('odsłania obserwatorium dopiero po pierwszej gotowej klatce sterowanej przejściem', () => {
  const events: string[] = []
  const observatory = {
    ready: false,
    setExternal() {}, setInteractive() {}, setProgress() {}, setPose() {}, setFade() {},
    step() { events.push('render') },
  }
  // Pętla i przygotowanie scen WebGL są poza tym testem; przechodzimy przez prawdziwe klatki sterownika.
  const dive: SpaceDive = Object.create(SpaceDive.prototype)
  Object.assign(dive, {
    elapsed: 0, last: null, phase: null, frozen: null, skipping: false, finished: false,
    applySpace: () => null,
    o: {
      direction: 'in', seam: { position: [0, 0, 200], target: [0, 0, 0] }, seamProgress: 1,
      observatory: () => observatory,
      onPhase() {}, onDone() {}, onObservatoryFrame: () => events.push('reveal'),
    },
  })
  const frame = Reflect.get(dive, 'frame') as (now: number) => void
  frame.call(dive, 0)
  expect(events).toEqual([])
  observatory.ready = true
  frame.call(dive, 16)
  expect(events).toEqual(['render', 'reveal'])
  frame.call(dive, 32)
  expect(events).toEqual(['render', 'reveal', 'render'])
})

it('w klatkach z siatką rysuje znaczniki na płótnie Obserwatorium nad siatką', () => {
  const markers = new THREE.Group().add(new THREE.Sprite())
  const group = new THREE.Group().add(markers)
  const camera = new THREE.PerspectiveCamera()
  const spaceVisibility: boolean[] = []
  const foregrounds: unknown[] = []
  const observatory = {
    ready: true,
    setExternal() {}, setInteractive() {}, setProgress() {}, setPose() {}, setFade() {},
    step(_now: number, foreground?: { object: THREE.Object3D; camera: THREE.Camera }) {
      if (foreground) expect(foreground.object.visible).toBe(true)
      foregrounds.push(foreground)
    },
  }
  const dive: SpaceDive = Object.create(SpaceDive.prototype)
  Object.assign(dive, {
    elapsed: 0, last: null, phase: null, frozen: null, skipping: false, finished: false,
    applySpace() { spaceVisibility.push(markers.visible); return null },
    o: {
      direction: 'in', space: { camera }, guide: { group, markers },
      seam: { position: [0, 0, 200], target: [0, 0, 0] }, seamProgress: 1,
      observatory: () => observatory, onPhase() {}, onDone() {}, onObservatoryFrame() {},
    },
  })
  const frame = Reflect.get(dive, 'frame') as (now: number) => void
  const { dive: diveMs, enter: enterMs } = DIVE_PHASE_MS.in
  for (const [i, k] of [0.2, 0.56, 0.8, 0.98].entries()) {
    Object.assign(dive, { frozen: k * diveMs / (diveMs + enterMs) })
    frame.call(dive, i * 16)
    expect(markers.visible).toBe(true)
  }
  expect(spaceVisibility).toEqual([true, false, false, true])
  expect(foregrounds).toEqual([undefined, { object: markers, camera }, { object: markers, camera }, undefined])
})

it('zdjęcie Obserwatorium rozkłada się dopiero w fazie wejścia', () => {
  const obsProgress: number[] = []
  const phases: string[] = []
  const observatory = {
    ready: true,
    setExternal() {}, setInteractive() {},
    setProgress(p: number) { obsProgress.push(p) },
    setPose() {}, setFade() {}, step() {},
  }
  const space = {
    scene: new THREE.Scene(),
    overlay: { style: { opacity: '1' } },
    earth: null,
    override: { camera: false, layerFade: 1, earthRadius: null, earthBlend: 0 },
    invalidate() {},
    step() {},
  }
  const dive: SpaceDive = Object.create(SpaceDive.prototype)
  Object.assign(dive, {
    elapsed: 0, last: null, phase: null, frozen: null, skipping: false, finished: false,
    bridge: null, earthMaterial: null,
    o: {
      direction: 'in',
      space,
      guide: null,
      seam: { position: [0, 0, 200], target: [0, 0, 0] },
      seamProgress: 1,
      observatory: () => observatory,
      onPhase: (p: string) => phases.push(p),
      onDone() {},
      onObservatoryFrame() {},
    },
  })
  const frame = Reflect.get(dive, 'frame') as (now: number) => void
  const { dive: diveMs, enter: enterMs } = DIVE_PHASE_MS.in
  Object.assign(dive, { frozen: 0 })
  frame.call(dive, 0)
  expect(obsProgress.at(-1)).toBe(0)
  Object.assign(dive, { frozen: (diveMs * ALIGN_K / 2) / (diveMs + enterMs) })
  frame.call(dive, 16)
  expect(obsProgress.at(-1)).toBe(0)
  Object.assign(dive, { frozen: (diveMs * ALIGN_K) / (diveMs + enterMs) })
  frame.call(dive, 32)
  expect(obsProgress.at(-1)).toBe(0)
  // Faza wejścia do Obserwatorium: rozkładanie zdjęcia (0 -> 1).
  Object.assign(dive, { frozen: (diveMs + enterMs / 2) / (diveMs + enterMs) })
  frame.call(dive, 48)
  expect(phases).toEqual(['dive', 'enter'])
  expect(obsProgress.at(-1)).toBeCloseTo(0.5, 5)
})

it('nurkowanie przekazuje scenie krycie warstw i szybsze krycie podpisów, a powrót przywraca 1', () => {
  const camera = new THREE.PerspectiveCamera()
  const space = {
    override: { camera: true, layerFade: 1, labelFade: 1, earthRadius: null, earthBlend: 0 },
    scene: new THREE.Scene(), overlay: { style: {} }, earth: null, camera,
    controls: { enableDamping: false, enabled: false, target: new THREE.Vector3(), update() {} },
    invalidate() {}, setExternal() {},
  }
  const dive: SpaceDive = Object.create(SpaceDive.prototype)
  Object.assign(dive, { o: { space, guide: null } })
  const fadeSpace = Reflect.get(dive, 'fadeSpace') as (k: number) => void
  fadeSpace.call(dive, 0.2)
  const f = diveFades(0.2)
  expect(space.override.layerFade).toBe(f.layers)
  expect(space.override.labelFade).toBe(Math.min(f.layers, f.labels))
  expect(space.override.labelFade).toBeLessThan(space.override.layerFade)
  restoreSpace(space as never, null, null)
  expect(space.override.layerFade).toBe(1)
  expect(space.override.labelFade).toBe(1)
})

it('wejście i osobny powrót przywracają dokładne krycia warstw, także uniformu linii gwiazdozbiorów', () => {
  const camera = new THREE.PerspectiveCamera()
  const scene = new THREE.Scene()
  // Linie gwiazdozbiorów (LineMaterial) trzymają krycie 0,9 w uniformie, podpisy to sprite'y, kropki – zwykły materiał.
  const lines = new THREE.ShaderMaterial({ uniforms: { opacity: { value: 0.9 } }, transparent: true })
  const label = new THREE.SpriteMaterial({ transparent: true, opacity: 0.8 })
  const dots = new THREE.PointsMaterial({ transparent: true, opacity: 0.6 })
  scene.add(new THREE.Mesh(new THREE.BufferGeometry(), lines), new THREE.Sprite(label), new THREE.Points(new THREE.BufferGeometry(), dots))
  const space = {
    override: { camera: true, layerFade: 1, labelFade: 1, earthRadius: null, earthBlend: 0 },
    scene, overlay: { style: {} }, earth: null, camera,
    controls: { enableDamping: false, enabled: false, target: new THREE.Vector3(), update() {} },
    invalidate() {}, setExternal() {},
  }
  const fadeSpace = Reflect.get(SpaceDive.prototype, 'fadeSpace') as (k: number) => void
  const inbound: SpaceDive = Object.create(SpaceDive.prototype)
  Object.assign(inbound, { o: { space, guide: null } })
  fadeSpace.call(inbound, 0.5)
  const f = diveFades(0.5)
  expect(lines.uniforms.opacity.value).toBeCloseTo(0.9 * f.layers, 12)
  expect(label.opacity).toBeCloseTo(0.8 * Math.min(f.layers, f.labels), 12)
  fadeSpace.call(inbound, 1)
  expect(lines.uniforms.opacity.value).toBe(0)
  // W stanie zdjęcia doszła warstwa (np. nazwy gwiazd); nie była wygaszana, więc jej bieżące krycie jest bazowe.
  const added = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.5 })
  scene.add(new THREE.Line(new THREE.BufferGeometry(), added))
  // Powrót to nowy sterownik startujący z wygaszonej sceny: krycia liczy od zapamiętanych sprzed wejścia.
  // Start sterownika powrotu (konstruktor) dołącza nowe materiały do zapamiętanych.
  collectLayers(space as never, null, true)
  const outbound: SpaceDive = Object.create(SpaceDive.prototype)
  Object.assign(outbound, { o: { space, guide: null } })
  fadeSpace.call(outbound, 0.2)
  expect(dots.opacity).toBeCloseTo(0.6 * diveFades(0.2).layers, 12)
  expect(added.opacity).toBeCloseTo(0.5 * diveFades(0.2).layers, 12)
  restoreSpace(space as never, null, null)
  expect(lines.uniforms.opacity.value).toBe(0.9)
  expect(label.opacity).toBe(0.8)
  expect(dots.opacity).toBe(0.6)
  expect(added.opacity).toBe(0.5)
})

it('skip podczas ładowania Obserwatorium (!ready) nie przeskakuje do fazy wejścia i nie wygasza sceny 3D', () => {
  const phases: string[] = []
  let doneCalls = 0
  const observatory = {
    ready: false,
    setExternal() {}, setInteractive() {}, setProgress() {}, setPose() {}, setFade() {},
    step() {},
  }
  const space = {
    scene: new THREE.Scene(),
    overlay: { style: { opacity: '1' } },
    earth: null,
    override: { camera: false, layerFade: 1, labelFade: 1, earthRadius: null, earthBlend: 0 },
    invalidate() {},
    step() {},
  }
  const dive: SpaceDive = Object.create(SpaceDive.prototype)
  Object.assign(dive, {
    elapsed: 0, last: null, phase: null, frozen: null, skipping: false, finished: false,
    observatoryStarted: false, bridge: null, earthMaterial: null,
    applySpace: () => null,
    o: {
      direction: 'in',
      space,
      guide: null,
      seam: { position: [0, 0, 200], target: [0, 0, 0] },
      seamProgress: 1,
      observatory: () => observatory,
      onPhase: (p: string) => phases.push(p),
      onDone: () => { doneCalls += 1 },
      onObservatoryFrame() {},
    },
  })
  const frame = Reflect.get(dive, 'frame') as (now: number) => void
  dive.skip()
  frame.call(dive, 0)
  frame.call(dive, 16)
  expect(phases).not.toContain('enter')
  expect(space.override.layerFade).toBe(1)
  expect(doneCalls).toBe(0)
})

it('wejście w fazę enter przerysowuje wygaszoną klatkę Space3D, żeby pod Obserwatorium nie została stara klatka', () => {
  const stepFades: number[] = []
  let invalidated = 0
  const observatory = {
    ready: true,
    setExternal() {}, setInteractive() {}, setProgress() {}, setPose() {}, setFade() {},
    getPose: () => ({ position: [0, 0, 200] as const, target: [0, 0, 0] as const }),
    step() {},
  }
  const space = {
    scene: new THREE.Scene(),
    overlay: { style: { opacity: '1' } },
    earth: null,
    override: { camera: false, layerFade: 1, labelFade: 1, earthRadius: null, earthBlend: 0 },
    invalidate() { invalidated += 1 },
    step() { stepFades.push(space.override.layerFade) },
  }
  const dive: SpaceDive = Object.create(SpaceDive.prototype)
  Object.assign(dive, {
    elapsed: 0, last: null, phase: null, frozen: null, skipping: false, finished: false,
    observatoryStarted: false, bridge: null, earthMaterial: null,
    applySpace: () => null,
    o: {
      direction: 'out',
      space,
      guide: null,
      seam: { position: [0, 0, 200], target: [0, 0, 0] },
      seamProgress: 1,
      observatory: () => observatory,
      onPhase() {},
      onDone() {},
      onObservatoryFrame() {},
    },
  })
  const frame = Reflect.get(dive, 'frame') as (now: number) => void
  frame.call(dive, 0)
  expect(invalidated).toBeGreaterThan(0)
  expect(stepFades).toEqual([0])
})

it('reverse() zwraca false przed startem lub gdy Obserwatorium nie jest gotowe, a w trakcie nurkowania zawraca płynnie do out', () => {
  const doneDirs: string[] = []
  let obsReady = false
  let setProgress = 0
  let setFadeCalls = 0
  const observatory = {
    get ready() { return obsReady },
    setExternal() {}, setInteractive() {},
    setProgress(p: number) { setProgress = p },
    setPose() {},
    setFade() { setFadeCalls += 1 },
    getPose: () => ({ position: [0, 0, 200] as [number, number, number], target: [0, 0, 0] as [number, number, number] }),
    step() {},
  }
  const space = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    controls: { target: new THREE.Vector3(), enabled: false, update() {} },
    sunPos: new THREE.Vector3(),
    overlay: { style: { opacity: '1' } },
    earth: null,
    override: { camera: true, layerFade: 1, labelFade: 1, earthRadius: null, earthBlend: 0 },
    invalidate() {},
    step() {},
    setExternal() {},
  }
  const dive: SpaceDive = Object.create(SpaceDive.prototype)
  Object.assign(dive, {
    raf: 0, elapsed: 0, last: null, phase: null, frozen: null, skipping: false, finished: false,
    observatoryStarted: false, bridge: null, earthMaterial: null, obsEnd: null,
    spacePose: { position: [0, 0, 50], target: [0, 0, 0], up: [0, 1, 0], fov: 50, near: 0.1 },
    cancel() {},
    o: {
      direction: 'in',
      space,
      guide: null,
      seam: { position: [0, 0, 200], target: [0, 0, 0] },
      markerTargets: new Map(),
      seamProgress: 1,
      imageAspect: 1,
      observatory: () => observatory,
      onPhase() {},
      onDone: (d: string) => doneDirs.push(d),
      onObservatoryFrame() {},
    },
  })
  const frame = Reflect.get(dive, 'frame') as (now: number) => void
  // Przed ready nie zawraca (brak ruchu do cofnięcia).
  frame.call(dive, 100)
  expect(dive.reverse()).toBe(false)

  // Po ready i postępie klatek zawraca w kierunku 'out' i odgrywa powrót aż do końca.
  obsReady = true
  frame.call(dive, 120)
  for (let t = 153; t <= 2200; t += 33) frame.call(dive, t)
  expect(setFadeCalls).toBeGreaterThan(0)
  expect(dive.reverse()).toBe(true)
  expect(setProgress).toBe(0)

  // Kolejne klatki odgrywają powrót aż do finish('out').
  let t = 2233
  for (let i = 0; i < 200 && doneDirs.length === 0; i += 1, t += 33) frame.call(dive, t)
  expect(doneDirs).toEqual(['out'])
  expect(space.override.layerFade).toBe(1)
  expect(space.override.camera).toBe(false)
})
