import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import type { PhotoProject } from './photo'

const project = (id: string): PhotoProject => ({
  version: 3, id, name: id, image: 'data:image/png;base64,AA==', width: 1, height: 1, createdAt: 0, cuts: [],
  astrometry: { raDeg: 0, decDeg: 0, rmsPx: 0, matches: 0, edgeMatches: 0, edgeRmsPx: null, totalMs: 0, wcs: null }, stars: null,
})

let saved: PhotoProject | null
let transactions: { complete(): void; fail(): void }[]

beforeEach(() => {
  vi.resetModules()
  saved = project('zapisane')
  transactions = []
  const db = {
    close: vi.fn(),
    transaction(_store: string, mode?: string) {
      let next = saved
      const transaction = {
        error: new Error('Brak miejsca'),
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onabort: null as (() => void) | null,
        objectStore: () => ({
          put(value: PhotoProject) { next = value },
          delete() { next = null },
          get() {
            const request = { result: saved, onsuccess: null as (() => void) | null }
            queueMicrotask(() => request.onsuccess?.())
            return request
          },
        }),
      }
      if (mode === 'readwrite') transactions.push({
        complete() { saved = next; transaction.oncomplete?.() },
        fail() { transaction.onerror?.() },
      })
      return transaction
    },
  }
  vi.stubGlobal('indexedDB', { open() {
    const request = { result: db, onsuccess: null as (() => void) | null }
    queueMicrotask(() => request.onsuccess?.())
    return request
  } })
})
afterEach(() => vi.unstubAllGlobals())

it('odzyskuje ostatni projekt po nieudanym zapisie przy opuszczeniu widoku', async () => {
  const { writePhoto, readPhoto } = await import('./photoStorage')
  const latest = project('ostatnia zmiana')
  const saving = writePhoto(latest)
  const failed = expect(saving).rejects.toThrow('Brak miejsca')
  await vi.waitFor(() => expect(transactions).toHaveLength(1))
  transactions[0].fail()
  await failed
  expect(await readPhoto()).toEqual(latest)
})

it('zapisuje projekty w kolejności zmian i zachowuje najnowszy', async () => {
  const { writePhoto, readPhoto } = await import('./photoStorage')
  const first = writePhoto(project('pierwszy'))
  const second = writePhoto(project('drugi'))
  await vi.waitFor(() => expect(transactions.length).toBeGreaterThan(0))
  expect(transactions).toHaveLength(1)
  transactions[0].complete()
  await first
  await vi.waitFor(() => expect(transactions).toHaveLength(2))
  transactions[1].complete()
  await second
  expect(await readPhoto()).toEqual(project('drugi'))
})

it('pamięta nieudaną operację usunięcia i pozwala ją ponowić', async () => {
  const { writePhoto, readPhoto } = await import('./photoStorage')
  const deleting = writePhoto(null)
  const failed = expect(deleting).rejects.toThrow('Brak miejsca')
  await vi.waitFor(() => expect(transactions).toHaveLength(1))
  transactions[0].fail()
  await failed
  expect(await readPhoto()).toBeNull()
  const retry = writePhoto(null)
  await vi.waitFor(() => expect(transactions).toHaveLength(2))
  transactions[1].complete()
  await retry
  expect(saved).toBeNull()
})
