// Klient Workera w wątku głównym: numeruje żądania i przyjmuje tylko odpowiedź na ostatnie (P9); atrapa Workera z postMessage.
import { describe, expect, it } from 'vitest'
import { createCatalogClient } from '../../../src/workers/catalogClient'
import { createCatalogEngine } from '../../../src/workers/catalogEngine'
import type { CatalogWorkerRequest, CatalogWorkerResponse, ErrorResponse } from '../../../src/workers/catalogMessages'
import { FIVE, FIVE_OBJECTS, FakeWorker, OCT_16, OCT_17, asResult, paramsWith, targetsOf } from './helpers'

/** Klient z atrapą Workera; `accepted` = odpowiedzi przyjęte przez klienta. */
function setup() {
  const worker = new FakeWorker()
  const accepted: CatalogWorkerResponse[] = []
  const client = createCatalogClient((response) => accepted.push(response), worker)
  return { worker, accepted, client }
}

/** Odpowiedzi prawdziwego silnika na komunikaty wysłane przez klienta (w tej samej kolejności). */
function engineReplies(messages: readonly CatalogWorkerRequest[]): CatalogWorkerResponse[] {
  const engine = createCatalogEngine()
  return messages.map((message) => structuredClone(engine.handle(structuredClone(message))))
}

const results = (responses: readonly CatalogWorkerResponse[]) => responses.filter((response) => response.type === 'result')
const errors = (responses: readonly CatalogWorkerResponse[]) =>
  responses.filter((response): response is ErrorResponse => response.type === 'error')

describe('P9 tylko odpowiedź na ostatnie żądanie', () => {
  it('P9: nr 1 (noc 16.10), potem nr 2 (noc 17.10); odpowiedź nr 1 po wysłaniu nr 2 → pomijana, przyjęta nr 2', () => {
    const { worker, accepted, client } = setup()
    client.sendCatalog(FIVE)
    expect(client.request(paramsWith({ nightDate: OCT_16 }))).toBe(1)
    expect(client.request(paramsWith({ nightDate: OCT_17 }))).toBe(2)
    expect(worker.sent).toEqual([
      { type: 'catalog', objects: FIVE },
      { type: 'compute', requestId: 1, params: paramsWith({ nightDate: OCT_16 }) },
      { type: 'compute', requestId: 2, params: paramsWith({ nightDate: OCT_17 }) },
    ])
    const [ready, first, second] = engineReplies(worker.sent)
    expect(asResult(first).requestId).toBe(1)
    expect(asResult(second).requestId).toBe(2)
    worker.reply(ready)
    worker.reply(first)
    expect(results(accepted)).toEqual([])
    worker.reply(second)
    expect(results(accepted)).toEqual([second])
  })

  it('odpowiedź nr 1, która przychodzi przed wysłaniem nr 2, jest przyjęta', () => {
    const { worker, accepted, client } = setup()
    client.sendCatalog(FIVE)
    client.request(paramsWith({ nightDate: OCT_16 }))
    const [ready, first] = engineReplies(worker.sent)
    worker.reply(ready)
    worker.reply(first)
    expect(results(accepted)).toEqual([first])
    client.request(paramsWith({ nightDate: OCT_17 }))
    const second = engineReplies(worker.sent)[2]
    worker.reply(second)
    expect(results(accepted)).toEqual([first, second])
  })

  it('trzy żądania pod rząd: przyjęta tylko odpowiedź nr 3, choć odpowiedzi nr 1 i 2 przychodzą po niej', () => {
    const { worker, accepted, client } = setup()
    client.sendCatalog(FIVE)
    const ids = [OCT_16, OCT_17, '2026-10-18'].map((nightDate) => client.request(paramsWith({ nightDate })))
    expect(ids).toEqual([1, 2, 3])
    const [, first, second, third] = engineReplies(worker.sent)
    worker.reply(third)
    worker.reply(first)
    worker.reply(second)
    expect(results(accepted)).toEqual([third])
  })

  it('„błąd” dla starszego żądania jest pomijany, a dla ostatniego przyjęty', () => {
    const { worker, accepted, client } = setup()
    client.request(paramsWith({ nightDate: OCT_16 }))
    client.request(paramsWith({ nightDate: OCT_17 }))
    const [staleError, latestError] = engineReplies(worker.sent)
    expect(staleError).toEqual({ type: 'error', requestId: 1, message: 'Katalog nie jest wczytany' })
    worker.reply(staleError)
    expect(errors(accepted)).toEqual([])
    worker.reply(latestError)
    expect(errors(accepted)).toEqual([{ type: 'error', requestId: 2, message: 'Katalog nie jest wczytany' }])
  })

  it('numery rosną o 1 także po przekazaniu nowego katalogu: 1, 2, potem 3', () => {
    const { worker, client } = setup()
    client.sendCatalog(FIVE)
    expect(client.request(paramsWith({}))).toBe(1)
    expect(client.request(paramsWith({ nightDate: OCT_17 }))).toBe(2)
    client.sendCatalog(FIVE.slice(0, 2))
    expect(client.request(paramsWith({}))).toBe(3)
    expect(worker.sent.map((message) => (message.type === 'compute' ? message.requestId : message.type))).toEqual([
      'catalog',
      1,
      2,
      'catalog',
      3,
    ])
  })
})

describe('przekazanie katalogu z wątku głównego', () => {
  it('Worker dostaje tylko uid i współrzędne J2000 obiektów; pozostałe dane katalogu zostają w wątku głównym', () => {
    const { worker, client } = setup()
    client.sendCatalog(FIVE_OBJECTS)
    expect(worker.sent).toEqual([{ type: 'catalog', objects: targetsOf(FIVE_OBJECTS) }])
    const sent = worker.sent[0]
    if (sent.type !== 'catalog') throw new Error('oczekiwano komunikatu „katalog”')
    expect(sent.objects.map((object) => Object.keys(object).sort())).toEqual(FIVE_OBJECTS.map(() => ['decDeg', 'raDeg', 'uid']))
  })
})
