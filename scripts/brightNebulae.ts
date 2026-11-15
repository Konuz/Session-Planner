// Mgławice jasne z katalogów Cederblada (1946, VizieR VII/231) i RCW (Rodgers, Campbell, Whiteoak 1960, VII/216) z
// numerami Gum z odsyłaczy RCW. Obiekt katalogu, który SIMBAD uznaje za ten sam, dostaje aliasy; reszta to nowe wiersze.
// Czysta logika bez sieci (testy w src/lib).
import { parseVizierTsv, separationDeg } from './catalogDistances.ts'
import { sexagesimal } from './planetaryNebulae.ts'

export interface CatalogNebula {
  primary: string
  /** Oznaczenia NGC/IC z katalogu źródłowego (do porównania, gdy SIMBAD nie rozstrzyga). */
  names: string[]
  /** Numery Gum z odsyłaczy RCW (aliasy). */
  gum: string[]
  type: 'EN' | 'RN' | 'CN'
  raDeg: number
  decDeg: number
  /** Wymiary w minutach łuku; 0 bez pomiaru. */
  majArcmin: number
  minArcmin: number | null
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
    const names = parts.flatMap((p) => { const n = ngcIc(p); return n ? [n] : [] })
    const gum = parts.flatMap((p) => /^G\d/.test(p) ? p.slice(1).split(',').map((g) => `Gum ${Number(g)}`) : [])
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
const exact = (d: string) => d.toUpperCase().replace(/\s+/g, '')

/**
 * Kandydaci to mgławice katalogu, w których zasięgu leży środek nowej albo ona w ich (≥ 2′). `same` (główne
 * identyfikatory SIMBAD) zwraca true (ten sam obiekt), false (inny) albo null (nie wiadomo); przy null wystarcza
 * wspólne oznaczenie NGC/IC. Bez dopasowania: nowy wiersz. Numery Gum idą za obiektem RCW.
 */
export function planNebulae(list: CatalogNebula[], known: KnownNebula[], same: (nebula: CatalogNebula, known: number) => boolean | null): NebulaPlan {
  const taken = new Set(known.flatMap((k) => k.designations.map(exact)))
  const plan: NebulaPlan = { added: [], aliases: new Map(), checked: [] }
  const nebulae = known.flatMap((k, i) => NEBULA_TYPES.includes(k.type) ? [i] : [])
  for (const n of list) {
    const candidates = nebulae.map((i) => ({ i, s: separationDeg(n.raDeg, n.decDeg, known[i].raDeg, known[i].decDeg) }))
      .filter(({ i, s }) => s <= Math.max(2 / 60, n.majArcmin / 120, known[i].majArcmin / 120))
      .sort((a, b) => a.s - b.s)
    let host: number | null = null
    for (const { i } of candidates) {
      plan.checked.push({ nebula: n, known: i })
      const verdict = same(n, i)
      const named = n.names.some((name) => known[i].designations.some((d) => exact(d) === exact(name)))
      if (verdict === true || (verdict === null && named)) { host = i; break }
    }
    const fresh = [n.primary, ...n.gum].filter((d) => !taken.has(exact(d)))
    fresh.forEach((d) => taken.add(exact(d)))
    if (host !== null) { if (fresh.length) plan.aliases.set(host, [...(plan.aliases.get(host) ?? []), ...fresh]) } else if (fresh.includes(n.primary)) plan.added.push({ ...n, aliases: fresh.slice(1) })
  }
  return plan
}
