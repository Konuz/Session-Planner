// Obiekty dopisane ręcznie: odkrycia amatorów spoza katalogów w VizieR. Każdy ma źródło pozycji i rozmiaru
// (sprawdzone 15.11.2026); odległość tylko tam, gdzie podaje ją publikacja.

export interface ManualObject {
  primary: string
  aliases: string[]
  commonNames: string[]
  type: 'PN' | 'EN'
  raDeg: number
  decDeg: number
  majArcmin: number
  minArcmin: number | null
  paDeg: number | null
  /** Skąd pozycja i rozmiar. */
  source: string
  distance?: { pc: number; sigmaPc: number | null; method: string; source: string; ref: string }
}

export const MANUAL_OBJECTS: ManualObject[] = [
  {
    primary: 'Zie 1', aliases: [], commonNames: ['Dreamcatcher Nebula'], type: 'PN',
    // Środek: gwiazda centralna PG 0038+199 (SIMBAD); średnica 41′ z tabeli kandydatów Ogle i in. 2025.
    raDeg: 10.39724, decDeg: 20.15470, majArcmin: 41, minArcmin: null, paDeg: null,
    source: 'SIMBAD (PG 0038+199); Ogle i in. 2025, arXiv:2507.15834',
    distance: { pc: 400, sigmaPc: null, method: 'paralaksa Gaia gwiazdy centralnej PG 0038+199', source: 'Ogle i in. 2025, arXiv:2507.15834', ref: '2025arXiv250715834O' },
  },
  {
    primary: 'StDr 56', aliases: ['PN G141.8-29.9'], commonNames: ['Goblet of Fire Nebula'], type: 'PN',
    raDeg: 31.82254, decDeg: 30.08664, majArcmin: 44, minArcmin: 36, paDeg: null,
    source: 'planetarynebulae.net (katalog kandydatów PN odkrytych przez amatorów), StDr 56',
  },
  {
    primary: 'Ou 4', aliases: [], commonNames: ['Squid Nebula'], type: 'EN',
    // W SIMBAD „NAME PN Ou 4” wskazuje gwiazdę HD 202214 w środku wypływu; wymiary 69′ × 20′.
    raDeg: 317.95099, decDeg: 59.98661, majArcmin: 69, minArcmin: 20, paDeg: null,
    source: 'SIMBAD (NAME PN Ou 4)',
  },
  {
    primary: 'HFG 2', aliases: ['FeGu 248-5'], commonNames: [], type: 'PN',
    raDeg: 115.59833, decDeg: -32.79583, majArcmin: 3.0, minArcmin: 2.6, paDeg: null,
    source: 'SIMBAD (PN HFG 2 = NAME FEGU 248-5)',
  },
  {
    primary: 'Simeis 57', aliases: ['Sim 57', 'DWB 111', 'DWB 119', 'HS 191'], commonNames: ['Propeller Nebula'], type: 'EN',
    // Pozycja SIMBAD (SIM 57); rozmiar „~20′” i odległość gwiazdy wzbudzającej WR 140 z Oudshoorn i in. 2021.
    raDeg: 304.07, decDeg: 43.73833, majArcmin: 20, minArcmin: null, paDeg: null,
    source: 'SIMBAD (SIM 57); Oudshoorn i in. 2021, A&A 650, A171',
    distance: { pc: 1700, sigmaPc: 500, method: 'odległość gwiazdy wzbudzającej WR 140 (HD 193793)', source: 'Oudshoorn i in. 2021, A&A 650, A171', ref: '2021A&A...650A.171O' },
  },
  {
    primary: 'SDSO 1', aliases: [], commonNames: ['Strottner-Drechsler-Sainty Object 1'], type: 'EN',
    // Pozycja przybliżona z opisu odkrycia: środek ≃1,2° na SE (PA 135°) od jądra M 31; 1,5° × 0,45°, PA 45–55°.
    // Natura sporna (Ogle i in. 2025: stara PN gwiazdy EG And; Lumbreras-Calle i in. 2025: włókno gazu w Drodze Mlecznej),
    // więc bez odległości.
    raDeg: 11.799, decDeg: 40.415, majArcmin: 90, minArcmin: 27, paDeg: 50,
    source: 'Drechsler i in. 2023, RNAAS 7, 1 (pozycja przybliżona)',
  },
]

/**
 * Gwiazdy WR, których mgławica ma w katalogu oznaczenie (Toalá i in. 2015, A&A 578, A66, tabela 1): numer WR jako alias
 * mgławicy, bo pod nim fotografowie jej szukają. Mgławice „Anon” (np. wokół WR 134) i G320.5−1.4, G2.4+1.4 bez wiersza.
 */
export const WR_NEBULAE: [wr: string, nebula: string][] = [
  ['WR 6', 'Sh2-308'], ['WR 7', 'NGC 2359'], ['WR 18', 'NGC 3199'], ['WR 40', 'RCW 58'], ['WR 55', 'RCW 78'], ['WR 75', 'RCW 104'],
  ['WR 85', 'RCW 118'], ['WR 86', 'RCW 130'], ['WR 113', 'RCW 167'], ['WR 124', 'Sh2-80'], ['WR 136', 'NGC 6888'],
]
