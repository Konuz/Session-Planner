// Podpisy w DOM nad sceną Space3D (znaczniki zdjęcia w Drodze Mlecznej, okno zdjęcia we Wszechświecie lokalnym):
// każdy stoi przy swoim punkcie, w miejscu, które nie zasłania innego podpisu ani znacznika; w ciasnej grupie podpisy
// odsuwają się w kolumny i dostają odnośnik. Podczas ruchu kamery podpis trzyma swoje miejsce względem punktu
// (jedzie sztywno ze znacznikiem); układ porządkuje się dopiero po zatrzymaniu kamery, płynnym przejściem.
// Wywoływane z haka `layout` sceny, czyli po ustawieniu kamery w tej samej klatce.
import * as THREE from 'three'
import type { Space3DHandle } from '../Space3D'

export interface SceneLabel {
  /** Punkt w scenie; żywa referencja (np. położenie znacznika przesuwanego w nurkowaniu). */
  position: THREE.Vector3
  el: HTMLDivElement
  /** Kreska od punktu do odsuniętego podpisu. */
  leader: HTMLDivElement
  width: number
  height: number
  /** Odstęp podpisu od punktu w pikselach (promień znacznika). */
  gap: number
  /** Podpis wyłączony (np. zaznaczenia, gdy nic nie zaznaczono); po zmianie wywołaj invalidate(). */
  hidden?: boolean
  /** Miejsce względem punktu (indeks z listy miejsc), poprzednie miejsce i czas rozpoczęcia przejścia między nimi. */
  spot: number
  from: number
  moved: number
  /** Podpis był widoczny w poprzednim przeliczeniu (nowo pokazany dostaje miejsce od razu). */
  shown: boolean
}

/** Wymiary podpisu w pikselach z kroju 10 px (ok. 6,1 px na znak, wiersze po 13,5 px, obramowanie) zamiast pomiaru układu. */
export function setLabelText(label: SceneLabel, lines: string[]) {
  label.el.textContent = lines.join('\n')
  label.width = Math.max(...lines.map((line) => line.length)) * 6.1 + 17
  label.height = lines.length * 13.5 + 8
}

/** Przy punkcie: z prawej, z lewej, nad nim i pod nim; dalej kolumny z obu stron w siedmiu pierścieniach. */
const SPOTS = 4 + 7 * 4
/** Kamera stoi tyle ms, zanim układ się uporządkuje; tyle trwa przejście podpisu na nowe miejsce. */
const REST_MS = 220
const MOVE_MS = 200

/** Lewy górny róg podpisu względem punktu dla danego miejsca. */
function spotOffset({ width: lw, height: lh, gap }: SceneLabel, index: number): [number, number] {
  if (index === 0) return [gap, -9]
  if (index === 1) return [-gap - lw, -9]
  if (index === 2) return [-lw / 2, -gap - 1 - lh]
  if (index === 3) return [-lw / 2, gap + 1]
  const i = index - 4, ring = (i >> 2) + 1
  return [i & 1 ? -gap - ring * 9 - lw : gap + ring * 9, -lh / 2 + (i & 2 ? ring : -ring) * (lh + 4)]
}

/** Ta sama kamera z dokładnością do niewidocznych zmian (tłumienie OrbitControls dogasa jeszcze przez sekundy). */
function same(a: THREE.Matrix4, b: THREE.Matrix4): boolean {
  for (let i = 0; i < 16; i++) if (Math.abs(a.elements[i] - b.elements[i]) > 1e-6 * Math.max(1, Math.abs(b.elements[i]))) return false
  return true
}

export interface LabelLayer {
  root: HTMLDivElement
  add(position: THREE.Vector3, lines: string[], options?: { className?: string; color?: string; gap?: number }): SceneLabel
  clear(): void
  setVisible(visible: boolean): void
  /** Co klatkę (hak `layout` sceny, z czasem klatki): tani test zmiany, przeliczenie tylko gdy trzeba. */
  update(now: number): void
  /** Wymusza przeliczenie przy następnym update (zmiana położeń punktów albo treści bez ruchu kamery). */
  invalidate(): void
  dispose(): void
}

interface Box { left: number; top: number; right: number; bottom: number; owner: SceneLabel }

export function createLabelLayer(handle: Space3DHandle, className: string): LabelLayer {
  const root = document.createElement('div')
  root.className = `obs-labels ${className}`
  handle.mount.appendChild(root)
  let labels: SceneLabel[] = []
  let visible = true, dirty = true, stale = true, lastW = 0, lastH = 0, lastMove = -Infinity
  const lastCamera = new THREE.Matrix4(), lastProjection = new THREE.Matrix4()
  const v = new THREE.Vector3()
  return {
    root,
    add(position, lines, { className: extra = '', color, gap = 13 } = {}) {
      const el = document.createElement('div')
      el.className = `obs-label space-photo-label ${extra}`
      const leader = document.createElement('div')
      leader.className = 'obs-leader'
      if (color) el.style.borderLeftColor = leader.style.background = color
      root.appendChild(leader)
      root.appendChild(el)
      const label: SceneLabel = { position, el, leader, gap, width: 0, height: 0, spot: 0, from: 0, moved: -Infinity, shown: false }
      setLabelText(label, lines)
      labels.push(label)
      dirty = true
      return label
    },
    clear() {
      for (const label of labels) { label.el.remove(); label.leader.remove() }
      labels = []
      dirty = true
    },
    setVisible(next) {
      visible = next
      root.style.display = next ? '' : 'none'
      dirty = true
    },
    invalidate() { dirty = true },
    update(now) {
      const { camera, mount } = handle
      const w = mount.clientWidth, h = mount.clientHeight
      const moved = w !== lastW || h !== lastH || !same(lastCamera, camera.matrixWorld) || !same(lastProjection, camera.projectionMatrix)
      if (moved) {
        lastMove = now
        stale = true
        lastW = w; lastH = h
        lastCamera.copy(camera.matrixWorld)
        lastProjection.copy(camera.projectionMatrix)
      }
      const rested = stale && now - lastMove >= REST_MS
      if (!moved && !dirty && !rested && !labels.some((label) => now - label.moved < MOVE_MS)) return
      const points = labels.flatMap((label) => {
        v.copy(label.position).project(camera)
        const on = visible && !label.hidden && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1
        label.el.style.display = on ? '' : 'none'
        label.leader.style.display = 'none'
        const fresh = on && !label.shown
        label.shown = on
        return on ? [{ label, x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h, fresh }] : []
      })
      // Układ: po zatrzymaniu kamery wszystkie podpisy, w ruchu tylko nowo pokazane (reszta trzyma swoje miejsca).
      const placing = points.filter((p) => rested || p.fresh)
      if (placing.length) {
        const box = ({ label, x, y }: (typeof points)[number], spot: number): Box => {
          const [dx, dy] = spotOffset(label, spot)
          return { left: x + dx, top: y + dy, right: x + dx + label.width, bottom: y + dy + label.height, owner: label }
        }
        // Zajęte: same znaczniki (podpis nie zasłania cudzego punktu) i podpisy, które zostają na miejscu.
        const boxes: Box[] = points.map(({ label, x, y }) => ({ left: x - label.gap * 0.7, top: y - label.gap * 0.7, right: x + label.gap * 0.7, bottom: y + label.gap * 0.7, owner: label }))
        for (const p of points) if (!placing.includes(p)) boxes.push(box(p, p.label.spot))
        for (const p of placing) {
          const { label } = p
          const free = (spot: number) => { const c = box(p, spot); return !boxes.some((b) => b.owner !== label && c.left < b.right && c.right > b.left && c.top < b.bottom && c.bottom > b.top) }
          // Podpis stojący przy punkcie zostaje, dopóki jest wolny; odsunięty wraca bliżej, gdy zrobi się miejsce.
          let spot = !p.fresh && label.spot < 4 && free(label.spot) ? label.spot : -1
          for (let i = 0; spot < 0 && i < SPOTS; i++) if (free(i)) spot = i
          if (spot < 0) spot = p.fresh ? 0 : label.spot
          if (spot !== label.spot) {
            label.from = p.fresh ? spot : label.spot
            label.moved = p.fresh ? -Infinity : now
            label.spot = spot
          }
          boxes.push(box(p, spot))
        }
      }
      if (rested) stale = false
      dirty = false
      for (const { label, x, y } of points) {
        const t = Math.min(1, (now - label.moved) / MOVE_MS)
        const e = t * t * (3 - 2 * t)
        const [ax, ay] = spotOffset(label, label.from), [bx, by] = spotOffset(label, label.spot)
        // Całe piksele: tekst nie migocze przy ułamkowych przesunięciach.
        const lx = Math.round(x + ax + (bx - ax) * e), ly = Math.round(y + ay + (by - ay) * e)
        label.el.style.transform = `translate(${lx}px, ${ly}px)`
        if (label.spot < 4 && (t >= 1 || label.from < 4)) continue
        // Odnośnik: od brzegu znacznika do najbliższego punktu ramki podpisu.
        const ex = Math.max(lx, Math.min(lx + label.width, x)), ey = Math.max(ly, Math.min(ly + label.height, y))
        const length = Math.hypot(ex - x, ey - y), start = label.gap * 0.7
        if (length <= start + 2) continue
        const angle = Math.atan2(ey - y, ex - x)
        label.leader.style.display = ''
        label.leader.style.width = `${(length - start).toFixed(1)}px`
        label.leader.style.transform = `translate(${(x + Math.cos(angle) * start).toFixed(1)}px, ${(y + Math.sin(angle) * start).toFixed(1)}px) rotate(${angle.toFixed(4)}rad)`
      }
    },
    dispose() { root.remove() },
  }
}
