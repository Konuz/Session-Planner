import { beforeEach, expect, it } from 'vitest'
import { useStore } from './store'

beforeEach(() => useStore.setState({ favoriteIds: [], plan: [], selectedIndex: null }))

it('dodaje i usuwa pojedynczy obiekt bez zmiany pozostałych ulubionych', () => {
  useStore.getState().toggleFavorite('M 45')
  useStore.getState().toggleFavorite('M 31')
  useStore.getState().toggleFavorite('M 45')
  expect(useStore.getState().favoriteIds).toEqual(['M 31'])
  useStore.getState().toggleFavorite('M 45')
  expect(useStore.getState().favoriteIds).toEqual(['M 31', 'M 45'])
})

it('czyści ulubione bez usuwania planu i wybranego obiektu', () => {
  useStore.getState().select(0)
  useStore.getState().addToPlan(0, 'M 45')
  const before = useStore.getState()
  useStore.getState().toggleFavorite('M 45')
  useStore.getState().toggleFavorite('M 31')
  useStore.getState().clearFavorites()
  expect(useStore.getState().favoriteIds).toEqual([])
  expect(useStore.getState().plan).toEqual(before.plan)
  expect(useStore.getState().selectedIndex).toBe(before.selectedIndex)
})
