// Ukryte testy funkcji „limit-hips2fits”: te same reguły co w testach jawnych, ale z innymi tabelami limitów,
// żeby nie przeszła implementacja z zaszytymi 30 s dla hips2fits. Nazwy API jak w ../limit-hips2fits.test.ts.
import { describe, expect, it } from 'vitest'
import {
  ALL_SILENT,
  asImage,
  blobText,
  flush,
  imageResponse,
  limitHarness,
  M42,
  settle,
  STORAGE_KEY,
  track,
} from '../helpers'

const TIMEOUT = 'limit czasu'
const ALL_TIMEOUT = (order: Array<'alaskybis' | 'alasky' | 'skyview' | 'stsci'>) => ({
  kind: 'none',
  attempts: order.map((sourceId) => ({ sourceId, reason: TIMEOUT })),
})

describe('inne tabele limitów', () => {
  it('alaskybis 15 s, alasky bez wpisu (10 s), SkyView 25 s, STScI 5 s → brak po 55 s', async () => {
    const { loader, net, clock } = limitHarness({
      net: ALL_SILENT,
      timeouts: { alaskybis: 15_000, skyview: 25_000, stsci: 5_000 },
    })
    const pending = track(loader.load(M42))
    await clock.advance(14_999)
    expect(net.sources()).toEqual(['alaskybis'])
    expect(net.calls[0].signal.aborted).toBe(false)
    await clock.advance(1) // 15 s
    expect(net.calls[0].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
    await clock.advance(9_999) // 24,999 s
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
    await clock.advance(1) // 25 s
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    await clock.advance(24_999) // 49,999 s
    expect(net.calls[2].signal.aborted).toBe(false)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    await clock.advance(1) // 50 s
    expect(net.calls[2].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
    await clock.advance(4_999) // 54,999 s
    expect(pending.settled()).toBe(false)
    expect(net.calls[3].signal.aborted).toBe(false)
    await clock.advance(1) // 55 s
    expect(pending.settled()).toBe(true)
    expect(net.calls[3].signal.aborted).toBe(true)
    expect(await pending.promise).toEqual(ALL_TIMEOUT(['alaskybis', 'alasky', 'skyview', 'stsci']))
  })

  it('pusta tabela {} działa jak bez limitów → brak po 40 s', async () => {
    const { loader, clock } = limitHarness({ net: ALL_SILENT, timeouts: {} })
    const pending = track(loader.load(M42))
    await clock.advance(39_999)
    expect(pending.settled()).toBe(false)
    await clock.advance(1)
    expect(pending.settled()).toBe(true)
    expect(await pending.promise).toEqual(ALL_TIMEOUT(['alaskybis', 'alasky', 'skyview', 'stsci']))
  })

  it('ręcznie SkyView z limitem 20 s, alaskybis 5 s → SkyView 20, alaskybis 5, alasky 10, STScI 10; brak po 45 s', async () => {
    const { loader, net, clock } = limitHarness({ net: ALL_SILENT, timeouts: { skyview: 20_000, alaskybis: 5_000 } })
    const pending = track(loader.load(M42, { sourceId: 'skyview' }))
    await clock.advance(19_999)
    expect(net.sources()).toEqual(['skyview'])
    expect(net.calls[0].signal.aborted).toBe(false)
    await clock.advance(1) // 20 s
    expect(net.calls[0].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['skyview', 'alaskybis'])
    await clock.advance(4_999) // 24,999 s
    expect(net.sources()).toEqual(['skyview', 'alaskybis'])
    await clock.advance(1) // 25 s
    expect(net.sources()).toEqual(['skyview', 'alaskybis', 'alasky'])
    await clock.advance(9_999) // 34,999 s
    expect(net.sources()).toEqual(['skyview', 'alaskybis', 'alasky'])
    await clock.advance(1) // 35 s
    expect(net.sources()).toEqual(['skyview', 'alaskybis', 'alasky', 'stsci'])
    await clock.advance(9_999) // 44,999 s
    expect(pending.settled()).toBe(false)
    await clock.advance(1) // 45 s
    expect(await pending.promise).toEqual(ALL_TIMEOUT(['skyview', 'alaskybis', 'alasky', 'stsci']))
  })

  it('zapamiętane alasky z limitem 45 s odpowiada po 44 s → obraz alasky, bez innych zapytań', async () => {
    const { loader, net, storage, clock } = limitHarness({
      net: { alasky: 'hold' },
      remembered: 'alasky',
      timeouts: { alasky: 45_000 },
    })
    const pending = track(loader.load(M42))
    await clock.advance(44_000)
    expect(net.sources()).toEqual(['alasky'])
    expect(net.calls[0].signal.aborted).toBe(false)
    expect(pending.settled()).toBe(false)
    net.held[0].resolve(imageResponse('late-alasky'))
    await flush()
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('alasky')
    expect(await blobText(image.data)).toBe('late-alasky')
    expect(net.sources()).toEqual(['alasky'])
    expect(storage.getItem(STORAGE_KEY)).toBe('alasky')
  })

  it('zapis offline z tabelą alaskybis 12 s, alasky 18 s, STScI 20 s → „nie udało się zapisać” po 50 s', async () => {
    const { loader, net, clock } = limitHarness({
      net: { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'ok' },
      timeouts: { alaskybis: 12_000, alasky: 18_000, stsci: 20_000 },
    })
    const skyview = asImage(await settle(clock, loader.load(M42)))
    net.set({ alaskybis: 'silent', alasky: 'silent', stsci: 'silent' })
    const before = net.calls.length
    const saving = track(loader.saveOffline())
    await clock.advance(11_999)
    expect(net.sources(before)).toEqual(['alaskybis'])
    await clock.advance(1) // 12 s
    expect(net.sources(before)).toEqual(['alaskybis', 'alasky'])
    await clock.advance(17_999) // 29,999 s
    expect(net.sources(before)).toEqual(['alaskybis', 'alasky'])
    await clock.advance(1) // 30 s
    expect(net.sources(before)).toEqual(['alaskybis', 'alasky', 'stsci'])
    await clock.advance(19_999) // 49,999 s
    expect(saving.settled()).toBe(false)
    await clock.advance(1) // 50 s
    expect(await saving.promise).toBe('failed')
    expect(loader.current()).toBe(skyview)
  })

  it('STScI z limitem 25 s odpowiada po 24 s (alaskybis, alasky 503, SkyView błąd) → obraz STScI', async () => {
    const { loader, net, clock } = limitHarness({
      net: { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'error', stsci: 'hold' },
      timeouts: { stsci: 25_000 },
    })
    const pending = track(loader.load(M42))
    await clock.advance(24_000)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
    expect(net.calls[3].signal.aborted).toBe(false)
    net.held[0].resolve(imageResponse('late-stsci', 'image/gif'))
    await flush()
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('stsci')
    expect(await blobText(image.data)).toBe('late-stsci')
  })
})
