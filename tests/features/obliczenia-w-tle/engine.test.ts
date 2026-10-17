// Silnik Workera katalogu: „katalog” → „gotowy”, „licz” → „wynik” albo „błąd”, pamięć podręczna (P1–P3, P8, P10, P11).
import { describe, expect, it } from 'vitest'
import { computeCatalogNight } from '../../../src/services/catalogNight'
import { at, expectSameMinute, expectWithin } from '../../../src/test/fixtures'
import { createCatalogEngine } from '../../../src/workers/catalogEngine'
import {
  CATALOG,
  FIVE,
  FULL_CATALOG,
  JUN_21,
  M101,
  M31,
  NGC7000,
  asError,
  asReady,
  baseParams,
  catalogMessage,
  computeMessage,
  countingEngine,
  loaded,
  paramsWith,
  resultFor,
  send,
  targetsOf,
} from './helpers'

describe('P1, P2 cały katalog aplikacji [AC1]', () => {
  it('P1: przekazanie całego katalogu (16 516 obiektów) → „gotowy” z liczbą 16 516', { timeout: 60_000 }, () => {
    expect(FULL_CATALOG).toHaveLength(16_516)
    const engine = createCatalogEngine()
    expect(asReady(send(engine, catalogMessage(FULL_CATALOG)))).toEqual({ type: 'ready', count: 16_516 })
  })

  it('„gotowy” podaje liczbę obiektów przekazanego katalogu: 5 obiektów → 5', () => {
    const engine = createCatalogEngine()
    expect(send(engine, catalogMessage(FIVE))).toEqual({ type: 'ready', count: 5 })
  })

  it('P2: żądanie bazowe nr 1 → odpowiedź nr 1 policzona, wynik dla 16 516 obiektów, M 31 9 h 39 min (±5 min)', { timeout: 60_000 }, () => {
    const engine = createCatalogEngine()
    asReady(send(engine, catalogMessage(FULL_CATALOG)))
    const result = resultFor(engine, 1, baseParams())
    expect(result.requestId).toBe(1)
    expect(result.fromCache).toBe(false)
    expect(result.objects).toHaveLength(16_516)
    expect(result.objects.map((object) => object.uid)).toEqual(CATALOG.map((object) => object.uid))
    const m31 = result.objects.find((object) => object.uid === M31.uid)
    expectWithin(m31?.effectiveMinutes ?? Number.NaN, 9 * 60 + 39, 5)
  })
})

describe('P3 to samo żądanie drugi raz: z pamięci [AC7]', () => {
  it('P3: żądanie bazowe nr 1, potem to samo jako nr 2 → nr 1 policzona, nr 2 z pamięci z identycznym wynikiem, liczenie raz', () => {
    const { engine, compute } = loaded(FIVE)
    const first = resultFor(engine, 1, baseParams())
    const second = resultFor(engine, 2, baseParams())
    expect(first).toMatchObject({ type: 'result', requestId: 1, fromCache: false })
    expect(second).toMatchObject({ type: 'result', requestId: 2, fromCache: true })
    expect(second.darkness).toEqual(first.darkness)
    expect(second.objects).toEqual(first.objects)
    expect(compute).toHaveBeenCalledTimes(1)
  })

  it('wynik policzony to wynik computeCatalogNight dla parametrów żądania, w kolejności obiektów katalogu', () => {
    const { engine } = loaded(FIVE)
    const result = resultFor(engine, 1, baseParams())
    const expected = computeCatalogNight(baseParams(), FIVE)
    expect(result.darkness).toEqual(expected.darkness)
    expect(result.objects).toEqual(expected.objects)
    expect(result.objects.map((object) => object.uid)).toEqual(FIVE.map((object) => object.uid))
  })

  it('numer odpowiedzi to numer żądania, także przy numerach nie po kolei (7, 42, 3)', () => {
    const { engine, compute } = loaded(FIVE)
    expect(resultFor(engine, 7, baseParams())).toMatchObject({ requestId: 7, fromCache: false })
    expect(resultFor(engine, 42, baseParams())).toMatchObject({ requestId: 42, fromCache: true })
    expect(resultFor(engine, 3, paramsWith({ nightDate: '2026-10-17' }))).toMatchObject({ requestId: 3, fromCache: false })
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('każde kolejne powtórzenie też jest z pamięci (5 powtórzeń, liczenie raz)', () => {
    const { engine, compute } = loaded(FIVE)
    const first = resultFor(engine, 1, baseParams())
    for (let requestId = 2; requestId <= 6; requestId++) {
      const again = resultFor(engine, requestId, baseParams())
      expect(again.fromCache).toBe(true)
      expect(again.objects).toEqual(first.objects)
    }
    expect(compute).toHaveBeenCalledTimes(1)
  })
})

describe('P8 odpowiedź niesie stan nocy [T6]', () => {
  it('P8: 21/22.06.2026 na 52,0°N → próg −12° obniżony z −18° i okno 23:15–02:16 CEST (±1 min)', () => {
    const { engine } = loaded(FIVE)
    const result = resultFor(engine, 1, paramsWith({ nightDate: JUN_21 }))
    expect(result.darkness).toMatchObject({ kind: 'window', thresholdDeg: -12, lowered: true })
    if (result.darkness.kind !== 'window') throw new Error('brak okna')
    expectSameMinute(result.darkness.window.startMs, at('2026-06-21 23:15', 'CEST'))
    expectSameMinute(result.darkness.window.endMs, at('2026-06-22 02:16', 'CEST'))
    expect(result.objects.map((object) => object.darkness)).toEqual(FIVE.map(() => result.darkness))
  })

  it('P8: ta sama noc na 54,83°N → „brak okna przy progu −12°”', () => {
    const { engine } = loaded(FIVE)
    const result = resultFor(engine, 1, paramsWith({ nightDate: JUN_21, location: { latDeg: 54.83 } }))
    expect(result.darkness).toEqual({ kind: 'none', thresholdDeg: -12 })
    expect(result.objects.map((object) => object.darkness)).toEqual(FIVE.map(() => ({ kind: 'none', thresholdDeg: -12 })))
  })

  it('P8: odpowiedź z pamięci też niesie stan nocy (54,83°N: „brak okna przy progu −12°”; 52,0°N: −12° obniżony)', () => {
    const { engine, compute } = loaded(FIVE)
    const north = paramsWith({ nightDate: JUN_21, location: { latDeg: 54.83 } })
    const south = paramsWith({ nightDate: JUN_21 })
    resultFor(engine, 1, north)
    resultFor(engine, 2, south)
    const northAgain = resultFor(engine, 3, north)
    const southAgain = resultFor(engine, 4, south)
    expect(northAgain).toMatchObject({ fromCache: true, darkness: { kind: 'none', thresholdDeg: -12 } })
    expect(southAgain).toMatchObject({ fromCache: true, darkness: { kind: 'window', thresholdDeg: -12, lowered: true } })
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('noc 16/17.10.2026 na 52,0°N: próg −18° bez obniżenia, okno 19:40–05:19 CEST (±1 min)', () => {
    const { engine } = loaded(FIVE)
    const { darkness } = resultFor(engine, 1, baseParams())
    expect(darkness).toMatchObject({ kind: 'window', thresholdDeg: -18, lowered: false })
    if (darkness.kind !== 'window') throw new Error('brak okna')
    expectSameMinute(darkness.window.startMs, at('2026-10-16 19:40', 'CEST'))
    expectSameMinute(darkness.window.endMs, at('2026-10-17 05:19', 'CEST'))
  })
})

describe('P10 ponowne przekazanie katalogu czyści pamięć', () => {
  it('P10: ponowne przekazanie katalogu → kolejne żądanie bazowe liczy się od nowa', () => {
    const { engine, compute } = loaded(FIVE)
    expect(resultFor(engine, 1, baseParams()).fromCache).toBe(false)
    expect(resultFor(engine, 2, baseParams()).fromCache).toBe(true)
    expect(send(engine, catalogMessage(FIVE))).toEqual({ type: 'ready', count: 5 })
    const after = resultFor(engine, 3, baseParams())
    expect(after).toMatchObject({ requestId: 3, fromCache: false })
    expect(compute).toHaveBeenCalledTimes(2)
    expect(resultFor(engine, 4, baseParams()).fromCache).toBe(true)
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('nowy katalog z innymi obiektami: wynik dla nowych obiektów w ich kolejności, nie stary z pamięci', () => {
    const { engine } = loaded(FIVE)
    resultFor(engine, 1, baseParams())
    const two = targetsOf([M101, M31])
    expect(send(engine, catalogMessage(two))).toEqual({ type: 'ready', count: 2 })
    const result = resultFor(engine, 2, baseParams())
    expect(result.fromCache).toBe(false)
    expect(result.objects.map((object) => object.uid)).toEqual([M101.uid, M31.uid])
    expect(result.objects).toEqual(computeCatalogNight(baseParams(), two).objects)
  })

  it('noce policzone przed nowym katalogiem też liczą się od nowa (16.10 i 21.06)', () => {
    const { engine, compute } = loaded(FIVE)
    resultFor(engine, 1, baseParams())
    resultFor(engine, 2, paramsWith({ nightDate: JUN_21 }))
    send(engine, catalogMessage(targetsOf([NGC7000])))
    expect(resultFor(engine, 3, paramsWith({ nightDate: JUN_21 })).fromCache).toBe(false)
    expect(resultFor(engine, 4, baseParams()).fromCache).toBe(false)
    expect(compute).toHaveBeenCalledTimes(4)
  })
})

describe('P11 żądanie przed przekazaniem katalogu', () => {
  it('P11: żądanie nr 1 przed katalogiem → „błąd” nr 1 „Katalog nie jest wczytany”; Worker przyjmuje dalsze komunikaty', () => {
    const engine = createCatalogEngine()
    expect(send(engine, computeMessage(1, baseParams()))).toEqual({
      type: 'error',
      requestId: 1,
      message: 'Katalog nie jest wczytany',
    })
    expect(send(engine, catalogMessage(FIVE))).toEqual({ type: 'ready', count: 5 })
    const result = resultFor(engine, 2, baseParams())
    expect(result).toMatchObject({ requestId: 2, fromCache: false })
    expect(result.objects).toEqual(computeCatalogNight(baseParams(), FIVE).objects)
  })

  it('błąd ma numer żądania (42) i nic nie liczy; kolejne żądanie przed katalogiem znów daje błąd', () => {
    const { engine, compute } = countingEngine()
    expect(asError(send(engine, computeMessage(42, baseParams())))).toEqual({
      type: 'error',
      requestId: 42,
      message: 'Katalog nie jest wczytany',
    })
    expect(asError(send(engine, computeMessage(43, paramsWith({ nightDate: JUN_21 }))))).toMatchObject({
      requestId: 43,
      message: 'Katalog nie jest wczytany',
    })
    expect(compute).not.toHaveBeenCalled()
  })
})
