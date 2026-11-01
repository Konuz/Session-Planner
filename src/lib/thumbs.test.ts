import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DSO } from './catalog'
import type { HipsReply, HipsRequest } from './hips'

type Reply = HipsReply | 'crash' | 'never'

/** Atrapa workera: zapamiętuje zlecenia i odpowiada w mikrozadaniu wynikiem z `reply` ('crash' = błąd workera). */
class FakeWorker {
  static posted: (HipsRequest | { cancel: number })[] = []
  static created = 0
  static reply: (msg: HipsRequest) => Reply = (msg) => ({ id: msg.id, blob: new Blob([new Uint8Array(500)]), complete: true })
  onmessage: ((e: MessageEvent<HipsReply>) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  constructor() {
    FakeWorker.created++
  }
  terminate() {}
  postMessage(msg: HipsRequest | { cancel: number }) {
    FakeWorker.posted.push(msg)
    if ('cancel' in msg) return
    const r = FakeWorker.reply(msg)
    if (r === 'never') return
    queueMicrotask(() => (r === 'crash' ? this.onerror?.(new Event('error')) : this.onmessage?.({ data: r } as MessageEvent<HipsReply>)))
  }
}

describe('miniatury', () => {
  beforeEach(() => {
    vi.resetModules()
    FakeWorker.posted = []
    FakeWorker.created = 0
    FakeWorker.reply = (msg) => ({ id: msg.id, blob: new Blob([new Uint8Array(500)]), complete: true })
    vi.stubGlobal('Worker', FakeWorker)
  })

  it('niepełny obraz (kafelek nie przyszedł) nie trafia do Cache Storage', async () => {
    const put = vi.fn(async () => undefined)
    vi.stubGlobal('caches', { open: async () => ({ match: async () => undefined, put }), delete: async () => true })
    FakeWorker.reply = (msg) => ({ id: msg.id, blob: new Blob([new Uint8Array(500)]), complete: msg.raDeg === 1 })
    const { getSkyImage } = await import('./thumbs')
    await getSkyImage(2, 20, 3, 800)
    expect(put).not.toHaveBeenCalled()
    await getSkyImage(1, 20, 3, 800)
    expect(put).toHaveBeenCalledTimes(1)
  })

  it('awaria workera odrzuca zadanie, a kolejne tworzy nowy worker', async () => {
    FakeWorker.reply = () => 'crash'
    const { getSkyImage } = await import('./thumbs')
    await expect(getSkyImage(10, 20, 3, 800)).rejects.toThrow()
    FakeWorker.reply = (msg) => ({ id: msg.id, blob: new Blob([new Uint8Array(500)]), complete: true })
    await expect(getSkyImage(11, 20, 3, 800)).resolves.toMatch(/^blob:/)
    expect(FakeWorker.created).toBe(2)
  })

  it('przerwanie wysyła do workera anulowanie zadania', async () => {
    FakeWorker.reply = () => 'never'
    const { getSkyImage } = await import('./thumbs')
    const ctrl = new AbortController()
    const p = getSkyImage(10, 20, 3, 800, ctrl.signal)
    await vi.waitFor(() => expect(FakeWorker.posted.length).toBe(1))
    ctrl.abort()
    await expect(p).rejects.toThrow()
    expect(FakeWorker.posted[1]).toEqual({ cancel: (FakeWorker.posted[0] as HipsRequest).id })
  })

  it('odbiorca z już przerwanym sygnałem nie dostaje obrazu z pamięci', async () => {
    const { getSkyImage } = await import('./thumbs')
    await getSkyImage(10, 20, 3, 800)
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(getSkyImage(10, 20, 3, 800, ctrl.signal)).rejects.toThrow('aborted')
  })
  afterEach(() => vi.unstubAllGlobals())

  it('drugi odbiorca dostaje obraz, gdy pierwszy przerwał wspólne zapytanie (podwójny efekt w StrictMode)', async () => {
    const { getSkyImage } = await import('./thumbs')
    const first = new AbortController()
    const a = getSkyImage(83.82, -5.39, 1, 100, first.signal)
    first.abort()
    const b = getSkyImage(83.82, -5.39, 1, 100, new AbortController().signal)
    await expect(a).rejects.toThrow()
    await expect(b).resolves.toMatch(/^blob:/)
  })

  it('domyślnie DSS2 czarno-białe; getThumb prosi o 128 px i rząd grubszy o 2', async () => {
    const { getSkyImage, getThumb } = await import('./thumbs')
    await getSkyImage(10, 20, 3, 800)
    expect(FakeWorker.posted[0]).toMatchObject({ survey: 'dss2', mode: 'red', coarser: 0, sizePx: 800 })
    await getThumb({ raDeg: 1, decDeg: 2, majArcmin: 10 } as DSO)
    expect(FakeWorker.posted[1]).toMatchObject({ sizePx: 128, coarser: 2, fovDeg: 0.283 })
  })

  it('błąd workera odrzuca obietnicę', async () => {
    FakeWorker.reply = (msg) => ({ id: msg.id, error: 'brak kafelków' })
    const { getSkyImage } = await import('./thumbs')
    await expect(getSkyImage(10, 20, 3, 800)).rejects.toThrow('brak kafelków')
  })
})
