import { beforeEach, expect, it } from 'vitest'
import { EMPTY_FILTER } from '../lib/catalog'
import { useStore } from './store'

beforeEach(() => useStore.setState({ filter: { ...EMPTY_FILTER, query: 'm 31' } }))

it('setFilter z tymi samymi wartościami nie tworzy nowego filtra (brak przeliczenia katalogu)', () => {
  const before = useStore.getState().filter
  useStore.getState().setFilter({ query: 'm 31' })
  expect(useStore.getState().filter).toBe(before)
})

it('setFilter ze zmianą tworzy nowy filtr i zachowuje pozostałe pola', () => {
  const before = useStore.getState().filter
  useStore.getState().setFilter({ query: 'ngc', maxMag: 10 })
  expect(useStore.getState().filter).not.toBe(before)
  expect(useStore.getState().filter).toEqual({ ...before, query: 'ngc', maxMag: 10 })
})
