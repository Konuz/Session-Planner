import { expect, it } from 'vitest'
import { SpaceDive } from './dive'

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
