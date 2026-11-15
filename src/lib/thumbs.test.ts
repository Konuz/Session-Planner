import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DSO } from './catalog'
import type { HipsReply, HipsRequest } from './hips'

type Reply = HipsReply | 'crash' | 'never'

/** Atrapa workera: zapamiętuje zlecenia i odpowiada w mikrozadaniu wynikiem z `reply` ('crash' = błąd workera). */
class FakeWorker {
  static posted: (HipsRequest | { cancel: number })[] = []
  static created = 0
  static instance: FakeWorker
  static reply: (msg: HipsRequest) => Reply = (msg) => ({ id: msg.id, blob: new Blob([new Uint8Array(500)]), complete: true })
  onmessage: ((e: MessageEvent<HipsReply>) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  constructor() {
    FakeWorker.created++
    FakeWorker.instance = this
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
    vi.stubGlobal('caches', { open: async () => ({ match: async () => undefined, keys: async () => [], put }), delete: async () => true })
    FakeWorker.reply = (msg) => ({ id: msg.id, blob: new Blob([new Uint8Array(500)]), complete: msg.raDeg === 1 })
    const { getSkyImage } = await import('./thumbs')
    await getSkyImage(2, 20, 3, 800)
    expect(put).not.toHaveBeenCalled()
    await getSkyImage(1, 20, 3, 800)
    expect(put).toHaveBeenCalledTimes(1)
  })

  it('niepełny obraz jest rozpoznawalny dla odbiorców składających obrazy', async () => {
    FakeWorker.reply = (msg) => ({ id: msg.id, blob: new Blob([new Uint8Array(500)]), complete: msg.raDeg === 1 })
    const { getSkyImage, isCompleteSkyImage } = await import('./thumbs')
    expect(isCompleteSkyImage(await getSkyImage(2, 20, 3, 800))).toBe(false)
    expect(isCompleteSkyImage(await getSkyImage(1, 20, 3, 800))).toBe(true)
  })

  it('awaria workera odrzuca zadanie, a kolejne tworzy nowy worker', async () => {
    FakeWorker.reply = () => 'crash'
    const { getSkyImage } = await import('./thumbs')
    await expect(getSkyImage(10, 20, 3, 800)).rejects.toThrow()
    FakeWorker.reply = (msg) => ({ id: msg.id, blob: new Blob([new Uint8Array(500)]), complete: true })
    await expect(getSkyImage(11, 20, 3, 800)).resolves.toBeInstanceOf(Blob)
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
    await expect(b).resolves.toBeInstanceOf(Blob)
  })

  it('domyślnie DSS2 kolor; getThumb prosi o 224 px i rząd grubszy o 1', async () => {
    const { getSkyImage, getThumb } = await import('./thumbs')
    await getSkyImage(10, 20, 3, 800)
    expect(FakeWorker.posted[0]).toMatchObject({ survey: 'dss2', mode: 'color', coarser: 0, sizePx: 800 })
    await getThumb({ raDeg: 1, decDeg: 2, majArcmin: 10 } as DSO)
    expect(FakeWorker.posted[1]).toMatchObject({ sizePx: 224, coarser: 1, fovDeg: 0.283 })
  })

  it('miniatura NSNS: tylko duże pole w pokryciu, inaczej DSS2 z rzędem grubszym o 1', async () => {
    const { getThumb, thumbImageOptions } = await import('./thumbs')
    // NGC 7000 (120′): pole 3,4°, 55″/px.
    await getThumb({ raDeg: 314.7, decDeg: 44.3, majArcmin: 120 } as DSO, undefined, 'nsns')
    expect(FakeWorker.posted[0]).toMatchObject({ survey: 'nsns', coarser: 0, sizePx: 224 })
    // M 51 (11′): pole 0,31°, 5″/px — za drobno dla NSNS.
    await getThumb({ raDeg: 202.47, decDeg: 47.2, majArcmin: 11 } as DSO, undefined, 'nsns')
    expect(FakeWorker.posted[1]).toMatchObject({ survey: 'dss2', coarser: 1 })
    // Pole sięgające na południe od −16°: DSS2.
    expect(thumbImageOptions('nsns', -15, 4, 224)).toEqual({ survey: 'dss2', coarser: 0 })
    expect(thumbImageOptions('nsns', -13, 4, 224)).toEqual({ survey: 'nsns' })
    expect(thumbImageOptions('nsnsRgb', -13, 4, 224)).toEqual({ survey: 'nsnsRgb' })
    expect(thumbImageOptions('nsnsRgb', 47, 0.3, 224)).toEqual({ survey: 'dss2', coarser: 0 })
    expect(thumbImageOptions('dss2', 40, 4, 224)).toEqual({ survey: 'dss2', coarser: 0 })
  })

  it('błąd workera odrzuca obietnicę', async () => {
    FakeWorker.reply = (msg) => ({ id: msg.id, error: 'brak kafelków' })
    const { getSkyImage } = await import('./thumbs')
    await expect(getSkyImage(10, 20, 3, 800)).rejects.toThrow('brak kafelków')
  })

  it('anulowanie jednego odbiorcy nie anuluje obrazu drugiemu i nie tworzy współdzielonych URL', async () => {
    FakeWorker.reply = () => 'never'
    const create = vi.spyOn(URL, 'createObjectURL')
    const { getSkyImage } = await import('./thumbs')
    const ctrl = new AbortController()
    const a = getSkyImage(1, 2, 3, 224, ctrl.signal)
    const b = getSkyImage(1, 2, 3, 224)
    await vi.waitFor(() => expect(FakeWorker.posted.length).toBe(1))
    ctrl.abort()
    await expect(a).rejects.toThrow('aborted')
    expect(FakeWorker.posted.length).toBe(1)
    const id = (FakeWorker.posted[0] as HipsRequest).id
    FakeWorker.instance.onmessage?.({ data: { id, blob: new Blob(['image']), complete: true } } as MessageEvent<HipsReply>)
    expect(await (await b).text()).toBe('image')
    expect(create).not.toHaveBeenCalled()
    create.mockRestore()
  })

  it('anulowane zadania trzymają pięć slotów do potwierdzenia końca pracy', async () => {
    FakeWorker.reply = () => 'never'
    const { getSkyImage } = await import('./thumbs')
    const controllers = Array.from({ length: 5 }, () => new AbortController())
    const first = controllers.map((ctrl, i) => getSkyImage(i, 2, 3, 224, ctrl.signal).catch((e: Error) => e.name))
    await vi.waitFor(() => expect(FakeWorker.posted.length).toBe(5))
    controllers.forEach((c) => c.abort())
    expect(await Promise.all(first)).toEqual(Array(5).fill('AbortError'))
    const next = getSkyImage(99, 2, 3, 224)
    await new Promise((r) => setTimeout(r, 10))
    expect(FakeWorker.posted.filter((m) => !('cancel' in m))).toHaveLength(5)
    const id = (FakeWorker.posted[0] as HipsRequest).id
    FakeWorker.instance.onmessage?.({ data: { id, cancelled: true } } as MessageEvent<HipsReply>)
    await vi.waitFor(() => expect(FakeWorker.posted.filter((m) => !('cancel' in m))).toHaveLength(6))
    const last = FakeWorker.posted.at(-1) as HipsRequest
    FakeWorker.instance.onmessage?.({ data: { id: last.id, blob: new Blob(['next']), complete: true } } as MessageEvent<HipsReply>)
    expect(await (await next).text()).toBe('next')
  })

  it.each(['match', 'put'])('błąd cache.%s nie odrzuca gotowego obrazu', async (op) => {
    const fail = async () => { throw new DOMException('full', 'QuotaExceededError') }
    vi.stubGlobal('caches', { open: async () => ({ match: op === 'match' ? fail : async () => undefined, keys: async () => [], delete: async () => true, put: fail }) })
    const { getSkyImage } = await import('./thumbs')
    await expect(getSkyImage(10, 20, 3, 800)).resolves.toBeInstanceOf(Blob)
  })
})
