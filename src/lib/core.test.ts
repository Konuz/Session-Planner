import { Horizon, MakeTime, Observer, RotateVector, Rotation_EQJ_EQD, SphereFromVector, Vector } from 'astronomy-engine'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { altAz, computeOptics, DEG, galactic, hourAngleDeg, horizontalMatrix, horizontalToVec, isCircumpolar, moonInfo, mulVec, nextTransitMs, transpose, vecToEquatorial, type Site } from './astro'
import { matchesFilter, normalizeQuery, parseCatalog, quickSearch, searchScore, skyGroupOf, EMPTY_FILTER } from './catalog'
import { frameCorners, gnomonic, gnomonicInverse, pixelToTangent, tangentToPixel } from './framing'
import { exportHorizon, horizonAltitude, parseHorizon } from './horizon'
import { darkWindow, nightDateOf, nightPhases, phaseAt, zonedMidnightMs } from './night'
import { formatDec, formatPa, formatRa } from './planExport'
import { pointInOutline, pointInPolygon, polygonArea, prepareRing } from './outlines'
import { affineFrom3, FULL_DOME, makeProjector } from './projection'
import { autoSchedule, localTimeToMs, overlaps } from './planner'
import { astrobinSearchUrl } from './services'
import { thumbFovDeg } from './thumbs'

const SITE: Site = { latDeg: 51.09, lonDeg: 17.29, elevationM: 130 }
const M51 = { raDeg: 202.4696, decDeg: 47.1952 }
const TZ = 'Europe/Warsaw'

describe('astro', () => {
  it('okołobiegunowość z deklinacji zgadza się z wysokością w pełnej dobie', () => {
    const cases: [number, number][] = [[41.3, 51.1], [30, 51.1], [36.5, 51.1], [-70, -34], [-50, -34], [89, 10], [-89, 10]]
    for (const [decDeg, latDeg] of cases) {
      const site = { latDeg, lonDeg: 17, elevationM: 0 }
      let minAlt = 90
      for (let t = Date.UTC(2026, 10, 5); t < Date.UTC(2026, 10, 6); t += 5 * 60_000) minAlt = Math.min(minAlt, altAz({ raDeg: 80, decDeg }, t, site).altDeg)
      expect(isCircumpolar(decDeg, latDeg), `δ=${decDeg} φ=${latDeg}`).toBe(minAlt > 0)
    }
  })

  it('wysokość i azymut zgodne z astronomy-engine (bez refrakcji)', () => {
    const t = Date.UTC(2026, 9, 22, 20, 0)
    const ours = altAz(M51, t, SITE)
    const obs = new Observer(SITE.latDeg, SITE.lonDeg, SITE.elevationM)
    // Wzorzec: precesja do daty i Horizon z astronomy-engine (bez refrakcji).
    const ra = (M51.raDeg * Math.PI) / 180
    const dec = (M51.decDeg * Math.PI) / 180
    const v = new Vector(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec), MakeTime(new Date(t)))
    const s = SphereFromVector(RotateVector(Rotation_EQJ_EQD(new Date(t)), v))
    const ref = Horizon(new Date(t), obs, s.lon / 15, s.lat)
    expect(ours.altDeg).toBeCloseTo(ref.altitude, 2)
    expect(ours.azDeg).toBeCloseTo(ref.azimuth, 2)
  })

  it('górowanie: kąt godzinny 0 i wysokość 90 − |φ − δ|', () => {
    const t = nextTransitMs(M51, Date.UTC(2026, 9, 22, 12), SITE)
    expect(Math.abs(hourAngleDeg(M51, t, SITE))).toBeLessThan(0.01)
    expect(altAz(M51, t, SITE).altDeg).toBeCloseTo(90 - Math.abs(SITE.latDeg - M51.decDeg), 0)
  })

  it('górowanie M 42 w nocy 22/23.10 wypada tej samej nocy (bez przeskoku o dobę)', () => {
    const n = nightPhases('2026-10-22', SITE, TZ)
    const t = nextTransitMs({ raDeg: 83.8187, decDeg: -5.3897 }, n.startMs, SITE)
    expect(t).toBeGreaterThan(n.startMs)
    expect(t).toBeLessThan(n.endMs)
  })

  it('macierz horyzontalna jest ortogonalna', () => {
    const m = horizontalMatrix(Date.UTC(2026, 0, 1), SITE)
    const dot = (a: number, b: number) => m[a * 3] * m[b * 3] + m[a * 3 + 1] * m[b * 3 + 1] + m[a * 3 + 2] * m[b * 3 + 2]
    expect(dot(0, 0)).toBeCloseTo(1, 9)
    expect(dot(0, 1)).toBeCloseTo(0, 9)
    expect(dot(1, 2)).toBeCloseTo(0, 9)
  })

  it('faza Księżyca: 2026-10-26 to ok. pełni, 2026-11-09 ok. nowiu', () => {
    // Pełnia 26.10.2026, nów 9.11.2026 (efemerydy USNO).
    expect(moonInfo(Date.UTC(2026, 9, 26, 6)).illumination).toBeGreaterThan(0.97)
    expect(moonInfo(Date.UTC(2026, 10, 9, 12)).illumination).toBeLessThan(0.03)
    const m = moonInfo(Date.UTC(2026, 9, 22))
    expect(m.nextFullMs).toBeGreaterThan(Date.UTC(2026, 9, 25))
    expect(m.nextFullMs).toBeLessThan(Date.UTC(2026, 9, 27))
  })

  it('optyka: Newton 150/600 + Ares-M Pro', () => {
    const o = computeOptics({ apertureMm: 150, focalLengthMm: 600, reducer: 1, widthPx: 3008, heightPx: 3008, pixelUm: 3.76, binning: 1 })
    expect(o.fRatio).toBe(4)
    expect(o.fovWdeg).toBeCloseTo(1.08, 2)
    expect(o.scaleArcsecPx).toBeCloseTo(1.29, 2)
  })

  it('współrzędne galaktyczne: centrum Galaktyki (Sgr A*) ma l ≈ 0, b ≈ 0', () => {
    const g = galactic({ raDeg: 266.41683, decDeg: -29.00781 })
    expect(Math.min(g.lDeg, 360 - g.lDeg)).toBeLessThan(0.1)
    expect(Math.abs(g.bDeg)).toBeLessThan(0.1)
  })
})

describe('noc', () => {
  it('północ strefy i data nocy', () => {
    expect(new Date(zonedMidnightMs('2026-10-22', TZ)).toISOString()).toBe('2026-10-21T22:00:00.000Z')
    expect(nightDateOf(Date.UTC(2026, 9, 23, 1), TZ)).toBe('2026-10-22')
    expect(nightDateOf(Date.UTC(2026, 9, 22, 15), TZ)).toBe('2026-10-22')
  })

  it('fazy nocy 22/23 października w kolejności i w rozsądnych godzinach', () => {
    const n = nightPhases('2026-10-22', SITE, TZ)
    const order = [n.sunset, n.civilDusk, n.nauticalDusk, n.astroDusk, n.astroDawn, n.nauticalDawn, n.civilDawn, n.sunrise]
    order.forEach((t) => expect(t).not.toBeNull())
    for (let i = 1; i < order.length; i++) expect(order[i]!).toBeGreaterThan(order[i - 1]!)
    // Zachód Słońca we Wrocławiu 22.10: ok. 17:55 CEST (15:55 UTC).
    expect(Math.abs(n.sunset! - Date.UTC(2026, 9, 22, 15, 55))).toBeLessThan(15 * 60_000)
    expect(phaseAt(n, (n.astroDusk! + n.astroDawn!) / 2)).toBe('night')
    expect(phaseAt(n, n.sunset! - 60_000)).toBe('day')
    expect(darkWindow(n)).toEqual([n.astroDusk, n.astroDawn])
  })

  it('białe noce: brak nocy astronomicznej w czerwcu na 51° N', () => {
    const n = nightPhases('2026-06-21', SITE, TZ)
    expect(n.astroDusk).toBeNull()
    expect(n.nauticalDusk).not.toBeNull()
    expect(darkWindow(n)).toEqual([n.nauticalDusk, n.nauticalDawn])
  })
})

describe('horyzont', () => {
  it('interpolacja z zawinięciem przez 360°', () => {
    const h = [{ azDeg: 10, altDeg: 10 }, { azDeg: 350, altDeg: 20 }]
    expect(horizonAltitude(h, 0)).toBeCloseTo(15)
    expect(horizonAltitude([], 123)).toBe(0)
  })

  it('plik: komentarze, separatory, błędne linie', () => {
    const p = parseHorizon('# moj\n0 10\n90;20\n180,5\nabc\n270 95\n')
    expect(p.points).toEqual([{ azDeg: 0, altDeg: 10 }, { azDeg: 90, altDeg: 20 }, { azDeg: 180, altDeg: 5 }])
    expect(p.rejected).toEqual([5, 6])
    expect(exportHorizon(p.points, 'Test')).toContain('90 20')
  })
})

describe('eksport planu', () => {
  it('formaty współrzędnych', () => {
    expect(formatRa(202.4696)).toBe('13:29:52.70')
    expect(formatDec(47.1952)).toBe('+47:11:42.7')
    expect(formatDec(-0.5)).toBe('-00:30:00.0')
    expect(formatPa(30)).toBe('30.0')
    expect(formatPa(-10)).toBe('350.0')
  })
})

describe('kadr i rzut', () => {
  it('rzut gnomoniczny tam i z powrotem', () => {
    const c = { raDeg: 83.8, decDeg: -5.4 }
    const p = { raDeg: 84.3, decDeg: -4.9 }
    const back = gnomonicInverse(c, gnomonic(c, p))
    expect(back.raDeg).toBeCloseTo(p.raDeg, 9)
    expect(back.decDeg).toBeCloseTo(p.decDeg, 9)
  })

  it('kadr bez obrotu: góra = N, lewy bok po stronie E; piksele tam i z powrotem', () => {
    const [tl, tr] = frameCorners({ xi: 0, eta: 0 }, 2, 1, 0)
    expect(tl.eta).toBeGreaterThan(0)
    expect(tl.xi).toBeGreaterThan(0) // lewy górny róg jest po stronie E
    expect(tr.xi).toBeLessThan(0)
    const [x, y] = tangentToPixel(tl, 4, 800)
    const back = pixelToTangent(x, y, 4, 800)
    expect(back.xi).toBeCloseTo(tl.xi, 12)
    expect(x).toBeLessThan(400)
    expect(y).toBeLessThan(400)
  })

  it('kopuła: zenit w środku, N u góry, E po lewej', () => {
    const p = makeProjector(horizontalMatrix(0, SITE), FULL_DOME, 500, 500, 400)
    const [zx, zy] = p.hor([0, 0, 1])!
    expect(zx).toBeCloseTo(500)
    expect(zy).toBeCloseTo(500)
    const [nx, ny] = p.hor([1, 0, 0])!
    expect(ny).toBeLessThan(120)
    expect(nx).toBeCloseTo(500)
    const [ex] = p.hor([0, 1, 0])!
    expect(ex).toBeLessThan(120)
    const v = p.unprojectHor(ex, 500)
    expect(v[1]).toBeCloseTo(1, 6)
    for (let azDeg = 0; azDeg < 360; azDeg += 15) {
      const [x, y] = p.hor(horizontalToVec({ azDeg, altDeg: 0 }))!
      expect(Math.hypot(x - p.cx, y - p.cy)).toBeCloseTo(p.scale * 2)
    }
  })

  it('w kopule zenitalnej oś ruchu gwiazd jest przy biegunie, nad środkiem kadru', () => {
    const matrix = horizontalMatrix(0, SITE)
    const p = makeProjector(matrix, FULL_DOME, 500, 500, 400)
    const later = makeProjector(horizontalMatrix(6 * 3_600_000, SITE), FULL_DOME, 500, 500, 400)
    const poleHor = horizontalToVec({ azDeg: 0, altDeg: SITE.latDeg })
    const pole = p.hor(poleHor)!
    expect(pole[0]).toBeCloseTo(p.cx)
    expect(pole[1]).toBeLessThan(p.cy)
    const poleEq = mulVec(transpose(matrix), poleHor)
    expect(later.eq(poleEq)![1]).toBeCloseTo(pole[1], 3)
    const star = mulVec(transpose(matrix), horizontalToVec({ azDeg: 45, altDeg: 55 }))
    const initial = p.eq(star)!
    const moved = later.eq(star)!
    expect(Math.hypot(initial[0] - moved[0], initial[1] - moved[1])).toBeGreaterThan(30)
    const angleToPole = (v: number[]) => v.reduce((sum, value, i) => sum + value * poleHor[i], 0)
    expect(angleToPole(later.unprojectHor(...moved))).toBeCloseTo(angleToPole(p.unprojectHor(...initial)), 6)
  })

  it('transformacja afiniczna z trzech punktów', () => {
    const m = affineFrom3([[0, 0], [1, 0], [0, 1]], [[10, 20], [12, 20], [10, 23]])!
    expect(m).toEqual([2, 0, 0, 3, 10, 20])
  })
})

describe('planer', () => {
  const H = 3_600_000
  it('dzieli ciemne okno wokół najlepszych chwil i pomija niewidoczne cele', () => {
    const slots = autoSchedule(
      [
        { key: 'b', bestMs: 6 * H, usableStart: 2 * H, usableEnd: 9 * H },
        { key: 'a', bestMs: 2 * H, usableStart: 0, usableEnd: 5 * H },
        { key: 'x', bestMs: 4 * H, usableStart: null, usableEnd: null },
      ],
      0,
      10 * H,
    )
    expect(slots).toEqual([
      { key: 'a', startMs: 0, endMs: 4 * H },
      { key: 'b', startMs: 4 * H, endMs: 9 * H },
    ])
    expect(overlaps(slots).size).toBe(0)
    expect(overlaps([{ key: 'p', startMs: 0, endMs: 2 * H }, { key: 'q', startMs: H, endMs: 3 * H }])).toEqual(new Set(['p', 'q']))
  })

  it('godzina lokalna rano należy do następnego dnia kalendarzowego', () => {
    expect(new Date(localTimeToMs('2026-10-22', '01:30', TZ)!).toISOString()).toBe('2026-10-22T23:30:00.000Z')
    expect(new Date(localTimeToMs('2026-10-22', '21:00', TZ)!).toISOString()).toBe('2026-10-22T19:00:00.000Z')
  })
})

describe('katalog', () => {
  const rows = [
    ['M 51', 'NGC 5194', 'Galaktyka Wir', 'Whirlpool Galaxy', 'G', 202.47, 47.2, 13.7, 11.7, 163, 8.4, 22.9, 'CVn', 0, '', ''],
    ['LDN 1355', '', '', '', 'DN', 30, 60, 20, 0, -1, 99, 99, 'Cas', 0, '', ''],
    ['Sh2-105', 'NGC 6888|LBN 203', 'Mgławica Półksiężyc', 'Crescent Nebula', 'EN', 303, 38.4, 18, 12, -1, 7.4, 99, 'Cyg', 4700, '', ''],
  ] as Parameters<typeof parseCatalog>[0]
  const cat = parseCatalog(rows)

  it('szybkie wyszukiwanie zachowuje kolejność remisów na granicy 12 wyników', () => {
    const tied = Array.from({ length: 13 }, (_, i) => ({ ...cat[0], i, search: 'wspolnanazwa' }))
    const exact = { ...cat[0], i: 99, id: 'Wspólna', search: 'wspolna' }
    expect(quickSearch([...tied, exact], 'wspólna').map((o) => o.i)).toEqual([99, ...tied.slice(0, 11).map((o) => o.i)])
    expect(quickSearch(tied, '  ')).toEqual([])
  })

  it('katalogi z oznaczeń i filtr po katalogu i typie', () => {
    expect(cat[0].catalogs).toEqual(['M', 'NGC'])
    expect(cat[2].catalogs).toEqual(['Sh2', 'NGC', 'LBN'])
    expect(cat.filter((o) => matchesFilter(o, { ...EMPTY_FILTER, catalogs: ['LBN', 'LDN'] })).map((o) => o.id)).toEqual(['LDN 1355', 'Sh2-105'])
    expect(cat.filter((o) => matchesFilter(o, { ...EMPTY_FILTER, types: ['G'] }))).toHaveLength(1)
    expect(cat.filter((o) => matchesFilter(o, { ...EMPTY_FILTER, maxMag: 8 }))).toHaveLength(1)
  })

  it('wyszukiwanie bez spacji i znaków diakrytycznych', () => {
    expect(normalizeQuery('Półksiężyc')).toBe('polksiezyc')
    expect(cat.filter((o) => matchesFilter(o, { ...EMPTY_FILTER, query: 'm51' }))).toHaveLength(1)
    expect(cat.filter((o) => matchesFilter(o, { ...EMPTY_FILTER, query: 'polksiezyc' }))).toHaveLength(1)
    expect(searchScore(cat[0], 'M 51')).toBe(0)
    expect(searchScore(cat[2], 'NGC6888')).toBe(1)
  })

  it('grupa katalogu kopuły według najpopularniejszego katalogu', () => {
    expect(skyGroupOf({ catalogs: ['NGC', 'M'] })).toBe('M')
    expect(skyGroupOf({ catalogs: ['Sh2', 'NGC', 'LBN'] })).toBe('NGC')
    expect(skyGroupOf({ catalogs: ['IC', 'LBN'] })).toBe('IC')
    expect(skyGroupOf({ catalogs: ['Sh2', 'LBN'] })).toBe('Sh2')
    expect(skyGroupOf({ catalogs: ['LDN', 'B'] })).toBe('B')
    expect(skyGroupOf({ catalogs: ['C'] })).toBe('other')
    expect(skyGroupOf({ catalogs: [] })).toBe('other')
    expect(cat.map(skyGroupOf)).toEqual(['M', 'LDN', 'NGC'])
  })

  it('pole miniatury', () => {
    expect(thumbFovDeg({ majArcmin: 13.7 })).toBeCloseTo(0.388, 3)
    expect(thumbFovDeg({ majArcmin: 600 })).toBe(4)
    expect(thumbFovDeg({ majArcmin: 0 })).toBe(0.2)
  })
})

describe('kontury mgławic', () => {
  it('środek i promień pierścienia przechodzącego przez RA 0°', () => {
    const ring = prepareRing([359, 10, 1, 10, 1, 12, 359, 12])
    const c = vecToEquatorial(ring.centre)
    expect(Math.min(c.raDeg, 360 - c.raDeg)).toBeLessThan(1e-6)
    expect(c.decDeg).toBeCloseTo(11, 1)
    expect(ring.radiusDeg).toBeCloseTo(Math.hypot(Math.cos(11 * DEG), 1), 1)
  })

  it('trafienie w kontur na ekranie', () => {
    const square: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]]
    expect(pointInPolygon(square, 5, 5)).toBe(true)
    expect(pointInPolygon(square, 15, 5)).toBe(false)
    expect(polygonArea(square)).toBe(100)
  })

  it('outlines.json: poziomy 2 i 3, duże obrysy poziomu 1 i obiekty z M 33', () => {
    const data = JSON.parse(readFileSync(new URL('../../public/data/outlines.json', import.meta.url), 'utf8')) as {
      objects: { id: string; level: number; rings: number[][] }[]
    }
    const levels = (id: string) => data.objects.filter((o) => o.id === id).map((o) => o.level).sort()
    expect(levels('NGC 604')).toEqual([2, 3])
    expect(levels('NGC 595')).toEqual([2, 3])
    expect(levels('NGC 1976')).toEqual([1, 2, 3])
    expect(levels('NGC 7000')).toEqual([1, 2, 3])
    expect(levels('NGC 6888')).toEqual([3])
    // Pierścienie regionów przypisane do największej mgławicy w środku; bez niej zostaje region.
    expect(levels('Sh2-264')).toEqual([1])
    expect(levels('Cygnus')).toEqual([])
    expect(levels('Puppis')).toEqual([1, 1, 1])
    for (const o of data.objects) for (const ring of o.rings) expect(ring.length).toBeGreaterThanOrEqual(6)
  })

  it('outlines.json: mgławice ciemne z nazwami i wspólnymi oznaczeniami', () => {
    const data = JSON.parse(readFileSync(new URL('../../public/data/outlines.json', import.meta.url), 'utf8')) as {
      objects: { id: string; dark?: number; name?: string; also?: string[] }[]
    }
    const dark = new Map(data.objects.filter((o) => o.dark === 1).map((o) => [o.id, o]))
    expect(dark.size).toBe(93)
    expect(dark.get('LDN 1235')?.name).toBe('Shark Nebula')
    expect(dark.get('LDN 1251')?.name).toBe('Rotten Fish Nebula')
    expect(dark.get('LDN 1082')?.also).toEqual(['B 150'])
    expect(dark.get('LDN 1355')?.also).toEqual(['LDN 1357', 'LDN 1358', 'vdB 9'])
    expect(dark.get('vdB 141')?.also).toEqual(['Sh2-136', 'LDN 1177'])
    expect(dark.get('vdB 141')?.name).toBe('Ghost Nebula')
    // Jasna mgławica z tym samym źródłem konturów: bez dark, rysowana jak jasne.
    const vulture = data.objects.find((o) => o.id === 'LBN 777')
    expect(vulture?.dark).toBeUndefined()
    expect(vulture?.also).toEqual(['LBN 775', 'LDN 1489', 'LDN 1491', 'B 207'])
    for (const id of ['LDN 935', 'LDN 886', 'B 347']) expect(dark.has(id)).toBe(true)
    expect(dark.has('B 150')).toBe(false)
  })

  it('outlines.json: zaakceptowane kompleksy mają trzy warstwy i wspólne oznaczenia', () => {
    const data = JSON.parse(readFileSync(new URL('../../public/data/outlines.json', import.meta.url), 'utf8')) as {
      objects: { id: string; level: number; also?: string[]; rings: number[][] }[]
    }
    for (const id of ['LDN 1355', 'B 168', 'B 72', 'LDN 935', 'LDN 886', 'B 347', 'LDN 1448', 'LDN 1450', 'LDN 1174', 'B 22', 'LBN 437', 'vdB 141', 'LDN 1503', 'LDN 800', 'LDN 1317', 'LDN 1089', 'LDN 717', 'LDN 1245', 'LDN 1295', 'LDN 1296', 'LDN 1353', 'LDN 1307', 'LDN 1336', 'LDN 988', 'LDN 1015', 'LDN 659', 'B 140', 'LDN 647', 'LDN 684']) {
      const layers = data.objects.filter((o) => o.id === id)
      expect(layers.map((o) => o.level).sort(), id).toEqual([1, 2, 3])
      expect(layers.every((o) => o.rings.length > 0), id).toBe(true)
    }
    const aliases = (id: string) => data.objects.find((o) => o.id === id)?.also ?? []
    expect(aliases('LDN 1448')).toContain('LDN 1451')
    expect(aliases('LDN 1448')).toContain('LDN 1455')
    expect(aliases('LDN 1450')).toEqual(['B 205'])
    expect(data.objects.filter((o) => o.id === 'NGC 1333').map((o) => o.level)).toEqual([2])
    expect(aliases('LDN 1174')).toEqual(['LDN 1172', 'LDN 1170', 'LDN 1173'])
    expect(data.objects.filter((o) => o.id === 'NGC 7023').map((o) => o.level)).toEqual([2, 3])
    expect(aliases('LDN 800')).toEqual(['LDN 803', 'LDN 804', 'LDN 799', 'LDN 806', 'LDN 807', 'LDN 808'])
    expect(aliases('LDN 1317')).toContain('LDN 1313')
    expect(aliases('LDN 1503')).toContain('B 23')
    expect(aliases('LDN 1336')).toContain('LDN 1349')
    expect(aliases('LDN 1336')).toContain('LDN 1327')
    expect(aliases('LDN 988')).toContain('LDN 999')
    expect(aliases('LDN 988')).toContain('LDN 1000')
    expect(aliases('LDN 988')).toContain('vdB 138')
    expect(aliases('LDN 1015')).toContain('LDN 1029')
    expect(aliases('LDN 1015')).not.toContain('LDN 999')
    expect(aliases('LDN 659')).toEqual(['LDN 648', 'LDN 650', 'LDN 653', 'LDN 660', 'LDN 665', 'LDN 666'])
    expect(aliases('B 140')).toEqual(['LDN 642'])
    expect(aliases('LDN 647')).toEqual(['B 330', 'LDN 644', 'LDN 645', 'LDN 651', 'LDN 652', 'LDN 655', 'LDN 656'])
    expect(aliases('LDN 684')).toEqual(['LDN 683', 'LDN 686', 'LDN 692'])
    expect(aliases('LDN 684')).not.toContain('LDN 677')
  })

  it('prześwity nie są wypełniane ani wybierane jako część obrysu', () => {
    const outer: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]]
    const hole: [number, number][] = [[3, 3], [7, 3], [7, 7], [3, 7]]
    expect(pointInOutline(outer, [hole], 1, 1)).toBe(true)
    expect(pointInOutline(outer, [hole], 5, 5)).toBe(false)
    expect(pointInOutline(outer, [hole], 11, 5)).toBe(false)
    const data = JSON.parse(readFileSync(new URL('../../public/data/outlines.json', import.meta.url), 'utf8')) as {
      objects: { id: string; level: number; rings: number[][]; holes?: number[][][] }[]
    }
    for (const id of ['LBN 437', 'LDN 1317']) {
      const o = data.objects.find((entry) => entry.id === id && entry.level === 1)!
      expect(o.rings).toHaveLength(1)
      expect(o.holes?.[0]).toHaveLength(1)
      expect(prepareRing(o.rings[0], o.holes?.[0]).holes).toHaveLength(1)
    }
  })
})

describe('AstroBin', () => {
  it('adres wyszukiwania: msgpack + zlib + base64 z obiektem i filtrem IOTD/Top Pick', async () => {
    const url = new URL(await astrobinSearchUrl('M 81'))
    expect(url.origin + url.pathname).toBe('https://app.astrobin.com/search')
    const zipped = Uint8Array.from(atob(url.searchParams.get('p')!), (c) => c.charCodeAt(0))
    const raw = new Uint8Array(await new Response(new Blob([zipped]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer())
    // Napis msgpack str8: znacznik 0xd9 i długość.
    expect(raw[0]).toBe(0xd9)
    expect(raw[1]).toBe(raw.length - 2)
    const params = new URLSearchParams(new TextDecoder().decode(raw.slice(2)))
    expect(JSON.parse(params.get('subjects')!)).toEqual({ value: ['M 81'], matchType: null })
    expect(JSON.parse(params.get('award')!)).toEqual(['iotd', 'top-pick'])
  })
})
