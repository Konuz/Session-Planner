import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Mesh, PerspectiveCamera, type ShaderMaterial, Scene, Texture, TextureLoader, Vector3, type BufferAttribute, type Object3D } from 'three'
import { NO_DISTANCE } from '../../lib/distance'
import { frameBasis } from '../../lib/frameBasis'
import type { PhotoCut, PhotoProject } from '../../lib/photo'
import { scenePoint, sunPosition } from '../../lib/space3d'
import type { CameraPose } from '../../lib/spaceCamera'
import type { Space3DHandle } from '../Space3D'
import { createPhotoWindow } from './universePhoto'

const WIDTH = 3200, HEIGHT = 2000
// Pole 1,5° w kierunku Gromady w Warkoczu (prawie biegun Galaktyki: najtrudniejszy przypadek dla kamery).
const astrometry = { raDeg: 194.95, decDeg: 27.98, rmsPx: 1, matches: 20, edgeMatches: 5, edgeRmsPx: 1, totalMs: 1, wcs: { cd: [[-1.5 / WIDTH, 0], [0, -1.5 / WIDTH]], crpix: [WIDTH / 2, HEIGHT / 2] } }

function cut(id: string, distLy: number, x: number, y: number, radius = 20): PhotoCut {
  return { ...NO_DISTANCE, id, type: 'G', raDeg: 194.95, decDeg: 27.98, x, y, radius, enabled: true, distLy, distanceOrigin: 'user' }
}

/** Gromada: `members` galaktyk ok. 321 mln lś ± 12%, dwie galaktyki pierwszego planu i trzy tła. */
function comaProject(members = 120): PhotoProject {
  const cuts = Array.from({ length: members }, (_, i) => cut(`PGC ${i}`, 321e6 * (0.88 + 0.24 * ((i * 37) % 101) / 100), 100 + (i * 263) % 3000, 100 + (i * 149) % 1800))
  cuts.push(cut('NGC 4793', 110e6, 400, 500, 60), cut('NGC 4789A', 14e6, 2700, 300, 70))
  cuts.push(cut('tło 1', 1.0e9, 900, 1500, 12), cut('tło 2', 1.4e9, 2000, 1700, 12), cut('tło 3', 2.1e9, 1500, 300, 12))
  return { version: 3, id: 'coma', name: 'Abell 1656', image: 'coma.jpg', width: WIDTH, height: HEIGHT, createdAt: 0, stars: null, cuts, astrometry }
}

function fixture(project = comaProject()) {
  const camera = new PerspectiveCamera(50, 1.6, 0.1, 5000)
  const scene = new Scene()
  const controls = { target: new Vector3() }
  const mount = { clientWidth: 1280, clientHeight: 800, appendChild: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), getBoundingClientRect: () => ({ left: 0, top: 0 }) }
  const poses: CameraPose[] = []
  const handle = {
    scale: 'universe', camera, scene, mount, controls, sunPos: new Vector3(...sunPosition('universe')), hooks: new Set<(now: number) => void>(), claims: new Set<(x: number, y: number, click: boolean) => boolean>(), layout: new Set<(now: number) => void>(), anchors: new Set<Vector3>(), invalidate: vi.fn(),
    flyTo(pose: CameraPose) {
      poses.push(pose)
      camera.position.set(...pose.position)
      controls.target.set(...pose.target)
      camera.lookAt(controls.target)
      camera.updateMatrixWorld()
    },
  } as unknown as Space3DHandle
  const picked: string[] = []
  const scene3d = createPhotoWindow(handle, project, { near: '#f5a524', main: '#00e0ff', far: '#8b9dff', accent: '#00e0ff' }, (id) => picked.push(id))!
  const group = scene.getObjectByName('universe-photo-fragments')!
  const discs = group.getObjectsByProperty('type', 'Mesh').find((m) => (m as Mesh).geometry.getAttribute('local')) as Mesh
  return { handle, scene, camera, mount, poses, picked, window: scene3d, group, discs, project }
}

function count(object: Object3D): number {
  let n = 0
  object.traverse(() => { n++ })
  return n
}

beforeEach(() => {
  vi.spyOn(TextureLoader.prototype, 'load').mockImplementation(() => new Texture() as Texture<HTMLImageElement>)
  const element = () => ({ className: '', textContent: '', style: {} as Record<string, string>, appendChild: vi.fn(), remove: vi.fn() })
  vi.stubGlobal('document', { createElement: element })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('okno stoi w kierunku zdjęcia na odległości głównego planu i jest wielokrotnie większe od prawdziwego pola', () => {
  const f = fixture()
  const basis = frameBasis(astrometry, WIDTH, HEIGHT)!
  expect(f.window.layers.counts).toEqual({ near: 2, main: 120, far: 3 })
  const frame = f.group.children.find((c) => c.type === 'Group')!
  // Na linii widzenia od Ziemi, w odległości głównego planu w skali sceny: igła trafia w środek okna.
  const sun = new Vector3(...sunPosition('universe'))
  const reach = new Vector3(...scenePoint(basis.center, f.window.layers.center, 'universe')).distanceTo(sun)
  expect(frame.position.distanceTo(sun.clone().addScaledVector(new Vector3(...basis.center), reach))).toBeLessThan(1e-9)
  expect(f.window.guide.length).toBeCloseTo(reach, 9)
  expect(f.window.guide.basis.center).toEqual(basis.center)
  expect(f.window.magnification).toBeGreaterThan(8)
  expect(f.window.fieldDeg[0]).toBeCloseTo(1.5, 2)
})

it('główny plan leży w płaszczyźnie okna, pierwszy plan przed nią (ku Ziemi), tło za nią; złożone zdjęcie jest płaskie', () => {
  const f = fixture()
  const position = f.discs.geometry.getAttribute('position') as BufferAttribute
  const lifted = 5, total = 125
  expect(position.count).toBe((lifted + total) * 4)
  const z = (quad: number) => position.getZ(quad * 4)
  // Kolejność rysowania: obrysy miejsc wysuniętych obiektów, potem od najdalszego do najbliższego.
  for (let q = 0; q < lifted; q++) expect(z(q)).toBe(0)
  for (let q = lifted; q < lifted + 3; q++) expect(z(q)).toBeLessThan(0)
  for (let q = lifted + 3; q < lifted + 123; q++) expect(z(q)).toBe(0)
  for (let q = lifted + 123; q < lifted + total; q++) expect(z(q)).toBeGreaterThan(0)
  f.window.setLift(0)
  for (let q = 0; q < lifted + total; q++) expect(z(q)).toBe(0)
})

it('liczba obiektów sceny nie zależy od liczby galaktyk (jedna siatka dla 10 000 obiektów)', () => {
  const small = fixture(comaProject(7))
  const large = fixture(comaProject(10_000))
  expect(count(large.group)).toBe(count(small.group))
  expect((large.discs.geometry.getAttribute('position') as BufferAttribute).count).toBe((5 + 10_005) * 4)
})

it('widok „Z Ziemi” patrzy wzdłuż linii widzenia, a wszystkie widoki mają okno w kadrze', () => {
  const f = fixture()
  const basis = frameBasis(astrometry, WIDTH, HEIGHT)!
  const frame = f.group.children.find((c) => c.type === 'Group')!
  for (const view of ['earth', 'frame', 'position'] as const) {
    f.window.view(view)
    const pose = f.poses.at(-1)!
    const offset = new Vector3(...pose.position).sub(new Vector3(...pose.target))
    // Kamera po stronie Ziemi: widać przód fotografii.
    expect(offset.clone().normalize().dot(new Vector3(...basis.center))).toBeLessThan(-0.3)
    if (view === 'earth') expect(offset.clone().normalize().dot(new Vector3(...basis.center))).toBeLessThan(-0.995)
    const corner = frame.position.clone().project(f.camera)
    expect(Math.abs(corner.x)).toBeLessThan(1)
    expect(Math.abs(corner.y)).toBeLessThan(1)
  }
})

it('kliknięcie w obiekt zgłasza go przez pierwszeństwo modułu zdjęcia; zamknięcie zwalnia scenę', () => {
  const f = fixture()
  f.window.view('frame')
  const [claim] = [...f.handle.claims]
  expect(claim(5, 5, true)).toBe(false)
  // Środek wysuniętej galaktyki pierwszego planu na ekranie (ostatni czworokąt = najbliższy obiekt).
  const position = f.discs.geometry.getAttribute('position') as BufferAttribute
  const last = position.count - 4
  const center = new Vector3((position.getX(last) + position.getX(last + 2)) / 2, (position.getY(last) + position.getY(last + 2)) / 2, position.getZ(last))
  f.discs.localToWorld(center).project(f.camera)
  expect(claim((center.x + 1) / 2 * 1280, (1 - center.y) / 2 * 800, true)).toBe(true)
  expect(f.picked).toEqual(['NGC 4789A'])
  f.window.dispose()
  expect(f.scene.children).toHaveLength(0)
  expect(f.handle.hooks.size).toBe(0)
  expect(f.handle.layout.size).toBe(0)
  expect(f.handle.claims.size).toBe(0)
  expect(f.camera.view?.enabled ?? false).toBe(false)
})

it('w nurkowaniu okno składa plany i gaśnie, a kadr wraca na środek sceny', () => {
  const f = fixture()
  const position = f.discs.geometry.getAttribute('position') as BufferAttribute
  const [applyOffset] = [...f.handle.hooks]
  applyOffset(0)
  f.window.setInsets(280, 70)
  applyOffset(0)
  expect(f.camera.view?.offsetX).toBe(140)
  f.window.setDive(0, 1)
  applyOffset(0)
  expect(f.camera.view?.offsetX).toBe(0)
  for (let q = 0; q < position.count / 4; q++) expect(position.getZ(q * 4)).toBe(0)
  const material = f.discs.material as ShaderMaterial
  expect(material.uniforms.opacity.value).toBe(0)
  f.window.setDive(1, 1)
  applyOffset(0)
  expect(material.uniforms.opacity.value).toBe(1)
  expect(f.camera.view?.offsetX).toBe(140)
})

it('bez WCS albo bez obiektów z odległością okna nie ma', () => {
  const project = comaProject(3)
  const f = fixture()
  expect(createPhotoWindow(f.handle, { ...project, astrometry: { ...astrometry, wcs: null } }, { near: '#fff', main: '#fff', far: '#fff', accent: '#fff' }, () => {})).toBeNull()
  expect(createPhotoWindow(f.handle, { ...project, cuts: [] }, { near: '#fff', main: '#fff', far: '#fff', accent: '#fff' }, () => {})).toBeNull()
})
