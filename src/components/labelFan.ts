// Wachlarz nazw grupy nakładających się podpisów (Obserwatorium i sceny „Pozycja 3D”): ramiona przy bocznej ścianie
// ramki klastra, zgodnie z ruchem wskazówek zegara, w kolejności podanej przez wywołującego (zwykle według odległości).
// Geometria w src/lib/labelGroups.ts; tu tylko DOM, wskazanie, wybór i zamykanie klawiszem Esc.
import { fanLayout, type LabelBox } from '../lib/labelGroups'
import { photoCropSquare } from '../lib/photo'

/** Odstęp osi ramion na zewnętrznym końcu (28 px wysokości paska + 2 px przerwy), maksymalna liczba ramion i odstępy od ramki/brzegu. */
export const SPOKE_PITCH = 30
export const FAN_MAX = 40
const WALL_GAP = 2
const EDGE_PAD = 4

export function relativeBox(el: HTMLElement, container: HTMLElement, fallback: LabelBox): LabelBox {
  if (typeof el.getBoundingClientRect !== 'function' || typeof container.getBoundingClientRect !== 'function') return fallback
  const rect = el.getBoundingClientRect()
  if (!(rect.width > 0 || rect.height > 0)) return fallback
  const origin = container.getBoundingClientRect()
  return { left: rect.left - origin.left, top: rect.top - origin.top, right: rect.right - origin.left, bottom: rect.bottom - origin.top }
}

export interface FanCutout {
  image: string
  width: number
  height: number
  x: number
  y: number
  radius: number
}

export interface FanEntry { id: string; text: string; cutout?: FanCutout }

function cutoutPreview(cutout: FanCutout): SVGSVGElement {
  const { image, width, height } = cutout
  const { x, y, side } = photoCropSquare(cutout, width, height)
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.classList.add('obs-spoke-cutout')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('viewBox', `${x} ${y} ${side} ${side}`)
  const photo = document.createElementNS(ns, 'image')
  photo.setAttribute('href', image)
  photo.setAttribute('width', String(width))
  photo.setAttribute('height', String(height))
  photo.setAttribute('preserveAspectRatio', 'none')
  svg.appendChild(photo)
  return svg
}

export interface LabelFan {
  setSelected(id: string | null): void
  close(): void
}

interface FanOptions {
  /** Ramię pod kursorem (null po zejściu z niego). */
  hover(id: string | null): void
  pick(id: string): void
  /** Wachlarz zamknięty (Esc albo close()). */
  closed(): void
}

/**
 * Otwiera wachlarz w `container` (warstwa podpisów z klasą `fan-open`) przy bocznej ścianie ramki `anchor`; środek
 * odsuwa się od brzegów obszaru width × height tak, żeby mieściły się całe ramiona.
 */
export function openLabelFan(container: HTMLElement, entries: FanEntry[], anchor: LabelBox, width: number, height: number, on: FanOptions): LabelFan {
  const listed = entries.slice(0, FAN_MAX)
  const remaining = entries.length - listed.length
  const root = document.createElement('div')
  root.className = 'obs-fan'
  root.setAttribute('role', 'menu')
  root.setAttribute('aria-label', 'Obiekty grupy według odległości')
  const byId = new Map<string, HTMLButtonElement>()
  let hovered: string | null = null
  const buttons = listed.map((entry) => {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'obs-spoke'
    el.textContent = entry.text
    if (entry.cutout) el.appendChild(cutoutPreview(entry.cutout))
    el.setAttribute('role', 'menuitem')
    el.addEventListener('pointerenter', () => { hovered = entry.id; on.hover(entry.id) })
    el.addEventListener('pointerleave', () => { if (hovered === entry.id) { hovered = null; on.hover(null) } })
    el.addEventListener('click', () => on.pick(entry.id))
    byId.set(entry.id, el)
    root.appendChild(el)
    return el
  })
  container.appendChild(root)
  const spokeWidth = Math.max(0, ...buttons.map((button) => button.offsetWidth))
  const anchorX = (anchor.left + anchor.right) / 2
  const anchorY = (anchor.top + anchor.bottom) / 2
  const halfW = Math.max(0, (anchor.right - anchor.left) / 2)
  const wallOffset = halfW + WALL_GAP
  const leftLayout = fanLayout(listed.length, SPOKE_PITCH, spokeWidth, { wallOffset, side: 'left' })
  const leftReach = Math.hypot(leftLayout.radius + spokeWidth, 14) - leftLayout.pivotShift
  const oneSide = !leftLayout.spokes.some((spoke) => !spoke.left)
  const layout = oneSide && anchorX - leftReach < EDGE_PAD && width - anchor.right > anchor.left
    ? fanLayout(listed.length, SPOKE_PITCH, spokeWidth, { wallOffset, side: 'right' })
    : leftLayout
  const { radius, pivotShift, maxHalfArc, spokes } = layout
  const outerRadius = radius + spokeWidth
  const reach = Math.hypot(outerRadius, 14) - pivotShift
  const clamp = (value: number, lo: number, hi: number) => lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, value))
  const rise = outerRadius * Math.sin(maxHalfArc) + 14 * Math.cos(maxHalfArc) + 4
  const hasLeft = spokes.some((spoke) => spoke.left)
  const hasRight = spokes.some((spoke) => !spoke.left)
  const cx = clamp(anchorX, hasLeft ? reach + EDGE_PAD : EDGE_PAD, hasRight ? width - reach - EDGE_PAD : width - EDGE_PAD)
  const cy = clamp(anchorY, rise, height - rise)
  buttons.forEach((el, i) => {
    const { angle, left } = spokes[i]
    const px = left ? cx + pivotShift : cx - pivotShift
    el.classList.toggle('left', left)
    el.style.width = `${spokeWidth}px`
    el.style.transform = left
      ? `translate(${px.toFixed(1)}px, ${cy.toFixed(1)}px) rotate(${(angle - Math.PI).toFixed(4)}rad) translate(calc(-100% - ${radius.toFixed(1)}px), -50%)`
      : `translate(${px.toFixed(1)}px, ${cy.toFixed(1)}px) rotate(${angle.toFixed(4)}rad) translate(${radius.toFixed(1)}px, -50%)`
  })
  if (remaining > 0) {
    const counter = document.createElement('span')
    counter.className = 'obs-fan-more'
    counter.textContent = `+${remaining} na liście`
    counter.style.left = `${cx}px`
    counter.style.top = `${Math.max(4, cy - rise + 32)}px`
    root.appendChild(counter)
  }
  container.classList.add('fan-open')
  let open = true
  // Faza przechwytywania: Esc zamyka tylko wachlarz, nie całe okno.
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    fan.close()
  }
  window.addEventListener('keydown', onKey, true)
  const fan: LabelFan = {
    setSelected(id) { for (const [spokeId, spoke] of byId) spoke.classList.toggle('selected', spokeId === id) },
    close() {
      if (!open) return
      open = false
      window.removeEventListener('keydown', onKey, true)
      root.remove()
      if (!container.querySelector(':scope > .obs-fan')) container.classList.remove('fan-open')
      if (hovered !== null) { hovered = null; on.hover(null) }
      on.closed()
    },
  }
  return fan
}
