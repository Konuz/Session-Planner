// Mały renderer do testów zakładki Kadr bez DOM (zoom-kadru).
//
// Testy w Node nie mają DOM, a `renderToStaticMarkup` nie zachowuje stanu komponentów między renderami. Ten renderer
// wywołuje komponenty sam i podstawia własny dyspozytor haków Reacta (`ReactSharedInternals.H`), więc prawdziwe
// `useState`, `useRef`, `useEffect`, `useSyncExternalStore` (zustand) itd. działają: stan zostaje między renderami,
// efekty się wykonują (z czyszczeniem), a zmiana stanu przerysowuje drzewo.
//
// Elementy HTML/SVG to zwykłe obiekty (`HostElement`: znacznik, właściwości, dzieci). Każdy ma atrapę węzła DOM
// (`FakeNode`), którą dostają odwołania `ref`: `addEventListener` zapisuje nasłuchy (z opcjami, np. `passive`),
// a `getBoundingClientRect`, `setPointerCapture` itd. zwracają stałe wartości.
//
// Zdarzenia: `fireReact(host, 'onPointerDown', init)` woła właściwości obsługi elementu i jego przodków (jak bąbelkowanie
// zdarzeń Reacta), a `fireNative(host, 'wheel', init)` woła nasłuchy `addEventListener` elementu i jego przodków.
// Po każdym zdarzeniu renderer przerysowuje drzewo, dopóki są zmiany stanu.
import * as React from 'react'
import type { ReactElement } from 'react'

type Props = Record<string, unknown>
type Fn = (...args: unknown[]) => unknown

const internals = (React as unknown as Record<string, unknown>)
  .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE as { H: unknown }

const FRAGMENT = Symbol.for('react.fragment')
const CONTEXT = Symbol.for('react.context')
const CONSUMER = Symbol.for('react.consumer')
const FORWARD_REF = Symbol.for('react.forward_ref')
const MEMO = Symbol.for('react.memo')
const PASS_THROUGH = new Set([
  Symbol.for('react.strict_mode'),
  Symbol.for('react.suspense'),
  Symbol.for('react.profiler'),
  Symbol.for('react.activity'),
  FRAGMENT,
])

// ---------- Atrapa węzła DOM ----------

export interface Listener {
  type: string
  fn: Fn
  options: unknown
}

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export class FakeNode {
  readonly listeners: Listener[] = []
  readonly captured = new Set<number>()
  readonly style: Record<string, string> = {}
  host: HostElement | null = null
  rect: Rect = { left: 0, top: 0, width: 1000, height: 1000 }

  readonly tagName: string

  constructor(tagName: string) {
    this.tagName = tagName
  }

  addEventListener(type: string, fn: Fn, options?: unknown): void {
    this.listeners.push({ type, fn, options })
  }

  removeEventListener(type: string, fn: Fn): void {
    const index = this.listeners.findIndex((listener) => listener.type === type && listener.fn === fn)
    if (index >= 0) this.listeners.splice(index, 1)
  }

  getBoundingClientRect() {
    const { left, top, width, height } = this.rect
    return { left, top, width, height, x: left, y: top, right: left + width, bottom: top + height, toJSON: () => ({}) }
  }

  get clientWidth(): number {
    return this.rect.width
  }

  get clientHeight(): number {
    return this.rect.height
  }

  get offsetWidth(): number {
    return this.rect.width
  }

  get offsetHeight(): number {
    return this.rect.height
  }

  setPointerCapture(id: number): void {
    this.captured.add(id)
  }

  releasePointerCapture(id: number): void {
    this.captured.delete(id)
  }

  hasPointerCapture(id: number): boolean {
    return this.captured.has(id)
  }

  get parentElement(): FakeNode | null {
    let parent = this.host?.parent ?? null
    while (parent && !parent.node) parent = parent.parent
    return parent?.node ?? null
  }

  get parentNode(): FakeNode | null {
    return this.parentElement
  }

  contains(other: unknown): boolean {
    let node = other instanceof FakeNode ? other : null
    while (node) {
      if (node === this) return true
      node = node.parentElement
    }
    return false
  }

  focus(): void {}

  blur(): void {}
}

// ---------- Drzewo elementów ----------

export interface HostElement {
  tag: string
  props: Props
  children: HostChild[]
  parent: HostElement | null
  node: FakeNode
}

export type HostChild = HostElement | string

interface EffectSlot {
  kind: 'effect'
  deps: readonly unknown[] | undefined
  cleanup: (() => void) | undefined
  pending: (() => unknown) | null
  layout: boolean
}

interface Instance {
  key: string
  hooks: unknown[]
  index: number
  ids: number
}

function depsChanged(a: readonly unknown[] | undefined, b: readonly unknown[] | undefined): boolean {
  if (!a || !b || a.length !== b.length) return true
  return a.some((value, i) => !Object.is(value, b[i]))
}

function typeName(type: unknown): string {
  if (typeof type === 'function') return (type as { name?: string }).name || 'anon'
  if (typeof type === 'string') return type
  return 'x'
}

export class HookRenderer {
  private readonly instances = new Map<string, Instance>()
  private readonly nodes = new Map<string, FakeNode>()
  private readonly refs = new Map<string, { ref: unknown; node: FakeNode; cleanup: unknown }>()
  private visited = new Set<string>()
  private visitedHosts = new Set<string>()
  private commitOrder: Instance[] = []
  private current: Instance | null = null
  private contexts = new Map<unknown, unknown[]>()
  private dirty = false
  private idCounter = 0
  root: HostElement = this.emptyRoot()
  private readonly element: () => ReactElement

  constructor(element: () => ReactElement) {
    this.element = element
  }

  private emptyRoot(): HostElement {
    return { tag: '#root', props: {}, children: [], parent: null, node: new FakeNode('#root') }
  }

  /** Pierwszy render (z efektami i przerysowaniem po zmianach stanu). */
  mount(): this {
    this.dirty = true
    this.flush()
    return this
  }

  /** Przerysowanie, dopóki są zmiany stanu (najwyżej 100 razy). */
  flush(): void {
    for (let i = 0; i < 100 && this.dirty; i += 1) {
      this.dirty = false
      this.renderOnce()
    }
    if (this.dirty) throw new Error('Renderer: przerysowanie bez końca (ponad 100 razy)')
  }

  /** Wywołanie akcji (zdarzenie, timer, zmiana stanu aplikacji) i przerysowanie. */
  act(action: () => void): void {
    action()
    this.flush()
  }

  /** Atrapa zmiany stanu zewnętrznego: wymusza przerysowanie. */
  invalidate(): void {
    this.dirty = true
  }

  unmount(): void {
    this.visited = new Set()
    this.visitedHosts = new Set()
    this.cleanupUnvisited()
  }

  private markDirty = () => {
    this.dirty = true
  }

  private renderOnce(): void {
    this.visited = new Set()
    this.visitedHosts = new Set()
    this.commitOrder = []
    this.contexts = new Map()
    const root = this.emptyRoot()
    const previous = internals.H
    internals.H = this.dispatcher
    try {
      root.children = this.renderNode(this.element(), 'r', root)
    } finally {
      internals.H = previous
    }
    this.root = root
    this.attachRefs()
    this.cleanupUnvisited()
    this.runEffects(true)
    this.runEffects(false)
  }

  private renderNode(node: unknown, path: string, parent: HostElement): HostChild[] {
    if (node === null || node === undefined || typeof node === 'boolean') return []
    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') return [String(node)]
    if (Array.isArray(node)) {
      return node.flatMap((child: unknown, i) => {
        const key = React.isValidElement(child) && child.key !== null ? `k${child.key}` : `i${i}`
        return this.renderNode(child, `${path}.${key}`, parent)
      })
    }
    if (typeof node === 'object' && node !== null && typeof (node as { then?: unknown }).then === 'function') {
      throw new Error('Renderer: obietnice w drzewie nie są obsługiwane')
    }
    if (!React.isValidElement(node)) return []
    const element = node as ReactElement<Props>
    const props = element.props ?? {}
    const type: unknown = element.type
    if (typeof type === 'string') return [this.renderHost(type, props, path, parent)]
    if (typeof type === 'function') {
      const proto = (type as { prototype?: { isReactComponent?: unknown } }).prototype
      if (proto?.isReactComponent) throw new Error('Renderer: komponenty klasowe nie są obsługiwane')
      return this.renderComponent(type as Fn, `${path}/${typeName(type)}`, parent, (fn) => fn(props, undefined))
    }
    if (typeof type === 'symbol' && PASS_THROUGH.has(type)) return this.renderNode(props.children, `${path}/f`, parent)
    if (typeof type === 'object' && type !== null) {
      const kind = (type as { $$typeof?: symbol }).$$typeof
      if (kind === FORWARD_REF) {
        const render = (type as unknown as { render: Fn }).render
        return this.renderComponent(render, `${path}/fr-${typeName(render)}`, parent, (fn) => fn(props, props.ref ?? null))
      }
      if (kind === MEMO) {
        const inner = (type as unknown as { type: unknown }).type
        return this.renderNode(React.createElement(inner as string, props), `${path}/m`, parent)
      }
      if (kind === CONTEXT) {
        const stack = this.contexts.get(type) ?? []
        stack.push(props.value)
        this.contexts.set(type, stack)
        try {
          return this.renderNode(props.children, `${path}/p`, parent)
        } finally {
          stack.pop()
        }
      }
      if (kind === CONSUMER) {
        const context = (type as unknown as { _context: unknown })._context
        const render = props.children as Fn
        return this.renderNode(render(this.readContext(context)), `${path}/c`, parent)
      }
    }
    throw new Error(`Renderer: nieobsługiwany typ elementu ${String(type)}`)
  }

  private renderHost(tag: string, props: Props, path: string, parent: HostElement): HostElement {
    let node = this.nodes.get(path)
    if (!node || node.tagName !== tag) {
      node = new FakeNode(tag)
      this.nodes.set(path, node)
    }
    this.visitedHosts.add(path)
    const host: HostElement = { tag, props, children: [], parent, node }
    node.host = host
    if (props.ref !== undefined && props.ref !== null) {
      const known = this.refs.get(path)
      if (!known || known.ref !== props.ref || known.node !== node) {
        if (known) this.detachRef(known)
        this.refs.set(path, { ref: props.ref, node, cleanup: 'pending' })
      }
    } else if (this.refs.has(path)) {
      this.detachRef(this.refs.get(path)!)
      this.refs.delete(path)
    }
    if (typeof props.dangerouslySetInnerHTML === 'object' && props.dangerouslySetInnerHTML !== null) {
      const html = (props.dangerouslySetInnerHTML as { __html?: unknown }).__html
      host.children = [typeof html === 'string' ? html : '']
    } else {
      host.children = this.renderNode(props.children, `${path}>`, host)
    }
    return host
  }

  private renderComponent(type: Fn, key: string, parent: HostElement, call: (fn: Fn) => unknown): HostChild[] {
    let instance = this.instances.get(key)
    if (!instance) {
      instance = { key, hooks: [], index: 0, ids: 0 }
      this.instances.set(key, instance)
    }
    this.visited.add(key)
    const outer = this.current
    this.current = instance
    instance.index = 0
    let output: unknown
    try {
      output = call(type)
    } finally {
      this.current = outer
    }
    const children = this.renderNode(output, `${key}>`, parent)
    this.commitOrder.push(instance)
    return children
  }

  private readContext(context: unknown): unknown {
    const stack = this.contexts.get(context)
    if (stack && stack.length > 0) return stack[stack.length - 1]
    return (context as { _currentValue?: unknown })._currentValue
  }

  private slot<T>(create: () => T): T {
    const instance = this.current
    if (!instance) throw new Error('Renderer: hak poza komponentem')
    const index = instance.index
    instance.index += 1
    if (index >= instance.hooks.length) instance.hooks.push(create())
    return instance.hooks[index] as T
  }

  private effect(create: () => unknown, deps: readonly unknown[] | undefined, layout: boolean): void {
    let first = false
    const slot = this.slot<EffectSlot>(() => {
      first = true
      return { kind: 'effect', deps: undefined, cleanup: undefined, pending: null, layout }
    })
    if (first || deps === undefined || depsChanged(slot.deps, deps)) {
      slot.pending = create
      slot.deps = deps
    }
  }

  private runEffects(layout: boolean): void {
    for (const instance of this.commitOrder) {
      for (const hook of instance.hooks) {
        const slot = hook as EffectSlot
        if (slot?.kind !== 'effect' || slot.layout !== layout || slot.pending === null) continue
        const create = slot.pending
        slot.pending = null
        slot.cleanup?.()
        const result = create()
        slot.cleanup = typeof result === 'function' ? (result as () => void) : undefined
      }
    }
  }

  private cleanupUnvisited(): void {
    for (const [key, instance] of [...this.instances]) {
      if (this.visited.has(key)) continue
      for (const hook of instance.hooks) {
        const slot = hook as EffectSlot & { unsubscribe?: () => void }
        if (slot?.kind === 'effect') slot.cleanup?.()
        if ((hook as { kind?: string })?.kind === 'store') (hook as { unsubscribe?: () => void }).unsubscribe?.()
      }
      this.instances.delete(key)
    }
    for (const [path, ref] of [...this.refs]) {
      if (this.visitedHosts.has(path)) continue
      this.detachRef(ref)
      this.refs.delete(path)
    }
    for (const path of [...this.nodes.keys()]) if (!this.visitedHosts.has(path)) this.nodes.delete(path)
  }

  private attachRefs(): void {
    for (const entry of this.refs.values()) {
      if (entry.cleanup !== 'pending') continue
      const { ref, node } = entry
      if (typeof ref === 'function') {
        const result = (ref as Fn)(node)
        entry.cleanup = typeof result === 'function' ? result : null
      } else if (typeof ref === 'object' && ref !== null) {
        ;(ref as { current: unknown }).current = node
        entry.cleanup = null
      }
    }
  }

  private detachRef(entry: { ref: unknown; node: FakeNode; cleanup: unknown }): void {
    if (entry.cleanup === 'pending') return
    if (typeof entry.cleanup === 'function') (entry.cleanup as Fn)()
    else if (typeof entry.ref === 'function') (entry.ref as Fn)(null)
    else if (typeof entry.ref === 'object' && entry.ref !== null) (entry.ref as { current: unknown }).current = null
  }

  private readonly dispatcher = {
    readContext: (context: unknown) => this.readContext(context),
    useContext: (context: unknown) => this.readContext(context),
    use: (usable: unknown) => {
      const kind = (usable as { $$typeof?: symbol })?.$$typeof
      if (kind === CONTEXT) return this.readContext(usable)
      throw new Error('Renderer: use(obietnica) nie jest obsługiwane')
    },
    useState: (initial: unknown) =>
      this.dispatcher.useReducer(
        (state: unknown, action: unknown) => (typeof action === 'function' ? (action as Fn)(state) : action),
        initial,
        (value: unknown) => (typeof value === 'function' ? (value as Fn)() : value),
      ),
    useReducer: (reducer: (state: unknown, action: unknown) => unknown, initialArg: unknown, init?: Fn) => {
      const slot = this.slot(() => {
        const state = init ? init(initialArg) : initialArg
        const hook = { kind: 'state', state, reducer, dispatch: (() => undefined) as (action: unknown) => void }
        hook.dispatch = (action: unknown) => {
          const next = hook.reducer(hook.state, action)
          if (!Object.is(next, hook.state)) {
            hook.state = next
            this.markDirty()
          }
        }
        return hook
      })
      slot.reducer = reducer
      return [slot.state, slot.dispatch]
    },
    useRef: (initial: unknown) => this.slot(() => ({ current: initial })),
    useMemo: (create: () => unknown, deps: readonly unknown[] | undefined) => {
      const slot = this.slot<{ value: unknown; deps: readonly unknown[] | undefined; set: boolean }>(() => ({ value: undefined, deps: undefined as readonly unknown[] | undefined, set: false }))
      if (!slot.set || deps === undefined || depsChanged(slot.deps, deps)) {
        slot.value = create()
        slot.deps = deps
        slot.set = true
      }
      return slot.value
    },
    useCallback: (callback: unknown, deps: readonly unknown[] | undefined) => this.dispatcher.useMemo(() => callback, deps),
    useEffect: (create: () => unknown, deps?: readonly unknown[]) => this.effect(create, deps, false),
    useLayoutEffect: (create: () => unknown, deps?: readonly unknown[]) => this.effect(create, deps, true),
    useInsertionEffect: (create: () => unknown, deps?: readonly unknown[]) => this.effect(create, deps, true),
    useImperativeHandle: (ref: unknown, create: () => unknown, deps?: readonly unknown[]) =>
      this.effect(
        () => {
          if (typeof ref === 'function') {
            ;(ref as Fn)(create())
            return () => (ref as Fn)(null)
          }
          if (ref && typeof ref === 'object') (ref as { current: unknown }).current = create()
          return undefined
        },
        deps,
        true,
      ),
    useDebugValue: () => undefined,
    useDeferredValue: (value: unknown) => value,
    useTransition: () => [false, (callback: () => void) => callback()],
    useId: () => {
      const slot = this.slot(() => ({ id: `:t${(this.idCounter += 1)}:` }))
      return slot.id
    },
    useSyncExternalStore: (subscribe: (listener: () => void) => () => void, getSnapshot: () => unknown) => {
      const value = getSnapshot()
      const slot = this.slot(() => ({
        kind: 'store',
        subscribe: null as ((listener: () => void) => () => void) | null,
        unsubscribe: undefined as (() => void) | undefined,
        getSnapshot,
        value,
      }))
      slot.getSnapshot = getSnapshot
      slot.value = value
      if (slot.subscribe !== subscribe) {
        slot.unsubscribe?.()
        slot.subscribe = subscribe
        slot.unsubscribe = subscribe(() => {
          if (!Object.is(slot.getSnapshot(), slot.value)) this.markDirty()
        })
      }
      return value
    },
    useEffectEvent: (callback: Fn) => {
      const slot = this.slot<{ latest: Fn; call: Fn }>(() => ({ latest: callback, call: () => undefined }))
      slot.latest = callback
      slot.call = (...args: unknown[]) => slot.latest(...args)
      return slot.call
    },
    useOptimistic: (passthrough: unknown) => [passthrough, () => undefined],
    useActionState: () => {
      throw new Error('Renderer: useActionState nie jest obsługiwane')
    },
    useMemoCache: (size: number) => {
      const slot = this.slot(() => ({ cache: new Array<unknown>(size).fill(Symbol.for('react.memo_cache_sentinel')) }))
      return slot.cache
    },
    useCacheRefresh: () => () => undefined,
    useHostTransitionStatus: () => null,
    useFormState: () => {
      throw new Error('Renderer: useFormState nie jest obsługiwane')
    },
  }

  // ---------- Wyszukiwanie i zdarzenia ----------

  /** Wszystkie elementy drzewa w kolejności dokumentu. */
  hosts(): HostElement[] {
    const found: HostElement[] = []
    const walk = (element: HostElement) => {
      for (const child of element.children) {
        if (typeof child === 'string') continue
        found.push(child)
        walk(child)
      }
    }
    walk(this.root)
    return found
  }

  /** Woła właściwość obsługi (np. `onPointerDown`) elementu i jego przodków; potem przerysowuje. */
  fireReact(target: HostElement, handler: string, init: Record<string, unknown> = {}): FiredEvent {
    const event = makeEvent(target.node, init)
    this.act(() => {
      for (let element: HostElement | null = target; element && !event.propagationStopped; element = element.parent) {
        const fn = element.props[handler]
        if (typeof fn !== 'function') continue
        event.currentTarget = element.node
        ;(fn as Fn)(event)
      }
    })
    return event
  }

  /** Woła nasłuchy `addEventListener` danego typu na elemencie i jego przodkach; potem przerysowuje. */
  fireNative(target: HostElement, type: string, init: Record<string, unknown> = {}): FiredEvent {
    const event = makeEvent(target.node, { type, ...init })
    this.act(() => {
      for (let element: HostElement | null = target; element && !event.propagationStopped; element = element.parent) {
        for (const listener of [...element.node.listeners]) {
          if (listener.type !== type) continue
          event.currentTarget = element.node
          listener.fn(event)
        }
      }
    })
    return event
  }
}

export interface FiredEvent extends Record<string, unknown> {
  currentTarget: FakeNode
  target: FakeNode
  defaultPrevented: boolean
  propagationStopped: boolean
  preventDefault: () => void
  stopPropagation: () => void
}

function makeEvent(target: FakeNode, init: Record<string, unknown>): FiredEvent {
  const event: FiredEvent = {
    bubbles: true,
    cancelable: true,
    timeStamp: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    button: 0,
    buttons: 1,
    ...init,
    target,
    currentTarget: target,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault: () => {
      event.defaultPrevented = true
    },
    stopPropagation: () => {
      event.propagationStopped = true
    },
    persist: () => undefined,
    isDefaultPrevented: () => event.defaultPrevented,
    isPropagationStopped: () => event.propagationStopped,
  }
  event.nativeEvent = event
  return event
}

// ---------- Tekst ----------

export function textOf(element: HostElement): string {
  const parts: string[] = []
  const walk = (node: HostElement) => {
    for (const child of node.children) {
      if (typeof child === 'string') parts.push(child)
      else walk(child)
    }
  }
  walk(element)
  return parts.join(' ').replace(/[\u00a0\u202f\u2007]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function ancestorsOf(element: HostElement): HostElement[] {
  const found: HostElement[] = []
  for (let node = element.parent; node; node = node.parent) found.push(node)
  return found
}

export function descendantsOf(element: HostElement): HostElement[] {
  const found: HostElement[] = []
  const walk = (node: HostElement) => {
    for (const child of node.children) {
      if (typeof child === 'string') continue
      found.push(child)
      walk(child)
    }
  }
  walk(element)
  return found
}
