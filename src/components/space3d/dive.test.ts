import * as THREE from 'three'
import { expect, it } from 'vitest'
import { ALIGN_K, DIVE_PHASE_MS, diveFades } from '../../lib/spaceDive'
import { SpaceDive, restoreSpace } from './dive'

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
