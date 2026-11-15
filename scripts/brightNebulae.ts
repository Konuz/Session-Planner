// Mgławice jasne z katalogów Cederblada (1946, VizieR VII/231) i RCW (Rodgers, Campbell, Whiteoak 1960, VII/216) z
// numerami Gum z odsyłaczy RCW oraz galaktyki osobliwe Arpa (VII/192) i zwarte grupy Hicksona (VII/213). Obiekt katalogu, który SIMBAD uznaje za ten sam, dostaje aliasy; reszta to nowe wiersze.
// Czysta logika bez sieci (testy w src/lib).
import { parseVizierTsv, separationDeg } from './catalogDistances.ts'
import { sexagesimal } from './planetaryNebulae.ts'

export interface CatalogNebula {
  primary: string
  /** Oznaczenia NGC/IC z katalogu źródłowego (do porównania, gdy SIMBAD nie rozstrzyga). */
  names: string[]
  /** Numery Gum z odsyłaczy RCW (aliasy). */
  gum: string[]
  type: 'EN' | 'RN' | 'CN' | 'G' | 'GG'
  raDeg: number
  decDeg: number
  /** Wymiary w minutach łuku; 0 bez pomiaru. */
  majArcmin: number
  minArcmin: number | null
  /** Jasność całkowita (HCG); bez pomiaru null. */
  mag?: number | null
}

const num = (text: string | undefined) => text && Number.isFinite(Number(text)) ? Number(text) : null
/** „NGC2327”, „NGC 281”, „IC 11” → „NGC 2327”; inne nazwy (BD, McD) pomijamy. */
const ngcIc = (text: string) => { const m = /^(NGC|IC)\s*(\d+)$/.exec(text.trim()); return m ? `${m[1]} ${Number(m[2])}` : null }

/**
 * Cederblad: „Ced 44a” (litera podziału), typ z widma mgławicy (E/e emisyjne, C/c ciągłe, czyli refleksyjne; bez widma
 * emisyjne) i klasy (A: gromada w mgławicy).
 */
export function parseCederblad(tsv: string): CatalogNebula[] {
  return parseVizierTsv(tsv).flatMap((row) => {
    const ra = sexagesimal(`${row['_RA.icrs'] ?? ''}`, true), dec = sexagesimal(`${row['_DE.icrs'] ?? ''}`, false)
    if (!row.Ced || ra === null || dec === null) return []
    const spec = row.SpNeb ?? ''
    const type = row.Class?.startsWith('A') ? 'CN' : /[Ee]/.test(spec) || !spec ? 'EN' : 'RN'
    const name = ngcIc(row.Name ?? '')
    const maj = num(row.Dim1) ?? 0, min = num(row.Dim2)
    return [{ primary: `Ced ${Number(row.Ced)}${row.m_Ced ?? ''}`, names: name ? [name] : [], gum: [], type, raDeg: ra, decDeg: dec, majArcmin: maj, minArcmin: maj ? min : null } satisfies CatalogNebula]
  })
}

/** RCW: obszary Hα (mgławice emisyjne); w IDs „NGC2327; HS111;G2,3”, niepewne „(NGC2409?)” i „Part of NGC2736” pomijamy. */
export function parseRcw(tsv: string): CatalogNebula[] {
  return parseVizierTsv(tsv).flatMap((row) => {
    const ra = sexagesimal(`${row['_RA.icrs'] ?? ''}`, true), dec = sexagesimal(`${row['_DE.icrs'] ?? ''}`, false)
    if (!row.RCW || ra === null || dec === null) return []
    const parts = (row.IDs ?? '').split(';').map((p) => p.trim())
    // „NGC6164,5” to NGC 6164 i 6165; „G38,a,b” to Gum 38, 38a i 38b, „G2,3” to Gum 2 i 3.
    const names = parts.flatMap((p) => {
      const m = /^(NGC|IC)\s*(\d+)((?:,\d+)*)$/.exec(p)
      if (!m) return []
      const base = Number(m[2])
      return [base, ...m[3].split(',').filter(Boolean).map((tail) => Number(String(base).slice(0, -tail.length) + tail))].map((n) => `${m[1]} ${n}`)
    })
    const gum = parts.flatMap((p) => {
      const m = /^G(\d+)((?:,[\da-z]+)*)$/.exec(p)
      if (!m) return []
      return [m[1], ...m[2].split(',').filter(Boolean).map((t) => /^\d+$/.test(t) ? t : `${m[1]}${t}`)].map((g) => `Gum ${/^\d+$/.test(g) ? Number(g) : g}`)
    })
    const maj = num(row.MajAxis) ?? 0
    return [{ primary: `RCW ${Number(row.RCW)}`, names, gum, type: 'EN' as const, raDeg: ra, decDeg: dec, majArcmin: maj, minArcmin: maj ? num(row.MinAxis) : null }]
  })
}

export interface KnownNebula { designations: string[]; type: string; raDeg: number; decDeg: number; majArcmin: number }
export interface NebulaPlan {
  added: (CatalogNebula & { aliases: string[] })[]
  aliases: Map<number, string[]>
  /** Pary sprawdzone w SIMBAD (mgławica, obiekt katalogu w jej zasięgu albo ona w jego). */
  checked: { nebula: CatalogNebula; known: number }[]
}

const NEBULA_TYPES = ['EN', 'RN', 'CN', 'SNR', 'PN']
/** Kandydaci dla Arpa i HCG: galaktyki i grupy galaktyk. */
export const GALAXY_TYPES = ['G', 'GG']
const exact = (d: string) => d.toUpperCase().replace(/\s+/g, '')

/**
 * Kandydaci to mgławice katalogu, w których zasięgu leży środek nowej albo ona w ich (≥ 2′). `same` (główne
 * identyfikatory SIMBAD) zwraca true (ten sam obiekt), false (inny) albo null (nie wiadomo); przy null wystarcza
 * wspólne oznaczenie NGC/IC. Bez dopasowania: nowy wiersz. Numery Gum idą za obiektem RCW.
 */
export function planNebulae(
  list: CatalogNebula[], known: KnownNebula[], same: (nebula: CatalogNebula, known: number) => boolean | null, types: string[] = NEBULA_TYPES,
  /** Arp: galaktyka z kolumny Name wygrywa z SIMBAD (wpis to często para, a SIMBAD wskazuje parę), a obiekt katalogu
   *  bliżej niż `closeDeg` to ten sam (inaczej dwa wiersze w jednym miejscu psują dopasowanie Cosmicflows-4). */
  /** `searchDeg`: najmniejszy promień szukania kandydatów (pozycje RCW z dokładnością ~1′ i małe PN: RCW 124 leży
   *  2,8′ od NGC 6302); poza zasięgiem obiektów liczy się tylko SIMBAD albo wspólne oznaczenie. */
  options: { nameFirst?: boolean; closeDeg?: number; searchDeg?: number } = {},
): NebulaPlan {
  const taken = new Set(known.flatMap((k) => k.designations.map(exact)))
  const plan: NebulaPlan = { added: [], aliases: new Map(), checked: [] }
  const nebulae = known.flatMap((k, i) => types.includes(k.type) ? [i] : [])
  for (const n of list) {
    const candidates = nebulae.map((i) => ({ i, s: separationDeg(n.raDeg, n.decDeg, known[i].raDeg, known[i].decDeg) }))
      .filter(({ i, s }) => s <= Math.max(2 / 60, n.majArcmin / 120, known[i].majArcmin / 120, options.searchDeg ?? 0))
      .sort((a, b) => a.s - b.s)
    let host: number | null = null
    for (const { i, s } of candidates) {
      plan.checked.push({ nebula: n, known: i })
      const verdict = same(n, i)
      const named = n.names.some((name) => known[i].designations.some((d) => exact(d) === exact(name)))
      if (verdict === true || (named && (verdict === null || options.nameFirst)) || s <= (options.closeDeg ?? 0)) { host = i; break }
    }
    const fresh = [n.primary, ...n.gum].filter((d) => !taken.has(exact(d)))
    fresh.forEach((d) => taken.add(exact(d)))
    if (host !== null) { if (fresh.length) plan.aliases.set(host, [...(plan.aliases.get(host) ?? []), ...fresh]) } else if (fresh.includes(n.primary)) plan.added.push({ ...n, aliases: fresh.slice(1) })
  }
  return plan
}

/** Pozycja w stopniach z kolumn _RAJ2000/_DEJ2000 (VizieR, -oc.form=d). */
const degrees = (row: Record<string, string>) => {
  const ra = num(row._RAJ2000), dec = num(row._DEJ2000)
  return ra === null || dec === null ? null : { raDeg: ra, decDeg: dec }
}
/** „MESSIER 051” → „M 51”, „NGC 2857” bez zmian, „UGC 10310” → „UGC 10310”. */
function galaxyName(text: string): string | null {
  const name = text.trim().replace(/\s+/g, ' ')
  const m = /^(MESSIER|NGC|IC|UGC) ?0*(\d+)$/.exec(name)
  return m ? `${m[1] === 'MESSIER' ? 'M' : m[1]} ${Number(m[2])}` : null
}

/** Arp: „Arp 85”, galaktyka główna z kolumny Name (do porównania), rozmiar w minutach łuku. */
export function parseArp(tsv: string): CatalogNebula[] {
  return parseVizierTsv(tsv).flatMap((row) => {
    const pos = degrees(row)
    if (!row.Arp || !pos) return []
    const name = galaxyName(row.Name ?? '')
    return [{ primary: `Arp ${Number(row.Arp)}`, names: name ? [name] : [], gum: [], type: 'G' as const, ...pos, majArcmin: num(row.Size) ?? 0, minArcmin: null }]
  })
}

/** HCG: grupa galaktyk z rozmiarem kątowym i jasnością całkowitą. */
export function parseHcg(tsv: string): CatalogNebula[] {
  return parseVizierTsv(tsv).flatMap((row) => {
    const pos = degrees(row)
    if (!row.HCG || !pos) return []
    return [{ primary: `HCG ${Number(row.HCG)}`, names: [], gum: [], type: 'GG' as const, ...pos, majArcmin: num(row.AngSize) ?? 0, minArcmin: null, mag: num(row.Totmag) }]
  })
}
