import { beforeEach, expect, it } from 'vitest'
import { fieldId } from '../lib/fieldTarget'
import { useStore } from './store'

const s = () => useStore.getState()
const field = { raDeg: 200, decDeg: 40 }
const mosaic = { cols: 2, rows: 1, overlapPct: 15 }

beforeEach(() => useStore.setState({
  selectedIndex: null, history: [], historyPos: -1, freeField: null, framePinned: true, plan: [],
  framing: { raDeg: null, decDeg: null, paDeg: 0 },
  framingView: { ...useStore.getState().framingView, photoCenter: null },
}))

it('przesunięcie ramki zaczyna swobodną eksplorację: środek kadru to pole, mozaika obiektu nie przechodzi', () => {
  s().select(3)
  s().setFraming({ raDeg: 1, decDeg: 2, paDeg: 45, mosaic })
  s().setFramingView({ photoCenter: { objectIndex: 3, raDeg: 1, decDeg: 2 } })
  s().setFreeField(field)
  expect(s().freeField).toEqual(field)
  expect(s().framing).toEqual({ raDeg: null, decDeg: null, paDeg: 45, mosaic: undefined })
  expect(s().framingView.photoCenter).toBeNull()
  expect(s().selectedIndex).toBe(3)
  // Mozaika ustawiona już dla pola zostaje przy kolejnym przesunięciu.
  s().setFraming({ mosaic })
  s().setFreeField({ raDeg: 201, decDeg: 41 })
  expect(s().framing.mosaic).toEqual(mosaic)
})

it('wybór obiektu kończy swobodną eksplorację i przypina ramkę, także dla tego samego obiektu', () => {
  s().select(3)
  s().setFramePinned(false)
  s().setFreeField(field)
  s().setFraming({ raDeg: 5, decDeg: 6 })
  s().select(3)
  expect(s().freeField).toBeNull()
  expect(s().framePinned).toBe(true)
  expect(s().framing.raDeg).toBeNull()
  expect(s().history).toEqual([3])
})

it('pole (indeks −1) nie trafia do wyboru ani historii', () => {
  s().select(3)
  s().select(-1)
  expect(s().selectedIndex).toBe(3)
  expect(s().history).toEqual([3])
})

it('„wstecz” ze swobodnej eksploracji wraca do obiektu, od którego się zaczęła; „dalej” idzie po historii', () => {
  s().select(1)
  s().select(2)
  s().setFreeField(field)
  s().stepHistory(-1)
  expect(s().freeField).toBeNull()
  expect(s().selectedIndex).toBe(2)
  expect(s().historyPos).toBe(1)
  s().stepHistory(-1)
  s().setFreeField(field)
  s().stepHistory(1)
  expect(s().freeField).toBeNull()
  expect(s().selectedIndex).toBe(2)
})

it('pole trafia do planu z własnym kadrem; obiekt katalogu dodany w tym czasie dostaje kadr domyślny', () => {
  s().select(3)
  s().setFreeField(field)
  s().setFraming({ paDeg: 30 })
  s().addToPlan(-1, fieldId(field), field)
  s().addToPlan(3, 'M 3')
  const [fieldItem, objectItem] = s().plan
  expect(fieldItem).toMatchObject({ objectIndex: -1, objectId: fieldId(field), field, framing: { paDeg: 30 } })
  expect(objectItem.field).toBeUndefined()
  expect(objectItem.framing).toEqual({ raDeg: null, decDeg: null, paDeg: 0 })
  s().addToPlan(-1, fieldId(field), field)
  expect(s().plan).toHaveLength(2)
})
