import { describe, expect, it } from 'vitest'
import { DEMO_HORIZON } from '../test/fixtures'
import type { HorizonPoint } from '../types'
import { horizonAltitudeDeg } from './astroMath'
import { exportHorizonFile, normalizeHorizon, parseHorizonFile } from './horizonFile'

const points = (pairs: [number, number][]): HorizonPoint[] => pairs.map(([azDeg, altDeg]) => ({ azDeg, altDeg }))

const DEMO_FILE = ['# Az Alt', '', ...DEMO_HORIZON.map(({ azDeg, altDeg }) => `${azDeg} ${altDeg}`), '', ''].join('\n')

describe('T10 plik horyzontu', () => {
  it('plik z linią „# Az Alt” i pustymi liniami parsuje się poprawnie', () => {
    expect(parseHorizonFile(DEMO_FILE)).toEqual({ points: DEMO_HORIZON, rejected: [], error: null })
  })

  it('po wczytaniu: az 127,5° → 31,5° i az 352,5° → 11,5° (zawinięcie 345 → 0)', () => {
    const { points: loaded } = parseHorizonFile(DEMO_FILE)
    expect(horizonAltitudeDeg(loaded, 127.5)).toBeCloseTo(31.5, 9)
    expect(horizonAltitudeDeg(loaded, 352.5)).toBeCloseTo(11.5, 9)
  })

  it('punkty {350: 10, 10: 20} z pliku: az 0° → 15°', () => {
    const { points: loaded } = parseHorizonFile('350 10\n10 20\n')
    expect(horizonAltitudeDeg(loaded, 0)).toBeCloseTo(15, 9)
  })
})

describe('format pliku horyzontu (7C)', () => {
  it('separatory: spacje, tabulatory, przecinek i średnik, także kilka naraz', () => {
    const text = '0 10\n90\t20\n180,30\n270;40\n300 ,  ;\t50\n'
    expect(parseHorizonFile(text).points).toEqual(points([[0, 10], [90, 20], [180, 30], [270, 40], [300, 50]]))
  })

  it('„#” rozpoczyna komentarz także po wartościach', () => {
    const result = parseHorizonFile('# nagłówek\n90 15 # dach sąsiada\n  # wcięty komentarz\n180 8')
    expect(result).toEqual({ points: points([[90, 15], [180, 8]]), rejected: [], error: null })
  })

  it('znak BOM i końce linii CRLF z plików z Windows', () => {
    expect(parseHorizonFile('\uFEFF# Az Alt\r\n0 12\r\n180 8\r\n').points).toEqual(points([[0, 12], [180, 8]]))
  })

  it('liczby z kropką dziesiętną i znakiem', () => {
    expect(parseHorizonFile('127.5 31.5\n+200 -2.25\n.5 .25').points).toEqual(
      points([[0.5, 0.25], [127.5, 31.5], [200, -2.25]]),
    )
  })

  it('azymut normalizowany do [0, 360): 360 → 0, −15 → 345, 370 → 10', () => {
    expect(parseHorizonFile('360 12\n-15 9\n370 14').points).toEqual(points([[0, 12], [10, 14], [345, 9]]))
  })

  it('punkty są sortowane; przy duplikacie azymutu wygrywa ostatni wpis', () => {
    expect(parseHorizonFile('180 8\n0 12\n90 15\n0 20\n360 25').points).toEqual(points([[0, 25], [90, 15], [180, 8]]))
  })

  it('wysokość w [−5, 90]: wartości graniczne są przyjmowane', () => {
    expect(parseHorizonFile('0 -5\n90 90').points).toEqual(points([[0, -5], [90, 90]]))
  })

  it('wysokość spoza [−5, 90] odrzuca linię z numerem i przyczyną', () => {
    const result = parseHorizonFile('0 10\n90 95\n180 -5.5\n270 20')
    expect(result.points).toEqual(points([[0, 10], [270, 20]]))
    expect(result.rejected.map(({ line, text }) => [line, text])).toEqual([
      [2, '90 95'],
      [3, '180 -5.5'],
    ])
    for (const { reason } of result.rejected) expect(reason).toMatch(/zakres/)
    expect(result.error).toBeNull()
  })

  it('linia bez dokładnie dwóch liczb albo z tekstem jest odrzucana', () => {
    const result = parseHorizonFile('0 10\n45\n90 15 20\nAz Alt\n180 abc\n270 20')
    expect(result.points).toEqual(points([[0, 10], [270, 20]]))
    expect(result.rejected.map(({ line }) => line)).toEqual([2, 3, 4, 5])
    expect(result.rejected[3].reason).toContain('abc')
  })

  it('przecinek dziesiętny: przyczyna odrzucenia podpowiada kropkę', () => {
    const result = parseHorizonFile('127,5 31,5\n0 10\n180 8')
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0].reason).toMatch(/kropk/)
  })

  it('mniej niż 2 poprawne punkty to błąd całego pliku', () => {
    expect(parseHorizonFile('# tylko komentarz\n').error).toMatch(/co najmniej 2/)
    expect(parseHorizonFile('0 10\n90 95').error).toMatch(/co najmniej 2/)
    expect(parseHorizonFile('0 10\n0 12').error).toMatch(/co najmniej 2/)
  })
})

describe('porządkowanie punktów', () => {
  it('normalizacja azymutu, sortowanie i ostatni wpis przy duplikacie', () => {
    expect(normalizeHorizon(points([[350, 10], [-10, 11], [10, 20]]))).toEqual(points([[10, 20], [350, 11]]))
  })
})

/**
 * Odczyt pliku według CustomHorizon.cs z N.I.N.A. (gałąź develop, 16.10.2026): linie przycięte, „#” na początku
 * to komentarz, kolumny rozdzielane tabulatorem, spacją, „,” lub „;”, dokładnie 2 kolumny, liczby w InvariantCulture,
 * powtórzony azymut nadpisuje poprzedni. Brakujące 360 dostaje wysokość z 0 (eksport zawsze zawiera 0),
 * a wysokość między punktami jest interpolowana liniowo.
 */
function ninaHorizon(text: string): (azDeg: number) => number {
  const map = new Map<number, number>()
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    const columns = line.split(/[\t ,;]/).filter((column) => column !== '')
    if (columns.length !== 2) continue
    const [az, alt] = columns.map(Number)
    if (Number.isFinite(az) && Number.isFinite(alt)) map.set(az, alt)
  }
  const zero = map.get(0)
  if (zero === undefined) throw new Error('Eksport bez punktu 0°: N.I.N.A. nie interpolowałby przez 360° → 0°')
  if (!map.has(360)) map.set(360, zero)
  const azimuths = [...map.keys()].sort((a, b) => a - b)
  return (azDeg) => {
    const next = azimuths.findIndex((az) => az >= azDeg)
    if (azimuths[next] === azDeg) return map.get(azDeg) ?? NaN
    const [a, b] = [azimuths[next - 1], azimuths[next]]
    const [altA, altB] = [map.get(a) ?? NaN, map.get(b) ?? NaN]
    return altA + ((azDeg - a) / (b - a)) * (altB - altA)
  }
}

describe('eksport zgodny z plikiem horyzontu N.I.N.A.', () => {
  it('nagłówek z komentarzy „#”, potem linie „az alt” z kropką dziesiętną', () => {
    const text = exportHorizonFile(points([[0, 12], [127.5, 31.5], [200, -2.25]]), 'Polska centralna (demo)')
    const lines = text.trimEnd().split('\n')
    const header = lines.filter((line) => line.startsWith('#'))
    expect(header.join('\n')).toContain('Polska centralna (demo)')
    expect(lines.slice(header.length)).toEqual(['0 12', '127.5 31.5', '200 -2.25'])
    expect(lines.slice(0, header.length)).toEqual(header)
  })

  it('eksport → import daje te same punkty', () => {
    expect(parseHorizonFile(exportHorizonFile(DEMO_HORIZON, 'demo'))).toEqual({
      points: DEMO_HORIZON,
      rejected: [],
      error: null,
    })
  })

  it('bez punktu na 0° eksport dopisuje 0° z wysokością interpolowaną przez 360° → 0°', () => {
    const horizon = points([[10, 20], [350, 10]])
    const reloaded = parseHorizonFile(exportHorizonFile(horizon, 'test')).points
    expect(reloaded).toEqual(points([[0, 15], [10, 20], [350, 10]]))
    for (const azDeg of [0, 5, 352.5, 180]) {
      expect(horizonAltitudeDeg(reloaded, azDeg)).toBeCloseTo(horizonAltitudeDeg(horizon, azDeg), 9)
    }
  })

  it('N.I.N.A. odczytuje z eksportu ten sam horyzont co aplikacja', () => {
    for (const horizon of [DEMO_HORIZON, points([[10, 20], [350, 10]]), points([[40, 3.33], [200, 25], [300, 7]])]) {
      const nina = ninaHorizon(exportHorizonFile(horizon, 'test'))
      for (let azDeg = 0; azDeg < 360; azDeg += 2.5) {
        expect(nina(azDeg)).toBeCloseTo(horizonAltitudeDeg(horizon, azDeg), 1)
      }
    }
  })

  it('wartości dopisane przy eksporcie mają najwyżej 2 miejsca po przecinku', () => {
    const text = exportHorizonFile(points([[40, 10], [340, 11]]), 'test')
    expect(text).toContain('\n0 10.67\n')
  })

  it('wymaga co najmniej 2 punktów', () => {
    expect(() => exportHorizonFile(points([[0, 10]]), 'test')).toThrow(/co najmniej 2/)
  })
})
