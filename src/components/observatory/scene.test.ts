import * as THREE from 'three'
import { expect, it } from 'vitest'
import { ObservatoryScene } from './scene'
import type { ObservatoryItem } from '../../lib/observatory'
import { MARK, MARK_PROJECTION_Y } from '../space3d/photoGuide'

// Prawdziwe obiekty Three.js; pomijamy tylko konstruktor wymagający DOM i kontekstu WebGL.
function fixture() {
  const item: ObservatoryItem = {
    id: 'obiekt', kind: 'object', category: 'nebulae', type: 'EN', x: 750, y: 125, radius: 100,
    distLy: 10000, distLoLy: null, distHiLy: null, gMag: null, bpRp: null, parallaxOverError: null,
    raDeg: 0, decDeg: 0, source: '', method: '', ref: '', scope: 'object',
  }
  const star: ObservatoryItem = { ...item, id: 'gwiazda', kind: 'star', type: null, category: 'stars', x: 500, y: 250, distLy: 1000 }
  const geometry = new THREE.BufferGeometry()
  const positions = new THREE.BufferAttribute(new Float32Array(3), 3)
  const alphas = new THREE.BufferAttribute(new Float32Array(1), 1)
  geometry.setAttribute('position', positions)
  geometry.setAttribute('alpha', alphas)
  const card = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.Texture() }))
  const anchor = new THREE.Sprite(new THREE.SpriteMaterial())
  const ring = new THREE.Sprite(new THREE.SpriteMaterial())
  const cutPreview = new THREE.Sprite(new THREE.SpriteMaterial())
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial())
  const frame = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial())
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000)
  camera.position.set(100, 100, 300)
  camera.lookAt(0, 0, 0)
  const rendered: number[] = []
  const host = { clientWidth: 600, clientHeight: 600 }
  const sizes: number[][] = []
  const scene: ObservatoryScene = Object.create(ObservatoryScene.prototype)
  Object.assign(scene, {
    scene: new THREE.Scene(), camera, host, external: true, dirty: false, progress: 0, arrival: 1,
    items: [item, star], image: { width: 1000, height: 500 }, domain: { minLy: 100, maxLy: 10000 },
    visible: new Set([item.id, star.id]), selected: null, stars: new THREE.Points(geometry), starIndex: [1],
    cards: new Map([[item.id, card]]), anchors: new Map([[item.id, anchor]]), ring, cutPreview, photo, frame,
    grid: new THREE.GridHelper(), axis: new THREE.Group(), ticks: [],
    fade: { earth: 1, pyramid: 1, axis: 1, photo: 1, grid: 1 },
    labels: { style: { setProperty() {} }, querySelector: () => null }, itemLabels: new Map(), labelWidths: new Map(), badges: [], fan: null, hovered: null, earthLabel: { style: {} },
    renderer: {
      setSize: (width: number, height: number) => sizes.push([width, height]),
      render: () => rendered.push(card.position.z),
      domElement: { clientWidth: 600, clientHeight: 600, style: {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 600 }) },
    },
  })
  return { scene, camera, positions, alphas, card, anchor, ring, cutPreview, photo, rendered, host, sizes, item }
}

it('pokazuje wycinek w pierścieniu zaznaczenia w Drodze Mlecznej i po wskazaniu obiektu spoza niej', () => {
  const { scene, item, card, ring, cutPreview } = fixture()
  scene.setSelected(item.id)
  scene.step(100)
  expect(cutPreview.visible).toBe(true)
  expect(cutPreview.material.map).toBe(card.material.map)
  expect(cutPreview.position.toArray()).toEqual(ring.position.toArray())

  item.distLy = 10e6
  scene.setProgress(0.5)
  scene.step(116)
  expect(cutPreview.visible).toBe(false)

  Reflect.set(scene, 'hovered', item.id)
  scene.setProgress(1)
  scene.step(132)
  expect(cutPreview.visible).toBe(true)
  expect(cutPreview.material.map).toBe(card.material.map)

  Reflect.set(scene, 'hovered', null)
  scene.setVisible(new Set([item.id]))
  scene.step(148)
  expect(cutPreview.visible).toBe(false)
})

it('łączy zmiany postępu, krycia i zaznaczenia w jedną aktualizację buforów przed rysowaniem', () => {
  const { scene, camera, positions, alphas, card, anchor, ring, photo, rendered } = fixture()
  scene.setProgress(0.25)
  scene.setProgress(0.5)
  scene.setFade({ photo: 0.7 }, 0.3)
  scene.setSelected('obiekt')
  expect(positions.version).toBe(0)
  scene.step(100)
  expect(positions.version).toBe(1)
  expect(alphas.version).toBe(1)
  expect(Array.from(positions.array)).toEqual([0, 0, -100])
  expect(alphas.getX(0)).toBeCloseTo(0.4375)
  expect(card.position.toArray()).toEqual([25, 12.5, expect.closeTo(-43.2, 9)])
  expect(anchor.position.toArray()).toEqual([25, 12.5, -200])
  expect(anchor.scale.x).toBeCloseTo(MARK * MARK_PROJECTION_Y / camera.projectionMatrix.elements[5])
  expect(ring.position.toArray()).toEqual([25, 12.5, -200])
  expect(card.scale.x).toBeCloseTo(19.352)
  expect(card.material.opacity).toBeCloseTo(0.6804)
  expect(photo.material.opacity).toBeCloseTo(0.638008)
  expect(rendered).toEqual([expect.closeTo(-43.2, 9)])
  scene.step(116)
  expect(positions.version).toBe(1)
  expect(rendered).toHaveLength(1)
  // Krycia nurkowania co klatkę przy stałym postępie: tylko bufor krycia gwiazd, bez przeliczania pozycji.
  scene.setFade({ photo: 0.35 }, 0.3)
  scene.step(132)
  expect(positions.version).toBe(1)
  expect(alphas.version).toBe(2)
  expect(alphas.getX(0)).toBeCloseTo(0.21875)
})

it('wybór kursorem uwzględnia aktualną widoczność i pozycję przed następną klatką', () => {
  const { scene, camera } = fixture()
  scene.setProgress(1)
  scene.setFade({ photo: 1 }, 1)
  scene.setVisible(new Set(['obiekt']))
  const screen = new THREE.Vector3(25, 12.5, -400).project(camera)
  expect(scene.pick((screen.x + 1) * 300, (1 - screen.y) * 300)).toBe('obiekt')
  scene.setVisible(new Set())
  expect(scene.pick((screen.x + 1) * 300, (1 - screen.y) * 300)).toBeNull()
})

it('wcześniej zwiększa krycie wycinka Drogi Mlecznej podczas rozkładania zdjęcia', () => {
  const { scene, item, card } = fixture()
  scene.setProgress(0.25)
  scene.step(100)
  expect(card.material.opacity).toBeCloseTo(0.625)

  item.distLy = 10e6
  scene.setProgress(0.2)
  scene.step(116)
  expect(card.material.opacity).toBeCloseTo(0.26)
})

it('w przejściu zmienia co klatkę tylko proporcje kamery, a bufor rysowania po ustaniu zmian rozmiaru', () => {
  const { scene, host, sizes, camera, rendered } = fixture()
  // Stan po konstruktorze: bufor dopasowany do płótna.
  Object.assign(scene, { sizedWidth: 600, sizedHeight: 600, bufferWidth: 600, bufferHeight: 600, steadyFrames: 0 })
  scene.setProgress(0.5)
  scene.step(100)
  expect(rendered).toHaveLength(1)
  // Panele wsuwają się: płótno zwęża się w kolejnych klatkach, kamera nadąża bez nowego bufora.
  host.clientWidth = 420
  scene.step(116)
  expect(camera.aspect).toBe(0.7)
  host.clientWidth = 400
  scene.step(132)
  expect(camera.aspect).toBeCloseTo(400 / 600, 12)
  expect(sizes).toEqual([])
  expect(rendered).toHaveLength(3)
  // Dwie klatki bez zmiany: jeden nowy bufor i klatka w nim.
  scene.step(148)
  expect(sizes).toEqual([])
  scene.step(164)
  expect(sizes).toEqual([[400, 600]])
  expect(rendered).toHaveLength(4)
  scene.step(180)
  expect(sizes).toHaveLength(1)
  expect(rendered).toHaveLength(4)
  // Panele zwijają się (powrót): rosnące płótno dostaje od razu bufor z zapasem, potem jeden dokładny.
  host.clientWidth = 480
  scene.step(196)
  expect(sizes).toEqual([[400, 600], [600, 600]])
  host.clientWidth = 560
  scene.step(212)
  expect(sizes).toHaveLength(2)
  host.clientWidth = 640
  scene.step(228)
  expect(sizes).toEqual([[400, 600], [600, 600], [800, 600]])
  scene.step(244)
  scene.step(260)
  expect(sizes).toEqual([[400, 600], [600, 600], [800, 600], [640, 600]])
  // Poza przejściem (ResizeObserver, własna pętla) bufor nadąża od razu; ten sam rozmiar nie wymaga nowego rysowania.
  const resize = Reflect.get(scene, 'resize') as (defer?: boolean) => boolean
  expect(resize.call(scene)).toBe(false)
  host.clientWidth = 500
  expect(resize.call(scene)).toBe(true)
  expect(sizes.at(-1)).toEqual([500, 600])
})
