// Podpisy w DOM nad sceną Space3D (znaczniki zdjęcia w Drodze Mlecznej, okno zdjęcia we Wszechświecie lokalnym):
// każdy stoi przy swoim punkcie, w miejscu, które nie zasłania innego podpisu ani znacznika; w ciasnej grupie podpisy
// odsuwają się w kolumny i dostają odnośnik. Podczas ruchu kamery podpis trzyma swoje miejsce względem punktu
// (jedzie sztywno ze znacznikiem); układ porządkuje się dopiero po zatrzymaniu kamery, płynnym przejściem.
// Podpisy obiektów (z `id`), które na ekranie nachodzą na siebie, łączą się w plakietkę grupy („N obiektów” i zakres
// odległości); plakietka otwiera wachlarz nazw (labelFan.ts). Grupy przeliczają się razem z układem, po zatrzymaniu kamery.
// Wywoływane z haka `layout` sceny, czyli po ustawieniu kamery w tej samej klatce.
import * as THREE from 'three'
import { fmtDistance, fmtDistanceRange } from '../../lib/format'
import { objectCount, overlapGroups, type LabelBox } from '../../lib/labelGroups'
import { openLabelFan, type FanCutout, type LabelFan } from '../labelFan'
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
  /** Obiekt podpisu: tylko takie podpisy łączą się w grupy. */
  id?: string
  distLy?: number
  cutout?: FanCutout
  /** Podpis poza grupami (np. zaznaczony obiekt): zawsze osobno. Po zmianie wywołaj invalidate(). */
  pinned?: boolean
  /** Podpis schowany w plakietce grupy. */
  grouped?: boolean
  /** Wejście do grupy i wyjście z niej (np. zmniejszenie znacznika). */
  onGroup?(grouped: boolean): void
  /** Plakietka grupy: podpisy, które zastępuje. */
  members?: SceneLabel[]
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
  add(position: THREE.Vector3, lines: string[], options?: { className?: string; color?: string; gap?: number; id?: string; distLy?: number; cutout?: FanCutout; onGroup?(grouped: boolean): void }): SceneLabel
  clear(): void
  setVisible(visible: boolean): void
  /** Co klatkę (hak `layout` sceny, z czasem klatki): tani test zmiany, przeliczenie tylko gdy trzeba. */
  update(now: number): void
  /** Wymusza przeliczenie przy następnym update (zmiana położeń punktów albo treści bez ruchu kamery). */
  invalidate(): void
  dispose(): void
}

interface Box { left: number; top: number; right: number; bottom: number; owner: SceneLabel }

interface LayerOptions {
  /** Wybór obiektu z wachlarza grupy. */
  onPick?(id: string): void
  /** Ramię wachlarza pod kursorem (null po zejściu). */
  onHover?(id: string | null): void
}

export function createLabelLayer(handle: Space3DHandle, className: string, { onPick, onHover }: LayerOptions = {}): LabelLayer {
  const root = document.createElement('div')
  root.className = `obs-labels ${className}`
  handle.mount.appendChild(root)
  let labels: SceneLabel[] = []
  /** Pula plakietek grup (ukryte, gdy nieużywane). */
  const badges: SceneLabel[] = []
  let fan: LabelFan | null = null
  let visible = true, dirty = true, stale = true, lastW = 0, lastH = 0, lastMove = -Infinity
  const lastCamera = new THREE.Matrix4(), lastProjection = new THREE.Matrix4()
  const v = new THREE.Vector3()
  /** Grupy przeliczone choć raz od dodania podpisów. */
  let groupsReady = false
  const closeFan = () => fan?.close()
  handle.renderer.domElement.addEventListener('pointerdown', closeFan)
  handle.renderer.domElement.addEventListener('wheel', closeFan)

  const create = (position: THREE.Vector3, lines: string[], el: HTMLElement, color: string | undefined, gap: number): SceneLabel => {
    const leader = document.createElement('div')
    leader.className = 'obs-leader'
    if (color) el.style.borderLeftColor = leader.style.background = color
    root.appendChild(leader)
    root.appendChild(el)
    const label: SceneLabel = { position, el: el as HTMLDivElement, leader, gap, width: 0, height: 0, spot: 0, from: 0, moved: -Infinity, shown: false }
    setLabelText(label, lines)
    labels.push(label)
    dirty = true
    return label
  }

  const openFan = (badge: SceneLabel) => {
    closeFan()
    const { camera, mount } = handle
    v.copy(badge.position).project(camera)
    const entries = [...badge.members ?? []].sort((a, b) => (a.distLy ?? 0) - (b.distLy ?? 0) || a.id!.localeCompare(b.id!))
      .map((m) => ({ id: m.id!, text: `${m.id} · ${fmtDistance(m.distLy ?? null)}`, cutout: m.cutout }))
    fan = openLabelFan(root, entries, (v.x + 1) / 2 * mount.clientWidth, (1 - v.y) / 2 * mount.clientHeight, mount.clientWidth, mount.clientHeight, {
      hover: (id) => onHover?.(id),
      pick: (id) => { onPick?.(id); fan?.setSelected(id) },
      closed: () => { fan = null },
    })
  }

  const badge = (index: number): SceneLabel => {
    if (badges[index]) return badges[index]
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'obs-label space-photo-label obs-group'
    el.title = 'Pokaż obiekty grupy'
    const label = create(new THREE.Vector3(), [''], el, undefined, 13)
    el.addEventListener('click', () => openFan(label))
    label.hidden = true
    badges[index] = label
    return label
  }

  /** Grupy podpisów obiektów, które przy punkcie (miejsce 0) nachodzą na siebie na ekranie; jedna plakietka na grupę. */
  const regroup = (w: number, h: number) => {
    const candidates: SceneLabel[] = []
    const boxes: LabelBox[] = []
    for (const label of labels) {
      if (!label.id || label.pinned || label.hidden || !visible) continue
      v.copy(label.position).project(handle.camera)
      if (!(v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1)) continue
      const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h
      const [dx, dy] = spotOffset(label, 0)
      // Ramka obejmuje też sam znacznik: bliskie znaczniki łączą się, nawet gdy podpisy mieszczą się obok siebie.
      candidates.push(label)
      boxes.push({ left: x - label.gap, top: Math.min(y - label.gap, y + dy), right: x + dx + label.width, bottom: Math.max(y + label.gap, y + dy + label.height) })
    }
    const groups = overlapGroups(boxes).filter((group) => group.length > 1).map((group) => group.map((i) => candidates[i]))
    const inGroup = new Set(groups.flat())
    for (const label of labels) {
      const grouped = inGroup.has(label)
      if (!!label.grouped === grouped) continue
      label.grouped = grouped
      label.onGroup?.(grouped)
    }
    groups.forEach((members, i) => {
      const b = badge(i)
      b.hidden = false
      b.members = members
      b.position.set(0, 0, 0)
      for (const m of members) b.position.add(m.position)
      b.position.divideScalar(members.length)
      const distances = members.map((m) => m.distLy).filter((d): d is number => d !== undefined)
      const lines = [objectCount(members.length), distances.length ? fmtDistanceRange(Math.min(...distances), Math.max(...distances)) : '']
      if (b.el.textContent !== lines.join('\n')) setLabelText(b, lines)
    })
    for (let i = groups.length; i < badges.length; i++) { badges[i].hidden = true; badges[i].members = [] }
  }

  return {
    root,
    add(position, lines, { className: extra = '', color, gap = 13, id, distLy, cutout, onGroup } = {}) {
      const el = document.createElement('div')
      el.className = `obs-label space-photo-label ${extra}`
      const label = create(position, lines, el, color, gap)
      Object.assign(label, { id, distLy, cutout, onGroup })
      return label
    },
    clear() {
      closeFan()
      for (const label of labels) { label.el.remove(); label.leader.remove() }
      labels = []
      badges.length = 0
      groupsReady = false
      dirty = true
    },
    setVisible(next) {
      visible = next
      root.style.display = next ? '' : 'none'
      if (!next) closeFan()
      dirty = true
    },
    invalidate() { dirty = true },
    update(now) {
      const { camera, mount } = handle
      const w = mount.clientWidth, h = mount.clientHeight
      const resized = w !== lastW || h !== lastH
      if (resized) closeFan()
      // Wygaszanie obrotu może trwać już po puszczeniu myszy i otwarciu wachlarza.
      const moved = resized || !same(lastCamera, camera.matrixWorld) || !same(lastProjection, camera.projectionMatrix)
      if (moved) {
        lastMove = now
        stale = true
        lastW = w; lastH = h
        lastCamera.copy(camera.matrixWorld)
        lastProjection.copy(camera.projectionMatrix)
      }
      const rested = stale && now - lastMove >= REST_MS
      if (!moved && !dirty && !rested && !labels.some((label) => now - label.moved < MOVE_MS)) return
      // Grupy jak układ: po zatrzymaniu kamery i po zmianie treści bez ruchu; w ruchu (przelot, nurkowanie) trzymają
      // skład, a pierwsze powstają od razu, żeby przelot startowy nie pokazywał stosu podpisów.
      if (rested || (dirty && !moved) || !groupsReady) { regroup(w, h); groupsReady = true }
      const points = labels.flatMap((label) => {
        v.copy(label.position).project(camera)
        const on = visible && !label.hidden && !label.grouped && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1
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
    dispose() {
      closeFan()
      handle.renderer.domElement.removeEventListener('pointerdown', closeFan)
      handle.renderer.domElement.removeEventListener('wheel', closeFan)
      root.remove()
    },
  }
}
