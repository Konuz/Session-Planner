// Testy funkcji „zarysy-stellarium” (spec: .autoloop/features/zarysy-stellarium/spec.md).
// Nazwy funkcji wybrał test-author (spec ich nie podaje) – opis w src/services/outlines.ts.
// Wartości spoza P1…P15 (np. liczba punktów IC 5068, IC 434) odczytano z src/data/outlines.dat zasadami spec:
// punkty to kolejne linie start/vertex/end, RA w stopniach = RA w godzinach × 15.
import { describe, expect, it } from 'vitest'
import { assignOutlines, objectPolygons, outlineDesignation, parseOutlines } from '../../../src/services/outlines'
import {
  CATALOG,
  expectPoint,
  hoursToDeg,
  OUTLINES_TEXT,
  OUTLINES_TEXT_CRLF,
  outlineLines,
  syntheticObject,
  uidsOf,
  withLabel,
} from './helpers'

// P10: „38”–„49” w pliku to 38 (dwa zarysy), 39–41 i 43–49; zarysu „42” w pliku nie ma.
const UNASSIGNED_LABELS = [
  '38',
  '39',
  '40',
  '41',
  '43',
  '44',
  '45',
  '46',
  '47',
  '48',
  '49',
  'RCW 27',
  'RCW 32',
  'RCW 33',
  'Ced 30',
  'C 99',
  'C 100',
  'PGC 17223',
]

describe('parser pliku outlines.dat', () => {
  it('test_p1_plik_ma_3491_niepustych_linii_LF_i_ostatnia_linie_end', () => {
    expect(OUTLINES_TEXT.includes('\r')).toBe(false)
    const lines = OUTLINES_TEXT.split('\n').filter((line) => line !== '')
    expect(lines).toHaveLength(3491)
    expect(OUTLINES_TEXT.split('\n').filter((line) => line.trim() === '')).toEqual(OUTLINES_TEXT.endsWith('\n') ? [''] : [])
    expect(lines[lines.length - 1].trim()).toBe('20.11484 +37.19802 end')
  })

  it('test_p2_caly_plik_daje_100_zarysow_po_co_najmniej_3_punkty', () => {
    const outlines = parseOutlines(OUTLINES_TEXT)
    expect(outlines).toHaveLength(100)
    for (const outline of outlines) expect(outline.points.length).toBeGreaterThanOrEqual(3)
  })

  it('test_p3_pierwszy_zarys_LBN_933_ma_65_punktow_i_wspolrzedne_w_stopniach', () => {
    const first = parseOutlines(OUTLINES_TEXT)[0]
    expect(first.label).toBe('LBN 933')
    expect(first.points).toHaveLength(65)
    expectPoint(first.points[0], 85.0476, 2.76126)
    expectPoint(first.points[64], hoursToDeg(5.68207), 2.55104)
  })

  it('test_p4_komentarze_need_a_check_pominiete_LBN_342_ma_10_punktow', () => {
    const outlines = parseOutlines(OUTLINES_TEXT)
    expect(outlines.some((outline) => outline.label.includes('#') || outline.label.includes('Need'))).toBe(false)
    const [lbn342] = withLabel(outlines, 'LBN 342')
    expect(withLabel(outlines, 'LBN 342')).toHaveLength(1)
    expect(lbn342.points).toHaveLength(10)
    expectPoint(lbn342.points[0], hoursToDeg(20.89287), 42.40458)
    // Zarys przed pierwszym komentarzem (IC 5068, linie 798–810) kończy się na swoim `end`.
    const [ic5068] = withLabel(outlines, 'IC 5068')
    expect(ic5068.points).toHaveLength(13)
    // Wszystkie punkty: 3491 linii − 2 komentarze.
    expect(outlines.reduce((sum, outline) => sum + outline.points.length, 0)).toBe(3489)
  })

  it('test_p4_komentarz_w_tekscie_nie_jest_punktem_ani_zarysem', () => {
    const text = [
      ...outlineLines('IC 5068', [
        [20.8, 42.7],
        [20.81, 42.71],
        [20.82, 42.72],
      ]),
      '# Need a check',
      ...outlineLines('LBN 342', [
        [20.9, 42.4],
        [20.91, 42.41],
        [20.92, 42.42],
        [20.93, 42.43],
      ]),
    ].join('\n')
    const outlines = parseOutlines(text)
    expect(outlines.map((outline) => outline.label)).toEqual(['IC 5068', 'LBN 342'])
    expect(outlines.map((outline) => outline.points.length)).toEqual([3, 4])
  })

  it('test_p5_plik_z_koncami_CRLF_daje_ten_sam_wynik', () => {
    const crlf = parseOutlines(OUTLINES_TEXT_CRLF)
    expect(crlf).toHaveLength(100)
    expect(crlf[0].label).toBe('LBN 933')
    expect(crlf[0].points).toHaveLength(65)
    expectPoint(crlf[0].points[0], 85.0476, 2.76126)
    expectPoint(crlf[0].points[64], hoursToDeg(5.68207), 2.55104)
    expect(crlf.some((outline) => /\r/.test(outline.label))).toBe(false)
    expect(crlf).toEqual(parseOutlines(OUTLINES_TEXT))
  })

  it('test_p6_RA_bez_zera_wiodacego_NGC_292', () => {
    const [ngc292] = withLabel(parseOutlines(OUTLINES_TEXT), 'NGC 292')
    expect(ngc292).toBeDefined()
    expectPoint(ngc292.points[0], 13.0031, -73.64761)
    expectPoint(ngc292.points[0], hoursToDeg(0.866875), -73.64761)
  })

  it('test_p7_kilka_spacji_i_spacja_na_koncu_oznaczenie_44', () => {
    const text = ['18.29533 -18.83000 start  44  ', '18.30000 -18.84000 vertex ', '18.31000 -18.85000 end '].join('\n')
    const [outline] = parseOutlines(text)
    expect(outline.label).toBe('44')
    expectPoint(outline.points[0], hoursToDeg(18.29533), -18.83)
    expect(withLabel(parseOutlines(OUTLINES_TEXT), '44')).toHaveLength(1)
  })

  it('test_p13_zarys_z_2_punktami_pominiety_nastepny_czytany', () => {
    const text = [
      ...outlineLines('A 1', [
        [1, 10],
        [1.1, 10.1],
        [1.2, 10.2],
      ]),
      '02.00000 +20.00000 start  B 2 ',
      '02.10000 +20.10000 end ',
      ...outlineLines('C 3', [
        [3, 30],
        [3.1, 30.1],
        [3.2, 30.2],
        [3.3, 30.3],
      ]),
    ].join('\n')
    const outlines = parseOutlines(text)
    expect(outlines.map((outline) => outline.label)).toEqual(['A 1', 'C 3'])
    expect(outlines[1].points).toHaveLength(4)
    expectPoint(outlines[1].points[0], 45, 30)
  })

  it('test_p14_tekst_konczy_sie_w_srodku_zarysu', () => {
    const text = [
      ...outlineLines('A 1', [
        [1, 10],
        [1.1, 10.1],
        [1.2, 10.2],
      ]),
      '02.00000 +20.00000 start  B 2 ',
      '02.10000 +20.10000 vertex ',
      '02.20000 +20.20000 vertex ',
    ].join('\n')
    const outlines = parseOutlines(text)
    expect(outlines.map((outline) => outline.label)).toEqual(['A 1'])
    expect(outlines[0].points).toHaveLength(3)
  })

  it('test_p14_nowy_start_przed_end_pomija_poprzedni_zarys', () => {
    const text = [
      '01.00000 +10.00000 start  A 1 ',
      '01.10000 +10.10000 vertex ',
      '01.20000 +10.20000 vertex ',
      ...outlineLines('B 2', [
        [2, 20],
        [2.1, 20.1],
        [2.2, 20.2],
      ]),
    ].join('\n')
    const outlines = parseOutlines(text)
    expect(outlines.map((outline) => outline.label)).toEqual(['B 2'])
    expect(outlines[0].points).toHaveLength(3)
    expectPoint(outlines[0].points[0], 30, 20)
    expectPoint(outlines[0].points[2], 33, 20.2)
  })

  it('test_p15_puste_linie_i_inne_polecenia_pominiete', () => {
    const text = [
      '',
      '01.00000 +10.00000 start  A 1 ',
      '   ',
      '01.10000 +10.10000 vertex ',
      '01.15000 +10.15000 point ',
      '',
      '01.20000 +10.20000 end ',
      '',
    ].join('\n')
    const outlines = parseOutlines(text)
    expect(outlines).toHaveLength(1)
    expect(outlines[0].points).toHaveLength(3)
    expectPoint(outlines[0].points[2], 18, 10.2)
  })

  it('test_p15_pusty_tekst_daje_zero_zarysow', () => {
    expect(parseOutlines('')).toEqual([])
  })

  it('punkt_end_jest_ostatni_i_powtorzony_punkt_zamykajacy_zostaje', () => {
    // Pytania: end = ostatni punkt; powtórzonego punktu zamykającego się nie usuwa (IC 434: start = end).
    const [ic434] = withLabel(parseOutlines(OUTLINES_TEXT), 'IC 434')
    expect(ic434.points).toHaveLength(84)
    expect(ic434.points[83]).toEqual(ic434.points[0])
    const closed = parseOutlines(
      outlineLines('X 1', [
        [4, 40],
        [4.1, 40],
        [4.1, 41],
        [4, 40],
      ]).join('\n'),
    )
    expect(closed[0].points).toHaveLength(4)
    expectPoint(closed[0].points[3], 60, 40)
  })
})

describe('przypisanie zarysów do katalogu', () => {
  const whole = () => assignOutlines(parseOutlines(OUTLINES_TEXT), CATALOG)

  it('test_p8_przypisanie_przez_wyszukanie_w_katalogu', () => {
    const { outlines } = whole()
    expect(uidsOf(outlines, 'M 42')).toEqual(['NGC1976'])
    expect(uidsOf(outlines, 'M 43')).toEqual(['NGC1982'])
    expect(uidsOf(outlines, 'NGC 1977')).toEqual(['NGC1977'])
    expect(uidsOf(outlines, 'M 1')).toEqual(['NGC1952'])
    expect(uidsOf(outlines, 'IC 2118')).toEqual(['NGC1909'])
  })

  it('test_p8_uid_pochodzi_z_obiektu_katalogu_a_nie_z_tekstu', () => {
    const catalog = [
      syntheticObject('X1', [{ catalog: 'M', id: '42' }]),
      syntheticObject('X2', [
        { catalog: 'Sh2', id: '999' },
        { catalog: 'LBN', id: '933' },
      ]),
    ]
    const { outlines } = assignOutlines(parseOutlines(OUTLINES_TEXT), catalog)
    expect(uidsOf(outlines, 'M 42')).toEqual(['X1'])
    expect(uidsOf(outlines, 'LBN 933')).toEqual(['X2'])
    expect(uidsOf(outlines, 'M 43')).toEqual([null])
    expect(outlines.filter((outline) => outline.uid !== null)).toHaveLength(2)
  })

  it('test_p9_inny_zapis_przedrostka_w_pliku', () => {
    const { outlines } = whole()
    expect(uidsOf(outlines, 'SH 2-275')).toEqual(['Sh2-275'])
    expect(uidsOf(outlines, 'VDB 23')).toEqual(['vdB23'])
    expect(uidsOf(outlines, 'B 44')).toEqual(['B44'])
    expect(uidsOf(outlines, 'LBN 933')).toEqual(['LBN933'])
  })

  it('test_p9_LDN_1235_z_tekstu_trafia_do_LDN1235', () => {
    const text = outlineLines('LDN 1235', [
      [22.2, 73.3],
      [22.3, 73.4],
      [22.4, 73.3],
    ]).join('\n')
    const { outlines } = assignOutlines(parseOutlines(text), CATALOG)
    expect(uidsOf(outlines, 'LDN 1235')).toEqual(['LDN1235'])
  })

  it('test_p9_wielkosc_liter_w_przedrostku_nie_ma_znaczenia', () => {
    const text = [
      ...outlineLines('sh 2-275', [
        [6.5, 5.5],
        [6.6, 5.6],
        [6.7, 5.5],
      ]),
      ...outlineLines('Lbn 933', [
        [5.6, 2.7],
        [5.7, 2.6],
        [5.8, 2.5],
      ]),
      ...outlineLines('ldn 1235', [
        [22.2, 73.3],
        [22.3, 73.4],
        [22.4, 73.3],
      ]),
    ].join('\n')
    const { outlines } = assignOutlines(parseOutlines(text), CATALOG)
    expect(outlines.map((outline) => outline.uid)).toEqual(['Sh2-275', 'LBN933', 'LDN1235'])
  })

  it('test_p9_oznaczenie_z_pliku_zamienia_sie_na_Designation', () => {
    expect(outlineDesignation('SH 2-275')).toEqual({ catalog: 'Sh2', id: '275' })
    expect(outlineDesignation('VDB 23')).toEqual({ catalog: 'VdB', id: '23' })
    expect(outlineDesignation('B 44')).toEqual({ catalog: 'B', id: '44' })
    expect(outlineDesignation('LBN 933')).toEqual({ catalog: 'LBN', id: '933' })
    expect(outlineDesignation('LDN 1235')).toEqual({ catalog: 'LDN', id: '1235' })
    expect(outlineDesignation('M 42')).toEqual({ catalog: 'M', id: '42' })
    expect(outlineDesignation('NGC 1977')).toEqual({ catalog: 'NGC', id: '1977' })
  })

  it('test_p10_oznaczenia_spoza_katalogu_zostaja_bez_obiektu', () => {
    const parsed = parseOutlines(OUTLINES_TEXT)
    const { outlines, polygonsByUid } = assignOutlines(parsed, CATALOG)
    expect(outlines).toHaveLength(100)
    expect(outlines.map((outline) => outline.label)).toEqual(parsed.map((outline) => outline.label))
    expect(outlines.map((outline) => outline.points)).toEqual(parsed.map((outline) => outline.points))
    const unassigned = outlines.filter((outline) => outline.uid === null)
    expect(new Set(unassigned.map((outline) => outline.label))).toEqual(new Set(UNASSIGNED_LABELS))
    expect(unassigned).toHaveLength(19)
    expect(outlines.filter((outline) => outline.uid !== null)).toHaveLength(81)
    const allPolygons = [...polygonsByUid.values()].flat()
    expect(allPolygons).toHaveLength(81)
    const c99 = withLabel(outlines, 'C 99')[0]
    expect(allPolygons).not.toContainEqual(c99.points)
  })

  it('test_p10_inne_przedrostki_i_same_liczby_nie_maja_odpowiednika', () => {
    for (const label of ['RCW 27', 'Ced 30', 'C 99', 'C 100', 'PGC 17223', '38', '49']) {
      expect(outlineDesignation(label), label).toBeNull()
    }
  })

  it('test_p11_jeden_obiekt_moze_miec_kilka_wielokatow', () => {
    const { outlines, polygonsByUid } = whole()
    expect(polygonsByUid.get('NGC6334')).toHaveLength(4)
    expect(polygonsByUid.get('NGC3372')).toHaveLength(2)
    expect(polygonsByUid.get('IC2177')).toHaveLength(2)
    expect(polygonsByUid.size).toBe(75)
    expect(uidsOf(outlines, 'M 8')).toEqual(['NGC6523'])
    expect(uidsOf(outlines, 'NGC 6523')).toEqual(['NGC6523'])
    const ngc6523 = polygonsByUid.get('NGC6523')!
    expect(ngc6523).toHaveLength(2)
    expect(ngc6523).toContainEqual(withLabel(outlines, 'M 8')[0].points)
    expect(ngc6523).toContainEqual(withLabel(outlines, 'NGC 6523')[0].points)
  })

  it('test_p12_obiekt_bez_zarysu_ma_pusta_liste', () => {
    expect(CATALOG.some((object) => object.uid === 'NGC1973')).toBe(true)
    const assignment = whole()
    expect(objectPolygons(assignment, 'NGC1973')).toEqual([])
    expect(objectPolygons(assignment, 'NGC6334')).toHaveLength(4)
    expect(objectPolygons(assignment, 'NGC1976')).toEqual([withLabel(assignment.outlines, 'M 42')[0].points])
  })

  it('wynik_zalezy_od_podanego_katalogu', () => {
    // Styk z resztą: przypisanie bierze obiekty z argumentu, nie z wbudowanej listy.
    const subset = CATALOG.filter((object) => object.uid === 'NGC6334' || object.uid === 'NGC1977')
    const assignment = assignOutlines(parseOutlines(OUTLINES_TEXT), subset)
    expect(assignment.outlines.filter((outline) => outline.uid !== null)).toHaveLength(5)
    expect([...assignment.polygonsByUid.keys()].sort()).toEqual(['NGC1977', 'NGC6334'])
    expect(objectPolygons(assignment, 'NGC1976')).toEqual([])
  })

  it('oznaczenie_w_dwoch_obiektach_trafia_do_pierwszego_w_kolejnosci_katalogu', () => {
    // Pytania: przy powtórzonym oznaczeniu bierze się pierwszy obiekt w kolejności katalogu.
    const catalog = [
      syntheticObject('FIRST', [{ catalog: 'NGC', id: '1977' }]),
      syntheticObject('SECOND', [
        { catalog: 'NGC', id: '1977' },
        { catalog: 'M', id: '42' },
      ]),
    ]
    const assignment = assignOutlines(parseOutlines(OUTLINES_TEXT), catalog)
    expect(uidsOf(assignment.outlines, 'NGC 1977')).toEqual(['FIRST'])
    expect(uidsOf(assignment.outlines, 'M 42')).toEqual(['SECOND'])
    expect(objectPolygons(assignment, 'FIRST')).toHaveLength(1)
    expect(objectPolygons(assignment, 'SECOND')).toHaveLength(1)
  })

  it('pusty_tekst_i_pusty_katalog_daja_puste_zestawienie', () => {
    // P15 (pusty tekst → zero zarysów) i P10 (oznaczenie bez obiektu → uid puste) przeniesione na przypisanie.
    const empty = assignOutlines([], CATALOG)
    expect(empty.outlines).toEqual([])
    expect(empty.polygonsByUid.size).toBe(0)
    const noCatalog = assignOutlines(parseOutlines(OUTLINES_TEXT), [])
    expect(noCatalog.outlines.every((outline) => outline.uid === null)).toBe(true)
    expect(noCatalog.polygonsByUid.size).toBe(0)
  })
})
