// Odległości obiektów przy budowie katalogu (etap `catalog`): deterministyczny łańcuch źródeł według rekomendacji
// pilotażu 6.11.2026 i kontrola tożsamości z SIMBAD. Czysta logika bez sieci i plików (testy w src/lib).
//   gromady: Hunt & Reffert 2023 (Gaia DR3), galaktyki: Cosmicflows-4, bez niego z (SIMBAD), mgławice ciemne:
//   linie widzenia Zucker i in. 2020, pozostałości po supernowych: Ranasinghe & Leahy 2022, na końcu Wikidata
//   (niezweryfikowane). Gwiazda oświetlająca (van den Bergh 1966)
//   trafia do katalogu tylko jako pozycja: odległość daje dopiero gwiazda Gaia z pola zdjęcia.
import { hasDistance, redshiftDistance, simbadId, type DistanceScope } from '../src/lib/distance.ts'

const LY_PER_PC = 3.26156
const DEG = Math.PI / 180

export function separationDeg(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const s = Math.sin((dec2 - dec1) * DEG / 2) ** 2 + Math.cos(dec1 * DEG) * Math.cos(dec2 * DEG) * Math.sin((ra2 - ra1) * DEG / 2) ** 2
  return 2 * Math.asin(Math.min(1, Math.sqrt(s))) / DEG
}

/** Tabela VizieR w formacie asu-tsv: komentarze „#”, nagłówek, jednostki, kreski, dane. */
export function parseVizierTsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line && !line.startsWith('#'))
  const head = lines[0]?.split('\t').map((h) => h.trim()) ?? []
  return lines.slice(3).map((line) => {
    const cells = line.split('\t')
    return Object.fromEntries(head.map((name, i) => [name, (cells[i] ?? '').trim()]))
  })
}

const num = (value: string | undefined) => value === undefined || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null

/** Obiekt katalogu do ustalenia odległości. */
export interface Entry {
  /** Oznaczenia: pierwsze główne. */
  designations: string[]
  type: string
  raDeg: number
  decDeg: number
  majArcmin: number
  /** V gwiazdy oświetlającej (tylko vdB). */
  vdbStarMagV: number | null
}

export interface SimbadObject { mainId: string; otype: string; raDeg: number; decDeg: number; z: number | null; zQual: string; nbref: number }

/** Klucz porównania identyfikatorów SIMBAD (SIMBAD wyrównuje spacje: „NGC  5194”). */
export const simbadKey = (id: string) => id.toUpperCase().replace(/\s+/g, ' ').trim()

export function parseSimbadIdents(json: string): Map<string, SimbadObject> {
  const body = JSON.parse(json) as { metadata: { name: string }[]; data: unknown[][] }
  const names = body.metadata.map((m) => m.name)
  const get = (row: unknown[], name: string) => row[names.indexOf(name)]
  return new Map(body.data.map((row) => [simbadKey(String(get(row, 'id'))), {
    mainId: String(get(row, 'main_id')).replace(/\s+/g, ' ').trim(), otype: String(get(row, 'otype') ?? ''),
    raDeg: Number(get(row, 'ra')), decDeg: Number(get(row, 'dec')),
    z: typeof get(row, 'rvz_redshift') === 'number' ? get(row, 'rvz_redshift') as number : null, zQual: String(get(row, 'rvz_qual') ?? ''),
    nbref: Number(get(row, 'nbref') ?? 0),
  }]))
}

/** Odległość kątowa pozycji katalogu od pozycji SIMBAD, powyżej której tożsamość jest nierozstrzygnięta
 *  (Sh2-277: 0,67°, LBN 773 → IC 336: 1,56°). Próg bezwzględny: duże obiekty nie mogą „wchłonąć” cudzej pozycji. */
export const IDENTITY_LIMIT_DEG = 0.25

export type Identity = {
  verdict: 'ok' | 'missing' | 'position'
  mainId: string
  otype: string
  sepDeg: number | null
  /** Aliasy należące w SIMBAD do innego obiektu daleko od pozycji katalogu: bez nich szukamy odległości. */
  foreignAliases: { alias: string; mainId: string; sepDeg: number }[]
  /** Rozbieżność klas (np. mgławica emisyjna w aplikacji, refleksyjna w SIMBAD). */
  typeNote: string
}

const GALAXY_OTYPES = /^(G|GiC|GiG|GiP|BiC|IG|PaG|SBG|SyG|Sy1|Sy2|AGN|LIN|EmG|H2G|LSB|bCG|rG|QSO|BLL|Bla|LeG|GrG|CGG|ClG|PoG|G\?|AG\?)$/
function typeClass(otype: string): string {
  if (GALAXY_OTYPES.test(otype)) return 'galaktyka'
  if (otype === 'RNe') return 'mgławica refleksyjna'
  if (otype === 'DNe' || otype === 'MoC' || otype === 'Cld' || otype === 'glb') return 'mgławica ciemna'
  if (otype === 'HII' || otype === 'GNe' || otype === 'ISM' || otype === 'bub' || otype === 'SFR' || otype === 'Neb' || otype === 'EmO') return 'mgławica'
  if (otype === 'OpC' || otype === 'Cl*' || otype === 'As*' || otype === 'GlC' || otype === 'C?*' || otype === 'MGr') return 'gromada'
  if (otype === 'PN' || otype === 'PN?') return 'mgławica planetarna'
  if (otype === 'SNR' || otype === 'SR?') return 'pozostałość po supernowej'
  if (otype.includes('*')) return 'gwiazda'
  return ''
}
const APP_CLASS: Record<string, string[]> = {
  G: ['galaktyka'], GG: ['galaktyka'], EN: ['mgławica'], RN: ['mgławica refleksyjna', 'gwiazda', 'mgławica'], DN: ['mgławica ciemna', 'mgławica'],
  PN: ['mgławica planetarna'], SNR: ['pozostałość po supernowej', 'mgławica'], OC: ['gromada'], GC: ['gromada'], CN: ['gromada', 'mgławica'],
}

export function checkIdentity(entry: Entry, simbad: Map<string, SimbadObject>): Identity {
  const lookup = (designation: string) => { const id = simbadId(designation); return id ? simbad.get(simbadKey(id)) : undefined }
  const primary = lookup(entry.designations[0])
  const foreignAliases = entry.designations.slice(1).flatMap((alias) => {
    const hit = lookup(alias)
    if (!hit || (primary && hit.mainId === primary.mainId)) return []
    const sepDeg = separationDeg(entry.raDeg, entry.decDeg, hit.raDeg, hit.decDeg)
    return sepDeg > IDENTITY_LIMIT_DEG ? [{ alias, mainId: hit.mainId, sepDeg }] : []
  })
  if (!primary) return { verdict: 'missing', mainId: '', otype: '', sepDeg: null, foreignAliases, typeNote: '' }
  const sepDeg = separationDeg(entry.raDeg, entry.decDeg, primary.raDeg, primary.decDeg)
  const cls = typeClass(primary.otype)
  const typeNote = cls && APP_CLASS[entry.type] && !APP_CLASS[entry.type].includes(cls) ? `${entry.type} w aplikacji, ${primary.otype} (${cls}) w SIMBAD` : ''
  return { verdict: sepDeg > IDENTITY_LIMIT_DEG ? 'position' : 'ok', mainId: primary.mainId, otype: primary.otype, sepDeg, foreignAliases, typeNote }
}

/** Wynik łańcucha: wartość w lś, 1σ (null: nieznana) i klucz tabeli źródeł. */
export interface Choice { ly: number; sigmaLy: number | null; source: SourceKey }
export interface SourceKey { scope: DistanceScope; method: string; source: string; ref: string; verified: boolean }

export const HR23: Omit<SourceKey, 'scope'> = { method: 'paralaksy Gaia DR3 członków gromady', source: 'Hunt & Reffert 2023, A&A 673, A114', ref: '2023A&A...673A.114H', verified: true }
const CF4 = { source: 'Tully i in. 2023, ApJ 944, 94 (Cosmicflows-4)', ref: '2023ApJ...944...94T' }
const ZUCKER: SourceKey = { scope: 'cloud', method: 'linie widzenia: skok ekstynkcji pyłu (Gaia DR2)', source: 'Zucker i in. 2020, A&A 633, A51', ref: '2020A&A...633A..51Z', verified: true }
const REDSHIFT: SourceKey = { scope: 'redshift', method: 'z (SIMBAD), układ CMB, H₀ = 70 (oszacowanie pośrednie)', source: 'SIMBAD (przesunięcie ku czerwieni)', ref: '', verified: true }
export const WIKIDATA: SourceKey = { scope: 'object', method: 'Wikidata, niezweryfikowane', source: 'Wikidata (P2583)', ref: '', verified: false }

export interface Hr23Cluster { names: string[]; raDeg: number; decDeg: number; rtDeg: number; d16: number; d50: number; d84: number }

/** Gromady Hunt & Reffert 2023: typ o (otwarta) i g (kulista), CST ≥ 5 (wiarygodne wykrycie). */
export function parseHr23(text: string): Hr23Cluster[] {
  return parseVizierTsv(text).flatMap((row) => {
    const [ra, dec, rt, d16, d50, d84, cst] = ['RA_ICRS', 'DE_ICRS', 'rt', 'dist16', 'dist50', 'dist84', 'CST'].map((k) => num(row[k]))
    if (!['o', 'g'].includes(row.Type) || cst === null || cst < 5 || ra === null || dec === null || d16 === null || d50 === null || d84 === null) return []
    return [{ names: [row.Name, ...row.AllNames.split(',')].filter(Boolean), raDeg: ra, decDeg: dec, rtDeg: rt ?? 0, d16, d50, d84 }]
  })
}

/** Nazwa gromady do porównania: „Melotte_22” i „Mel 22” → „MEL22”, „NGC_2632” → „NGC2632”. */
export function clusterKey(name: string): string {
  return name.toUpperCase().replace(/^MELOTTE/, 'MEL').replace(/^COLLINDER/, 'CR').replace(/^TRUMPLER/, 'TR').replace(/[\s_-]+/g, '')
}

export interface Cf4Galaxy { raDeg: number; decDeg: number; dm: number; eDm: number; methods: string[] }
const CF4_METHODS: [string, string][] = [['DMmas', 'maser'], ['DMceph', 'cefeidy'], ['DMtrgb', 'TRGB'], ['DMsnIa', 'SN Ia'], ['DMsbf', 'SBF'], ['DMsnII', 'SN II'], ['DMfp', 'płaszczyzna podstawowa'], ['DMtf', 'Tully–Fisher']]

export function parseCf4(text: string): Cf4Galaxy[] {
  return parseVizierTsv(text).flatMap((row) => {
    const [ra, dec, dm, eDm] = ['RAJ2000', 'DEJ2000', 'DM', 'e_DM'].map((k) => num(row[k]))
    if (ra === null || dec === null || dm === null || eDm === null) return []
    return [{ raDeg: ra, decDeg: dec, dm, eDm, methods: CF4_METHODS.filter(([k]) => num(row[k]) !== null).map(([, label]) => label) }]
  })
}

export interface ZuckerLine { raDeg: number; decDeg: number; d16: number; d50: number; d84: number }
export function parseZucker(text: string): ZuckerLine[] {
  return parseVizierTsv(text).flatMap((row) => {
    const [ra, dec, d16, d50, d84] = ['_RA.icrs', '_DE.icrs', 'd16', 'd50', 'd84'].map((k) => num(row[k]))
    return ra === null || dec === null || d16 === null || d50 === null || d84 === null ? [] : [{ raDeg: ra, decDeg: dec, d16, d50, d84 }]
  })
}

/** Galaktyki CF4 dopasowane pozycją (≤ 0,5′, najbliższa; każda galaktyka CF4 najwyżej raz). */
export const CF4_MATCH_DEG = 0.5 / 60
export function matchCf4(entries: Entry[], galaxies: Cf4Galaxy[]): Map<number, Cf4Galaxy> {
  // Siatka 1° po deklinacji i rektascensji: kilkanaście tysięcy galaktyk katalogu × 56 tys. CF4.
  const cells = new Map<string, Cf4Galaxy[]>()
  const cell = (ra: number, dec: number) => `${Math.floor(ra)}:${Math.floor(dec)}`
  for (const g of galaxies) cells.set(cell(g.raDeg, g.decDeg), [...(cells.get(cell(g.raDeg, g.decDeg)) ?? []), g])
  const pairs: { i: number; g: Cf4Galaxy; sep: number }[] = []
  entries.forEach((e, i) => {
    if (e.type !== 'G') return
    for (let dr = -1; dr <= 1; dr++) for (let dd = -1; dd <= 1; dd++) {
      for (const g of cells.get(cell((e.raDeg + dr + 360) % 360, e.decDeg + dd)) ?? []) {
        const sep = separationDeg(e.raDeg, e.decDeg, g.raDeg, g.decDeg)
        if (sep <= CF4_MATCH_DEG) pairs.push({ i, g, sep })
      }
    }
  })
  pairs.sort((a, b) => a.sep - b.sep)
  const used = new Set<Cf4Galaxy>(), result = new Map<number, Cf4Galaxy>()
  for (const { i, g } of pairs) if (!used.has(g) && !result.has(i)) { used.add(g); result.set(i, g) }
  return result
}

export function cf4Choice(g: Cf4Galaxy): Choice {
  const ly = 10 ** (g.dm / 5 + 1) * LY_PER_PC
  // σ odległości z błędu modułu: σ_d/d = ln 10 / 5 · σ_μ.
  return { ly, sigmaLy: ly * Math.LN10 / 5 * g.eDm, source: { scope: 'object', method: `${g.methods.join(' + ') || 'moduł odległości'} (Cosmicflows-4)`, ...CF4, verified: true } }
}

/** Mgławica ciemna: linie widzenia w obrysie (promień ≥ 6′). Linie rozbieżne o > 20 % mediany: bez wartości. */
export function zuckerChoice(e: Entry, lines: ZuckerLine[]): Choice | null {
  const radius = Math.max(e.majArcmin / 2, 6) / 60
  const inside = lines.filter((l) => separationDeg(e.raDeg, e.decDeg, l.raDeg, l.decDeg) <= radius)
  if (!inside.length) return null
  const d = inside.map((l) => l.d50).sort((a, b) => a - b)
  const median = d.length % 2 ? d[(d.length - 1) / 2] : (d[d.length / 2 - 1] + d[d.length / 2]) / 2
  if (d[d.length - 1] - d[0] > 0.2 * median) return null
  // Niepewność: statystyczna (średnia połowa przedziału 16–84) i systematyczna 5 % (Zucker i in. 2019, 2020).
  const stat = Math.sqrt(inside.reduce((s, l) => s + ((l.d84 - l.d16) / 2) ** 2, 0) / inside.length)
  return { ly: median * LY_PER_PC, sigmaLy: Math.hypot(stat, 0.05 * median) * LY_PER_PC, source: ZUCKER }
}

export function redshiftChoice(simbad: SimbadObject | undefined): Choice | null {
  if (!simbad || simbad.z === null || simbad.zQual === 'E') return null
  const d = redshiftDistance(simbad.z, simbad.raDeg, simbad.decDeg)
  return d ? { ly: d.distLy, sigmaLy: d.uncertaintyLy, source: REDSHIFT } : null
}

/** Odległość gromady HR23; niepewność co najmniej 1 % (punkt zerowy paralaks Gaia i głębokość gromady, jak w pilotażu). */
export function hr23Choice(c: Hr23Cluster): Choice {
  return { ly: c.d50 * LY_PER_PC, sigmaLy: Math.max((c.d84 - c.d16) / 2, 0.01 * c.d50) * LY_PER_PC, source: { scope: 'object', ...HR23 } }
}

/** Gromada HR23 obiektu: po nazwie (oznaczenia bez cudzych aliasów), z pozycją w promieniu pływowym (≥ 0,25°). */
export function findHr23(e: Entry, designations: string[], byKey: Map<string, Hr23Cluster>): Hr23Cluster | null {
  if (!['OC', 'GC', 'CN'].includes(e.type)) return null
  for (const d of designations) {
    const c = byKey.get(clusterKey(d))
    if (c && separationDeg(e.raDeg, e.decDeg, c.raDeg, c.decDeg) <= Math.max(c.rtDeg, 0.25)) return c
  }
  return null
}

/** Mgławice NGC/IC, których pozycja leży ≤ 1′ od gwiazdy vdB, dzielą z nią gwiazdę oświetlającą. */
export const ILLUMINATOR_MATCH_DEG = 1 / 60

/** Rozbieżności znane z pilotażu 6.11.2026, których typ SIMBAD nie ujawnia (tylko do przeglądu, bez wpływu na odległość). */
export const KNOWN_DISCREPANCIES = [
  { id: 'NGC 1432', note: 'mgławica refleksyjna (Maia), w aplikacji EN; SIMBAD: HII' },
  { id: 'NGC 1435', note: 'mgławica refleksyjna (Merope), w aplikacji EN; SIMBAD: ISM' },
]

/** Wikidata (niezweryfikowane), gdy łańcuch nic nie dał albo jego pomiar ma σ > 20 % i nie trafiłby do 3D
 *  (decyzja użytkownika 7.11.2026). Bez wartości Wikidata zostaje pomiar, nawet niepewny. */
export function withWikidataFallback(measured: Choice | null, wikidataLy: number | null): Choice | null {
  if (measured && hasDistance({ distLy: measured.ly, uncertaintyLy: measured.sigmaLy })) return measured
  return wikidataLy ? { ly: wikidataLy, sigmaLy: null, source: WIKIDATA } : measured
}

/** Pozostałość po supernowej z Ranasinghe & Leahy 2022 (J/ApJ/940/63/table1, „wiarygodne odległości” 215 SNR). */
export interface Rl22Snr { key: string; raDeg: number; decDeg: number; kpc: number; sigmaKpc: number | null; method: string; revised: boolean }

/** Klucz SNR z oznaczenia Greena: „SNR G116.5+01.1” i „G116.5+1.1” → „116.5+1.1”. */
export function snrKey(designation: string): string | null {
  const m = /G(\d{1,3}(?:\.\d+)?)([+-]\d{1,2}(?:\.\d+)?)/.exec(designation)
  if (!m) return null
  const b = Number(m[2])
  return `${Number(m[1]).toFixed(1)}${b < 0 ? '-' : '+'}${Math.abs(b).toFixed(1)}`
}

const RL22_METHODS: Record<string, string> = {
  'Kinematic distance': 'odległość kinematyczna', 'Optical extinction': 'ekstynkcja optyczna', 'Absorption column': 'kolumna absorpcji',
  'MC association': 'związek z obłokiem molekularnym', GC: 'centrum Galaktyki', Estimation: 'oszacowanie', 'Pulsar association': 'związek z pulsarem',
  'Proper motion + v _shock': 'ruch własny i prędkość fali uderzeniowej', 'Parallax measurement': 'paralaksa', 'CO observations': 'obserwacje CO',
  'Proper motion + v _exp': 'ruch własny i prędkość ekspansji', PWN: 'mgławica wiatru pulsara', 'Sedov estimates': 'model Sedova', 'H II distance': 'odległość obszaru H II',
  'Scutum-Crux arm': 'ramię Tarczy–Krzyża', 'Norma arm': 'ramię Węgielnicy', 'PWN association': 'związek z mgławicą wiatru pulsara',
  'Estimation (z distance)': 'oszacowanie z odległości od płaszczyzny Galaktyki', 'Sagittarius-Carina arm': 'ramię Strzelca–Kila', 'Proper motion': 'ruch własny',
}

/** Odległość zrewidowana przez autorów (Dist ± e_Dist), a bez niej z literatury (Distl1 z błędami albo środek
 *  przedziału Distl1–Distl2). Granice („<”, „>”) pomijamy. */
export function parseRl22(text: string): Rl22Snr[] {
  return parseVizierTsv(text).flatMap((row): Rl22Snr[] => {
    const key = snrKey(row.SNR ?? '')
    const [ra, dec] = [num(row._RA), num(row._DE)]
    if (!key || ra === null || dec === null) return []
    const base = { key, raDeg: ra, decDeg: dec, method: RL22_METHODS[row.Method] ?? row.Method }
    const dist = num(row.Dist)
    if (dist !== null && !row.l_Dist) return [{ ...base, kpc: dist, sigmaKpc: num(row.e_Dist), revised: true }]
    const lo = num(row.Distl1), hi = num(row.Distl2)
    if (lo === null || row.l_Distl1.replace(/[=~]/g, '')) return []
    if (hi !== null) return [{ ...base, kpc: (lo + hi) / 2, sigmaKpc: (hi - lo) / 2, revised: false }]
    const errors = [num(row.e_Distl1), num(row.E_Distl1)].filter((e): e is number => e !== null)
    return [{ ...base, kpc: lo, sigmaKpc: errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : null, revised: false }]
  })
}

/** SNR katalogu po oznaczeniu Greena, z pozycją SIMBAD z tabeli w obrysie (≥ 0,25°). */
export function findRl22(e: Entry, designations: string[], byKey: Map<string, Rl22Snr>): Rl22Snr | null {
  if (e.type !== 'SNR') return null
  for (const d of designations) {
    const key = snrKey(d)
    const snr = key ? byKey.get(key) : undefined
    if (snr && separationDeg(e.raDeg, e.decDeg, snr.raDeg, snr.decDeg) <= Math.max(0.25, e.majArcmin / 120)) return snr
  }
  return null
}

export function rl22Choice(snr: Rl22Snr): Choice {
  return {
    ly: snr.kpc * 1000 * LY_PER_PC, sigmaLy: snr.sigmaKpc === null ? null : snr.sigmaKpc * 1000 * LY_PER_PC,
    source: { scope: 'object', method: `${snr.method || 'metoda niepodana'} (${snr.revised ? 'odległość zrewidowana' : 'z literatury'})`, source: 'Ranasinghe & Leahy 2022, ApJ 940, 63', ref: '2022ApJ...940...63R', verified: true },
  }
}

/** Gwiazda centralna mgławicy planetarnej z Chornay & Walton 2021 (J/A+A/656/A110/tablea1, Gaia EDR3). */
export interface Cw21Pn { png: string; raDeg: number; decDeg: number; radiusDeg: number; pc: number; loPc: number; hiPc: number }

/** Dopasowania wiarygodne (Rel ≥ 0,5, RUWE < 1,4) z odległością łączoną (paralaksa i prior statystyczny). */
export function parseCw21(text: string): Cw21Pn[] {
  return parseVizierTsv(text).flatMap((row): Cw21Pn[] => {
    const [ra, dec, rad, pc, lo, hi, rel, ruwe] = ['pnRAdeg', 'pnDEdeg', 'pnRad', 'rcomb', 'b_rcomb', 'B_rcomb', 'Rel', 'RUWE'].map((k) => num(row[k]))
    if (!row.PNG || ra === null || dec === null || pc === null || lo === null || hi === null || rel === null || rel < 0.5 || (ruwe !== null && ruwe >= 1.4)) return []
    return [{ png: `PN G${row.PNG}`, raDeg: ra, decDeg: dec, radiusDeg: (rad ?? 0) / 3600, pc, loPc: lo, hiPc: hi }]
  })
}

/** Mgławica planetarna katalogu: po oznaczeniu „PN G…”, a bez niego najbliższa pozycja w max(1′, promieniu). */
export function findCw21(e: Entry, designations: string[], pns: Cw21Pn[], byPng: Map<string, Cw21Pn>): Cw21Pn | null {
  if (e.type !== 'PN') return null
  for (const d of designations) { const pn = byPng.get(d); if (pn) return pn }
  let best: { pn: Cw21Pn; sep: number } | null = null
  for (const pn of pns) {
    if (Math.abs(pn.decDeg - e.decDeg) > 0.2) continue
    const sep = separationDeg(e.raDeg, e.decDeg, pn.raDeg, pn.decDeg)
    if (sep <= Math.max(1 / 60, pn.radiusDeg) && (!best || sep < best.sep)) best = { pn, sep }
  }
  return best?.pn ?? null
}

export function cw21Choice(pn: Cw21Pn): Choice {
  return {
    ly: pn.pc * LY_PER_PC, sigmaLy: (pn.hiPc - pn.loPc) / 2 * LY_PER_PC,
    source: { scope: 'object', method: 'paralaksa gwiazdy centralnej Gaia EDR3 z priorem statystycznym', source: 'Chornay & Walton 2021, A&A 656, A110', ref: '2021A&A...656A.110C', verified: true },
  }
}
