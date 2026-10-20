// Testy funkcji „katalog-gwiazd” (spec: .autoloop/features/katalog-gwiazd/spec.md): katalog gwiazd Tycho-2 do V ≤ 10.
// Nazwy API spec nie podaje; wybrał je test-author i opisał w zaślepkach:
// - src/services/stars.ts: `visualMagnitude`, `parseStarsCsv`, `encodeStarFile` / `decodeStarFile` (nagłówek 64 B:
//   znacznik `STAR`, wersja uint16 LE w bajtach 4–5, liczba gwiazd uint32 LE w bajtach 8–11), `buildStarIndex`,
//   `starsInField`;
// - src/data/starCatalog.ts: `loadStarCatalog`;
// - scripts/build-stars.ts: wiersz poleceń `--cache <katalog> --out <katalog> [--refresh]`, pliki podręczne
//   `I_259_tyc2.csv` / `I_259_suppl_1.csv`, wpis `stars` w meta.json `{ count, builtAt, citation, tables: [{ table,
//   query, rows, stars, skipped }] }`. Skrypt działa w osobnym procesie z podmienionym `fetch` (helpers.ts).
// P21 (prawdziwy plik) sprawdza orkiestrator po zbudowaniu pliku; tutaj test bez sieci sprawdza to, co skrypt zrobi
// przy budowie prawdziwego pliku: zapytania na symulatorze TAP z prawdziwymi wierszami VizieR (vizierRows.ts).
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { angularSeparationDeg, type EquatorialDeg } from '../../../src/services/astroMath'
import {
  buildStarIndex,
  decodeStarFile,
  encodeStarFile,
  parseStarsCsv,
  starsInField,
  visualMagnitude,
  type Star,
} from '../../../src/services/stars'
import {
  buildDirs,
  cacheFile,
  CITATION,
  describeRun,
  expectedV,
  IOTA_ORI,
  M42,
  randomCenters,
  randomStars,
  readJson,
  readStarsMeta,
  ROOT,
  runBuildStars,
  starFileBytes,
  starFileExists,
  TAP_SYNC,
  THETA1_ORI_C,
  type BuildRun,
} from './helpers'
import { parseCsv } from './tapSimulator'
import { SUPPL1_CSV, SUPPL1_TABLE, TYC2_CSV, TYC2_SYNTHETIC, TYC2_TABLE } from './vizierRows'

const ARCSEC = 1 / 3600
const TOL = 1e-6

const plain = (stars: readonly Star[]) => stars.map(({ raDeg, decDeg, mag }) => ({ raDeg, decDeg, mag }))
const star = (raDeg: number, decDeg: number, mag: number): Star => ({ raDeg, decDeg, mag })

/** Pozycja po odczycie zgodna z oczekiwaną: odległość ≤ maxArcsec (RA porównywane po sferze). */
function expectNear(actual: EquatorialDeg, expected: EquatorialDeg, maxArcsec: number) {
  const sepArcsec = angularSeparationDeg(actual, expected) * 3600
  expect(sepArcsec, `odległość ${sepArcsec}″ od ${JSON.stringify(expected)}`).toBeLessThanOrEqual(maxArcsec)
}

/** Wybór przeglądem wszystkich gwiazd: odległość ≤ r + 1e-6°, od najjaśniejszej, remis → kolejność listy. */
function bruteForce(stars: readonly Star[], center: EquatorialDeg, radiusDeg: number): number[] {
  const picked: number[] = []
  for (let i = 0; i < stars.length; i++) {
    if (angularSeparationDeg(center, stars[i]) <= radiusDeg + TOL) picked.push(i)
  }
  return picked.sort((a, b) => stars[a].mag - stars[b].mag || a - b)
}

/** meta.json katalogu obiektów (bez ewentualnego wpisu `stars`) jako dane „dotychczasowe”. */
function objectCatalogMeta(): Record<string, unknown> {
  let meta: Record<string, unknown>
  try {
    meta = JSON.parse(readFileSync(join(ROOT, 'public', 'catalog', 'meta.json'), 'utf8')) as Record<string, unknown>
  } catch {
    meta = { schemaVersion: 1, generatedAt: '2026-10-16T20:44:18.572Z', objectCount: 16516, sources: [], aliases: 3 }
  }
  delete meta.stars
  return meta
}

function withoutStars(meta: unknown): Record<string, unknown> {
  const copy = { ...(meta as Record<string, unknown>) }
  delete copy.stars
  return copy
}

// ---------------------------------------------------------------------------------------------------------------
describe('jasność V (P1, P2)', () => {
  it('test_p1_wzor: VT 9,00, BT 10,00 → V 8,91; VT 6,00, BT 5,00 → V 6,09', () => {
    expect(visualMagnitude({ bt: 10.0, vt: 9.0 })).toBeCloseTo(8.91, 9)
    expect(visualMagnitude({ bt: 5.0, vt: 6.0 })).toBeCloseTo(6.09, 9)
  })

  it('test_p2_brak_jednej: brak BT, VT 9,50 → V 9,50; brak VT, BT 9,80 → V 9,80', () => {
    expect(visualMagnitude({ bt: null, vt: 9.5 })).toBeCloseTo(9.5, 9)
    expect(visualMagnitude({ bt: 9.8, vt: null })).toBeCloseTo(9.8, 9)
  })

  it('test_p2_brak_obu: gwiazda bez BT i VT nie ma jasności, a w CSV jest pominięta i doliczona do pominiętych', () => {
    expect(visualMagnitude({ bt: null, vt: null })).toBeNull()
    const result = parseStarsCsv('ra,dec,bt,vt\n10,20,,9.50\n15,25,9.80,\n30,40,,\n')
    expect(result.rows).toBe(3)
    expect(result.skipped).toBe(1)
    expect(plain(result.stars)).toEqual([
      { raDeg: 10, decDeg: 20, mag: expect.closeTo(9.5, 9) as number },
      { raDeg: 15, decDeg: 25, mag: expect.closeTo(9.8, 9) as number },
    ])
  })
})

describe('odczyt CSV z VizieR (P3, P4)', () => {
  it('test_p3_granica: V 10,00 jest w pliku, V 10,09 nie, V 9,92 (VT 10,10 > 10) jest', () => {
    const result = parseStarsCsv('ra,dec,bt,vt\n1,1,10.00,10.00\n2,2,9.00,10.00\n3,3,12.10,10.10\n')
    expect(result.rows).toBe(3)
    expect(plain(result.stars)).toEqual([
      { raDeg: 1, decDeg: 1, mag: expect.closeTo(10.0, 9) as number },
      { raDeg: 3, decDeg: 3, mag: expect.closeTo(9.92, 9) as number },
    ])
  })

  it('test_p4_kolejnosc_kolumn_crlf: nagłówek vt,bt,dec,ra, CRLF, 4 wiersze → 2 gwiazdy, pominięte 2', () => {
    const text = 'vt,bt,dec,ra\r\n5.10,5.30,-5.3897,83.8186\r\n9.50,,10,20\r\n9.00,10.00,abc,30\r\n,,1,40\r\n'
    const result = parseStarsCsv(text)
    expect(result.rows).toBe(4)
    expect(result.skipped).toBe(2)
    expect(plain(result.stars)).toEqual([
      { raDeg: expect.closeTo(83.8186, 9) as number, decDeg: expect.closeTo(-5.3897, 9) as number, mag: expect.closeTo(5.1 - 0.09 * 0.2, 9) as number },
      { raDeg: expect.closeTo(20, 9) as number, decDeg: expect.closeTo(10, 9) as number, mag: expect.closeTo(9.5, 9) as number },
    ])
  })

  it('test_csv_lf_bez_pustej_linii: końce LF i brak pustej linii na końcu też działają (reguła „LF albo CRLF”)', () => {
    const result = parseStarsCsv('ra,dec,bt,vt\n120.5,-30.25,8.00,7.50\n121,-31,,')
    expect(result.rows).toBe(2)
    expect(result.skipped).toBe(1)
    expect(plain(result.stars)).toEqual([{ raDeg: 120.5, decDeg: -30.25, mag: expect.closeTo(7.5 - 0.09 * 0.5, 9) as number }])
  })

  it('test_csv_zla_liczba_ra: zła liczba w RA też pomija wiersz (reguła z „Pytania”: złe liczby są pomijane i liczone)', () => {
    const result = parseStarsCsv('dec,ra,vt,bt\n5,x12,8.00,8.20\n6,13,8.00,8.20\n')
    expect(result.rows).toBe(2)
    expect(result.skipped).toBe(1)
    expect(plain(result.stars)).toEqual([{ raDeg: 13, decDeg: 6, mag: expect.closeTo(8 - 0.09 * 0.2, 9) as number }])
  })
})

// ---------------------------------------------------------------------------------------------------------------
describe('plik binarny (P6–P9)', () => {
  it('test_p6_zapis_odczyt: trzy gwiazdy wracają w tej samej kolejności, ±0,1″ i ±0,01 mag, RA w [0, 360)', () => {
    const stars = [star(0, -90, -1.46), star(83.8186, -5.3897, 5.13), star(359.99999, 90, 10.0)]
    const back = decodeStarFile(encodeStarFile(stars))
    expect(back).toHaveLength(3)
    back.forEach((read, i) => {
      expectNear(read, stars[i], 0.1)
      expect(Math.abs(read.mag - stars[i].mag), `jasność gwiazdy ${i}`).toBeLessThanOrEqual(0.01)
      expect(read.raDeg).toBeGreaterThanOrEqual(0)
      expect(read.raDeg).toBeLessThan(360)
    })
  })

  it('test_p6_dokladnosc_m42: gwiazda w RA 83,8186°, Dec −5,3897° wraca z RA i Dec różnymi o ≤ 0,1″', () => {
    const [read] = decodeStarFile(encodeStarFile([star(83.8186, -5.3897, 5.13)]))
    expect(Math.abs(read.raDeg - 83.8186) * Math.cos((5.3897 * Math.PI) / 180)).toBeLessThanOrEqual(0.1 * ARCSEC)
    expect(Math.abs(read.decDeg + 5.3897)).toBeLessThanOrEqual(0.1 * ARCSEC)
  })

  it('test_p7_pusty: plik z 0 gwiazd zapisuje się i odczytuje jako pusta lista', () => {
    const bytes = encodeStarFile([])
    expect(bytes.length).toBeLessThanOrEqual(64)
    expect(decodeStarFile(bytes)).toEqual([])
  })

  it('test_p8_rozmiar: 357 147 gwiazd → najwyżej 3 571 534 B', () => {
    const bytes = encodeStarFile(randomStars(357_147, 8))
    expect(bytes.length).toBeLessThanOrEqual(3_571_534)
    expect(decodeStarFile(bytes)).toHaveLength(357_147)
  }, 60_000)

  it('test_p8_rozmiar_maly: 10 gwiazd → najwyżej 64 + 100 B (10 B na gwiazdę i 64 B na nagłówek)', () => {
    expect(encodeStarFile(randomStars(10, 81)).length).toBeLessThanOrEqual(164)
  })

  it('test_p9_znacznik: inny znacznik na początku → „To nie jest plik katalogu gwiazd”', () => {
    const bytes = encodeStarFile([star(10, 20, 5)]).slice()
    bytes[0] = 'X'.charCodeAt(0)
    expect(() => decodeStarFile(bytes)).toThrow(new Error('To nie jest plik katalogu gwiazd'))
  })

  it('test_p9_wersja: wersja 2 → „Nieobsługiwana wersja pliku gwiazd: 2”', () => {
    const bytes = encodeStarFile([star(10, 20, 5)]).slice()
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint16(4, 2, true)
    expect(() => decodeStarFile(bytes)).toThrow(new Error('Nieobsługiwana wersja pliku gwiazd: 2'))
  })

  it('test_p9_za_malo_danych: nagłówek podaje 3 gwiazdy, a danych starcza na 2 → „Plik katalogu gwiazd jest niepełny”', () => {
    const bytes = encodeStarFile([star(10, 20, 5), star(11, 21, 6)]).slice()
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(8, 3, true)
    expect(() => decodeStarFile(bytes)).toThrow(new Error('Plik katalogu gwiazd jest niepełny'))
  })

  it('test_p9_krotszy_od_naglowka: plik krótszy od nagłówka (63 B) → „Plik katalogu gwiazd jest niepełny”', () => {
    const bytes = encodeStarFile([]).slice(0, 63)
    expect(() => decodeStarFile(bytes)).toThrow(new Error('Plik katalogu gwiazd jest niepełny'))
  })

  it('test_p9_poprawny_naglowek: zapisany plik ma znacznik STAR, wersję 1 i liczbę gwiazd w nagłówku', () => {
    const bytes = encodeStarFile([star(10, 20, 5), star(11, 21, 6)])
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('STAR')
    expect(view.getUint16(4, true)).toBe(1)
    expect(view.getUint32(8, true)).toBe(2)
  })
})

// ---------------------------------------------------------------------------------------------------------------
describe('wybór gwiazd w polu (P12–P18)', () => {
  it('test_p12_brzeg: środek (10°; 0°), r = 1°: Dec 0,5° i 1,0° (brzeg) są, Dec 1,01° nie', () => {
    const index = buildStarIndex([star(10, 1.01, 4), star(10, 0.5, 5), star(10, 1.0, 6)])
    expect(plain(starsInField(index, { raDeg: 10, decDeg: 0 }, 1))).toEqual([star(10, 0.5, 5), star(10, 1.0, 6)])
  })

  it('test_p13_ra_zero: środek (0,5°; 0°), r = 1°: RA 359,8° (0,7°) jest, RA 1,6° (1,1°) nie', () => {
    const index = buildStarIndex([star(359.8, 0, 6), star(1.6, 0, 5)])
    expect(plain(starsInField(index, { raDeg: 0.5, decDeg: 0 }, 1))).toEqual([star(359.8, 0, 6)])
  })

  it('test_p14_biegun_srodek: środek Dec +90°, r = 1°: Dec 89,5° przy RA 0°, 120°, 240° są, Dec 88,9° nie', () => {
    const index = buildStarIndex([star(0, 89.5, 3), star(120, 89.5, 4), star(240, 89.5, 5), star(60, 88.9, 2)])
    expect(plain(starsInField(index, { raDeg: 0, decDeg: 90 }, 1))).toEqual([
      star(0, 89.5, 3),
      star(120, 89.5, 4),
      star(240, 89.5, 5),
    ])
  })

  it('test_p14_przez_biegun: środek (0°; 89,5°): (180°; 89,6°) przez biegun 0,9° jest, (180°; 89,4°) 1,1° nie', () => {
    const index = buildStarIndex([star(180, 89.6, 7), star(180, 89.4, 6)])
    expect(plain(starsInField(index, { raDeg: 0, decDeg: 89.5 }, 1))).toEqual([star(180, 89.6, 7)])
  })

  it('test_p15_wysokie_dec: środek (0°; 60°), r = 1°: RA 1,9° (≈0,95°) jest, RA 2,1° (≈1,05°) nie', () => {
    const index = buildStarIndex([star(2.1, 60, 5), star(1.9, 60, 6)])
    expect(plain(starsInField(index, { raDeg: 0, decDeg: 60 }, 1))).toEqual([star(1.9, 60, 6)])
  })

  describe('katalog sztuczny 357 147 gwiazd (P16, P18)', () => {
    let stars: Star[] = []
    let index: ReturnType<typeof buildStarIndex> | null = null

    beforeAll(() => {
      stars = randomStars(357_147, 16)
    })

    const indexOnce = () => (index ??= buildStarIndex(stars))

    const centers: EquatorialDeg[] = [
      { raDeg: 0, decDeg: 0 },
      { raDeg: 359.9, decDeg: 45 },
      { raDeg: 180, decDeg: -89.9 },
      { raDeg: 83.8221, decDeg: -5.3911 },
    ]
    for (const center of centers) {
      it(`test_p16_zgodnosc: środek (${center.raDeg}°; ${center.decDeg}°), r = 0,1°, 1°, 30°, 180° jak przegląd wszystkich gwiazd`, () => {
        const built = indexOnce()
        for (const radius of [0.1, 1, 30, 180]) {
          const expected = bruteForce(stars, center, radius)
          const actual = starsInField(built, center, radius)
          expect(actual.length, `liczba gwiazd dla r = ${radius}°`).toBe(expected.length)
          if (radius === 180) expect(actual.length).toBe(stars.length)
          const firstDiff = expected.findIndex((i, k) => {
            const got = actual[k]
            return got.raDeg !== stars[i].raDeg || got.decDeg !== stars[i].decDeg || got.mag !== stars[i].mag
          })
          expect(firstDiff, `pierwsza różnica zbioru albo kolejności dla r = ${radius}°`).toBe(-1)
        }
      }, 60_000)
    }

    it('test_p18_szybkosc: po przygotowaniu indeksu 1000 wyborów z r = 1° trwa łącznie < 1 s', () => {
      const built = indexOnce()
      const queries = randomCenters(1000, 18)
      let found = 0
      const start = performance.now()
      for (const center of queries) found += starsInField(built, center, 1).length
      const elapsed = performance.now() - start
      expect(found, 'wybory coś znalazły').toBeGreaterThan(1000)
      expect(elapsed).toBeLessThan(1000)
    }, 60_000)
  })

  it('test_p17_kolejnosc: V 7,0, V 3,0, V 7,0 → V 3,0, pierwsza V 7,0, druga V 7,0', () => {
    const index = buildStarIndex([star(50, 10, 7.0), star(50.2, 10, 3.0), star(50.4, 10, 7.0)])
    expect(plain(starsInField(index, { raDeg: 50.2, decDeg: 10 }, 1))).toEqual([
      star(50.2, 10, 3.0),
      star(50, 10, 7.0),
      star(50.4, 10, 7.0),
    ])
  })

  it('test_p17_pusty: katalog bez gwiazd daje pustą listę', () => {
    expect(starsInField(buildStarIndex([]), { raDeg: 10, decDeg: 10 }, 180)).toEqual([])
  })

  it('test_wybor_po_odczycie: indeks z odczytanego pliku wybiera jak przegląd wszystkich gwiazd (reguła „indeks raz”)', () => {
    const stars = decodeStarFile(encodeStarFile(randomStars(5000, 99)))
    const center = { raDeg: 250, decDeg: -20 }
    const expected = bruteForce(stars, center, 10).map((i) => stars[i])
    expect(plain(starsInField(buildStarIndex(stars), center, 10))).toEqual(plain(expected))
  })
})

// ---------------------------------------------------------------------------------------------------------------
describe('wczytanie w aplikacji (P19, P20)', () => {
  const FILE_URL = `${import.meta.env.BASE_URL}catalog/stars.v1.bin`

  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('test_p19_raz: pierwsze wczytanie pobiera catalog/stars.v1.bin, drugie zwraca ten sam katalog bez pobierania', async () => {
    const bytes = encodeStarFile([star(10, 20, 5.5), star(10.5, 20, 4.5)])
    const fetchMock = vi.fn((url: string) => {
      void url
      return Promise.resolve(new Response(bytes.slice()))
    })
    vi.stubGlobal('fetch', fetchMock)
    const { loadStarCatalog } = await import('../../../src/data/starCatalog')
    const stars = await import('../../../src/services/stars')
    const first = await loadStarCatalog()
    const second = await loadStarCatalog()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toBe(FILE_URL)
    expect(second).toBe(first)
    const inField = stars.starsInField(first, { raDeg: 10, decDeg: 20 }, 1)
    expect(inField.map((s) => Math.round(s.mag * 10) / 10)).toEqual([4.5, 5.5])
  })

  it('test_p20_404: HTTP 404 → „Nie udało się wczytać katalogu gwiazd (HTTP 404)”, następne wczytanie pobiera od nowa', async () => {
    const bytes = encodeStarFile([star(1, 2, 3)])
    let call = 0
    const fetchMock = vi.fn((url: string) => {
      void url
      call++
      return Promise.resolve(call === 1 ? new Response('brak', { status: 404 }) : new Response(bytes.slice()))
    })
    vi.stubGlobal('fetch', fetchMock)
    const { loadStarCatalog } = await import('../../../src/data/starCatalog')
    await expect(loadStarCatalog()).rejects.toThrow(new Error('Nie udało się wczytać katalogu gwiazd (HTTP 404)'))
    const catalog = await loadStarCatalog()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[1][0])).toBe(FILE_URL)
    const stars = await import('../../../src/services/stars')
    expect(stars.starsInField(catalog, { raDeg: 1, decDeg: 2 }, 1)).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------------------------------------------
describe('skrypt build-stars bez sieci (P5, P10, P11)', () => {
  it('test_p5_obcieta_odpowiedz: 2000 wierszy z I/259/tyc2, COUNT 355 360 → błąd z tabelą i liczbami, bez zapisu', () => {
    const { cache, out } = buildDirs()
    const metaText = JSON.stringify(objectCatalogMeta(), null, 2) + '\n'
    writeFileSync(join(out, 'meta.json'), metaText)
    const run = runBuildStars(['--cache', cache, '--out', out], {
      mode: 'fixed',
      fixed: { [TYC2_TABLE]: { rows: 2000, count: 355_360 }, [SUPPL1_TABLE]: { rows: 3, count: 3 } },
    })
    expect(run.status, describeRun(run)).not.toBe(0)
    const compact = run.stderr.replace(/[\s\u00a0\u202f]/g, '')
    expect(compact, run.stderr).toContain('I/259/tyc2')
    expect(compact, run.stderr).toContain('2000')
    expect(compact, run.stderr).toContain('355360')
    expect(starFileExists(out)).toBe(false)
    expect(readFileSync(join(out, 'meta.json'), 'utf8')).toBe(metaText)
  })

  describe('katalog podręczny z przykładowymi odpowiedziami (P10, P11)', () => {
    const TYC2_SAMPLE = 'ra,dec,bt,vt\n83.8186,-5.3897,5.017,5.061\n10.5,20.25,8.40,8.10\n200.125,-45.5,,9.75\n150,30,,\n'
    const SUPPL_SAMPLE = 'ra,dec,bt,vt\n300.5,60.25,9.90,\n'
    const expectedTyc2 = [star(83.8186, -5.3897, 5.061 - 0.09 * (5.017 - 5.061)), star(10.5, 20.25, 8.1 - 0.09 * 0.3), star(200.125, -45.5, 9.75)]
    const expectedSuppl = star(300.5, 60.25, 9.9)
    let dirs: { cache: string; out: string } = { cache: '', out: '' }
    let seed: Record<string, unknown> = {}
    let first: BuildRun | null = null
    let metaAfterFirst: unknown = null
    let second: BuildRun | null = null

    beforeAll(() => {
      dirs = buildDirs()
      writeFileSync(cacheFile(dirs.cache, TYC2_TABLE), TYC2_SAMPLE)
      writeFileSync(cacheFile(dirs.cache, SUPPL1_TABLE), SUPPL_SAMPLE)
      seed = objectCatalogMeta()
      writeFileSync(join(dirs.out, 'meta.json'), JSON.stringify(seed, null, 2) + '\n')
      first = runBuildStars(['--cache', dirs.cache, '--out', dirs.out], { mode: 'offline' })
      metaAfterFirst = first.status === 0 ? readJson(join(dirs.out, 'meta.json')) : null
      second = runBuildStars(['--cache', dirs.cache, '--out', dirs.out], { mode: 'offline' })
    }, 200_000)

    it('test_p10_bez_sieci: skrypt kończy się sukcesem i nie wysyła żadnego żądania', () => {
      const run = first as BuildRun
      expect(run.status, describeRun(run)).toBe(0)
      expect(run.requests).toEqual([])
    })

    it('test_p10_plik: plik ma 4 gwiazdy, najpierw 3 z tabeli głównej, potem 1 z suplementu', () => {
      expect(first?.status, describeRun(first as BuildRun)).toBe(0)
      const stars = decodeStarFile(starFileBytes(dirs.out))
      expect(stars).toHaveLength(4)
      const main = stars.slice(0, 3)
      for (const expected of expectedTyc2) {
        const match = main.find((s) => angularSeparationDeg(s, expected) <= 0.1 * ARCSEC)
        expect(match, `gwiazda tabeli głównej ${JSON.stringify(expected)}`).toBeDefined()
        expect(Math.abs((match as Star).mag - expected.mag)).toBeLessThanOrEqual(0.01)
      }
      expectNear(stars[3], expectedSuppl, 0.1)
      expect(Math.abs(stars[3].mag - expectedSuppl.mag)).toBeLessThanOrEqual(0.01)
    })

    it('test_p11_meta: dotychczasowe pola bez zmian, wpis stars z liczbą, datą, cytowaniem i tabelami', () => {
      expect(first?.status, describeRun(first as BuildRun)).toBe(0)
      expect(withoutStars(metaAfterFirst)).toEqual(seed)
      const stars = (metaAfterFirst as { stars: unknown }).stars
      // toMatchObject: wymagane pola z dokładnymi wartościami; dodatkowe pola (np. data pobrania tabeli) są dozwolone
      expect(stars).toMatchObject({
        count: 4,
        builtAt: expect.any(String) as string,
        citation: CITATION,
        tables: [
          { table: TYC2_TABLE, query: expect.stringContaining(TYC2_TABLE) as string, rows: 4, stars: 3, skipped: 1 },
          { table: SUPPL1_TABLE, query: expect.stringContaining(SUPPL1_TABLE) as string, rows: 1, stars: 1, skipped: 0 },
        ],
      })
      expect(Number.isNaN(Date.parse((stars as { builtAt: string }).builtAt))).toBe(false)
    })

    it('test_p11_drugie_uruchomienie: drugie uruchomienie podmienia wpis stars, a nie dopisuje drugiego', () => {
      const run = second as BuildRun
      expect(run.status, describeRun(run)).toBe(0)
      const meta = readJson(join(dirs.out, 'meta.json')) as Record<string, unknown>
      expect(Object.keys(meta).sort()).toEqual([...Object.keys(seed), 'stars'].sort())
      expect(withoutStars(meta)).toEqual(seed)
      const stars = readStarsMeta(dirs.out)
      expect(stars.count).toBe(4)
      expect(stars.tables.map((t) => [t.table, t.rows, t.stars, t.skipped])).toEqual([
        [TYC2_TABLE, 4, 3, 1],
        [SUPPL1_TABLE, 1, 1, 0],
      ])
      expect(decodeStarFile(starFileBytes(dirs.out))).toHaveLength(4)
    })
  })
})

// ---------------------------------------------------------------------------------------------------------------
describe('skrypt build-stars z symulatorem TAP (P21 bez sieci, sieć i katalog podręczny ze „Styk z resztą”)', () => {
  // Gwiazdy oczekiwane w pliku, policzone niezależnie od programu z wierszy symulatora (vizierRows.ts):
  // pozycja = średnia J2000 (RAmdeg/DEmdeg), a gdy jej brak (pflag X) – RA(ICRS)/DE(ICRS); w suplemencie RA(ICRS).
  function expectedStars(csv: string, meanColumns: boolean): Star[] {
    const table = parseCsv(csv)
    const col = (name: string) => table.columns.indexOf(name)
    const num = (row: string[], name: string) => (row[col(name)].trim() === '' ? null : Number(row[col(name)]))
    return table.rows.flatMap((row) => {
      const v = expectedV(num(row, 'BTmag'), num(row, 'VTmag'))
      if (v === null || v > 10 + 1e-9) return []
      const raDeg = (meanColumns ? num(row, 'RAmdeg') : null) ?? Number(row[col('RA(ICRS)')])
      const decDeg = (meanColumns ? num(row, 'DEmdeg') : null) ?? Number(row[col('DE(ICRS)')])
      return [star(raDeg, decDeg, v)]
    })
  }
  const tyc2Expected = expectedStars(TYC2_CSV, true)
  const supplExpected = expectedStars(SUPPL1_CSV, false)

  let dirs: { cache: string; out: string } = { cache: '', out: '' }
  let build: BuildRun | null = null
  let bytesAfterBuild: Uint8Array | null = null
  let offline: BuildRun | null = null
  let refresh: BuildRun | null = null

  beforeAll(() => {
    dirs = buildDirs()
    writeFileSync(join(dirs.out, 'meta.json'), JSON.stringify(objectCatalogMeta(), null, 2) + '\n')
    build = runBuildStars(['--cache', dirs.cache, '--out', dirs.out], { mode: 'simulator' })
    if (build.status !== 0) return
    bytesAfterBuild = starFileBytes(dirs.out)
    offline = runBuildStars(['--cache', dirs.cache, '--out', dirs.out], { mode: 'offline' })
    refresh = runBuildStars(['--cache', dirs.cache, '--out', dirs.out, '--refresh'], { mode: 'simulator' })
  }, 300_000)

  const built = (): BuildRun => {
    expect(build?.status, build ? describeRun(build) : 'brak uruchomienia').toBe(0)
    return build as BuildRun
  }
  const dataRequests = (run: BuildRun) => run.requests.filter((r) => !r.isCount)

  it('test_p21_tabele_po_kolei: zapytania danych dotyczą I/259/tyc2, potem I/259/suppl_1; symulator nie zgłasza błędu', () => {
    const run = built()
    expect(run.requests.filter((r) => r.error !== null).map((r) => `${r.query ?? ''}: ${r.error ?? ''}`)).toEqual([])
    expect(dataRequests(run).map((r) => r.table)).toEqual([TYC2_TABLE, SUPPL1_TABLE])
    expect(readStarsMeta(dirs.out).tables.map((t) => t.table)).toEqual([TYC2_TABLE, SUPPL1_TABLE])
  })

  it('test_p21_ograniczenie_jasnosci: zapytanie tyc2 nie gubi V ≤ 10 (VT > 10, puste BT albo VT), ale odcina V 14,41', () => {
    const run = built()
    const tyc2 = dataRequests(run).find((r) => r.table === TYC2_TABLE)
    expect(tyc2, 'zapytanie danych dla I/259/tyc2').toBeDefined()
    const returned = new Set((tyc2 as { recnos: number[] }).recnos)
    for (const [recno, , , , , note] of TYC2_SYNTHETIC) {
      if (recno === 9000004) continue // V 10,09: zapytanie może go zwrócić albo nie; odsiew robi program
      expect(returned.has(recno), note).toBe(recno !== 9000005)
    }
    expect(returned.has(1229658), 'ι Ori (puste RAmdeg)').toBe(true)
  })

  it('test_p21_count: dla każdej tabeli jest zapytanie COUNT o tę samą tabelę, a liczby się zgadzają', () => {
    const run = built()
    expect(run.requests.filter((r) => r.isCount).map((r) => r.table).sort()).toEqual([SUPPL1_TABLE, TYC2_TABLE].sort())
  })

  it('test_p21_zapytanie_w_meta: zapytania w meta.json to te same zapytania, które poszły do TAP', () => {
    const run = built()
    expect(readStarsMeta(dirs.out).tables.map((t) => t.query)).toEqual(dataRequests(run).map((r) => r.query))
  })

  it('test_p21_plik: plik ma dokładnie gwiazdy V ≤ 10 z obu tabel, najpierw tyc2, potem suppl_1 (±1″, ±0,01 mag)', () => {
    built()
    const stars = decodeStarFile(starFileBytes(dirs.out))
    expect(stars).toHaveLength(tyc2Expected.length + supplExpected.length)
    expect(stars.every((s) => s.mag <= 10 + 0.01)).toBe(true)
    const check = (part: Star[], expected: Star[], label: string) => {
      for (const want of expected) {
        const match = part.find((s) => angularSeparationDeg(s, want) <= 1 * ARCSEC && Math.abs(s.mag - want.mag) <= 0.01)
        expect(match, `${label}: ${JSON.stringify(want)}`).toBeDefined()
      }
    }
    check(stars.slice(0, tyc2Expected.length), tyc2Expected, 'tyc2')
    check(stars.slice(tyc2Expected.length), supplExpected, 'suppl_1')
    const meta = readStarsMeta(dirs.out)
    expect(meta.count).toBe(stars.length)
    expect(meta.tables.map((t) => t.stars)).toEqual([tyc2Expected.length, supplExpected.length])
  })

  it('test_p21_m42: w polu r = 1° wokół M 42 są gwiazdy ≤ 5″ od θ¹ Ori C i od ι Ori; ι Ori (V 2,74) jest pierwsza', () => {
    built()
    const field = starsInField(buildStarIndex(decodeStarFile(starFileBytes(dirs.out))), M42, 1)
    for (const [name, target] of [['θ¹ Ori C', THETA1_ORI_C], ['ι Ori', IOTA_ORI]] as const) {
      const nearest = Math.min(...field.map((s) => angularSeparationDeg(s, target) * 3600))
      expect(nearest, name).toBeLessThanOrEqual(5)
    }
    expectNear(field[0], IOTA_ORI, 5)
    expect(field[0].mag).toBeCloseTo(2.715 - 0.09 * (2.485 - 2.715), 2)
  })

  it('test_siec_adres_i_user_agent: każde żądanie idzie do TAP VizieR sync z własnym nagłówkiem User-Agent', () => {
    const run = built()
    expect(run.requests.length).toBeGreaterThanOrEqual(4)
    for (const request of run.requests) {
      expect(request.url.startsWith(TAP_SYNC), request.url).toBe(true)
      expect(request.userAgent ?? '', 'User-Agent').not.toBe('')
    }
  })

  it('test_katalog_podreczny: odpowiedzi trafiają do I_259_tyc2.csv i I_259_suppl_1.csv; drugie uruchomienie bez sieci daje ten sam plik', () => {
    built()
    for (const table of [TYC2_TABLE, SUPPL1_TABLE]) {
      const columns = parseCsv(readFileSync(cacheFile(dirs.cache, table), 'utf8')).columns
      expect(columns, table).toEqual(expect.arrayContaining(['ra', 'dec', 'bt', 'vt']))
    }
    const run = offline as BuildRun
    expect(run.status, describeRun(run)).toBe(0)
    expect(run.requests).toEqual([])
    expect(starFileBytes(dirs.out)).toEqual(bytesAfterBuild)
  })

  it('test_refresh: --refresh pobiera obie tabele od nowa, mimo pełnego katalogu podręcznego', () => {
    built()
    const run = refresh as BuildRun
    expect(run.status, describeRun(run)).toBe(0)
    expect(dataRequests(run).map((r) => r.table)).toEqual([TYC2_TABLE, SUPPL1_TABLE])
  })
})
