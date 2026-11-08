import { expect, it, vi } from 'vitest'
import { Vector3, Scene, PerspectiveCamera, Texture, TextureLoader } from 'three'
import { NO_DISTANCE } from '../../lib/distance'
import type { PhotoCut } from '../../lib/photo'
import { scenePosition } from '../../lib/space3d'
import { createUniversePhoto, universePhotoLayout } from './universePhoto'
import type { Space3DHandle } from '../Space3D'
import { photoFrame, type PhotoProject } from '../../lib/photo'

const cuts: PhotoCut[] = [22e6, 25e6, 59e6, 65e6, 346e6, 353e6, 384e6].map((distLy, i) => ({
  ...NO_DISTANCE, id: `G ${i}`, type: 'G', raDeg: 184.7 + i * 0.05, decDeg: 47.3 + i * 0.03,
  x: i * 100, y: 300, radius: 50, enabled: true, distLy, distanceOrigin: 'user',
}))

it('osadza zdjęcia w przestrzeni, zachowując osobno dokładne położenia galaktyk', () => {
  const { cards, size } = universePhotoLayout(cuts)
  expect(cards).toHaveLength(7)
  expect(size).toBeGreaterThan(0)
  for (const card of cards) {
    expect(card.target.toArray()).toEqual(scenePosition(card.cut, card.cut.distLy!, 'universe'))
    expect(card.position.distanceTo(card.target)).toBeGreaterThan(size)
    expect(card.position.toArray().every(Number.isFinite)).toBe(true)
  }
  expect(new Set(cards.map(c => c.position.toArray().join(','))).size).toBe(7)
})

it('nie zależy od kolejności katalogu i nie zmienia danych odległości', () => {
  const before = structuredClone(cuts)
  const a = universePhotoLayout(cuts)
  const b = universePhotoLayout([...cuts].reverse())
  expect(a.cards.map(c => c.cut.id)).toEqual(b.cards.map(c => c.cut.id))
  expect(a.cards.map(c => c.position.toArray())).toEqual(b.cards.map(c => c.position.toArray()))
  expect(cuts).toEqual(before)
})

it('pomija wyłączone i nieznane odległości; radzi sobie z pustym i lokalnym polem', () => {
  expect(universePhotoLayout([]).cards).toEqual([])
  expect(universePhotoLayout([{ ...cuts[0], enabled: false }, { ...cuts[1], distLy: null }]).cards).toEqual([])
  const local = universePhotoLayout([{ ...cuts[0], distLy: 2000 }])
  expect(local.cards[0].target.equals(new Vector3())).toBe(true)
  expect(local.cards[0].position.toArray().every(Number.isFinite)).toBe(true)
})

it('animuje fragmenty od pikseli zdjęcia do pozycji 3D i zwalnia zasoby przy zamknięciu', async () => {
  vi.spyOn(TextureLoader.prototype, 'load').mockReturnValue(new Texture())
  const camera = new PerspectiveCamera(50, 1.5, 0.1, 5000)
  const scene = new Scene()
  const hooks = new Set<() => void>()
  const handle = { camera, scene, hooks, mount: { clientWidth: 1200, clientHeight: 800 }, controls: { target: new Vector3(), update: vi.fn() }, stopIntro: vi.fn(), invalidate: vi.fn() } as unknown as Space3DHandle
  const project = { width: 1600, height: 900, image: 'photo.jpg', cuts } as PhotoProject
  const progress = { current: 0 }
  const labels = vi.fn()
  const gallery = createUniversePhoto(handle, project, progress, labels)
  gallery.frameCamera()
  hooks.forEach(h => h())
  await Promise.resolve()
  const first = labels.mock.calls.at(-1)![0]
  const frame = photoFrame(1200, 800, project)
  first.forEach((p: { id: string; x: number; y: number }) => {
    const cut = cuts.find(c => c.id === p.id)!
    expect(p.x).toBeCloseTo(frame.x + cut.x * frame.scale, 5)
    expect(p.y).toBeCloseTo(frame.y + cut.y * frame.scale, 5)
  })
  progress.current = 1
  hooks.forEach(h => h())
  await Promise.resolve()
  expect(labels.mock.calls.at(-1)![0].every((p: { visible: boolean; size: number }) => p.visible && p.size > 0 && p.size <= 81)).toBe(true)
  gallery.dispose()
  expect(scene.children).toHaveLength(0)
  expect(hooks.size).toBe(0)
  vi.restoreAllMocks()
})
