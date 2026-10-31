import { beforeEach, expect, it } from 'vitest'
import { useStore } from './store'

beforeEach(() => useStore.setState({ selectedIndex: null, history: [], historyPos: -1 }))

it('strzałki przechodzą po wybranych obiektach, nowy wybór ucina historię do przodu', () => {
  const s = () => useStore.getState()
  s().select(1)
  s().select(2)
  s().select(3)
  s().stepHistory(-1)
  s().stepHistory(-1)
  expect(s().selectedIndex).toBe(1)
  s().stepHistory(-1)
  expect(s().selectedIndex).toBe(1)
  s().stepHistory(1)
  expect(s().selectedIndex).toBe(2)
  s().select(7)
  expect(s().history).toEqual([1, 2, 7])
  s().stepHistory(1)
  expect(s().selectedIndex).toBe(7)
})

it('obiekt z poprzedniej wizyty otwiera historię, powtórny wybór jej nie dubluje', () => {
  useStore.setState({ selectedIndex: 5 })
  useStore.getState().select(8)
  useStore.getState().select(8)
  expect(useStore.getState().history).toEqual([5, 8])
})
