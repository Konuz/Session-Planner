import { describe, expect, it } from 'vitest'
import { parseOpenNgc } from './openNgc'

const HEADER =
  'Name;Type;RA;Dec;Const;MajAx;MinAx;PosAng;B-Mag;V-Mag;J-Mag;H-Mag;K-Mag;SurfBr;Hubble;Pax;Pm-RA;Pm-Dec;RadVel;Redshift;Cstar U-Mag;Cstar B-Mag;Cstar V-Mag;M;NGC;IC;Cstar Names;Identifiers;Common names;NED notes;OpenNGC notes;Sources'

// Wiersze z database_files/NGC.csv i addendum.csv (OpenNGC, CC BY-SA 4.0).
const ROWS = {
  ngc224:
    'NGC0224;G;00:42:44.35;+41:16:08.6;And;177.83;69.66;35;4.29;3.44;2.09;1.28;0.98;23.63;Sb;;;;-300;-0.001000;;;;031;;;;2MASX J00424433+4116074,IRAS 00400+4059,MCG +07-02-016,PGC 002557,UGC 00454;Andromeda Galaxy;;;Type:1',
  ngc281: 'NGC0281;HII;00:52:59.35;+56:37:18.8;Cas;35.00;30.00;;;;;;;;;;;;-34;-0.000112;;;;;;0011;;LBN 616;;;;Type:1',
  ic11: 'IC0011;Dup;00:52:59.35;+56:37:18.8;Cas;;;;;;;;;;;;;;;;;;;;0281;;;;;;;Type:1',
  ic1396:
    'IC1396;Cl+N;21:38:57.62;+57:29:20.6;Cep;14.00;4.00;;;;;;;;;1.0660;-2.355;-4.495;-14;-0.000047;;;;;;;;BD +56 2617,HD 206267,HIP 106886,LBN 451,LBN 452,MWSC 3539;;;;Type:1',
  ic80: 'IC0080 NED01;G;01:08:50.70;-15:24:32.2;Cet;1.50;1.03;83;14.83;;;;;24.48;E;;;;;;;;;;;;;MCG -03-04-009,PGC 004072;;;;Type:1',
  ic67: 'IC0067;NonEx;01:00:17.66;-06:54:38.7;Cet;;;;;;;;;;;;;;;;;;;;;;;;;"Nominal position; does not exist.";;Type:1',
  ic71: 'IC0071;*;01:01:19.26;-06:46:01.8;Cet;;;;;;;;;;;;;;;;;;;;;;;;;ID not certain.;;Type:1',
  b33: 'B033;DrkN;05:40:59.0;-02:27:30;Ori;6.00;4.00;90;;;;;;;;;;;;;;;;;;;;;Horsehead Nebula;;;Type:2',
  mel22:
    'Mel022;OCl;03:47:28.6;+24:06:19;Tau;150.00;150.00;90;;1.20;;;;;;7.3640;19.997;-45.548;6;0.000020;;;;045;;;;MWSC 0305;Pleiades;;;Type:2',
  c9: 'C009;HII;22:57:54.0;+62:31:06;Cep;50.00;30.00;90;;;;;;;;;;;;;;;;;;;;LBN 529,SH 2-155;Cave Nebula;;;Type:2',
  m102: 'M102;Dup;14:03:12.54;+54:20:56.2;UMa;;;;;;;;;;;;;;;;;;;101;;;;;;;Controversial.;Type:1',
}

const csv = (...rows: string[]) => [HEADER, ...rows].join('\n')

describe('parser OpenNGC (6.1)', () => {
  it('M 31: oznaczenia NGC i M, współrzędne, rozmiar, PA, jasności, nazwa zwyczajowa', () => {
    const { records, rejected } = parseOpenNgc(csv(ROWS.ngc224))
    expect(rejected).toEqual([])
    expect(records).toHaveLength(1)
    const [record] = records
    expect(record).toMatchObject({
      kind: 'object',
      source: 'OpenNGC',
      designations: [
        { catalog: 'NGC', id: '224' },
        { catalog: 'M', id: '31' },
      ],
      crossIds: [],
      commonNames: ['Andromeda Galaxy'],
    })
    if (record.kind !== 'object') throw new Error('oczekiwano obiektu')
    expect(record.data).toMatchObject({
      type: 'galaxy',
      sizeMajorArcmin: 177.83,
      sizeMinorArcmin: 69.66,
      positionAngleDeg: 35,
      magV: 3.44,
      surfaceBrightness: 23.63,
      ldnOpacity: null,
    })
    expect(record.data.raDeg).toBeCloseTo(((42 + 44.35 / 60) / 60) * 15, 9)
    expect(record.data.decDeg).toBeCloseTo(41 + 16 / 60 + 8.6 / 3600, 9)
  })

  it('wiersz Dup daje rekord duplikatu wskazujący obiekt główny', () => {
    const { records } = parseOpenNgc(csv(ROWS.ngc281, ROWS.ic11, ROWS.m102))
    expect(records).toMatchObject([
      {
        kind: 'object',
        designations: [{ catalog: 'NGC', id: '281' }],
        crossIds: [
          { catalog: 'IC', id: '11' },
          { catalog: 'LBN', id: '616' },
        ],
      },
      { kind: 'duplicate', designations: [{ catalog: 'IC', id: '11' }], crossIds: [{ catalog: 'NGC', id: '281' }] },
      { kind: 'duplicate', designations: [{ catalog: 'M', id: '102' }], crossIds: [{ catalog: 'M', id: '101' }] },
    ])
  })

  it('krzyżowe ID z kolumny Identifiers: LBN i Sh2, pozostałe pomijane', () => {
    const { records } = parseOpenNgc(csv(ROWS.c9, ROWS.ic1396))
    expect(records).toMatchObject([
      {
        designations: [{ catalog: 'Other', id: 'C 9' }],
        crossIds: [
          { catalog: 'LBN', id: '529' },
          { catalog: 'Sh2', id: '155' },
        ],
        commonNames: ['Cave Nebula'],
      },
      {
        designations: [{ catalog: 'IC', id: '1396' }],
        crossIds: [
          { catalog: 'LBN', id: '451' },
          { catalog: 'LBN', id: '452' },
        ],
      },
    ])
  })

  it('nazwy spoza NGC/IC: B 33, Mel 22 z oznaczeniem M 45, przyrostki komponentów', () => {
    const { records } = parseOpenNgc(csv(ROWS.b33, ROWS.mel22, ROWS.ic80))
    expect(records).toMatchObject([
      { designations: [{ catalog: 'B', id: '33' }], data: { type: 'dark_nebula', sizeMajorArcmin: 6, sizeMinorArcmin: 4 } },
      {
        designations: [
          { catalog: 'Other', id: 'Mel 22' },
          { catalog: 'M', id: '45' },
        ],
        data: { type: 'open_cluster', magV: 1.2 },
      },
      { designations: [{ catalog: 'IC', id: '80 NED01' }] },
    ])
  })

  it('pomija gwiazdy i obiekty nieistniejące (także z cudzysłowem i średnikiem w polu)', () => {
    const result = parseOpenNgc(csv(ROWS.ic67, ROWS.ic71, ROWS.b33))
    expect(result.skipped).toBe(2)
    expect(result.rejected).toEqual([])
    expect(result.records).toHaveLength(1)
  })

  it('pole w cudzysłowie ze średnikiem nie przesuwa kolumn', () => {
    const row = 'NGC9999;HII;10:00:00.0;+10:00:00;Leo;5.00;;;;;;;;;;;;;;;;;;;;;;;"Mgławica; testowa";;;'
    const { records } = parseOpenNgc(csv(row))
    expect(records).toMatchObject([{ commonNames: ['Mgławica; testowa'], data: { sizeMajorArcmin: 5 } }])
  })

  it('odrzuca wiersze z nieznanym typem lub bez współrzędnych, podając numer linii i przyczynę', () => {
    const unknownType = 'NGC9998;XYZ;10:00:00.0;+10:00:00;Leo;;;;;;;;;;;;;;;;;;;;;;;;;;;'
    const noCoordinates = 'NGC9997;G;;+10:00:00;Leo;;;;;;;;;;;;;;;;;;;;;;;;;;;'
    const { records, rejected } = parseOpenNgc(csv(unknownType, noCoordinates))
    expect(records).toEqual([])
    expect(rejected).toMatchObject([
      { line: 2, reason: expect.stringContaining('XYZ') as string },
      { line: 3, reason: expect.stringContaining('współrzędn') as string },
    ])
  })

  it('plik bez wymaganych kolumn jest odrzucany w całości', () => {
    const result = parseOpenNgc('Name;Type\nNGC0001;G')
    expect(result.records).toEqual([])
    expect(result.rejected).toMatchObject([{ line: 1, reason: expect.stringContaining('RA') as string }])
  })
})
