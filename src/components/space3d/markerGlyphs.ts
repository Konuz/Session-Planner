// Znaczniki obiektów w scenach „Pozycja 3D”: symbole jak w atlasach nieba (kształt mówi o typie, kolor z ustawień
// adnotacji), puste w środku, żeby nie zasłaniały sceny. Zastępują jednakowe tarcze „okrąg z kropką”.
import * as THREE from 'three'
import type { ObjectType } from '../../lib/catalog'

const SIZE = 96
const C = SIZE / 2

type Path = (g: CanvasRenderingContext2D) => void

const circle = (r: number): Path => (g) => { g.moveTo(C + r, C); g.arc(C, C, r, 0, Math.PI * 2) }
const square = (half: number): Path => (g) => g.rect(C - half, C - half, half * 2, half * 2)
const ellipse: Path = (g) => { g.moveTo(C + 36 * Math.cos(-0.5), C + 36 * Math.sin(-0.5)); g.ellipse(C, C, 36, 17, -0.5, 0, Math.PI * 2) }
const cross = (r: number): Path => (g) => { g.moveTo(C - r, C); g.lineTo(C + r, C); g.moveTo(C, C - r); g.lineTo(C, C + r) }
const whiskers = (from: number, to: number): Path => (g) => {
  for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.moveTo(C + x * from, C + y * from); g.lineTo(C + x * to, C + y * to) }
}
const diamond: Path = (g) => { g.moveTo(C, C - 34); g.lineTo(C + 34, C); g.lineTo(C, C + 34); g.lineTo(C - 34, C); g.closePath() }

/** Symbol typu: części rysowane linią ciągłą i (osobno) przerywaną. */
const GLYPHS: Record<ObjectType, { solid?: Path[]; dashed?: Path[]; dash?: number[] }> = {
  G: { solid: [ellipse] },
  GG: { dashed: [ellipse], dash: [12, 9] },
  OC: { dashed: [circle(30)], dash: [3, 12] },
  GC: { solid: [circle(30), cross(30)] },
  EN: { solid: [square(29)] },
  RN: { solid: [square(29)] },
  CN: { solid: [square(31)], dashed: [circle(17)], dash: [3, 10] },
  DN: { dashed: [square(29)], dash: [13, 9] },
  PN: { solid: [circle(19), whiskers(19, 38)] },
  SNR: { dashed: [circle(30)], dash: [20, 11] },
  X: { solid: [diamond] },
}

function drawCanvas(draw: (stroke: (paths: Path[], dash?: number[]) => void) => void, color: string, canvas = document.createElement('canvas')): HTMLCanvasElement {
  canvas.width = canvas.height = SIZE
  const g = canvas.getContext('2d')!
  g.lineCap = 'round'
  g.lineJoin = 'round'
  // Najpierw ciemna otoczka (czytelność na jasnym tle Drogi Mlecznej), potem kolor typu.
  for (const [style, width] of [['rgba(2, 5, 13, 0.7)', 10], [color, 4.5]] as const) {
    g.strokeStyle = style
    g.lineWidth = width
    draw((paths, dash = []) => {
      g.setLineDash(dash)
      g.beginPath()
      for (const path of paths) path(g)
      g.stroke()
    })
  }
  return canvas
}

/** Symbol atlasowy typu obiektu w podanym kolorze. */
export function glyphTexture(type: ObjectType, color: string): THREE.CanvasTexture {
  const map = new THREE.CanvasTexture(glyphCanvas(type, color))
  map.colorSpace = THREE.SRGBColorSpace
  return map
}

export function glyphCanvas(type: ObjectType, color: string, canvas?: HTMLCanvasElement): HTMLCanvasElement {
  const { solid, dashed, dash } = GLYPHS[type]
  return drawCanvas((stroke) => {
    if (solid) stroke(solid)
    if (dashed) stroke(dashed, dash)
  }, color, canvas)
}

/** Podwójny grot: obiekty leżą dalej na linii widzenia, poza skalą sceny. */
export function beyondTexture(color: string): THREE.CanvasTexture {
  const chevron = (x: number): Path => (g) => { g.moveTo(x - 14, C - 26); g.lineTo(x + 12, C); g.lineTo(x - 14, C + 26) }
  const map = new THREE.CanvasTexture(drawCanvas((stroke) => stroke([chevron(C - 12), chevron(C + 16)]), color))
  map.colorSpace = THREE.SRGBColorSpace
  return map
}

/** Sprite znacznika o stałej wielkości na ekranie (ok. 3% wysokości kadru). */
export function glyphSprite(map: THREE.Texture, scale = 0.03): THREE.Sprite {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: false, sizeAttenuation: false }))
  sprite.scale.setScalar(scale)
  sprite.renderOrder = 5
  return sprite
}
