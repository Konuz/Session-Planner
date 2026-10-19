// Ukryte testy funkcji „zarysy-stellarium”: te same zachowania co w testach jawnych, inne wartości.
// Wartości z pliku odczytano zasadami spec (punkty start/vertex/end, RA × 15).
import { describe, expect, it } from 'vitest'
import { assignOutlines, objectPolygons, outlineDesignation, parseOutlines } from '../../../../src/services/outlines'
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
} from '../helpers'

describe('parser (ukryte)', () => {
  it('liczby_punktow_i_wspolrzedne_innych_zarysow', () => {
    const outlines = parseOutlines(OUTLINES_TEXT)
    const [ic5068] = withLabel(outlines, 'IC 5068')
    expect(ic5068.points).toHaveLength(13)
    expectPoint(ic5068.points[0], hoursToDeg(20.82393), 42.77298)
    const [ic405] = withLabel(outlines, 'IC 405')
    expect(ic405.points).toHaveLength(129)
    expect(ic405.points[128]).toEqual(ic405.points[0])
    const ngc6334 = withLabel(outlines, 'NGC 6334')
    expect(ngc6334.map((outline) => outline.points.length)).toEqual([34, 16, 16, 21])
    expectPoint(ngc6334[1].points[0], hoursToDeg(17.33061), -36.01933)
    const last = outlines[99]
    expect(last.label).toBe('B 144')
    expect(last.points).toHaveLength(26)
    expectPoint(last.points[25], hoursToDeg(20.11484), 37.19802)
  })

  it('CRLF_w_tekscie_syntetycznym', () => {
    const lines = [
      ...outlineLines('NGC 7000', [
        [20.9, 45.2],
        [20.95, 45.1],
        [21.0, 44.9],
        [20.9, 45.2],
      ]),
      '# Need a check',
      ...outlineLines('IC 5070', [
        [20.85, 44.0],
        [20.86, 44.1],
        [20.87, 44.2],
      ]),
    ]
    const lf = parseOutlines(lines.join('\n'))
    const crlf = parseOutlines(lines.join('\r\n') + '\r\n')
    expect(crlf).toEqual(lf)
    expect(crlf.map((outline) => outline.label)).toEqual(['NGC 7000', 'IC 5070'])
    expect(crlf.map((outline) => outline.points.length)).toEqual([4, 3])
    expect(OUTLINES_TEXT_CRLF.includes('\r\n')).toBe(true)
  })

  it('zarys_z_2_punktami_na_poczatku_i_na_koncu_tekstu', () => {
    const text = [
      '10.00000 -50.00000 start  Z 1 ',
      '10.10000 -50.10000 end ',
      ...outlineLines('Y 2', [
        [11, -51],
        [11.1, -51.1],
        [11.2, -51.2],
        [11.3, -51.3],
        [11.4, -51.4],
      ]),
      '12.00000 -52.00000 start  X 3 ',
      '12.10000 -52.10000 end ',
    ].join('\n')
    const outlines = parseOutlines(text)
    expect(outlines.map((outline) => outline.label)).toEqual(['Y 2'])
    expect(outlines[0].points).toHaveLength(5)
    expectPoint(outlines[0].points[4], 171, -51.4)
  })

  it('niedokonczony_zarys_i_nowy_start_w_innym_miejscu', () => {
    const text = [
      ...outlineLines('P 1', [
        [3, -10],
        [3.1, -10.5],
        [3.2, -11],
        [3.3, -11.5],
      ]),
      '04.00000 -20.00000 start  Q 2 ',
      '04.10000 -20.10000 vertex ',
      ...outlineLines('R 3', [
        [5, -30],
        [5.2, -30.2],
        [5.4, -30.4],
      ]),
      '06.00000 -40.00000 start  S 4 ',
    ].join('\n')
    const outlines = parseOutlines(text)
    expect(outlines.map((outline) => outline.label)).toEqual(['P 1', 'R 3'])
    expect(outlines.map((outline) => outline.points.length)).toEqual([4, 3])
    expectPoint(outlines[1].points[0], 75, -30)
  })

  it('oznaczenie_bez_spacji_po_trim_i_inne_polecenia', () => {
    const text = [
      '   ',
      '07.08951 -10.57390 start   IC 2177   ',
      '07.10000 -10.60000 label ',
      '07.11000 -10.61000 vertex ',
      '',
      '07.12000 -10.62000 end ',
    ].join('\n')
    const outlines = parseOutlines(text)
    expect(outlines).toHaveLength(1)
    expect(outlines[0].label).toBe('IC 2177')
    expect(outlines[0].points).toHaveLength(3)
    expectPoint(outlines[0].points[0], hoursToDeg(7.08951), -10.5739)
  })
})

describe('przypisanie (ukryte)', () => {
  const whole = () => assignOutlines(parseOutlines(OUTLINES_TEXT), CATALOG)

  it('inne_oznaczenia_z_pliku', () => {
    const { outlines } = whole()
    expect(uidsOf(outlines, 'M 20')).toEqual(['NGC6514'])
    expect(uidsOf(outlines, 'M 78')).toEqual(['NGC2068'])
    expect(uidsOf(outlines, 'M 16')).toEqual(['NGC6611'])
    expect(uidsOf(outlines, 'IC 5068')).toEqual(['IC5068'])
    expect(uidsOf(outlines, 'B 138')).toEqual(['B138'])
    expect(uidsOf(outlines, 'RCW 32')).toEqual([null])
    expect(uidsOf(outlines, '38')).toEqual([null, null])
    expect(uidsOf(outlines, 'C 100')).toEqual([null])
  })

  it('male_litery_w_przedrostku', () => {
    const text = [
      ...outlineLines('ngc 1977', [
        [5.58, -4.88],
        [5.59, -4.89],
        [5.6, -4.9],
      ]),
      ...outlineLines('vdb 23', [
        [3.77, 24.15],
        [3.78, 24.16],
        [3.79, 24.17],
      ]),
      ...outlineLines('m 42', [
        [5.58, -5.4],
        [5.59, -5.5],
        [5.6, -5.6],
      ]),
      ...outlineLines('b 44', [
        [16.44, -24.6],
        [16.45, -24.5],
        [16.46, -24.4],
      ]),
    ].join('\n')
    const { outlines } = assignOutlines(parseOutlines(text), CATALOG)
    expect(outlines.map((outline) => outline.uid)).toEqual(['NGC1977', 'vdB23', 'NGC1976', 'B44'])
    expect(outlineDesignation('sh 2-275')).toEqual({ catalog: 'Sh2', id: '275' })
    expect(outlineDesignation('Ic 2118')).toEqual({ catalog: 'IC', id: '2118' })
  })

  it('wyszukanie_w_syntetycznym_katalogu', () => {
    const catalog = [
      syntheticObject('Y7', [{ catalog: 'B', id: '44' }]),
      syntheticObject('Y8', [
        { catalog: 'VdB', id: '23' },
        { catalog: 'Sh2', id: '275' },
      ]),
      syntheticObject('Y9', [{ catalog: 'IC', id: '2177' }]),
      syntheticObject('Y10', [{ catalog: 'IC', id: '2177' }]),
    ]
    const assignment = assignOutlines(parseOutlines(OUTLINES_TEXT), catalog)
    expect(uidsOf(assignment.outlines, 'B 44')).toEqual(['Y7'])
    expect(uidsOf(assignment.outlines, 'VDB 23')).toEqual(['Y8'])
    expect(uidsOf(assignment.outlines, 'SH 2-275')).toEqual(['Y8'])
    expect(uidsOf(assignment.outlines, 'IC 2177')).toEqual(['Y9', 'Y9'])
    expect(objectPolygons(assignment, 'Y8')).toHaveLength(2)
    expect(objectPolygons(assignment, 'Y9')).toHaveLength(2)
    expect(objectPolygons(assignment, 'Y10')).toEqual([])
    expect(assignment.polygonsByUid.size).toBe(3)
    expect(assignment.outlines.filter((outline) => outline.uid !== null)).toHaveLength(5)
  })

  it('wielokaty_IC2177_i_NGC3372_to_punkty_z_pliku', () => {
    const assignment = whole()
    const ic2177 = objectPolygons(assignment, 'IC2177')
    expect(ic2177.map((polygon) => polygon.length).sort((a, b) => a - b)).toEqual([17, 83])
    const ngc3372 = objectPolygons(assignment, 'NGC3372')
    expect(ngc3372.map((polygon) => polygon.length).sort((a, b) => a - b)).toEqual([46, 63])
    expect(objectPolygons(assignment, 'IC2944')).toEqual([])
  })
})
