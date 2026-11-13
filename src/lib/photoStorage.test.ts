import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import type { PhotoProject } from './photo'

const IMAGE = 'data:image/png;base64,AA=='
const project = (id: string, image = IMAGE): PhotoProject => ({
  version: 3, id, name: id, image, width: 1, height: 1, createdAt: 0, cuts: [],
  astrometry: { raDeg: 0, decDeg: 0, rmsPx: 0, matches: 0, edgeMatches: 0, edgeRmsPx: null, totalMs: 0, wcs: null }, stars: null,
})

/** Zawartość magazynu `projects` po kluczach ('current', 'current-image'). */
let store: Map<string, unknown>
let transactions: { complete(): void; fail(): void }[]
let puts: { key: string; value: unknown }[]

beforeEach(() => {
  vi.resetModules()
  store = new Map<string, unknown>([['current', project('zapisane')]])
  transactions = []
  puts = []
  const db = {
    close: vi.fn(),
    transaction(_store: string, mode?: string) {
      const next = new Map(store)
      const transaction = {
        error: new Error('Brak miejsca'),
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onabort: null as (() => void) | null,
        objectStore: () => ({
          put(value: unknown, key: string) { next.set(key, value); puts.push({ key, value }) },
          delete(key: string) { next.delete(key) },
          get(key: string) { return { result: store.get(key) } },
        }),
      }
      if (mode === 'readwrite') transactions.push({
        complete() { store = next; transaction.oncomplete?.() },
        fail() { transaction.onerror?.() },
      })
      else queueMicrotask(() => transaction.oncomplete?.())
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

const blobText = async (value: unknown) => (value instanceof Blob ? new Uint8Array(await value.arrayBuffer()) : null)

it('odzyskuje ostatni projekt po nieudanym zapisie przy opuszczeniu widoku', async () => {
  const { writePhoto, readPhoto } = await import('./photoStorage')
  const latest = project('ostatnia zmiana')
  const saving = writePhoto(latest)
  const failed = expect(saving).rejects.toThrow('Brak miejsca')
  await vi.waitFor(() => expect(transactions.length).toBeGreaterThan(0))
  // Odczyt starego zapisu przenosi obraz i sam zapisuje projekt: tu zawodzą wszystkie zapisy.
  transactions.forEach((t) => t.fail())
  await failed
  expect(await readPhoto()).toEqual(latest)
})

it('zapisuje obraz osobno, a rekord projektu bez obrazu (audyt C06)', async () => {
  store = new Map()
  const { writePhoto, readPhoto, photoImageUrl } = await import('./photoStorage')
  const url = await photoImageUrl(IMAGE)
  expect(url).toMatch(/^blob:/)
  const first = writePhoto(project('pierwszy', url))
  const second = writePhoto({ ...project('pierwszy', url), name: 'po edycji' })
  await vi.waitFor(() => expect(transactions.length).toBeGreaterThan(0))
  transactions[0].complete()
  await first
  await vi.waitFor(() => expect(transactions).toHaveLength(2))
  transactions[1].complete()
  await second
  // Obraz trafia do bazy raz; drugi zapis (zmiana bez nowego zdjęcia) niesie tylko mały rekord.
  expect(puts.filter((p) => p.key === 'current-image')).toHaveLength(1)
  expect((store.get('current') as PhotoProject).image).toBe('')
  expect(await blobText(store.get('current-image'))).toEqual(new Uint8Array([0]))
  const read = await readPhoto()
  expect(read).toEqual({ ...project('pierwszy', url), name: 'po edycji' })
})

it('przenosi obraz ze starego zapisu do osobnego klucza przy odczycie', async () => {
  const { readPhoto } = await import('./photoStorage')
  const reading = readPhoto()
  const read = await reading
  expect(read?.image).toMatch(/^blob:/)
  expect({ ...read, image: IMAGE }).toEqual(project('zapisane'))
  await vi.waitFor(() => expect(transactions).toHaveLength(1))
  transactions[0].complete()
  await vi.waitFor(() => expect((store.get('current') as PhotoProject).image).toBe(''))
  expect(await blobText(store.get('current-image'))).toEqual(new Uint8Array([0]))
  // Ponowny odczyt: ten sam adres blob:, bez tworzenia nowego.
  expect((await readPhoto())?.image).toBe(read?.image)
})

it('pamięta nieudaną operację usunięcia i pozwala ją ponowić', async () => {
  const { writePhoto, readPhoto } = await import('./photoStorage')
  store.set('current-image', new Blob([new Uint8Array([0])]))
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
  expect(store.size).toBe(0)
})
