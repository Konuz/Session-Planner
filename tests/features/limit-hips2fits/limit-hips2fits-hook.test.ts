// P3 funkcji „limit-hips2fits”: tabela limitów aplikacji i jej przekazanie przez hak zakładki Kadr.
// Nazwy wybrał test-author: stała `SKY_IMAGE_APP_TIMEOUTS_MS` w src/services/skyImage/loader.ts (ms na źródło),
// drugi argument `createSkyImageLoader(deps, timeouts)`. Hak `useSkyImage` tworzy pobieranie już w renderze
// (`useState`), a zależności przeglądarki czyta dopiero przy użyciu, więc render w Node wystarczy, żeby zobaczyć,
// z jaką tabelą zakładka tworzy pobieranie (moduł loader.ts jest opakowany szpiegiem, działa jak prawdziwy).
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { useSkyImage } from '../../../src/features/framing/useSkyImage'
import {
  createSkyImageLoader,
  SKY_IMAGE_APP_TIMEOUTS_MS,
  SKY_IMAGE_TIMEOUT_MS,
} from '../../../src/services/skyImage/loader'

vi.mock('../../../src/services/skyImage/loader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/skyImage/loader')>()
  return { ...actual, createSkyImageLoader: vi.fn(actual.createSkyImageLoader) }
})

const EXPECTED = { alaskybis: 30_000, alasky: 30_000, skyview: 10_000, stsci: 10_000 }

function Probe() {
  useSkyImage({ center: { raDeg: 83.8221, decDeg: -5.3911 }, size: { widthDeg: 1, heightDeg: 0.7 }, dragging: false })
  return null
}

describe('limity aplikacji (P3)', () => {
  it('test_p3_tabela: tabela limitów ma dokładnie alaskybis 30 s, alasky 30 s, SkyView 10 s, STScI 10 s', () => {
    expect(SKY_IMAGE_APP_TIMEOUTS_MS).toEqual(EXPECTED)
  })

  it('test_p3_domyslny_limit: stała SKY_IMAGE_TIMEOUT_MS zostaje 10 000', () => {
    expect(SKY_IMAGE_TIMEOUT_MS).toBe(10_000)
  })

  it('test_p3_zakladka: hak useSkyImage tworzy pobieranie z tabelą limitów aplikacji', () => {
    const spy = vi.mocked(createSkyImageLoader)
    spy.mockClear()
    renderToStaticMarkup(createElement(Probe))
    expect(spy).toHaveBeenCalled()
    for (const call of spy.mock.calls) {
      expect(call[1]).toEqual(EXPECTED)
    }
  })
})
