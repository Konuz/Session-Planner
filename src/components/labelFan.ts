// Wachlarz nazw grupy nakładających się podpisów (Obserwatorium i sceny „Pozycja 3D”): ramiona wokół punktu ekranu
// zgodnie z ruchem wskazówek zegara, w kolejności podanej przez wywołującego (zwykle według odległości). Geometria
// w src/lib/labelGroups.ts; tu tylko DOM, wskazanie, wybór i zamykanie klawiszem Esc.
import { FAN_HALF, fanLayout } from '../lib/labelGroups'

/** Wysokość wiersza ramienia, szerokość znaku kroju 10 px i największa liczba ramion (reszta zostaje na liście). */
export const SPOKE_PITCH = 17
export const FAN_CHAR_PX = 6.1
export const FAN_MAX = 40

export interface FanEntry { id: string; text: string }

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
 * Otwiera wachlarz w `container` (warstwa podpisów, klasa `fan-open` przygasza resztę) wokół punktu (x, y); środek
 * odsuwa się od brzegów obszaru width × height tak, żeby mieściły się całe ramiona.
 */
export function openLabelFan(container: HTMLElement, entries: FanEntry[], x: number, y: number, width: number, height: number, on: FanOptions): LabelFan {
  const listed = entries.slice(0, FAN_MAX)
  const texts = listed.map((entry) => entry.text)
  if (entries.length > listed.length) texts.push(`+${entries.length - listed.length} na liście`)
  const { radius, spokes } = fanLayout(texts.length, SPOKE_PITCH)
  const reach = radius + Math.max(...texts.map((text) => text.length)) * FAN_CHAR_PX + 16
  const clamp = (value: number, lo: number, hi: number) => lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, value))
  const rise = reach * Math.sin(FAN_HALF) + SPOKE_PITCH
  const cx = clamp(x, spokes.some((spoke) => spoke.left) ? reach + 4 : 4, width - reach - 4)
  const cy = clamp(y, rise, height - rise)
  const root = document.createElement('div')
  root.className = 'obs-fan'
  root.setAttribute('role', 'menu')
  root.setAttribute('aria-label', 'Obiekty grupy według odległości')
  const byId = new Map<string, HTMLButtonElement>()
  let hovered: string | null = null
  texts.forEach((text, i) => {
    const entry = listed[i] as FanEntry | undefined
    const { angle, left } = spokes[i]
    const el = document.createElement('button')
    el.type = 'button'
    el.className = `obs-spoke${entry ? '' : ' more'}`
    el.textContent = text
    el.style.transform = left
      ? `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) rotate(${(angle - Math.PI).toFixed(4)}rad) translate(calc(-100% - ${radius.toFixed(1)}px), -50%)`
      : `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) rotate(${angle.toFixed(4)}rad) translate(${radius.toFixed(1)}px, -50%)`
    if (entry) {
      el.setAttribute('role', 'menuitem')
      el.addEventListener('pointerenter', () => { hovered = entry.id; on.hover(entry.id) })
      el.addEventListener('pointerleave', () => { if (hovered === entry.id) { hovered = null; on.hover(null) } })
      el.addEventListener('click', () => on.pick(entry.id))
      byId.set(entry.id, el)
    } else el.disabled = true
    root.appendChild(el)
  })
  container.appendChild(root)
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
      container.classList.remove('fan-open')
      if (hovered !== null) { hovered = null; on.hover(null) }
      on.closed()
    },
  }
  return fan
}
