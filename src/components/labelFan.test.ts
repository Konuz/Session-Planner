import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { openLabelFan, relativeBox } from './labelFan'

interface MockEl {
  tagName: string
  className: string
  textContent: string
  offsetWidth: number
  style: Record<string, string>
  children: MockEl[]
  parent: MockEl | null
  attrs: Record<string, string>
  classes: Set<string>
  classList: {
    add: (...names: string[]) => void
    remove: (...names: string[]) => void
    toggle: (name: string, force?: boolean) => void
    contains: (name: string) => boolean
  }
  appendChild: (child: MockEl) => MockEl
  remove: () => void
  setAttribute: (k: string, v: string) => void
  addEventListener: () => void
  querySelector: (selector: string) => MockEl | null
}

function makeEl(tagName: string, spokeWidth = 140): MockEl {
  const classes = new Set<string>()
  let cls = ''
  const syncClasses = (raw: string) => {
    classes.clear()
    for (const name of raw.split(/\s+/).filter(Boolean)) classes.add(name)
  }
  const el: MockEl = {
    tagName,
    get className() { return cls },
    set className(v: string) { cls = v; syncClasses(v) },
    textContent: '',
    offsetWidth: tagName === 'button' ? spokeWidth : 0,
    style: {},
    children: [],
    parent: null,
    attrs: {},
    classes,
    classList: {
      add: (...names: string[]) => names.forEach((n) => classes.add(n)),
      remove: (...names: string[]) => names.forEach((n) => classes.delete(n)),
      toggle: (name: string, force?: boolean) => { if (force ?? !classes.has(name)) classes.add(name); else classes.delete(name) },
      contains: (name: string) => classes.has(name),
    },
    appendChild(child: MockEl) {
      child.parent = el
      el.children.push(child)
      return child
    },
    remove() {
      if (!el.parent) return
      el.parent.children = el.parent.children.filter((c) => c !== el)
      el.parent = null
    },
    setAttribute(k: string, v: string) { el.attrs[k] = v },
    addEventListener() {},
    querySelector(selector: string) {
      if (selector === ':scope > .obs-fan') return el.children.find((c) => c.classes.has('obs-fan')) ?? null
      return null
    },
  }
  return el
}

function parseTransform(transform: string) {
  const match = transform.match(/^translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*rotate\(([-\d.]+)rad\)\s*translate\((?:calc\(-100%\s*-\s*([-\d.]+)px\)|([-\d.]+)px),\s*-50%\)$/)
  if (!match) throw new Error(`Unexpected transform: ${transform}`)
  return {
    px: Number(match[1]),
    cy: Number(match[2]),
    rot: Number(match[3]),
    radius: Number(match[4] ?? match[5]),
  }
}

beforeEach(() => {
  vi.stubGlobal('document', { createElement: (tag: string) => makeEl(tag) })
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() })
})

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('relativeBox odejmuje prostokąt kontenera i wraca do fallbacku przy braku wymiarów', () => {
  const container = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 800, height: 600 }) } as unknown as HTMLElement
  const el = { getBoundingClientRect: () => ({ left: 220, top: 130, right: 300, bottom: 166, width: 80, height: 36 }) } as unknown as HTMLElement
  expect(relativeBox(el, container, { left: 0, top: 0, right: 1, bottom: 1 })).toEqual({ left: 120, top: 80, right: 200, bottom: 116 })

  const hidden = { getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }) } as unknown as HTMLElement
  const fallback = { left: 10, top: 20, right: 90, bottom: 56 }
  expect(relativeBox(hidden, container, fallback)).toEqual(fallback)
})

it('jednostronny wachlarz rozwija się dokładnie przy lewej ścianie ramki klastra', () => {
  const container = makeEl('div')
  const entries = Array.from({ length: 3 }, (_, i) => ({ id: `O${i}`, text: `Objekt ${i}` }))
  const anchor = { left: 500, top: 300, right: 580, bottom: 336 }
  const fan = openLabelFan(container as unknown as HTMLElement, entries, anchor, 1200, 800, {
    hover() {}, pick() {}, closed() {},
  })
  const root = container.children[0]
  const middle = root.children[1]
  expect(middle.classList.contains('left')).toBe(true)
  const { px, cy, rot, radius } = parseTransform(middle.style.transform)
  expect(cy).toBe(318)
  expect(rot).toBeCloseTo(0, 4)
  // Wewnętrzny koniec środkowego paska stoi w odległości 2 px od lewej ściany ramki (anchor.left - 2).
  expect(px - radius).toBeCloseTo(anchor.left - 2, 0)
  fan.close()
})

it('przerzuca jednostronny wachlarz na prawą ścianę ramki, gdy przy lewej krawędzi brakuje miejsca', () => {
  const container = makeEl('div')
  const entries = Array.from({ length: 3 }, (_, i) => ({ id: `O${i}`, text: `Objekt ${i}` }))
  const anchor = { left: 40, top: 300, right: 120, bottom: 336 }
  const fan = openLabelFan(container as unknown as HTMLElement, entries, anchor, 1200, 800, {
    hover() {}, pick() {}, closed() {},
  })
  const root = container.children[0]
  const middle = root.children[1]
  expect(middle.classList.contains('left')).toBe(false)
  const { px, cy, rot, radius } = parseTransform(middle.style.transform)
  expect(cy).toBe(318)
  expect(rot).toBeCloseTo(0, 4)
  // Wewnętrzny koniec środkowego paska stoi w odległości 2 px od prawej ściany ramki (anchor.right + 2).
  expect(px + radius).toBeCloseTo(anchor.right + 2, 0)
  fan.close()
})

it('dwustronny wachlarz otwiera prawe i lewe ramiona po obu bocznych ścianach ramki', () => {
  const container = makeEl('div')
  const entries = Array.from({ length: 12 }, (_, i) => ({ id: `O${i}`, text: `Objekt ${i}` }))
  const anchor = { left: 560, top: 380, right: 640, bottom: 416 }
  const fan = openLabelFan(container as unknown as HTMLElement, entries, anchor, 1200, 800, {
    hover() {}, pick() {}, closed() {},
  })
  const root = container.children[0]
  const rightSpokes = root.children.filter((el) => !el.classList.contains('left'))
  const leftSpokes = root.children.filter((el) => el.classList.contains('left'))
  expect(rightSpokes).toHaveLength(6)
  expect(leftSpokes).toHaveLength(6)
  const rightInner = parseTransform(rightSpokes[2].style.transform)
  const leftInner = parseTransform(leftSpokes[2].style.transform)
  expect(rightInner.px + rightInner.radius * Math.cos(rightInner.rot)).toBeCloseTo(anchor.right + 2, 0)
  expect(leftInner.px - leftInner.radius * Math.cos(leftInner.rot)).toBeCloseTo(anchor.left - 2, 0)
  fan.close()
})

it('zamknięcie jednego z dwóch otwartych wachlarzy zostawia klasę fan-open aż do zamknięcia ostatniego', () => {
  const container = makeEl('div')
  const entries = [{ id: 'A', text: 'A' }, { id: 'B', text: 'B' }]
  const fan1 = openLabelFan(container as unknown as HTMLElement, entries, { left: 400, top: 200, right: 480, bottom: 236 }, 1200, 800, { hover() {}, pick() {}, closed() {} })
  const fan2 = openLabelFan(container as unknown as HTMLElement, entries, { left: 700, top: 400, right: 780, bottom: 436 }, 1200, 800, { hover() {}, pick() {}, closed() {} })
  expect(container.classList.contains('fan-open')).toBe(true)
  fan1.close()
  expect(container.classList.contains('fan-open')).toBe(true)
  fan2.close()
  expect(container.classList.contains('fan-open')).toBe(false)
})
