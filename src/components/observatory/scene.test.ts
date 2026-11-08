import * as THREE from 'three'
import { expect, it } from 'vitest'
import { ObservatoryScene } from './scene'
import type { ObservatoryItem } from '../../lib/observatory'

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
  const card = new THREE.Sprite(new THREE.SpriteMaterial())
  const anchor = new THREE.Sprite(new THREE.SpriteMaterial())
  const ring = new THREE.Sprite(new THREE.SpriteMaterial())
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
    cards: new Map([[item.id, card]]), anchors: new Map([[item.id, anchor]]), ring, photo, frame,
    anchorMaterial: new THREE.SpriteMaterial(), grid: new THREE.GridHelper(), axis: new THREE.Group(), ticks: [],
    fade: { earth: 1, pyramid: 1, axis: 1, photo: 1, grid: 1 },
    labels: { style: { setProperty() {} }, querySelector: () => null }, itemLabels: new Map(), earthLabel: { style: {} },
    renderer: {
      setSize: (width: number, height: number) => sizes.push([width, height]),
      render: () => rendered.push(card.position.z),
      domElement: { clientWidth: 600, clientHeight: 600, style: {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 600 }) },
    },
  })
  return { scene, camera, positions, alphas, card, anchor, ring, photo, rendered, host, sizes }
}

it('łączy zmiany postępu, krycia i zaznaczenia w jedną aktualizację buforów przed rysowaniem', () => {
  const { scene, positions, alphas, card, anchor, ring, photo, rendered } = fixture()
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
  expect(ring.position.toArray()).toEqual([25, 12.5, -200])
  expect(card.scale.x).toBeCloseTo(19.352)
  expect(card.material.opacity).toBeCloseTo(0.6804)
  expect(photo.material.opacity).toBeCloseTo(0.638008)
  expect(rendered).toEqual([expect.closeTo(-43.2, 9)])
  scene.step(116)
  expect(positions.version).toBe(1)
  expect(rendered).toHaveLength(1)
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

it('dopasowuje bufor i kamerę przed klatką, bez ponownego czyszczenia tego samego rozmiaru', () => {
  const { scene, host, sizes, camera, rendered } = fixture()
  scene.setProgress(0.5)
  scene.step(100)
  expect(sizes).toEqual([[600, 600]])
  host.clientWidth = 420
  scene.step(116)
  expect(sizes).toEqual([[600, 600], [420, 600]])
  expect(camera.aspect).toBe(0.7)
  expect(rendered).toHaveLength(2)
  // ResizeObserver przychodzi po rAF; bufor ma już właściwy rozmiar i nie wymaga nowego rysowania.
  const resize = Reflect.get(scene, 'resize') as () => boolean
  expect(resize.call(scene)).toBe(false)
  scene.step(132)
  expect(sizes).toHaveLength(2)
  expect(rendered).toHaveLength(2)
})
