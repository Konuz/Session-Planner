import { afterEach, expect, it, vi } from 'vitest'
import { SURVEYS } from './hips'
import { createHipsSkyLayer } from './hipsSkyGL'
import { fetchTile } from './hipsTiles'
import { DEG, type Mat3 } from './astro'
import { healpixFaceXY, nestIndex } from './healpix'
import { makeProjector } from './projection'

vi.mock('./hipsTiles', () => ({ fetchTile: vi.fn() }))

type Paint = [tile: string, weight: number]

// Rejestruje teksturę i udział koloru rzeczywiście przekazane do WebGL w każdym rysowaniu.
function recordDraws() {
  let texture: { tile?: string } | null = null
  let blending = false
  let blendSource = 1
  let alpha = 1
  const paints: Paint[] = []
  const gl = new Proxy({
    BLEND: 1, ONE: 1, CONSTANT_ALPHA: 32771,
    canvas: { width: 128, height: 128 },
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    isContextLost: () => false,
    enable: () => { blending = true },
    disable: () => { blending = false },
    blendFunc: (source: number) => { blendSource = source },
    blendColor: (_r: number, _g: number, _b: number, a: number) => { alpha = a },
    createTexture: () => ({}),
    bindTexture: (_target: number, t: typeof texture) => { texture = t },
    texImage2D: (...args: unknown[]) => { texture!.tile = (args.at(-1) as { tile: string }).tile },
    clear: () => { paints.length = 0 },
    drawElements: () => { paints.push([texture!.tile!, blending && blendSource === 32771 ? alpha : 1]) },
  }, { get: (target, key) => Reflect.get(target, key) ?? (() => ({})) })
  return { gl: gl as unknown as WebGL2RenderingContext, paints }
}

const order3 = ['3/63', '3/127', '3/191', '3/255']
const order4 = ['4/255', '4/511', '4/767', '4/1023']
const order2 = ['2/15', '2/31', '2/47', '2/63']
const weighted = (keys: string[], weight = 1): Paint[] => keys.map((key) => [key, weight])
const image = (tile: string) => new Blob([tile], { type: 'image/jpeg' })
const flush = () => new Promise<void>((resolve) => setImmediate(resolve))

function setup(survey = SURVEYS.nsns) {
  let now = 1000
  const blocked = new Map<string, (blob: Blob) => void>()
  const waiting = new Map<string, Promise<Blob>>()
  const failed = new Set<string>()
  const { gl, paints } = recordDraws()
  vi.mocked(fetchTile).mockImplementation(async (_survey, order, npix) => {
    const tile = `${order}/${npix}`
    if (failed.has(tile)) throw new Error('brak kafelka')
    return waiting.get(tile) ?? image(tile)
  })
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('window', globalThis)
  vi.stubGlobal('createImageBitmap', async (blob: Blob) => ({ tile: await blob.text(), width: 1728, height: 1856, close() {} }))
  vi.stubGlobal('fetch', async () => ({ ok: true, headers: new Headers({ 'Content-Type': 'image/jpeg' }), blob: async () => image('Allsky') }))
  let nextFrame: FrameRequestCallback | undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { nextFrame = callback; return 1 })
  vi.stubGlobal('cancelAnimationFrame', () => { nextFrame = undefined })
  const redraw = vi.fn()
  const layer = createHipsSkyLayer(gl, survey, redraw)
  const details = () => paints.filter(([tile]) => tile !== 'Allsky')
  const tick = (elapsed: number) => {
    const callback = nextFrame
    nextFrame = undefined
    now += elapsed
    callback?.(now)
    return details()
  }
  const animate = (elapsed: number) => {
    for (; elapsed > 50; elapsed -= 50) tick(50)
    return tick(elapsed)
  }
  const draw = (arcsecPerPx: number, elapsed = 0, width = 128, height = 128, eqToView: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]) => {
    now += elapsed
    layer.draw({
      eqToView, zen: [0, 0, 1],
      scale: 206264.806 / arcsecPerPx, width, height, cx: width / 2, cy: height / 2, dpr: 1, bright: 1, allowDecode: true,
    })
    return details()
  }

  return {
    layer, draw, redraw, tick, animate,
    async show(arcsecPerPx: number) {
      draw(arcsecPerPx)
      await flush()
      tick(0)
      draw(arcsecPerPx)
      return animate(200)
    },
    hold(tile: string) { waiting.set(tile, new Promise<Blob>((resolve) => blocked.set(tile, resolve))) },
    release(tile: string) { blocked.get(tile)?.(image(tile)) },
    fail(tile: string) { failed.add(tile) },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('po zmianie proporcji mapy pobiera nowe brzegi i pomija kafelki daleko za krótszym bokiem', async () => {
  const sky = setup()
  const calls = vi.mocked(fetchTile).mockClear().mock.calls
  try {
    for (const [width, height] of [[1920, 320], [320, 1920]]) {
      const view = { azDeg: 100, altDeg: 35, fovDeg: 2 }
      const proj = makeProjector([1, 0, 0, 0, 1, 0, 0, 0, 1], view, width / 2, height / 2, Math.min(width, height) / 2)
      const pixelTile = (x: number, y: number) => {
        const [a, b, c] = proj.unprojectHor(x, y)
        return nestIndex(5, ...healpixFaceXY(5, Math.atan2(b, a) / DEG, Math.asin(c) / DEG))
      }
      const start = calls.length
      for (let i = 0; i < 15; i++) {
        sky.draw(206264.806 / proj.scale, 0, width, height, proj.eqToView)
        await flush()
      }
      const requested = new Set(calls.filter(([, order]) => order === 5).map(([, , npix]) => npix))
      for (const x of [0, width / 2, width]) {
        for (const y of [0, height / 2, height]) expect(requested.has(pixelTile(x, y))).toBe(true)
      }
      const outside = width > height ? pixelTile(width / 2, height / 2 + 900) : pixelTile(width / 2 + 900, height / 2)
      expect(calls.slice(start).some(([, order, npix]) => order === 5 && npix === outside)).toBe(false)
    }
  } finally {
    sky.layer.dispose()
  }
})

it('przybliżanie zachowuje poprzednie kafelki i wyostrza widoczne pole jednocześnie', async () => {
  const sky = setup()
  try {
    expect(await sky.show(80)).toEqual(weighted(order3))
    sky.hold('4/1023')
    sky.draw(50)
    await flush()
    expect(sky.draw(50, 300)).toEqual(weighted(order3))

    sky.release('4/1023')
    await flush()
    sky.draw(50)
    sky.redraw.mockClear()
    expect(sky.animate(100)).toEqual([...weighted(order3), ...weighted(order4, 0.5)])
    expect(sky.redraw).not.toHaveBeenCalled()
    expect(sky.animate(100)).toEqual(weighted(order4))
  } finally {
    sky.release('4/1023')
    await flush()
    sky.layer.dispose()
  }
})

it('NSNS OHS zachowuje rząd 5 do chwili gotowości rzędu 6 i wraca do zapisanych kafelków przy oddalaniu', async () => {
  const sky = setup(SURVEYS.nsnsOhs)
  const order5 = ['5/1023', '5/2047', '5/3071', '5/4095']
  const order6 = ['6/4095', '6/8191', '6/12287', '6/16383']
  try {
    expect(await sky.show(16)).toEqual(weighted(order5))
    sky.hold(order6[0])
    sky.draw(10)
    await flush()
    expect(sky.draw(10)).toEqual(weighted(order5))
    sky.release(order6[0])
    await flush()
    sky.draw(10)
    expect(sky.animate(200)).toEqual(weighted(order6))
    vi.mocked(fetchTile).mockClear()
    sky.draw(16)
    expect(sky.animate(200)).toEqual(weighted(order5))
    expect(vi.mocked(fetchTile)).not.toHaveBeenCalled()
  } finally {
    sky.release(order6[0])
    await flush()
    sky.layer.dispose()
  }
})

it('przy oddalaniu używa starszego poziomu w miejscu kafelka, którego nie udało się pobrać', async () => {
  const sky = setup()
  try {
    expect(await sky.show(50)).toEqual(weighted(order4))
    sky.fail('2/63')
    sky.draw(120)
    await flush()
    sky.draw(120)
    const ready = order2.slice(0, 3)
    expect(sky.animate(100)).toEqual([...weighted(order4), ...weighted(ready, 0.5)])
    const settled = sky.animate(100)
    expect(settled).toContainEqual(['4/1023', 1])
    expect(settled.filter(([tile]) => tile.startsWith('2/'))).toEqual(weighted(ready))
  } finally {
    sky.layer.dispose()
  }
})

it('podczas szybkiej zmiany skali czeka na kafelki aktualnego pola', async () => {
  const sky = setup()
  try {
    await sky.show(80)
    sky.hold('4/1023')
    sky.hold('2/63')
    sky.draw(50)
    await flush()
    sky.draw(120)
    sky.release('4/1023')
    await flush()
    expect(sky.draw(120, 300)).toEqual(weighted(order3))

    sky.release('2/63')
    await flush()
    sky.draw(120)
    expect(sky.animate(100)).toEqual([...weighted(order3), ...weighted(order2, 0.5)])
    expect(sky.animate(100)).toEqual(weighted(order2))
  } finally {
    sky.release('4/1023')
    sky.release('2/63')
    await flush()
    sky.layer.dispose()
  }
})

it('zachowuje klatki pośrednie po zacięciu przeglądarki', async () => {
  const sky = setup()
  try {
    await sky.show(80)
    sky.draw(50)
    await flush()
    sky.draw(50)
    const next = sky.tick(350)
    expect(next).toContainEqual(['3/63', 1])
    const newTile = next.find(([tile]) => tile === '4/255')!
    expect(newTile[1]).toBeGreaterThan(0)
    expect(newTile[1]).toBeLessThan(1)
    expect(sky.animate(200)).toEqual(weighted(order4))
  } finally {
    sky.layer.dispose()
  }
})

it('po zatrzymaniu mapy zmienia poziom z przygotowanych tekstur bez ponownego pobierania', async () => {
  const sky = setup()
  try {
    expect(await sky.show(80)).toEqual(weighted(order3))
    sky.draw(80, 400)
    for (let i = 0; i < 5; i++) {
      await flush()
      sky.tick(16)
    }
    expect(sky.draw(80)).toEqual(weighted(order3))

    vi.mocked(fetchTile).mockClear()
    sky.draw(50)
    expect(sky.animate(100)).toEqual([...weighted(order3), ...weighted(order4, 0.5)])
    expect(fetchTile).not.toHaveBeenCalled()
  } finally {
    await flush()
    sky.layer.dispose()
  }
})
