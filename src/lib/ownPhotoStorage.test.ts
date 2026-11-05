import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { OwnPhotoRecord, OwnPhotoSolved } from './ownPhoto'

const astrometry = { raDeg: 0, decDeg: 0, rmsPx: 0, matches: 0, edgeMatches: 0, edgeRmsPx: null, totalMs: 0, wcs: null }
const record = (objectId: string): OwnPhotoRecord => ({
  objectId, photoId: `id-${objectId}`, name: 'zdjęcie.jpg', image: new Blob(['jpeg'], { type: 'image/jpeg' }), mask: null,
  width: 10, height: 8, createdAt: 1, astrometry, grid: { cols: 2, rows: 2, sky: [[0, 0], [1, 0], [0, 1], [1, 1]] },
})

let data: Map<string, unknown>
let stores: string[]

beforeEach(() => {
  vi.resetModules()
  data = new Map()
  stores = []
  const db = {
    close: vi.fn(),
    createObjectStore(name: string) { stores.push(name) },
    transaction() {
      const transaction = {
        error: null,
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onabort: null as (() => void) | null,
        objectStore: () => ({
          get(key: string) {
            const request = { result: undefined as unknown, onsuccess: null as (() => void) | null, onerror: null }
            queueMicrotask(() => { request.result = data.get(key); request.onsuccess?.() })
            return request
          },
          put(value: unknown, key: string) { data.set(key, value) },
          delete(key: string) { data.delete(key) },
        }),
      }
      setTimeout(() => transaction.oncomplete?.())
      return transaction
    },
  }
  vi.stubGlobal('indexedDB', { open() {
    const request = { result: db, onupgradeneeded: null as (() => void) | null, onsuccess: null as (() => void) | null, onerror: null }
    queueMicrotask(() => { if (!stores.length) request.onupgradeneeded?.(); request.onsuccess?.() })
    return request
  } })
})
afterEach(() => vi.unstubAllGlobals())

it('zapis i odczyt zwraca ten sam rekord', async () => {
  const { writeOwnPhoto, readOwnPhoto } = await import('./ownPhotoStorage')
  const saved = record('M 51')
  await writeOwnPhoto(saved)
  expect(await readOwnPhoto('M 51')).toEqual(saved)
})

it('odczyt nieznanego obiektu to null', async () => {
  const { readOwnPhoto } = await import('./ownPhotoStorage')
  expect(await readOwnPhoto('M 1')).toBeNull()
})

it('usunięcie kasuje rekord', async () => {
  const { writeOwnPhoto, readOwnPhoto, deleteOwnPhoto } = await import('./ownPhotoStorage')
  await writeOwnPhoto(record('M 42'))
  await deleteOwnPhoto('M 42')
  expect(await readOwnPhoto('M 42')).toBeNull()
})

it('baza tworzy magazyn photos', async () => {
  const { readOwnPhoto } = await import('./ownPhotoStorage')
  await readOwnPhoto('M 1')
  expect(stores).toEqual(['photos'])
})

it('recordFromSolved bierze objectId z odpowiedzi i zachowuje mask null', async () => {
  const { recordFromSolved } = await import('./ownPhotoStorage')
  const solved: OwnPhotoSolved = { ...record('M 81'), image: 'data:image/jpeg;base64,/9j/', mask: null }
  const converted = await recordFromSolved(solved)
  expect(converted.objectId).toBe('M 81')
  expect(converted.mask).toBeNull()
  expect(converted.image.type).toBe('image/jpeg')
  expect(converted.image.size).toBe(3)
})

it('recordFromSolved zamienia maskę na Blob PNG', async () => {
  const { recordFromSolved } = await import('./ownPhotoStorage')
  const solved: OwnPhotoSolved = { ...record('M 81'), image: 'data:image/jpeg;base64,/9j/', mask: 'data:image/png;base64,iVBORw==' }
  expect((await recordFromSolved(solved)).mask?.type).toBe('image/png')
})
