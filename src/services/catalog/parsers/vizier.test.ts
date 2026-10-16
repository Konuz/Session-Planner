import { describe, expect, it } from 'vitest'
import { parseVizier } from './vizier'

// Odpowiedź asu-tsv VizieR: komentarze #, nagłówek, wiersz jednostek, wiersz kresek, dane rozdzielane tabulatorem.
function tsv(table: string, header: string, ...rows: string[]): string {
  const width = header.split('\t').length
  return [
    `#Name: ${table.split('/').slice(0, 2).join('/')}`,
    `#Table\t${table.replaceAll('/', '_')}:`,
    `#Name: ${table}`,
    header,
    Array(width).fill(' ').join('\t'),
    Array(width).fill('----').join('\t'),
    ...rows,
    '',
  ].join('\n')
}

const SH2 = '_RAJ2000\t_DEJ2000\trecno\tSh2\tGlLund\tGbLund\tGLon\tGLat\tRA1900\tDE1900\tDiam\tForm\tStruct\tBright\tStars'
const LDN = '_RAJ2000\t_DEJ2000\trecno\tLDN\tRA1950\tDE1950\tGLON\tGLAT\tArea\tOpacity\tID\tSeq\tLynds2\tBarn\t_RA.icrs\t_DE.icrs'
const LBN = '_RAJ2000\t_DEJ2000\trecno\tSeq\tGLON\tGLAT\tRA1950\tDE1950\tDiam1\tDiam2\tArea\tColor\tBright\tID\tName\t_RA.icrs\t_DE.icrs'
const VDB =
  '_RAJ2000\t_DEJ2000\trecno\tVdB\tRemFlag\tDM\tHD\tHD2\tSpType\tVmag\tn_Vmag\tType\tSurfBr\tColor\tAbsorb\tBRadMax\tu_BRadMax\tRRadMax\tu_RRadMax\tSimbad\t_RA\t_DE\toGLON\toGLAT'
const BARNARD = '_RAJ2000\t_DEJ2000\trecno\tBarn\tRA1875\tDE1875\tDiam\t_RA.icrs\t_DE.icrs'
const GREEN =
  '_RAJ2000\t_DEJ2000\trecno\tSNR\tRAJ2000\tDEJ2000\tMajDiam\tMinDiam\tu_MinDiam\ttype\tl_S(1GHz)\tS(1GHz)\tu_S(1GHz)\tSp-Index\tu_Sp-Index\tNames\tSimbad'

describe('parser VizieR TSV (6.1)', () => {
  it('Sh2 (VII/20): emisyjna, średnica jako wielka oś, jasność 1–3, współrzędne _RAJ2000/_DEJ2000', () => {
    const row = '344.182555\t+62.617601\t     155\t 155\t 77.8\t  2.6\t110.2\t  2.6\t22 52 48.0\t+62 05 00\t  60\t3\t2\t2\t 9'
    const { records, rejected } = parseVizier(tsv('VII/20/catalog', SH2, row))
    expect(rejected).toEqual([])
    expect(records).toEqual([
      {
        kind: 'object',
        source: 'VizieR VII/20',
        designations: [{ catalog: 'Sh2', id: '155' }],
        crossIds: [],
        commonNames: [],
        data: {
          type: 'emission_nebula',
          raDeg: 344.182555,
          decDeg: 62.617601,
          sizeMajorArcmin: 60,
          sizeMinorArcmin: null,
          positionAngleDeg: null,
          magV: null,
          surfaceBrightness: null,
          ldnOpacity: null,
          sh2Brightness: 2,
          lbnBrightness: null,
          vdbStarMagV: null,
        },
      },
    ])
  })

  it('LDN (VII/7A): ciemna, nieprzezroczystość, średnica równoważna z pola powierzchni; bez numeru LDN → odrzucony', () => {
    const ldn1235 = '333.7288\t+73.4159\t    1229\t1235\t22 14.0\t+73 10\t112.24\t 13.88\t  0.037\t6\t351\t1233\t 736\t                                \t22 14 54.9\t+73 24 58'
    const noNumber = '300.0000\t+40.0000\t    1388\t    \t20 00.0\t+40 00\t 80.00\t  4.00\t  0.169\t3\t  0\t1388\t    \t                                \t20 00 00.0\t+40 00 00'
    const { records, rejected } = parseVizier(tsv('VII/7A/ldn', LDN, ldn1235, noNumber))
    expect(records).toMatchObject([
      { source: 'VizieR VII/7A', designations: [{ catalog: 'LDN', id: '1235' }], data: { type: 'dark_nebula', ldnOpacity: 6 } },
    ])
    const [record] = records
    if (record.kind !== 'object') throw new Error('oczekiwano obiektu')
    expect(record.data.sizeMajorArcmin).toBeCloseTo(60 * 2 * Math.sqrt(0.037 / Math.PI), 9)
    expect(rejected).toMatchObject([{ line: 8, reason: expect.stringContaining('LDN') as string }])
  })

  it('LDN: kolumna Barn nie łączy z katalogiem Barnarda (decyzja użytkownika)', () => {
    const ldn1630 = '085.6000\t -1.5000\t    1630\t1630\t05 40.0\t-01 30\t205.00\t-16.00\t  5.980\t3\t  0\t1630\t    \t 33                             \t05 42 00.0\t-01 30 00'
    const { records } = parseVizier(tsv('VII/7A/ldn', LDN, ldn1630))
    expect(records).toMatchObject([{ designations: [{ catalog: 'LDN', id: '1630' }], crossIds: [] }])
  })

  it('LBN (VII/9): wymiary Diam1/Diam2, jasność 1–6; kolumna Name nie jest krzyżowym ID', () => {
    const row = '315.4508\t+44.1976\t     373\t 373\t 85.75\t -1.48\t21 00\t+44 00\t 120\t 30\t  0.650\t3\t4\t 47\tNGC 7000\t21 01 48.2\t+44 11 51'
    const { records } = parseVizier(tsv('VII/9/catalog', LBN, row))
    expect(records).toMatchObject([
      {
        source: 'VizieR VII/9',
        designations: [{ catalog: 'LBN', id: '373' }],
        crossIds: [],
        data: { type: 'emission_nebula', sizeMajorArcmin: 120, sizeMinorArcmin: 30, lbnBrightness: 4 },
      },
    ])
  })

  it('VdB (VII/21): refleksyjna, jasność gwiazdy, rozmiar = 2 × większy promień', () => {
    const row =
      '319.1097028\t+68.2601550\t     141\t141\t \tBD+67 1300\t      \t  \t         \t 9.40\t \tI     \tF   \tR   \tWk   \t  1.7\t \t  4.2\t \tSimbad\t319.10970\t+68.26015\t105.0\t 13.2'
    const { records } = parseVizier(tsv('VII/21/catalog', VDB, row))
    expect(records).toMatchObject([
      {
        source: 'VizieR VII/21',
        designations: [{ catalog: 'VdB', id: '141' }],
        data: { type: 'reflection_nebula', vdbStarMagV: 9.4, sizeMajorArcmin: 8.4, sizeMinorArcmin: null },
      },
    ])
  })

  it('Barnard (VII/220A): tylko tabela barnard z odpowiedzi z dwiema tabelami; przyrostek „a” małą literą', () => {
    const barnard = tsv(
      'VII/220A/barnard',
      BARNARD,
      '085.2206\t -2.4658\t      33\t 33 \t05 34 36\t-02 32\t  4.0\t05 40 52.9\t-02 27 57',
      '251.1878\t-40.3368\t      45\t 44a\t16 36 08\t-40 06\t  5.0\t16 44 45.1\t-40 20 13',
    )
    const notes = tsv('VII/220A/notes', 'recno\tBarn\tText', '       1\t   1\tNotatka')
    const { records, rejected } = parseVizier(barnard + notes)
    expect(rejected).toEqual([])
    expect(records).toMatchObject([
      { source: 'VizieR VII/220A', designations: [{ catalog: 'B', id: '33' }], data: { type: 'dark_nebula', sizeMajorArcmin: 4 } },
      { designations: [{ catalog: 'B', id: '44a' }] },
    ])
  })

  it('Green (VII/297): SNR, oba wymiary, nazwy z kolumny Names', () => {
    const crab =
      '083.6292\t+22.0167\t     174\tG184.6-05.8\t05 34 31\t+22 01\t  7.0\t  5.0\t \tF \t \t 900.0\t \t 0.30\t  \tCrab Nebula, 3C144, SN1054\tSimbad'
    const simeis =
      '084.7500\t+27.8333\t     171\tG180.0-01.7\t05 39 00\t+27 50\t180.0\t     \t \tS \t \t  65.0\t \t     \tv \tS147                      \tSimbad'
    const { records } = parseVizier(tsv('VII/297/snrs', GREEN, crab, simeis))
    expect(records).toMatchObject([
      {
        source: 'VizieR VII/297',
        designations: [{ catalog: 'SNR-G', id: 'G184.6-05.8' }],
        commonNames: ['Crab Nebula', '3C144', 'SN1054'],
        data: { type: 'supernova_remnant', sizeMajorArcmin: 7, sizeMinorArcmin: 5 },
      },
      { designations: [{ catalog: 'SNR-G', id: 'G180.0-01.7' }], commonNames: ['S147'], data: { sizeMajorArcmin: 180, sizeMinorArcmin: null } },
    ])
  })

  it('nieobsługiwana tabela albo brak wymaganej kolumny → odrzucenie z przyczyną', () => {
    expect(parseVizier(tsv('I/239/hip_main', 'HIP\tVmag', '1\t9.1')).rejected).toMatchObject([
      { reason: expect.stringContaining('I/239/hip_main') as string },
    ])
    expect(parseVizier(tsv('VII/20/catalog', '_RAJ2000\t_DEJ2000\tSh2', '1\t2\t3')).rejected).toMatchObject([
      { reason: expect.stringContaining('Diam') as string },
    ])
  })
})
