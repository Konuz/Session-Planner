// Gromady spoza OpenNGC z katalogu Hunt & Reffert 2023 (VizieR J/A+A/673/A114/clusters): tylko nazwy z katalogów
// optycznych sprzed Gai i odkrycia amatorów; grupy wykryte wyłącznie w danych Gai (HSC, UBC, CWNU, Theia…) pomijamy,
// bo na zdjęciach zwykle ich nie widać. Czysta logika bez sieci (testy w src/lib).
import { clusterKey, parseVizierTsv, separationDeg } from './catalogDistances.ts'

export interface Hr23Entry {
  /** Nazwa główna HR23 i nazwy z kolumny AllNames („Collinder_135”, „Theia_19”), bez powtórzeń. */
  names: string[]
  type: 'o' | 'g'
  raDeg: number
  decDeg: number
  /** Promień obejmujący połowę członków i promień pływowy [°]. */
  r50Deg: number
  rtDeg: number
  /** Spełnia próg klasy CMD (gromady klasyczne wchodzą też bez niego, dopisywane na końcu katalogu). */
  cmdOk: boolean
}

const num = (text: string | undefined) => text && Number.isFinite(Number(text)) ? Number(text) : null

/**
 * Próg jakości autorów: CST ≥ 5 (wiarygodne wykrycie) i mediana klasy CMD > 0,5 (wykres barwa–jasność jak gromady).
 * Gromady z katalogów klasycznych są zwolnione z progu CMD: ich istnienie potwierdzają obserwacje sprzed Gai, a niską
 * klasę dają nierówny pył, młody wiek i mała liczba członków (Berkeley 59 w Sh2-171: 0,09; Melotte 66: 0,498).
 */
export function parseHr23Catalog(text: string): Hr23Entry[] {
  return parseVizierTsv(text).flatMap((row) => {
    const [ra, dec, r50, rt, cst, cmd] = ['RA_ICRS', 'DE_ICRS', 'r50', 'rt', 'CST', 'CMDCl50'].map((k) => num(row[k]))
    if ((row.Type !== 'o' && row.Type !== 'g') || cst === null || cst < 5 || ra === null || dec === null || r50 === null) return []
    const names = [...new Set([row.Name, ...row.AllNames.split(',')].filter(Boolean))]
    const cmdOk = cmd !== null && cmd > 0.5
    if (!cmdOk && !names.some(isClassic)) return []
    return [{ names, cmdOk, type: row.Type === 'g' ? 'g' as const : 'o' as const, raDeg: ra, decDeg: dec, r50Deg: r50, rtDeg: rt ?? 0 }]
  })
}

/** Prefiks HR23 → nazwa wyświetlana (domyślnie sam prefiks) i skrót do wyszukiwania. */
const CLASSIC: Record<string, { display?: string; short?: string }> = {
  // Katalogi optyczne sprzed Gai. Bez skrótów „Do” i „BH”: „DO 5” to w SIMBAD gwiazda, „BH 5” inny obiekt. Bez ESO:
  // HR23 pisze „ESO 360-12” bez „SC”, a w SIMBAD to oznaczenie galaktyki.
  Collinder: { short: 'Cr' }, Trumpler: { short: 'Tr' }, Berkeley: { short: 'Be' }, Ruprecht: { short: 'Ru' }, Czernik: { short: 'Cz' },
  Melotte: { display: 'Mel', short: 'Melotte' }, BH: { display: 'vdBH' }, Pal: { display: 'Palomar', short: 'Pal' }, Palomar: { short: 'Pal' },
  Stock: {}, King: {}, Dolidze: {}, vdBergh: {}, Pismis: {}, 'Pismis-Moreno': {}, Haffner: {}, Basel: {}, Bochum: {}, Lynga: {}, Hogg: {},
  Loden: {}, Roslund: {}, Harvard: {}, Terzan: {}, Tombaugh: {}, Waterloo: {}, Antalova: {}, Markarian: {}, Westerlund: {}, Feinstein: {},
  Stephenson: {}, Blanco: {}, Biurakan: {}, Barkhatova: {}, Moffat: {}, 'Havlen-Moffat': {}, Mayer: {}, Muzzio: {}, Danks: {},
  'Aveni-Hunter': {}, Auner: {}, 'Andrews-Lindsay': {}, Turner: {}, Pfleiderer: {}, Sher: {}, Negueruela: {},
}
// Odkrycia amatorów (przeglądy DSS i obserwacje wizualne): z progiem CMD.
const AMATEUR: Record<string, { display?: string; short?: string }> = {
  Teutsch: {}, Alessi: {}, 'Alessi-Teutsch': {}, Juchert: {}, 'Juchert-Saloran': {}, Saloranta: {}, Kronberger: {}, Casado: {},
  'Casado-Alessi': {}, Skiff: {}, Patchick: {}, Ferrero: {}, Riddle: {}, Streicher: {}, Renou: {}, Pozzo: {}, 'Can-Battlo': {}, Archinal: {}, Steine: {},
}
const CATALOGS = { ...CLASSIC, ...AMATEUR }

const prefixOf = (raw: string) => /^_?([A-Za-z]+(?:-[A-Za-z]+)*)_/.exec(raw.trim())?.[1] ?? ''
/** Nazwa HR23 z katalogu klasycznego („Berkeley_59”). */
export const isClassic = (raw: string) => Object.hasOwn(CLASSIC, prefixOf(raw))

/** Nazwa HR23 („Collinder_135”, „_ESO_390-6”) w zapisie aplikacji; null dla katalogów spoza listy. */
export function clusterName(raw: string): { display: string; short: string | null } | null {
  const m = /^_?([A-Za-z]+(?:-[A-Za-z]+)*)_(.+)$/.exec(raw.trim())
  const spec = m && Object.hasOwn(CATALOGS, m[1]) ? CATALOGS[m[1]] : null
  if (!m || !spec) return null
  const rest = m[2].replace(/_/g, ' ')
  return { display: `${spec.display ?? m[1]} ${rest}`, short: spec.short ? `${spec.short} ${rest}` : null }
}

/** Skrót („Cr 135”, „Melotte 25”) → nazwa wyświetlana („Collinder 135”, „Mel 25”); inne nazwy bez zmian. */
export function displayOf(alias: string): string {
  for (const [prefix, spec] of Object.entries(CATALOGS)) {
    if (spec.short && alias.startsWith(`${spec.short} `)) return `${spec.display ?? prefix}${alias.slice(spec.short.length)}`
  }
  return alias
}

/** Nazwa z pozycją („Teutsch J1037.3+6034”) ze znakiem deklinacji niezgodnym z pozycją gromady to literówka w AllNames. */
function signOk(display: string, decDeg: number): boolean {
  const m = /J\d{4}(?:\.\d+)?([+-])\d/.exec(display)
  return !m || (m[1] === '-') === (decDeg < 0)
}

/** Klucz porównania z oznaczeniami katalogu: „H 5” to Harvard 5, „ESO 390-006” to „ESO 390-6”, „Pal 5” to Palomar 5. */
function nameKey(designation: string): string {
  const eso = /^_?ESO[\s_]+0*(\d+)-0*(\d+)$/.exec(designation.trim())
  const base = eso ? `ESO ${eso[1]}-${eso[2]}` : designation.trim().replace(/^_/, '')
  return clusterKey(base).replace(/^HARVARD/, 'H').replace(/^PALOMAR/, 'PAL')
}
const exactKey = (designation: string) => designation.toUpperCase().replace(/\s+/g, '')

export interface KnownObject { designations: string[]; type: string; raDeg: number; decDeg: number; majArcmin: number }
export interface NewCluster { primary: string; aliases: string[]; type: 'OC' | 'GC'; raDeg: number; decDeg: number; diamArcmin: number }
export interface ClusterPlan {
  /** Nowe obiekty w kolejności HR23. */
  added: NewCluster[]
  /** Indeks obiektu katalogu → nowe aliasy (HR23 łączy je z jego oznaczeniem albo SIMBAD potwierdził tożsamość). */
  aliases: Map<number, string[]>
  /** Gromady na pozycji gromady katalogu bez wspólnej nazwy (do rozstrzygnięcia w SIMBAD). */
  nearby: { cluster: NewCluster; known: number; sepDeg: number }[]
}

const CLUSTER_TYPES = ['OC', 'GC', 'CN']
const r1 = (v: number) => Math.round(v * 10) / 10

/**
 * Gromady HR23 z nazwą z listy katalogów. Wspólna nazwa z obiektem katalogu w promieniu pływowym (≥ 0,25°, jak przy
 * odległościach) daje temu obiektowi aliasy. Gromada katalogu w odległości ≤ 2′ albo ≤ r50/2 i w jej własnym promieniu
 * to przypadek do rozstrzygnięcia: `same` zwraca true (ten sam obiekt: aliasy), false (inny: nowa gromada) albo null
 * (nie wiadomo: pomijamy, żeby nie zdublować obiektu). Średnica nowej gromady to 2·r50 (połowa członków w środku).
 */
export function planClusters(clusters: Hr23Entry[], known: KnownObject[], same: (cluster: NewCluster, known: number) => boolean | null = () => null, owners: Hr23Entry[] = clusters): ClusterPlan {
  const byKey = new Map<string, number[]>()
  known.forEach((k, i) => { for (const d of k.designations) byKey.set(nameKey(d), [...(byKey.get(nameKey(d)) ?? []), i]) })
  const taken = new Set(known.flatMap((k) => k.designations.map(exactKey)))
  const knownClusters = known.flatMap((k, i) => CLUSTER_TYPES.includes(k.type) ? [i] : [])
  const plan: ClusterPlan = { added: [], aliases: new Map(), nearby: [] }
  const addAliases = (i: number, names: string[]) => {
    const fresh = names.filter((n) => !taken.has(exactKey(n)))
    fresh.forEach((n) => taken.add(exactKey(n)))
    if (fresh.length) plan.aliases.set(i, [...(plan.aliases.get(i) ?? []), ...fresh])
  }
  // Nazwa należy do gromady, w której HR23 podaje ją jako główną; w AllNames innej gromady (podgrupa, sąsiad) jej nie bierzemy.
  const owner = new Map<string, Hr23Entry>()
  for (const c of owners) { const n = clusterName(c.names[0]); if (n && !owner.has(n.display)) owner.set(n.display, c) }
  for (const c of clusters) {
    // Bez powtórzeń różniących się tylko wielkością liter („Basel 11A” i „Basel_11a” w AllNames).
    const names = c.names.flatMap((raw) => {
      const n = clusterName(raw)
      if (!n || (owner.get(n.display) ?? c) !== c || !signOk(n.display, c.decDeg)) return []
      return [n.display, ...(n.short ? [n.short] : [])]
    }).filter((name, i, all) => all.findIndex((other) => other.toUpperCase() === name.toUpperCase()) === i)
    const sep = (i: number) => separationDeg(c.raDeg, c.decDeg, known[i].raDeg, known[i].decDeg)
    const byName = c.names.flatMap((raw) => byKey.get(nameKey(raw)) ?? []).find((i) => sep(i) <= Math.max(c.rtDeg, 0.25))
    if (byName !== undefined) { addAliases(byName, names); continue }
    if (!names.length) continue
    const cluster: NewCluster = { primary: names[0], aliases: names.slice(1), type: c.type === 'g' ? 'GC' : 'OC', raDeg: c.raDeg, decDeg: c.decDeg, diamArcmin: r1(c.r50Deg * 120) }
    const near = knownClusters.map((i) => ({ i, s: sep(i) }))
      .filter(({ i, s }) => s <= 2 / 60 || (s <= c.r50Deg / 2 && s <= known[i].majArcmin / 120))
      .sort((a, b) => a.s - b.s)[0]
    if (near) {
      plan.nearby.push({ cluster, known: near.i, sepDeg: near.s })
      const verdict = same(cluster, near.i)
      if (verdict === true) addAliases(near.i, names)
      if (verdict !== false) continue
    }
    if (taken.has(exactKey(cluster.primary))) continue
    cluster.aliases = cluster.aliases.filter((n) => !taken.has(exactKey(n)))
    names.forEach((n) => taken.add(exactKey(n)))
    plan.added.push(cluster)
  }
  return plan
}
