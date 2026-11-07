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

const key = (designation: string) => designation.toUpperCase().replace(/[\s_-]+/g, '')

export interface Known { designations: string[]; raDeg: number; decDeg: number; nebula: boolean }

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
