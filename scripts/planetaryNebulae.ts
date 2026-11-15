// Mgławice planetarne spoza OpenNGC ze Strasbourg-ESO Catalogue of Galactic Planetary Nebulae (Acker i in. 1992,
// VizieR V/84: 1143 pewne PN, średnice optyczne z V/84/diam). Czysta logika bez sieci (testy w src/lib).
import { parseVizierTsv, separationDeg } from './catalogDistances.ts'

export interface PlanetaryNebula {
  /** Nazwa główna z V/84 („HFG 1”, „Abell 39”, „M 2-19”). */
  name: string
  /** Oznaczenie galaktyczne „PN G136.3+05.5”. */
  png: string
  /** Inne oznaczenia z V/84 (do wykrycia obiektów już obecnych w katalogu). */
  idents: string[]
  raDeg: number
  decDeg: number
  /** Średnica optyczna w minutach łuku; 0 bez pomiaru lub przy samej granicy. */
  diamArcmin: number
  /** Mniejsza oś, gdy źródło podaje rozmiar a × b. */
  minorArcmin?: number
}

/** „03 03 48.84” (godziny) albo „+64 53 28.2” (stopnie) → stopnie. */
export function sexagesimal(text: string, hours: boolean): number | null {
  const m = /^\s*([+-]?)(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)\s*$/.exec(text)
  if (!m) return null
  const value = (Number(m[2]) + Number(m[3]) / 60 + Number(m[4]) / 3600) * (hours ? 15 : 1)
  return m[1] === '-' ? -value : value
}

/** Nazwa z V/84 w zapisie aplikacji: pojedyncze spacje, „A 39” (Abell 1966) → „Abell 39”. */
export function pnName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, ' ')
  return name.replace(/^A (\d+)$/, 'Abell $1')
}

export function parseV84(mainTsv: string, diamTsv: string): PlanetaryNebula[] {
  const diam = new Map(parseVizierTsv(diamTsv).flatMap((row) => {
    const d = Number(row.oDiam)
    return row.oDiam && Number.isFinite(d) && d > 0 && row.l_oDiam !== '<' ? [[row.PNG, d / 60] as const] : []
  }))
  return parseVizierTsv(mainTsv).flatMap((row) => {
    const ra = sexagesimal(row['_RA.icrs'] ?? '', true), dec = sexagesimal(row['_DE.icrs'] ?? '', false)
    if (!row.PNG || !row.Name || ra === null || dec === null) return []
    return [{ name: pnName(row.Name), png: `PN G${row.PNG}`, idents: (row.Idents ?? '').split(',').map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean), raDeg: ra, decDeg: dec, diamArcmin: diam.get(row.PNG) ?? 0 }]
  })
}

/**
 * Le Dû i in. 2022 (VizieR J/A+A/666/A152, tabela 1): mgławice planetarne odkryte przez amatorów (StDr, Pre, Ra, Ou…)
 * ze statusem HASH T/L/P i rozmiarem „11 x 4.6” w minutach łuku. Oznaczenie HASH („Kn 22”) jako alias; postać
 * galaktyczna „LBN 157.08-03.61” to nie numer Lyndsa, więc jej nie bierzemy.
 */
export function parseLeDu(tsv: string): PlanetaryNebula[] {
  return parseVizierTsv(tsv).flatMap((row) => {
    const ra = sexagesimal(row.RAJ2000 ?? '', true), dec = sexagesimal(row.DEJ2000 ?? '', false)
    if (!row.Name || !row.PNG || ra === null || dec === null) return []
    const size = /^([\d.]+)(?:\s*x\s*([\d.]+))?$/.exec(row.Size ?? '')
    const hash = (row.HName ?? '').replace(/\s+/g, ' ').trim()
    return [{
      name: row.Name.replace(/\s+/g, ' ').trim(), png: `PN G${row.PNG}`, idents: hash && !/^LBN \d+\.\d+[+-]/.test(hash) ? [hash] : [],
      raDeg: ra, decDeg: dec, diamArcmin: size ? Number(size[1]) : 0, minorArcmin: size?.[2] ? Number(size[2]) : undefined,
    }]
  })
}

const key = (designation: string) => designation.toUpperCase().replace(/[\s_-]+/g, '')

export interface Known { designations: string[]; raDeg: number; decDeg: number; nebula: boolean }

/**
 * Mgławice Le Dû: wspólne oznaczenie (nazwa, PN G albo nazwa HASH, np. „Sh 2-215” przy Pa 167) z obiektem katalogu
 * w odległości ≤ 0,5° daje temu obiektowi aliasy; reszta to nowe obiekty. Bez dopasowania po samej pozycji: kandydaci
 * PN potwierdzeni widmami leżą często w polu obszaru H II (StDr 57 przy środku Sh2-213).
 */
export function planLeDu(pns: PlanetaryNebula[], known: Known[]): { added: PlanetaryNebula[]; aliases: Map<number, string[]> } {
  const byKey = new Map<string, number[]>()
  known.forEach((k, i) => { for (const d of k.designations) byKey.set(key(d), [...(byKey.get(key(d)) ?? []), i]) })
  // Zajęte oznaczenia porównujemy z myślnikami: „Hu 21” to nie „Hu 2-1”.
  const exact = (d: string) => d.toUpperCase().replace(/\s+/g, '')
  const taken = new Set(known.flatMap((k) => k.designations.map(exact)))
  const plan = { added: [] as PlanetaryNebula[], aliases: new Map<number, string[]>() }
  for (const pn of pns) {
    const names = [pn.name, pn.png, ...pn.idents]
    const hit = names.flatMap((d) => byKey.get(key(d)) ?? []).find((i) => separationDeg(known[i].raDeg, known[i].decDeg, pn.raDeg, pn.decDeg) <= 0.5)
    const fresh = names.filter((d) => !taken.has(exact(d)))
    fresh.forEach((d) => taken.add(exact(d)))
    if (hit !== undefined) { if (fresh.length) plan.aliases.set(hit, [...(plan.aliases.get(hit) ?? []), ...fresh]) } else if (fresh.includes(pn.name)) plan.added.push({ ...pn, idents: pn.idents.filter((d) => fresh.includes(d)) })
  }
  return plan
}

/**
 * Mgławice planetarne, których jeszcze nie ma w katalogu: bez wspólnego oznaczenia (nazwa lub inne oznaczenia V/84)
 * i bez mgławicy katalogu w odległości max(1′, połowa średnicy). Galaktyki i gromady w tym samym miejscu to przypadek.
 */
export function newPlanetaryNebulae(pns: PlanetaryNebula[], known: Known[]): PlanetaryNebula[] {
  const names = new Set(known.flatMap((k) => k.designations.map(key)))
  const nebulae = known.filter((k) => k.nebula)
  return pns.filter((pn) => {
    if ([pn.name, pn.png, ...pn.idents].some((d) => names.has(key(d)))) return false
    const limit = Math.max(1 / 60, pn.diamArcmin / 120)
    return !nebulae.some((k) => Math.abs(k.decDeg - pn.decDeg) <= limit && separationDeg(k.raDeg, k.decDeg, pn.raDeg, pn.decDeg) <= limit)
  })
}
