// Ukryte testy katalog-gwiazd: te same reguły co w testach jawnych, sprawdzone innymi wartościami
// (żeby nie przeszedł kod napisany tylko pod wartości z przykładów).
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { angularSeparationDeg, type EquatorialDeg } from '../../../../src/services/astroMath'
import {
  buildStarIndex,
  decodeStarFile,
  encodeStarFile,
  parseStarsCsv,
  starsInField,
  visualMagnitude,
  type Star,
} from '../../../../src/services/stars'
import {
  buildDirs,
  cacheFile,
  CITATION,
  describeRun,
  randomStars,
  readJson,
  runBuildStars,
  starFileBytes,
  starFileExists,
} from '../helpers'
import { SUPPL1_TABLE, TYC2_TABLE } from '../vizierRows'

const ARCSEC = 1 / 3600
const plain = (stars: readonly Star[]) => stars.map(({ raDeg, decDeg, mag }) => ({ raDeg, decDeg, mag }))
const star = (raDeg: number, decDeg: number, mag: number): Star => ({ raDeg, decDeg, mag })

function bruteForce(stars: readonly Star[], center: EquatorialDeg, radiusDeg: number): Star[] {
  const picked: number[] = []
  for (let i = 0; i < stars.length; i++) if (angularSeparationDeg(center, stars[i]) <= radiusDeg + 1e-6) picked.push(i)
  return picked.sort((a, b) => stars[a].mag - stars[b].mag || a - b).map((i) => stars[i])
}

describe('ukryte: jasność i CSV', () => {
  it('hidden_p1_wzor: VT 7,50, BT 8,30 → 7,428; VT 3,20, BT 2,90 → 3,227', () => {
    expect(visualMagnitude({ bt: 8.3, vt: 7.5 })).toBeCloseTo(7.428, 9)
    expect(visualMagnitude({ bt: 2.9, vt: 3.2 })).toBeCloseTo(3.227, 9)
  })

  it('hidden_p2_brak_jednej: tylko VT 4,40 → 4,40; tylko BT 10,00 → 10,00', () => {
    expect(visualMagnitude({ bt: null, vt: 4.4 })).toBeCloseTo(4.4, 9)
    expect(visualMagnitude({ bt: 10, vt: null })).toBeCloseTo(10, 9)
  })

  it('hidden_p4_inna_kolejnosc: nagłówek dec,vt,ra,bt (CRLF) – kolumny czytane po nazwach, V > 10 odpada', () => {
    const text = 'dec,vt,ra,bt\r\n-12.5,8.80,45.25,9.60\r\n33,,12,9.99\r\n7,10.20,8,10.00\r\n'
    const result = parseStarsCsv(text)
    expect(result.rows).toBe(3)
    expect(plain(result.stars)).toEqual([
      { raDeg: 45.25, decDeg: -12.5, mag: expect.closeTo(8.8 - 0.09 * 0.8, 9) as number },
      { raDeg: 12, decDeg: 33, mag: expect.closeTo(9.99, 9) as number },
    ])
  })

  it('hidden_p4_pominiete: pusta Dec, brak obu jasności i zła liczba jasności → 3 pominięte, 1 gwiazda', () => {
    const result = parseStarsCsv('bt,ra,vt,dec\n9.5,5,9.0,\n,6,,1\n8.0,7,8.x,2\n7.0,8,6.5,3\n')
    expect(result.rows).toBe(4)
    expect(result.skipped).toBe(3)
    expect(plain(result.stars)).toEqual([{ raDeg: 8, decDeg: 3, mag: expect.closeTo(6.5 - 0.09 * 0.5, 9) as number }])
  })
})

describe('ukryte: plik binarny', () => {
  it('hidden_p6_losowe: 2000 losowych gwiazd wraca w tej samej kolejności (±0,1″, ±0,01 mag, RA w [0, 360))', () => {
    const stars = randomStars(2000, 2024)
    const back = decodeStarFile(encodeStarFile(stars))
    expect(back).toHaveLength(2000)
    const bad = back.findIndex(
      (read, i) =>
        angularSeparationDeg(read, stars[i]) > 0.1 * ARCSEC ||
        Math.abs(read.mag - stars[i].mag) > 0.01 ||
        read.raDeg < 0 ||
        read.raDeg >= 360,
    )
    expect(bad).toBe(-1)
  })

  it('hidden_p6_ra_ujemne_i_360: RA 360° i jasność −0,72 wracają z RA w [0, 360)', () => {
    const [read] = decodeStarFile(encodeStarFile([star(360, 12.5, -0.72)]))
    expect(read.raDeg).toBeGreaterThanOrEqual(0)
    expect(read.raDeg).toBeLessThan(360)
    expect(angularSeparationDeg(read, { raDeg: 0, decDeg: 12.5 })).toBeLessThanOrEqual(0.1 * ARCSEC)
    expect(Math.abs(read.mag + 0.72)).toBeLessThanOrEqual(0.01)
  })

  it('hidden_p8_rozmiar: 1000 gwiazd → najwyżej 10 064 B', () => {
    expect(encodeStarFile(randomStars(1000, 7)).length).toBeLessThanOrEqual(10_064)
  })

  it('hidden_p9_wersja_7: wersja 7 → „Nieobsługiwana wersja pliku gwiazd: 7”', () => {
    const bytes = encodeStarFile([]).slice()
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint16(4, 7, true)
    expect(() => decodeStarFile(bytes)).toThrow(new Error('Nieobsługiwana wersja pliku gwiazd: 7'))
  })

  it('hidden_p9_znacznik_bajt_3: zmieniony czwarty bajt znacznika → „To nie jest plik katalogu gwiazd”', () => {
    const bytes = encodeStarFile([star(1, 1, 1)]).slice()
    bytes[3] = 0
    expect(() => decodeStarFile(bytes)).toThrow(new Error('To nie jest plik katalogu gwiazd'))
  })

  it('hidden_p9_obciety_rekord: 5 gwiazd bez ostatniego bajtu → „Plik katalogu gwiazd jest niepełny”', () => {
    const bytes = encodeStarFile(randomStars(5, 3))
    expect(() => decodeStarFile(bytes.slice(0, bytes.length - 1))).toThrow(new Error('Plik katalogu gwiazd jest niepełny'))
  })
})

describe('ukryte: wybór gwiazd', () => {
  it('hidden_p12_brzeg_poludnie: środek (200°; −30°), r = 2°: Dec −32° (brzeg) jest, −32,01° nie; RA 201,5° jest, 202,4° nie', () => {
    const index = buildStarIndex([star(200, -32.01, 1), star(202.4, -30, 2), star(200, -32, 6), star(201.5, -30, 4)])
    expect(plain(starsInField(index, { raDeg: 200, decDeg: -30 }, 2))).toEqual([star(201.5, -30, 4), star(200, -32, 6)])
  })

  it('hidden_p13_ra_zero_z_drugiej_strony: środek (359,5°; 10°), r = 1°: RA 0,3° jest, RA 0,6° nie', () => {
    const index = buildStarIndex([star(0.6, 10, 3), star(0.3, 10, 5), star(358.7, 10, 6)])
    expect(plain(starsInField(index, { raDeg: 359.5, decDeg: 10 }, 1))).toEqual([star(0.3, 10, 5), star(358.7, 10, 6)])
  })

  it('hidden_p14_biegun_poludniowy: środek Dec −90°, r = 0,5°: Dec −89,6° przy RA 10° i 200° są, −89,4° nie', () => {
    const index = buildStarIndex([star(300, -89.4, 1), star(10, -89.6, 2), star(200, -89.6, 3)])
    expect(plain(starsInField(index, { raDeg: 123, decDeg: -90 }, 0.5))).toEqual([star(10, -89.6, 2), star(200, -89.6, 3)])
  })

  it('hidden_p17_remisy: V 5,5, 2,0, 5,5, 2,0 → 2,0 (pierwsza), 2,0 (druga), 5,5 (pierwsza), 5,5 (druga)', () => {
    const list = [star(100, 0, 5.5), star(100.1, 0, 2.0), star(100.2, 0, 5.5), star(100.3, 0, 2.0)]
    expect(plain(starsInField(buildStarIndex(list), { raDeg: 100.15, decDeg: 0 }, 1))).toEqual(
      plain([list[1], list[3], list[0], list[2]]),
    )
  })

  it('hidden_p16_inny_katalog: 50 000 gwiazd, inne środki i promienie – wynik jak przegląd wszystkich gwiazd', () => {
    const stars = randomStars(50_000, 4242)
    const index = buildStarIndex(stars)
    const cases: [EquatorialDeg, number][] = [
      [{ raDeg: 12, decDeg: 34 }, 5],
      [{ raDeg: 300, decDeg: -70 }, 15],
      [{ raDeg: 45, decDeg: 89.95 }, 0.5],
      [{ raDeg: 179.5, decDeg: -10 }, 90],
    ]
    for (const [center, radius] of cases) {
      expect(plain(starsInField(index, center, radius)), `${JSON.stringify(center)} r = ${radius}`).toEqual(
        plain(bruteForce(stars, center, radius)),
      )
    }
  }, 60_000)
})

describe('ukryte: wczytanie w aplikacji', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('hidden_p20_500: HTTP 500 → „Nie udało się wczytać katalogu gwiazd (HTTP 500)”', async () => {
    const fetchMock = vi.fn((url: string) => {
      void url
      return Promise.resolve(new Response('błąd', { status: 500 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const { loadStarCatalog } = await import('../../../../src/data/starCatalog')
    await expect(loadStarCatalog()).rejects.toThrow(new Error('Nie udało się wczytać katalogu gwiazd (HTTP 500)'))
    await expect(loadStarCatalog()).rejects.toThrow(new Error('Nie udało się wczytać katalogu gwiazd (HTTP 500)'))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('ukryte: skrypt build-stars', () => {
  it('hidden_p5_suplement_obciety: tyc2 w porządku, suppl_1 1500 wierszy przy COUNT 1787 → błąd, bez zapisu', () => {
    const { cache, out } = buildDirs()
    const metaText = JSON.stringify({ schemaVersion: 1, objectCount: 12, sources: [] }, null, 2) + '\n'
    writeFileSync(join(out, 'meta.json'), metaText)
    const run = runBuildStars(['--cache', cache, '--out', out], {
      mode: 'fixed',
      fixed: { [TYC2_TABLE]: { rows: 5, count: 5 }, [SUPPL1_TABLE]: { rows: 1500, count: 1787 } },
    })
    expect(run.status, describeRun(run)).not.toBe(0)
    const compact = run.stderr.replace(/[\s\u00a0\u202f]/g, '')
    expect(compact, run.stderr).toContain('I/259/suppl_1')
    expect(compact, run.stderr).toContain('1500')
    expect(compact, run.stderr).toContain('1787')
    expect(starFileExists(out)).toBe(false)
    expect(readFileSync(join(out, 'meta.json'), 'utf8')).toBe(metaText)
  })

  it('hidden_p10_inne_dane: 2 gwiazdy tyc2 (+1 z V > 10) i 2 z suplementu (+2 pominięte) → plik 4 gwiazd, wpis stars', () => {
    const { cache, out } = buildDirs()
    writeFileSync(cacheFile(cache, TYC2_TABLE), 'ra,dec,bt,vt\r\n10,10,10.80,10.30\r\n250.75,-60.5,7.20,7.00\r\n5.5,-1.25,,8.25\r\n')
    writeFileSync(cacheFile(cache, SUPPL1_TABLE), 'ra,dec,bt,vt\n1,2,,\n3,4,9.1,9.4\n33.3,44.4,y,9\n120,-5,9.95,\n')
    const seed = { schemaVersion: 1, generatedAt: '2026-01-02T03:04:05.000Z', objectCount: 3, sources: [{ id: 'x' }], aliases: 7 }
    writeFileSync(join(out, 'meta.json'), JSON.stringify(seed))
    const run = runBuildStars(['--cache', cache, '--out', out], { mode: 'offline' })
    expect(run.status, describeRun(run)).toBe(0)
    expect(run.requests).toEqual([])
    const stars = decodeStarFile(starFileBytes(out))
    const expected = [
      star(250.75, -60.5, 7.0 - 0.09 * 0.2),
      star(5.5, -1.25, 8.25),
      star(3, 4, 9.4 - 0.09 * -0.3),
      star(120, -5, 9.95),
    ]
    expect(stars).toHaveLength(4)
    const tyc2Part = stars.slice(0, 2)
    for (const want of expected.slice(0, 2)) {
      expect(tyc2Part.some((s) => angularSeparationDeg(s, want) <= 0.1 * ARCSEC && Math.abs(s.mag - want.mag) <= 0.01)).toBe(true)
    }
    const supplPart = stars.slice(2)
    for (const want of expected.slice(2)) {
      expect(supplPart.some((s) => angularSeparationDeg(s, want) <= 0.1 * ARCSEC && Math.abs(s.mag - want.mag) <= 0.01)).toBe(true)
    }
    const meta = readJson(join(out, 'meta.json')) as Record<string, unknown> & {
      stars: { count: number; citation: string; tables: { table: string; rows: number; stars: number; skipped: number }[] }
    }
    const { stars: starsEntry, ...rest } = meta
    expect(rest).toEqual(seed)
    expect(starsEntry.count).toBe(4)
    expect(starsEntry.citation).toBe(CITATION)
    expect(starsEntry.tables.map((t) => [t.table, t.rows, t.stars])).toEqual([
      [TYC2_TABLE, 3, 2],
      [SUPPL1_TABLE, 4, 2],
    ])
    expect(starsEntry.tables[1].skipped).toBe(2)
  })
})
