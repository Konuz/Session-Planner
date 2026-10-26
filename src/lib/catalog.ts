// Katalog obiektów: wczytanie zwartego pliku public/data/catalog.json, typy, filtry i wyszukiwanie.

export type ObjectType = 'G' | 'GG' | 'EN' | 'RN' | 'DN' | 'PN' | 'SNR' | 'OC' | 'GC' | 'CN' | 'X'

export interface DSO {
  /** Indeks w katalogu (stały w obrębie wersji danych). */
  i: number
  id: string
  aliases: string[]
  namePl: string
  namesEn: string[]
  type: ObjectType
  raDeg: number
  decDeg: number
  majArcmin: number
  minArcmin: number
  paDeg: number | null
  mag: number | null
  sb: number | null
  con: string
  distLy: number | null
  wikiPl: string
  wikiEn: string
  /** Katalogi, w których obiekt występuje (M, NGC, IC, Sh2, LDN, LBN, B, vdB, SNR, C). */
  catalogs: string[]
  /** Tekst do wyszukiwania (małe litery, bez spacji). */
  search: string
}

export const TYPE_INFO: Record<ObjectType, { label: string; short: string; color: string }> = {
  G: { label: 'Galaktyka', short: 'Galaktyka', color: 'var(--t-galaxy)' },
  GG: { label: 'Grupa galaktyk', short: 'Grupa gal.', color: 'var(--t-galaxy)' },
  EN: { label: 'Mgławica emisyjna', short: 'Emisyjna', color: 'var(--t-emission)' },
  RN: { label: 'Mgławica refleksyjna', short: 'Refleksyjna', color: 'var(--t-reflection)' },
  DN: { label: 'Mgławica ciemna', short: 'Ciemna', color: 'var(--t-dark)' },
  PN: { label: 'Mgławica planetarna', short: 'Planetarna', color: 'var(--t-planetary)' },
  SNR: { label: 'Pozostałość po supernowej', short: 'Pozost. SN', color: 'var(--t-snr)' },
  OC: { label: 'Gromada otwarta', short: 'Gr. otwarta', color: 'var(--t-cluster)' },
  GC: { label: 'Gromada kulista', short: 'Gr. kulista', color: 'var(--t-cluster)' },
  CN: { label: 'Gromada z mgławicą', short: 'Gr. + mgławica', color: 'var(--t-emission)' },
  X: { label: 'Inny obiekt', short: 'Inny', color: 'var(--text-dim)' },
}

export const CATALOGS: { id: string; label: string; title: string }[] = [
  { id: 'M', label: 'M', title: 'Messier' },
  { id: 'NGC', label: 'NGC', title: 'New General Catalogue' },
  { id: 'IC', label: 'IC', title: 'Index Catalogue' },
  { id: 'Sh2', label: 'Sh2', title: 'Sharpless (obszary HII)' },
  { id: 'LBN', label: 'LBN', title: 'Lynds: mgławice jasne' },
  { id: 'LDN', label: 'LDN', title: 'Lynds: mgławice ciemne' },
  { id: 'B', label: 'B', title: 'Barnard (mgławice ciemne)' },
  { id: 'vdB', label: 'vdB', title: 'van den Bergh (refleksyjne)' },
  { id: 'SNR', label: 'SNR', title: 'Green: pozostałości po supernowych' },
]

function catalogOf(designation: string): string | null {
  if (/^M \d/.test(designation)) return 'M'
  if (/^NGC /.test(designation)) return 'NGC'
  if (/^IC /.test(designation)) return 'IC'
  if (/^C \d/.test(designation)) return 'C'
  if (/^Sh2-/.test(designation)) return 'Sh2'
  if (/^LBN /.test(designation)) return 'LBN'
  if (/^LDN /.test(designation)) return 'LDN'
  if (/^B \d/.test(designation)) return 'B'
  if (/^vdB /.test(designation)) return 'vdB'
  if (/^SNR /.test(designation)) return 'SNR'
  return null
}

type Row = [string, string, string, string, ObjectType, number, number, number, number, number, number, number, string, number, string, string]

export function parseCatalog(rows: Row[]): DSO[] {
  return rows.map((r, i) => {
    const aliases = r[1] ? r[1].split('|') : []
    const namesEn = r[3] ? r[3].split('|') : []
    const all = [r[0], ...aliases]
    const catalogs = [...new Set(all.map(catalogOf).filter((c): c is string => c !== null))]
    return {
      i,
      id: r[0],
      aliases,
      namePl: r[2],
      namesEn,
      type: r[4],
      raDeg: r[5],
      decDeg: r[6],
      majArcmin: r[7],
      minArcmin: r[8] || r[7],
      paDeg: r[9] < 0 ? null : r[9],
      mag: r[10] >= 99 ? null : r[10],
      sb: r[11] >= 99 ? null : r[11],
      con: r[12],
      distLy: r[13] || null,
      wikiPl: r[14],
      wikiEn: r[15],
      catalogs,
      search: normalizeQuery([...all, r[2], ...namesEn].join(' ')),
    }
  })
}

/** Małe litery, bez znaków diakrytycznych i bez spacji („M 51” → „m51”, „Wir” → „wir”). */
export function normalizeQuery(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[\s_-]+/g, '')
}

/** Nazwa do wyświetlania: polska, potem angielska. */
export function displayName(o: DSO): string {
  return o.namePl || o.namesEn[0] || ''
}

/** Najmniejsza głębia adnotacji kopuły, przy której obiekt dostaje elipsę: 1: NGC/IC/Caldwell (i Messier),
 *  2: Sharpless, Barnard, van den Bergh, 3: pozostałe (LBN, LDN, SNR). Liczy się najpopularniejszy katalog obiektu. */
export function annotationDepthOf(o: Pick<DSO, 'catalogs'>): 1 | 2 | 3 {
  if (o.catalogs.some((c) => c === 'M' || c === 'NGC' || c === 'IC' || c === 'C')) return 1
  if (o.catalogs.some((c) => c === 'Sh2' || c === 'B' || c === 'vdB')) return 2
  return 3
}

export interface CatalogFilter {
  query: string
  catalogs: string[]
  types: ObjectType[]
  constellation: string
  maxMag: number | null
  minSizeArcmin: number
  maxSizeArcmin: number | null
}

export const EMPTY_FILTER: CatalogFilter = {
  query: '',
  catalogs: [],
  types: [],
  constellation: '',
  maxMag: null,
  minSizeArcmin: 0,
  maxSizeArcmin: null,
}

export function matchesFilter(o: DSO, f: CatalogFilter): boolean {
  if (f.catalogs.length && !f.catalogs.some((c) => o.catalogs.includes(c))) return false
  if (f.types.length && !f.types.includes(o.type)) return false
  if (f.constellation && o.con !== f.constellation) return false
  if (f.maxMag !== null && (o.mag === null || o.mag > f.maxMag)) return false
  if (o.majArcmin < f.minSizeArcmin) return false
  if (f.maxSizeArcmin !== null && o.majArcmin > f.maxSizeArcmin) return false
  if (f.query) {
    const q = normalizeQuery(f.query)
    if (q && !o.search.includes(q)) return false
  }
  return true
}

/** Ranking wyszukiwania: dokładne oznaczenie, początek oznaczenia, potem nazwa. */
export function searchScore(o: DSO, query: string): number {
  const q = normalizeQuery(query)
  const id = normalizeQuery(o.id)
  if (id === q) return 0
  if ([o.id, ...o.aliases].some((a) => normalizeQuery(a) === q)) return 1
  if (id.startsWith(q)) return 2 + id.length / 100
  if (normalizeQuery(o.namePl).startsWith(q)) return 3
  return 5
}

export async function loadCatalog(): Promise<DSO[]> {
  const res = await fetch('/data/catalog.json')
  if (!res.ok) throw new Error(`Nie udało się wczytać katalogu (HTTP ${res.status})`)
  const data = (await res.json()) as { rows: Row[] }
  return parseCatalog(data.rows)
}
