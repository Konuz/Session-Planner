// Znaczniki obiektów w scenach „Pozycja 3D”: galaktyki (G, GG) mają kształt elipsy, pozostałe typy — ciągłe okręgi,
// w kolorach z ustawień adnotacji (puste w środku, żeby nie zasłaniały sceny).
import * as THREE from 'three'
import type { ObjectType } from '../../lib/catalog'

const SIZE = 96
const C = SIZE / 2

type Path = (g: CanvasRenderingContext2D) => void
type Glyph = { solid?: Path[]; dashed?: Path[]; dash?: number[] }

const circle = (r: number): Path => (g) => { g.moveTo(C + r, C); g.arc(C, C, r, 0, Math.PI * 2) }
const ellipse: Path = (g) => { g.moveTo(C + 36 * Math.cos(-0.5), C + 36 * Math.sin(-0.5)); g.ellipse(C, C, 36, 17, -0.5, 0, Math.PI * 2) }

/** Domyślny znacznik wszystkich obiektów poza galaktykami: czysty ciągły okrąg. */
const RING: Glyph = { solid: [circle(30)] }

/** Symbol typu: pojedyncze galaktyki — elipsa ciągła, grupy — przerywana, reszta — okrąg. */
const GLYPHS: Record<ObjectType, Glyph> = {
  G: { solid: [ellipse] },
  GG: { dashed: [ellipse], dash: [12, 9] },
  OC: RING,
  GC: RING,
  EN: RING,
  RN: RING,
  CN: RING,
  DN: RING,
  PN: RING,
  SNR: RING,
  X: RING,
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
