import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Line, LineDashedMaterial, LineSegments, PerspectiveCamera, Scene, Sprite, SpriteMaterial, Texture, Vector3 } from 'three'
import { NO_DISTANCE } from '../../lib/distance'
import { frameBasis, halfFieldTan } from '../../lib/frameBasis'
import type { PhotoCut, PhotoProject } from '../../lib/photo'
import { UNIVERSE_MIN_SPAN, scenePosition, sunPosition, type SpaceScale } from '../../lib/space3d'
import type { CameraPose } from '../../lib/spaceCamera'
import type { Space3DHandle } from '../Space3D'
import { createPhotoGuide, MARK, MARK_PROJECTION_Y } from './photoGuide'

// Symbole rysowane na płótnie: w testach zwykły sprite.
vi.mock('./markerGlyphs', () => ({
  glyphTexture: () => new Texture(),
  beyondTexture: () => new Texture(),
  glyphSprite: (map: Texture, scale = 0.03) => { const s = new Sprite(new SpriteMaterial({ map })); s.scale.setScalar(scale); return s },
}))

const WIDTH = 3200, HEIGHT = 2000
// Pole 1,5° w kierunku Gromady w Warkoczu.
const astrometry = { raDeg: 194.95, decDeg: 27.98, rmsPx: 1, matches: 20, edgeMatches: 5, edgeRmsPx: 1, totalMs: 1, wcs: { cd: [[-1.5 / WIDTH, 0], [0, -1.5 / WIDTH]], crpix: [WIDTH / 2, HEIGHT / 2] } }

function cut(id: string, distLy: number, dRa = 0, dDec = 0): PhotoCut {
  return { ...NO_DISTANCE, id, type: 'G', raDeg: 194.95 + dRa, decDeg: 27.98 + dDec, x: 0, y: 0, radius: 20, enabled: true, distLy, distanceOrigin: 'user' }
}

/** Gromada (ok. 321 mln lś ± 12%) rozrzucona po polu, galaktyka pierwszego planu, tło i mgławica w Drodze Mlecznej. */
function comaProject(): PhotoProject {
  const cuts = Array.from({ length: 40 }, (_, i) => cut(`PGC ${i}`, 321e6 * (0.88 + 0.24 * ((i * 37) % 101) / 100), ((i * 13) % 11 - 5) * 0.12, ((i * 7) % 9 - 4) * 0.12))
  cuts.push(cut('NGC 4789A', 14e6, 0.5, 0.3), cut('tło', 2.1e9, -0.4, -0.2), cut('LDN 1', 1500, 0.1, 0.1))
  return { version: 3, id: 'coma', name: 'Abell 1656', image: 'coma.jpg', width: WIDTH, height: HEIGHT, createdAt: 0, stars: null, cuts, astrometry }
}

function fixture(scale: SpaceScale, project = comaProject()) {
  const camera = new PerspectiveCamera(50, 1.6, 0.1, 5000)
  const scene = new Scene()
  const controls = { target: new Vector3() }
  const listeners = { addEventListener: vi.fn(), removeEventListener: vi.fn() }
  const mount = { clientWidth: 1280, clientHeight: 800, style: {}, appendChild: vi.fn(), getBoundingClientRect: () => ({ left: 0, top: 0 }), ...listeners }
  const canvas = { addEventListener: vi.fn(), removeEventListener: vi.fn() }
  const handle = {
    camera, scene, mount, controls, sunPos: new Vector3(...sunPosition()), renderer: { domElement: canvas },
    claims: new Set<(x: number, y: number, click: boolean) => boolean>(), layout: new Set<(now: number) => void>(), anchors: new Set<Vector3>(), invalidate: vi.fn(),
    flyTo(pose: CameraPose) {
      camera.position.set(...pose.position)
      controls.target.set(...pose.target)
      camera.lookAt(controls.target)
      camera.updateMatrixWorld()
    },
  } as unknown as Space3DHandle
  const picked: string[] = []
  const guide = createPhotoGuide(handle, project, scale, {}, '#00e0ff', (id) => picked.push(id))!
  const sprites = guide.markers.children.filter((c): c is Sprite => c instanceof Sprite)
  return { handle, scene, camera, guide, sprites, picked, mount, canvas }
}

beforeEach(() => {
  const element = () => ({ className: '', textContent: '', style: {} as Record<string, string>, classList: { toggle: vi.fn(), add: vi.fn(), remove: vi.fn(), contains: () => false }, appendChild: vi.fn(), remove: vi.fn(), addEventListener: vi.fn() })
  vi.stubGlobal('document', { createElement: element })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('we Wszechświecie lokalnym każdy znacznik leży w stożku pola, a stożek sięga za najdalszy', () => {
  const f = fixture('universe')
  const basis = frameBasis(astrometry, WIDTH, HEIGHT)!
  const [tx, ty] = halfFieldTan(basis, WIDTH, HEIGHT)
  const axis = new Vector3(...basis.center), x = new Vector3(...basis.x), y = new Vector3(...basis.y)
  const sun = new Vector3(...sunPosition())
  // Wszystkie wycinki (także mgławica Drogi Mlecznej, tuż przy Ziemi) mają znacznik.
  expect(f.sprites).toHaveLength(43)
  let farthest = 0
  for (const sprite of f.sprites) {
    const d = sprite.position.clone().sub(sun)
    const depth = d.dot(axis)
    farthest = Math.max(farthest, d.length())
    expect(depth).toBeGreaterThan(0)
    // Kierunek wewnątrz ostrosłupa pola (z zapasem na krzywiznę rzutu).
    expect(Math.abs(d.dot(x)) / depth).toBeLessThan(tx * 1.05)
    expect(Math.abs(d.dot(y)) / depth).toBeLessThan(ty * 1.05)
  }
  expect(f.guide.length).toBeGreaterThan(farthest)
  expect(f.guide.length).toBeLessThan(farthest * 1.2)
})

it('znacznik M 33 i jego pozycja w scenie (scenePosition) pokrywają się dokładnie w stożku pola', () => {
  const m33Astrometry = {
    raDeg: 23.462, decDeg: 30.6602, rmsPx: 1, matches: 20, edgeMatches: 5, edgeRmsPx: 1, totalMs: 1,
    wcs: { cd: [[-1.5 / WIDTH, 0], [0, -1.5 / WIDTH]], crpix: [WIDTH / 2, HEIGHT / 2] },
  }
  const m33Cut: PhotoCut = { ...NO_DISTANCE, id: 'M 33', type: 'G', raDeg: 23.462, decDeg: 30.6602, x: WIDTH / 2, y: HEIGHT / 2, radius: 40, enabled: true, distLy: 2_781_156, distanceOrigin: 'user' }
  const project: PhotoProject = { version: 3, id: 'm33', name: 'M 33', image: 'm33.jpg', width: WIDTH, height: HEIGHT, createdAt: 0, stars: null, cuts: [m33Cut], astrometry: m33Astrometry }
  const f = fixture('universe', project)
  expect(f.sprites).toHaveLength(1)
  const expected = scenePosition(m33Cut, m33Cut.distLy!)
  f.sprites[0].position.toArray().forEach((v, i) => expect(v).toBeCloseTo(expected[i], 6))
})

it('w Drodze Mlecznej nie ma pionów do płaszczyzny Galaktyki: jedyne odcinki to stożek', () => {
  const f = fixture('galaxy')
  const segments: LineSegments[] = []
  f.guide.group.traverse((o) => { if (o instanceof LineSegments) segments.push(o) })
  expect(segments).toHaveLength(1)
  expect(segments[0].parent).toBe(f.guide.cone)
  // Mgławica na swoim miejscu w Galaktyce; obiekty spoza niej dostają jeden grot.
  expect(f.sprites).toHaveLength(2)
})

it('utrzymuje rozmiar ekranowy symbolu i grotu przy zmianie pola widzenia', () => {
  const f = fixture('galaxy')
  f.guide.frameCamera()
  const [layout] = f.handle.layout
  const screenSizes = () => f.sprites.map((sprite) => sprite.scale.x * f.camera.projectionMatrix.elements[5])
  const before = screenSizes()
  f.camera.fov = 8
  f.camera.updateProjectionMatrix()
  layout(100)
  screenSizes().forEach((size, i) => expect(size).toBeCloseTo(before[i], 8))
  f.guide.setHover('LDN 1')
  expect(screenSizes()[0]).toBeGreaterThan(before[0])
  expect(screenSizes()[1]).toBeCloseTo(before[1], 8)
})

it('zaznaczenie powiększa znacznik, kliknięcie wybiera obiekt, zamknięcie zwalnia scenę', () => {
  const f = fixture('universe')
  f.guide.frameCamera()
  f.camera.updateProjectionMatrix()
  const base = f.sprites[0].scale.x
  f.guide.setSelected('LDN 1')
  const ldn = f.sprites.find((s) => s.scale.x > base)!
  expect(ldn).toBeDefined()
  const p = ldn.position.clone().project(f.camera)
  const [claim] = [...f.handle.claims]
  expect(claim((p.x + 1) / 2 * 1280, (1 - p.y) / 2 * 800, true)).toBe(true)
  expect(f.picked).toEqual(['LDN 1'])
  expect(claim(3, 3, true)).toBe(false)
  f.guide.dispose()
  expect(f.scene.children).toHaveLength(0)
  expect(f.handle.claims.size).toBe(0)
  expect(f.handle.layout.size).toBe(0)
  expect(f.handle.anchors.size).toBe(0)
})

it('ruch nad nakładką nie kasuje podświetlenia znacznika wybranego w wachlarzu', () => {
  const f = fixture('universe')
  const sprite = f.sprites[0]
  const base = sprite.scale.x
  f.guide.setHover('LDN 1')
  expect(sprite.scale.x).toBeGreaterThan(base)
  expect(f.mount.addEventListener).not.toHaveBeenCalledWith('pointermove', expect.any(Function))
  const move = f.canvas.addEventListener.mock.calls.find(([type]) => type === 'pointermove')?.[1]
  expect(move).toBeTypeOf('function')
  move({ buttons: 0, clientX: -100, clientY: -100 })
  expect(sprite.scale.x).toBe(base)
  f.guide.dispose()
  expect(f.canvas.removeEventListener).toHaveBeenCalledWith('pointermove', move)
})

it('zdjęcie samej Drogi Mlecznej we Wszechświecie: kadr i kreski jak dawniej, w jednolicie większej skali (× 1/0,12)', () => {
  const milkyWayOnly = () => ({ ...comaProject(), cuts: [cut('LDN 1', 1500, 0.1, 0.1), cut('B 33', 1300, -0.1, 0)] })
  const universe = fixture('universe', milkyWayOnly()), galaxy = fixture('galaxy', milkyWayOnly())
  universe.guide.frameCamera()
  // Dawny minimalny odstęp kamery: 1 j. Wszechświata lokalnego.
  expect(universe.camera.position.distanceTo(universe.handle.controls.target)).toBeGreaterThanOrEqual(1 / 0.12 - 1e-9)
  const dash = (f: ReturnType<typeof fixture>) => {
    let size = 0
    f.guide.group.traverse((o) => { if (o instanceof Line && o.material instanceof LineDashedMaterial) size ||= o.material.dashSize })
    return size
  }
  expect(dash(universe) / dash(galaxy)).toBeCloseTo(1 / 0.12, 9)
})

it('przelot zakładek ze zdjęciem: kadr stożka leci ze zmianą skali, pierwszy kadr zwykłym przelotem', () => {
  const f = fixture('universe')
  const calls: unknown[][] = []
  const fly = f.handle.flyTo.bind(f.handle)
  f.handle.flyTo = (pose, ...rest: unknown[]) => { calls.push(rest); fly(pose) }
  f.guide.frameCamera()
  f.guide.frameCamera({ zoom: true })
  expect(calls).toEqual([[undefined, false], [undefined, true]])
})

it('zdjęcie samej Drogi Mlecznej (np. Sh2-181): zakładka Wszechświat oddala kamerę do skali Grupy Lokalnej', () => {
  const milkyWayOnly = () => ({ ...comaProject(), cuts: [cut('Sh2-181', 6600, 0.1, 0.1), cut('Sh2-180', 5400, -0.1, 0)] })
  const universe = fixture('universe', milkyWayOnly()), galaxy = fixture('galaxy', milkyWayOnly())
  universe.guide.frameCamera()
  galaxy.guide.frameCamera()
  const distance = (f: ReturnType<typeof fixture>) => f.camera.position.distanceTo(f.handle.controls.target)
  // Ta sama najmniejsza odległość co kadr obiektu we Wszechświecie (Space3D: 70 j. dawnej skali × 1,08).
  expect(distance(universe)).toBeGreaterThanOrEqual(UNIVERSE_MIN_SPAN * 1.08 - 1e-6)
  expect(distance(universe) / distance(galaxy)).toBeGreaterThan(20)
})

it('hover nad znacznikiem w grupie pokazuje nazwę obiektu i chowa ją po zejściu kursora', () => {
  const created: { className: string; textContent: string; style: Record<string, string> }[] = []
  const element = () => {
    const el = { className: '', textContent: '', style: {} as Record<string, string>, classList: { toggle: vi.fn(), add: vi.fn(), remove: vi.fn(), contains: () => false }, appendChild: vi.fn(), remove: vi.fn(), addEventListener: vi.fn() }
    created.push(el)
    return el
  }
  vi.stubGlobal('document', { createElement: element })
  const f = fixture('universe')
  f.guide.frameCamera()
  f.camera.updateProjectionMatrix()
  const [layout] = f.handle.layout
  layout(0)
  const hoverEl = created.find((el) => el.className.includes('hovered'))!
  expect(hoverEl).toBeDefined()
  expect(hoverEl.style.display).toBe('none')
  // W gromadzie Abell 1656 sąsiednie galaktyki PGC są zgrupowane w plakietkę.
  f.guide.setHover('PGC 0')
  layout(16)
  expect(hoverEl.style.display).toBe('')
  expect(hoverEl.textContent).toContain('PGC 0')
  f.guide.setHover(null)
  layout(32)
  expect(hoverEl.style.display).toBe('none')
})

it('wyrównuje skalę wszystkich znaczników (w tym zaznaczonego i zgrupowanego) w nurkowaniu i przywraca ją po powrocie', () => {
  const f = fixture('universe')
  f.guide.frameCamera()
  f.camera.fov = 40
  f.camera.updateProjectionMatrix()
  const [layout] = f.handle.layout
  layout(0)
  f.guide.setSelected('LDN 1')
  const markerScale = MARK_PROJECTION_Y / f.camera.projectionMatrix.elements[5]
  const before = f.sprites.map((s) => s.scale.x)
  expect(new Set(before.map((v) => v.toFixed(6))).size).toBeGreaterThan(1)

  f.guide.placeMarkers(undefined, 1)
  for (const sprite of f.sprites) expect(sprite.scale.x).toBeCloseTo(MARK * markerScale, 8)

  f.guide.placeMarkers()
  f.sprites.forEach((sprite, i) => expect(sprite.scale.x).toBeCloseTo(before[i], 8))
})
