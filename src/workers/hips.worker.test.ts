import { afterEach, expect, it, vi } from 'vitest'
import type { HipsReply, HipsRequest } from '../lib/hips'
const fetchTile = vi.hoisted(() => vi.fn())
vi.mock('../lib/hipsTiles', () => ({ fetchTile }))
const req: HipsRequest = { id: 1, raDeg: 10, decDeg: 20, fovDeg: 1, sizePx: 32, survey: 'dss2', mode: 'color', coarser: 2 }
afterEach(() => vi.unstubAllGlobals())

it.each(['canvas', 'draw', 'pixels'])('zamyka bitmapy po wyjątku: %s', async (failure) => {
  vi.resetModules()
  fetchTile.mockResolvedValue(new Blob(['image']))
  const close = vi.fn()
  const create = vi.fn(async () => ({ close }))
  vi.stubGlobal('createImageBitmap', create)
  vi.stubGlobal('OffscreenCanvas', class {
    constructor() { if (failure === 'canvas') throw new Error('canvas') }
    getContext() { return {
      drawImage() { if (failure === 'draw') throw new Error('draw') },
      getImageData() { throw new Error('pixels') },
    } }
  })
  const scope = { onmessage: null as unknown as (e: MessageEvent) => void, postMessage: vi.fn() }
  vi.stubGlobal('self', scope)
  await import('./hips.worker')
  scope.onmessage({ data: req } as MessageEvent)
  await vi.waitFor(() => expect(scope.postMessage).toHaveBeenCalled())
  expect(create.mock.calls.length).toBeGreaterThan(0)
  expect(close.mock.calls.length).toBe(create.mock.calls.length)
  expect(scope.postMessage.mock.calls[0][0]).toMatchObject({ id: 1, error: 'brak kafelków' })
})

it('potwierdza anulowanie dopiero po końcu współdzielonych pobrań kafelków', async () => {
  vi.resetModules()
  let finish!: (blob: Blob) => void
  fetchTile.mockReturnValue(new Promise<Blob>((resolve) => { finish = resolve }))
  const decode = vi.fn()
  vi.stubGlobal('createImageBitmap', decode)
  const scope = { onmessage: null as unknown as (e: MessageEvent) => void, postMessage: vi.fn<(r: HipsReply) => void>() }
  vi.stubGlobal('self', scope)
  await import('./hips.worker')
  scope.onmessage({ data: req } as MessageEvent)
  scope.onmessage({ data: { cancel: 1 } } as MessageEvent)
  await Promise.resolve()
  expect(scope.postMessage).not.toHaveBeenCalled()
  finish(new Blob(['image']))
  await vi.waitFor(() => expect(scope.postMessage).toHaveBeenCalledWith({ id: 1, cancelled: true }))
  expect(decode).not.toHaveBeenCalled()
})
