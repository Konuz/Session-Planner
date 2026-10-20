// Testy funkcji „limit-hips2fits” (spec: .autoloop/features/limit-hips2fits/spec.md): osobny limit czasu dla
// każdego źródła zdjęć. Nazwy API wybrał test-author (spec ich nie podaje) – opis w src/services/skyImage/loader.ts:
// `createSkyImageLoader(deps, timeouts?)` z tabelą `{ [id źródła]: ms }`, stała `SKY_IMAGE_APP_TIMEOUTS_MS`.
// Domyślnie jak w spec: wycinek M 42, tryb „automatycznie”, brak zapamiętanego źródła, pusta pamięć, atrapy sieci,
// obrazu i zegara (z tests/features/pobieranie-zdjec/helpers.ts). Testy pobierania z „limitami aplikacji” podają
// tabelę wprost (`APP_LIMITS`), a P3 (osobny plik limit-hips2fits-hook.test.ts) sprawdza stałą i hak.
// Czasy liczone atrapą zegara: `clock.advance(ms)` przesuwa zegar o `ms` od chwili bieżącej.
import { describe, expect, it } from 'vitest'
import { skyImageUrl, type SkyImageRequest } from '../../../src/services/skyImage/sources'
import {
  ALL_SILENT,
  APP_LIMITS,
  asImage,
  blobText,
  FakeCaches,
  fillCache,
  flush,
  HIPS_KEY,
  imageResponse,
  limitHarness,
  M42,
  settle,
  STORAGE_KEY,
  STSCI_KEY,
  track,
} from './helpers'

const TIMEOUT = 'limit czasu'

describe('bez podanych limitów – zgodność wstecz (P1, P2)', () => {
  it('test_p1: bez limitów alaskybis milczy → po 9,999 s czekamy, po 10 s przerwanie i start alasky', async () => {
    const { loader, net, clock } = limitHarness({ net: { alaskybis: 'silent' } })
    const pending = track(loader.load(M42))
    await clock.advance(9_999)
    expect(net.sources()).toEqual(['alaskybis'])
    expect(net.calls[0].signal.aborted).toBe(false)
    expect(pending.settled()).toBe(false)
    await clock.advance(1)
    expect(net.calls[0].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
    expect(asImage(await pending.promise).sourceId).toBe('alasky')
  })

  it('test_p2: bez limitów wszystkie źródła milczą → „brak zdjęcia” po 40 s od początku, nie wcześniej', async () => {
    const { loader, net, clock } = limitHarness({ net: ALL_SILENT })
    const pending = track(loader.load(M42))
    await clock.advance(39_999)
    expect(pending.settled()).toBe(false)
    await clock.advance(1)
    expect(pending.settled()).toBe(true)
    expect(await pending.promise).toEqual({
      kind: 'none',
      attempts: [
        { sourceId: 'alaskybis', reason: TIMEOUT },
        { sourceId: 'alasky', reason: TIMEOUT },
        { sourceId: 'skyview', reason: TIMEOUT },
        { sourceId: 'stsci', reason: TIMEOUT },
      ],
    })
    expect(net.calls.every((call) => call.signal.aborted)).toBe(true)
  })
})

describe('limity aplikacji (P4–P11)', () => {
  it('test_p4: alaskybis milczy → po 10 s i 29,999 s czekamy, alasky niezapytane; po 30 s przerwanie i start alasky', async () => {
    const { loader, net, clock } = limitHarness({ net: { alaskybis: 'silent' }, timeouts: APP_LIMITS })
    const pending = track(loader.load(M42))
    await clock.advance(10_000)
    expect(net.sources()).toEqual(['alaskybis'])
    expect(net.calls[0].signal.aborted).toBe(false)
    expect(pending.settled()).toBe(false)
    await clock.advance(19_999)
    expect(net.sources()).toEqual(['alaskybis'])
    expect(net.calls[0].signal.aborted).toBe(false)
    expect(pending.settled()).toBe(false)
    await clock.advance(1)
    expect(net.calls[0].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('alasky')
    expect(await blobText(image.data)).toBe('alasky-bytes')
  })

  it('test_p4_powod: przerwane po 30 s alaskybis ma powód „limit czasu” (reszta zawodzi od razu)', async () => {
    const { loader, clock } = limitHarness({
      net: { alaskybis: 'silent', alasky: { status: 503 }, skyview: 'error', stsci: 'network' },
      timeouts: APP_LIMITS,
    })
    const pending = track(loader.load(M42))
    await clock.advance(29_999)
    expect(pending.settled()).toBe(false)
    await clock.advance(1)
    expect(pending.settled()).toBe(true)
    expect(await pending.promise).toEqual({
      kind: 'none',
      attempts: [
        { sourceId: 'alaskybis', reason: TIMEOUT },
        { sourceId: 'alasky', reason: 'błąd 503' },
        { sourceId: 'skyview', reason: 'błąd obrazu' },
        { sourceId: 'stsci', reason: 'błąd sieci' },
      ],
    })
  })

  it('test_p5: alaskybis 503, alasky odpowiada po 21 s → obraz „CDS hips2fits (alasky)”, w pamięci, zapamiętane alasky', async () => {
    const { loader, net, caches, storage, clock } = limitHarness({
      net: { alaskybis: { status: 503 }, alasky: 'hold' },
      timeouts: APP_LIMITS,
    })
    const pending = track(loader.load(M42))
    await clock.advance(21_000)
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
    expect(net.calls[1].signal.aborted).toBe(false)
    expect(pending.settled()).toBe(false)
    expect(net.held.length).toBe(1)
    net.held[0].resolve(imageResponse('alasky-bytes'))
    await flush()
    expect(pending.settled()).toBe(true)
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('alasky')
    expect(image.sourceName).toBe('CDS hips2fits (alasky)')
    expect(image.fromCache).toBe(false)
    expect(image.saved).toBe(true)
    expect(await blobText(image.data)).toBe('alasky-bytes')
    expect(await caches?.text(HIPS_KEY)).toBe('alasky-bytes')
    expect(storage.getItem(STORAGE_KEY)).toBe('alasky')
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
  })

  it('test_p5_bez_limitow: ta sama sytuacja bez limitów → alasky „limit czasu” po 10 s i próbowany jest SkyView', async () => {
    const { loader, net, clock } = limitHarness({
      net: { alaskybis: { status: 503 }, alasky: 'hold', skyview: 'error', stsci: { status: 503 } },
    })
    const pending = track(loader.load(M42))
    await clock.advance(9_999)
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
    expect(net.calls[1].signal.aborted).toBe(false)
    await clock.advance(1)
    expect(net.calls[1].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
    expect(await pending.promise).toEqual({
      kind: 'none',
      attempts: [
        { sourceId: 'alaskybis', reason: 'błąd 503' },
        { sourceId: 'alasky', reason: TIMEOUT },
        { sourceId: 'skyview', reason: 'błąd obrazu' },
        { sourceId: 'stsci', reason: 'błąd 503' },
      ],
    })
  })

  it('test_p6: alaskybis i alasky zawodzą, SkyView milczy → po 10 s przerwanie SkyView i start STScI', async () => {
    const { loader, net, clock } = limitHarness({
      net: { alaskybis: { status: 503 }, alasky: 'network', skyview: 'silent' },
      timeouts: APP_LIMITS,
    })
    const pending = track(loader.load(M42))
    await clock.advance(0)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    expect(net.calls[2].kind).toBe('image')
    await clock.advance(9_999)
    expect(net.calls[2].signal.aborted).toBe(false)
    expect(net.calls.length).toBe(3)
    await clock.advance(1)
    expect(net.calls[2].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('stsci')
    expect(await blobText(image.data)).toBe('stsci-bytes')
  })

  it('test_p7: wszystkie źródła milczą → starty w 0, 30, 60, 70 s i „brak zdjęcia” po 80 s od początku', async () => {
    const { loader, net, clock } = limitHarness({ net: ALL_SILENT, timeouts: APP_LIMITS })
    const pending = track(loader.load(M42))
    await clock.advance(29_999)
    expect(net.sources()).toEqual(['alaskybis'])
    await clock.advance(1)
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
    await clock.advance(29_999) // 59,999 s
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
    expect(net.calls[1].signal.aborted).toBe(false)
    await clock.advance(1) // 60 s
    expect(net.calls[1].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    await clock.advance(9_999) // 69,999 s
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    await clock.advance(1) // 70 s
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
    await clock.advance(9_999) // 79,999 s
    expect(pending.settled()).toBe(false)
    await clock.advance(1) // 80 s
    expect(pending.settled()).toBe(true)
    expect(await pending.promise).toEqual({
      kind: 'none',
      attempts: [
        { sourceId: 'alaskybis', reason: TIMEOUT },
        { sourceId: 'alasky', reason: TIMEOUT },
        { sourceId: 'skyview', reason: TIMEOUT },
        { sourceId: 'stsci', reason: TIMEOUT },
      ],
    })
    expect(net.calls.every((call) => call.signal.aborted)).toBe(true)
  })

  it('test_p8: ręcznie STScI, wszystkie milczą → STScI 10 s, alaskybis 30 s, alasky 30 s, SkyView 10 s; brak po 80 s', async () => {
    const { loader, net, clock } = limitHarness({ net: ALL_SILENT, timeouts: APP_LIMITS })
    const pending = track(loader.load(M42, { sourceId: 'stsci' }))
    await clock.advance(9_999)
    expect(net.sources()).toEqual(['stsci'])
    expect(net.calls[0].signal.aborted).toBe(false)
    await clock.advance(1) // 10 s
    expect(net.calls[0].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['stsci', 'alaskybis'])
    await clock.advance(29_999) // 39,999 s
    expect(net.sources()).toEqual(['stsci', 'alaskybis'])
    await clock.advance(1) // 40 s
    expect(net.sources()).toEqual(['stsci', 'alaskybis', 'alasky'])
    await clock.advance(29_999) // 69,999 s
    expect(net.sources()).toEqual(['stsci', 'alaskybis', 'alasky'])
    await clock.advance(1) // 70 s
    expect(net.sources()).toEqual(['stsci', 'alaskybis', 'alasky', 'skyview'])
    await clock.advance(9_999) // 79,999 s
    expect(pending.settled()).toBe(false)
    await clock.advance(1) // 80 s
    expect(pending.settled()).toBe(true)
    expect(await pending.promise).toEqual({
      kind: 'none',
      attempts: [
        { sourceId: 'stsci', reason: TIMEOUT },
        { sourceId: 'alaskybis', reason: TIMEOUT },
        { sourceId: 'alasky', reason: TIMEOUT },
        { sourceId: 'skyview', reason: TIMEOUT },
      ],
    })
  })

  it('test_p9: zapamiętane STScI milczy → po 10 s start alaskybis, który czeka do 30 s (limit należy do źródła)', async () => {
    const { loader, net, clock } = limitHarness({
      net: { stsci: 'silent', alaskybis: 'silent' },
      remembered: 'stsci',
      timeouts: APP_LIMITS,
    })
    const pending = track(loader.load(M42))
    await clock.advance(9_999)
    expect(net.sources()).toEqual(['stsci'])
    expect(net.calls[0].signal.aborted).toBe(false)
    await clock.advance(1) // 10 s
    expect(net.calls[0].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['stsci', 'alaskybis'])
    await clock.advance(29_999) // 39,999 s: alaskybis czeka 29,999 s
    expect(net.calls[1].signal.aborted).toBe(false)
    expect(net.sources()).toEqual(['stsci', 'alaskybis'])
    await clock.advance(1) // 40 s
    expect(net.calls[1].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['stsci', 'alaskybis', 'alasky'])
    expect(asImage(await pending.promise).sourceId).toBe('alasky')
  })

  it('test_p10: zapis offline po SkyView; alaskybis i alasky milczą → przerwane po 30 s każde, potem STScI zapisane', async () => {
    const { loader, net, caches, storage, clock } = limitHarness({
      net: { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'ok' },
      timeouts: APP_LIMITS,
    })
    expect(asImage(await settle(clock, loader.load(M42))).sourceId).toBe('skyview')
    net.set({ alaskybis: 'silent', alasky: 'silent', stsci: 'ok' })
    const before = net.calls.length
    const saving = track(loader.saveOffline())
    await clock.advance(29_999)
    expect(net.sources(before)).toEqual(['alaskybis'])
    expect(net.calls[before].signal.aborted).toBe(false)
    await clock.advance(1) // 30 s od kliknięcia
    expect(net.calls[before].signal.aborted).toBe(true)
    expect(net.sources(before)).toEqual(['alaskybis', 'alasky'])
    await clock.advance(29_999) // 59,999 s
    expect(net.calls[before + 1].signal.aborted).toBe(false)
    expect(saving.settled()).toBe(false)
    await clock.advance(1) // 60 s
    expect(net.calls[before + 1].signal.aborted).toBe(true)
    expect(net.sources(before)).toEqual(['alaskybis', 'alasky', 'stsci'])
    expect(await saving.promise).toBe('saved')
    expect(caches?.keys()).toEqual([STSCI_KEY])
    const shown = asImage(loader.current())
    expect(shown.sourceId).toBe('stsci')
    expect(shown.saved).toBe(true)
    expect(await blobText(shown.data)).toBe('stsci-bytes')
    expect(storage.getItem(STORAGE_KEY)).toBe('stsci')
  })

  it('test_p11: jak P10, ale STScI też milczy → „nie udało się zapisać” po 70 s od kliknięcia, widok dalej SkyView', async () => {
    const { loader, net, caches, clock } = limitHarness({
      net: { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'ok' },
      timeouts: APP_LIMITS,
    })
    const skyview = asImage(await settle(clock, loader.load(M42)))
    net.set({ alaskybis: 'silent', alasky: 'silent', stsci: 'silent' })
    const before = net.calls.length
    const saving = track(loader.saveOffline())
    await clock.advance(59_999)
    expect(net.sources(before)).toEqual(['alaskybis', 'alasky'])
    await clock.advance(1) // 60 s
    expect(net.sources(before)).toEqual(['alaskybis', 'alasky', 'stsci'])
    await clock.advance(9_999) // 69,999 s
    expect(saving.settled()).toBe(false)
    expect(net.calls[before + 2].signal.aborted).toBe(false)
    await clock.advance(1) // 70 s
    expect(saving.settled()).toBe(true)
    expect(await saving.promise).toBe('failed')
    expect(net.calls[before + 2].signal.aborted).toBe(true)
    expect(loader.current()).toBe(skyview)
    expect(caches?.keys()).toEqual([])
  })
})

describe('niepełna tabela i pamięć (P12, P13)', () => {
  it('test_p12: limit tylko dla alasky (30 s) → alaskybis 10 s, alasky 30 s, SkyView 10 s, STScI 10 s', async () => {
    const { loader, net, clock } = limitHarness({ net: ALL_SILENT, timeouts: { alasky: 30_000 } })
    const pending = track(loader.load(M42))
    await clock.advance(9_999)
    expect(net.sources()).toEqual(['alaskybis'])
    expect(net.calls[0].signal.aborted).toBe(false)
    await clock.advance(1) // 10 s
    expect(net.calls[0].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
    await clock.advance(29_999) // 39,999 s
    expect(net.calls[1].signal.aborted).toBe(false)
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
    await clock.advance(1) // 40 s
    expect(net.calls[1].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    await clock.advance(9_999) // 49,999 s
    expect(net.calls[2].signal.aborted).toBe(false)
    await clock.advance(1) // 50 s
    expect(net.calls[2].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview', 'stsci'])
    await clock.advance(9_999) // 59,999 s
    expect(pending.settled()).toBe(false)
    await clock.advance(1) // 60 s
    expect(pending.settled()).toBe(true)
    expect(await pending.promise).toEqual({
      kind: 'none',
      attempts: [
        { sourceId: 'alaskybis', reason: TIMEOUT },
        { sourceId: 'alasky', reason: TIMEOUT },
        { sourceId: 'skyview', reason: TIMEOUT },
        { sourceId: 'stsci', reason: TIMEOUT },
      ],
    })
  })

  it('test_p13: wycinek alasky w pamięci, limity aplikacji → obraz z pamięci bez zapytań i bez czekania', async () => {
    const caches = new FakeCaches()
    await fillCache(caches, 'alasky', M42)
    const { loader, net, clock } = limitHarness({ caches, net: ALL_SILENT, timeouts: APP_LIMITS })
    const pending = track(loader.load(M42))
    await clock.advance(0)
    expect(pending.settled()).toBe(true)
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('alasky')
    expect(image.sourceName).toBe('CDS hips2fits (alasky)')
    expect(image.fromCache).toBe(true)
    expect(await blobText(image.data)).toBe('alasky-bytes')
    expect(net.calls.length).toBe(0)
  })
})

describe('reguły ze „Styk z resztą” i „Pytania”', () => {
  // Cel spec: warstwa DSS2 czerwony (photoModel: auto + czerwony → ręcznie alaskybis) liczona 9–21 s nie jest ucinana.
  it('warstwa DSS2 czerwony, ręcznie alaskybis odpowiada po 20 s → obraz z alaskybis (bez limitów: ucięty po 10 s)', async () => {
    const RED: SkyImageRequest = { ...M42, layerId: 'dss2-red' }
    const withLimits = limitHarness({ net: { alaskybis: 'hold' }, timeouts: APP_LIMITS })
    const pending = track(withLimits.loader.load(RED, { sourceId: 'alaskybis' }))
    await withLimits.clock.advance(20_000)
    expect(withLimits.net.sources()).toEqual(['alaskybis'])
    expect(withLimits.net.calls[0].url).toBe(skyImageUrl('alaskybis', RED))
    expect(withLimits.net.calls[0].signal.aborted).toBe(false)
    withLimits.net.held[0].resolve(imageResponse('red-bytes'))
    await flush()
    const image = asImage(await pending.promise)
    expect(image.sourceId).toBe('alaskybis')
    expect(await blobText(image.data)).toBe('red-bytes')

    const without = limitHarness({ net: { alaskybis: 'hold' } })
    const cut = track(without.loader.load(RED, { sourceId: 'alaskybis' }))
    await without.clock.advance(10_000)
    expect(without.net.calls[0].signal.aborted).toBe(true)
    expect(without.net.sources()).toEqual(['alaskybis', 'alasky'])
    expect(asImage(await cut.promise).sourceId).toBe('alasky')
  })

  it('limit liczony od startu każdej próby: alaskybis 503 od razu, alasky milczy → przerwane w 30 s, nie wcześniej', async () => {
    const { loader, net, clock } = limitHarness({
      net: { alaskybis: { status: 503 }, alasky: 'silent' },
      timeouts: APP_LIMITS,
    })
    const pending = track(loader.load(M42))
    await clock.advance(29_999)
    expect(net.sources()).toEqual(['alaskybis', 'alasky'])
    expect(net.calls[1].signal.aborted).toBe(false)
    await clock.advance(1)
    expect(net.calls[1].signal.aborted).toBe(true)
    expect(net.sources()).toEqual(['alaskybis', 'alasky', 'skyview'])
    expect(asImage(await pending.promise).sourceId).toBe('skyview')
  })

  it('zapis offline bez limitów (jak P21 w pobieranie-zdjec): alaskybis milczy → przerwane po 10 s', async () => {
    const { loader, net, clock } = limitHarness({
      net: { alaskybis: { status: 503 }, alasky: { status: 503 }, skyview: 'ok' },
    })
    await settle(clock, loader.load(M42))
    net.set({ alaskybis: 'silent', alasky: 'ok' })
    const before = net.calls.length
    const saving = track(loader.saveOffline())
    await clock.advance(9_999)
    expect(net.calls[before].signal.aborted).toBe(false)
    await clock.advance(1)
    expect(net.calls[before].signal.aborted).toBe(true)
    expect(net.sources(before)).toEqual(['alaskybis', 'alasky'])
    expect(await saving.promise).toBe('saved')
  })
})
