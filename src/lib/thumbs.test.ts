import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DSO } from './catalog'
import type { HipsReply, HipsRequest } from './hips'

/** Atrapa workera: zapamiętuje zlecenia i odpowiada w mikrozadaniu wynikiem z `reply`. */
class FakeWorker {
  static posted: HipsRequest[] = []
  static reply: (msg: HipsRequest) => HipsReply = (msg) => ({ id: msg.id, blob: new Blob([new Uint8Array(500)]) })
  onmessage: ((e: MessageEvent<HipsReply>) => void) | null = null
  postMessage(msg: HipsRequest) {
    FakeWorker.posted.push(msg)
    queueMicrotask(() => this.onmessage?.({ data: FakeWorker.reply(msg) } as MessageEvent<HipsReply>))
  }
}

describe('miniatury', () => {
  beforeEach(() => {
    vi.resetModules()
    FakeWorker.posted = []
    FakeWorker.reply = (msg) => ({ id: msg.id, blob: new Blob([new Uint8Array(500)]) })
    vi.stubGlobal('Worker', FakeWorker)
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

  it('domyślnie DSS2 czarno-białe; getThumb prosi o 128 px i rząd grubszy o 1', async () => {
    const { getSkyImage, getThumb } = await import('./thumbs')
    await getSkyImage(10, 20, 3, 800)
    expect(FakeWorker.posted[0]).toMatchObject({ survey: 'dss2', mode: 'red', coarser: 0, sizePx: 800 })
    await getThumb({ raDeg: 1, decDeg: 2, majArcmin: 10 } as DSO)
    expect(FakeWorker.posted[1]).toMatchObject({ sizePx: 128, coarser: 1, fovDeg: 0.283 })
  })

  it('błąd workera odrzuca obietnicę', async () => {
    FakeWorker.reply = (msg) => ({ id: msg.id, error: 'brak kafelków' })
    const { getSkyImage } = await import('./thumbs')
    await expect(getSkyImage(10, 20, 3, 800)).rejects.toThrow('brak kafelków')
  })
})
