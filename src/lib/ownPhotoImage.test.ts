import { beforeEach, expect, it, vi } from 'vitest'
import type { OwnPhotoRecord, TanView } from './ownPhoto'

const mocks = vi.hoisted(() => ({
  cache: { get: vi.fn<(key: string) => Promise<Blob | null>>(), put: vi.fn<(key: string, blob: Blob) => Promise<void>>() },
  read: vi.fn<(objectId: string) => Promise<unknown>>(),
  sky: vi.fn<(...args: unknown[]) => Promise<Blob>>(),
  complete: vi.fn<(blob: Blob) => boolean>(),
  compose: vi.fn<(background: Blob | null, record: unknown, view: TanView) => Promise<Blob>>(),
}))
vi.mock('./imageCache', () => ({ imageCache: () => mocks.cache }))
vi.mock('./ownPhotoStorage', () => ({ readOwnPhoto: mocks.read }))
vi.mock('./thumbs', () => ({ getSkyImage: mocks.sky, isCompleteSkyImage: mocks.complete }))
vi.mock('./ownPhotoCompose', () => ({ composeOwnPhoto: mocks.compose }))

const { getOwnSkyImage, ownImageKey, OwnPhotoMissingError } = await import('./ownPhotoImage')

const view: TanView = { raDeg: 10, decDeg: 20, fovDeg: 1.5, sizePx: 480 }
const record = { objectId: 'M 51', photoId: 'abc' } as OwnPhotoRecord
const background = new Blob(['tło'])
const composed = new Blob(['złożone'])

beforeEach(() => {
  mocks.cache.get.mockReset().mockResolvedValue(null)
  mocks.cache.put.mockReset().mockResolvedValue()
  mocks.read.mockReset().mockResolvedValue(record)
  mocks.sky.mockReset().mockResolvedValue(background)
  mocks.complete.mockReset().mockReturnValue(true)
  mocks.compose.mockReset().mockResolvedValue(composed)
})

it('klucz zawiera photoId i parametry widoku', () => {
  expect(ownImageKey('abc', view, {})).toBe('/own/abc/dss2/color/0/10.0000/20.0000/1.5/480')
  expect(ownImageKey('abc', view, { survey: 'ps1', mode: 'color', coarser: 2 })).toBe('/own/abc/ps1/color/2/10.0000/20.0000/1.5/480')
})

it('różne zdjęcia nie dzielą klucza', () => {
  expect(ownImageKey('abc', view, {})).not.toBe(ownImageKey('abd', view, {}))
})

it('brak rekordu lub inny photoId rzuca OwnPhotoMissingError', async () => {
  mocks.read.mockResolvedValueOnce(null)
  await expect(getOwnSkyImage('M 51', 'abc', view)).rejects.toBeInstanceOf(OwnPhotoMissingError)
  mocks.read.mockResolvedValueOnce({ ...record, photoId: 'inne' })
  await expect(getOwnSkyImage('M 51', 'abc', view)).rejects.toBeInstanceOf(OwnPhotoMissingError)
  expect(mocks.compose).not.toHaveBeenCalled()
})

it('złożony obraz trafia do bufora pod kluczem zdjęcia', async () => {
  expect(await getOwnSkyImage('M 51', 'abc', view, undefined, { coarser: 1 })).toBe(composed)
  expect(mocks.sky).toHaveBeenCalledWith(10, 20, 1.5, 480, undefined, { coarser: 1 })
  expect(mocks.compose).toHaveBeenCalledWith(background, record, view)
  expect(mocks.cache.put).toHaveBeenCalledWith('/own/abc/dss2/color/1/10.0000/20.0000/1.5/480', composed)
})

it('obraz z bufora nie składa się ponownie', async () => {
  mocks.cache.get.mockResolvedValueOnce(composed)
  expect(await getOwnSkyImage('M 51', 'abc', view)).toBe(composed)
  expect(mocks.compose).not.toHaveBeenCalled()
})

it('błąd tła nie blokuje zdjęcia, a wynik nie trafia do bufora', async () => {
  mocks.sky.mockRejectedValueOnce(new Error('brak kafelków'))
  expect(await getOwnSkyImage('M 51', 'abc', view)).toBe(composed)
  expect(mocks.compose).toHaveBeenCalledWith(null, record, view)
  expect(mocks.cache.put).not.toHaveBeenCalled()
})

it('przerwanie przez signal przechodzi jako AbortError', async () => {
  mocks.sky.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'))
  await expect(getOwnSkyImage('M 51', 'abc', view, new AbortController().signal)).rejects.toMatchObject({ name: 'AbortError' })
  expect(mocks.compose).not.toHaveBeenCalled()
})

it('złożenie na niepełnym tle nie trafia do bufora', async () => {
  mocks.complete.mockReturnValue(false)
  expect(await getOwnSkyImage('M 51', 'abc', view)).toBe(composed)
  expect(mocks.compose).toHaveBeenCalledWith(background, record, view)
  expect(mocks.cache.put).not.toHaveBeenCalled()
})
