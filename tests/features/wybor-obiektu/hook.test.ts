// „Styk z resztą”: hak `useFeaturedObjects` zachowuje nazwę i kształt wyniku (stan „gotowe” z listą „Klasyki” w `objects`
// oraz `retry`), a cały katalog dochodzi jako dodatkowe pole stanu „gotowe” (`catalog`; nazwy pola spec nie podaje).
// W Node bez DOM efekty Reacta się nie wykonują, więc hak działa tu na prostych atrapach hooków Reacta (stan, efekty
// po „renderze”, memo, ref), a `loadCatalog` zwraca katalog podany w teście. Sprawdzany jest tylko wynik haka.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFeaturedObjects, type FeaturedObjects } from '../../../src/features/night/useFeaturedObjects'
import type { DsoObject } from '../../../src/types'
import { CATALOG, KLASYKI, M13, M31, M42, M57, uids } from './helpers'

const react = vi.hoisted(() => {
  type Deps = readonly unknown[] | undefined
  let slots: Record<string, unknown>[] = []
  let index = 0
  let pending: (() => void)[] = []
  const changed = (previous: Deps, next: Deps) =>
    !previous || !next || previous.length !== next.length || next.some((value, i) => !Object.is(value, previous[i]))
  const slot = (init: () => Record<string, unknown>): Record<string, unknown> => {
    const i = index++
    slots[i] ??= init()
    return slots[i]
  }
  const memoized = (factory: () => unknown, deps: Deps) => {
    const memo = slot(() => ({ ran: false, deps: undefined, value: undefined }))
    if (!memo.ran || changed(memo.deps as Deps, deps)) Object.assign(memo, { ran: true, deps, value: factory() })
    return memo.value
  }
  const afterRender = (effect: () => unknown, deps: Deps) => {
    const state = slot(() => ({ ran: false, deps: undefined, cleanup: undefined }))
    if (state.ran && !changed(state.deps as Deps, deps)) return
    Object.assign(state, { ran: true, deps })
    pending.push(() => {
      if (typeof state.cleanup === 'function') (state.cleanup as () => void)()
      state.cleanup = effect()
    })
  }
  return {
    reset() {
      slots = []
      index = 0
      pending = []
    },
    /** Jeden „render” haka: wywołanie, a po nim efekty, których zależności się zmieniły. */
    render<T>(hook: () => T): T {
      index = 0
      const result = hook()
      const effects = pending
      pending = []
      for (const effect of effects) effect()
      return result
    },
    useState: (initial: unknown) => {
      const state = slot(() => ({ value: typeof initial === 'function' ? (initial as () => unknown)() : initial }))
      const setState = (next: unknown) => {
        state.value = typeof next === 'function' ? (next as (value: unknown) => unknown)(state.value) : next
      }
      return [state.value, setState]
    },
    useReducer: (reducer: (state: unknown, action: unknown) => unknown, initialArg: unknown, init?: (arg: unknown) => unknown) => {
      const state = slot(() => ({ value: init ? init(initialArg) : initialArg }))
      const dispatch = (action: unknown) => {
        state.value = reducer(state.value, action)
      }
      return [state.value, dispatch]
    },
    useEffect: afterRender,
    useMemo: memoized,
    useCallback: (callback: unknown, deps: Deps) => memoized(() => callback, deps),
    useRef: (initial: unknown) => slot(() => ({ current: initial })),
  }
})

const catalogLoad = vi.hoisted(() => ({
  next: (): Promise<DsoObject[]> => Promise.reject(new Error('Brak katalogu w teście')),
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState: react.useState,
    useReducer: react.useReducer,
    useEffect: react.useEffect,
    useLayoutEffect: react.useEffect,
    useMemo: react.useMemo,
    useCallback: react.useCallback,
    useRef: react.useRef,
  }
})

vi.mock('../../../src/data/featuredObjects', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/data/featuredObjects')>()),
  loadCatalog: () => catalogLoad.next(),
}))

/** Hak wywoływany przez atrapę „renderu” (nie w komponencie, więc pod inną nazwą). */
const runFeatured = useFeaturedObjects

/** Obietnice `loadCatalog` się rozstrzygają. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

function ready(featured: FeaturedObjects): Extract<FeaturedObjects, { status: 'ready' }> {
  if (featured.status !== 'ready') throw new Error(`Oczekiwano stanu „gotowe”, jest ${JSON.stringify(featured)}`)
  return featured
}

afterEach(() => {
  react.reset()
})

describe('useFeaturedObjects: cały katalog jako dodatkowe pole', () => {
  it('Styk: katalog M 13, M 57, M 42, M 31 → „gotowe”: objects = „Klasyki” (M 31, M 42), catalog = cały katalog; retry zostaje', async () => {
    react.reset()
    catalogLoad.next = () => Promise.resolve([M13, M57, M42, M31])
    expect(react.render(runFeatured).featured.status).toBe('loading')
    await settle()

    const { featured, retry } = react.render(runFeatured)
    const state = ready(featured)
    expect(uids(state.objects)).toEqual([M31.uid, M42.uid])
    expect(uids(state.catalog ?? [])).toEqual([M13.uid, M57.uid, M42.uid, M31.uid])
    expect(typeof retry).toBe('function')
  })

  it('Styk: cały katalog aplikacji → objects = 26 „Klasyki” w kolejności z featured.json, catalog = 16 516 obiektów z M 13', async () => {
    react.reset()
    catalogLoad.next = () => Promise.resolve(CATALOG)
    react.render(runFeatured)
    await settle()

    const state = ready(react.render(runFeatured).featured)
    expect(uids(state.objects)).toEqual(uids(KLASYKI))
    expect(state.catalog ?? []).toHaveLength(CATALOG.length)
    expect(uids(state.catalog ?? [])).toContain('NGC6205')
  })

  it('Styk: po błędzie wczytywania retry → „gotowe” z listą „Klasyki” i całym katalogiem', async () => {
    react.reset()
    catalogLoad.next = () => Promise.reject(new Error('Nie udało się wczytać katalogu (HTTP 404)'))
    react.render(runFeatured)
    await settle()
    const failed = react.render(runFeatured)
    expect(failed.featured).toEqual({ status: 'error', message: 'Nie udało się wczytać katalogu (HTTP 404)' })

    catalogLoad.next = () => Promise.resolve([M57, M31])
    failed.retry()
    react.render(runFeatured)
    await settle()

    const state = ready(react.render(runFeatured).featured)
    expect(uids(state.objects)).toEqual([M31.uid])
    expect(uids(state.catalog ?? [])).toEqual([M57.uid, M31.uid])
  })
})
