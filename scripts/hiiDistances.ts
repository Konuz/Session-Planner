// Odległości obszarów H II (EN, CN) przy budowie katalogu: Foster & Brunt 2015 (widma gwiazd), katalog H II WISE
// (Anderson i in. 2014: paralaksy i odległości kinematyczne autorów) i własna odległość kinematyczna z prędkości
// radialnych (Anderson i in. 2014, Russeil 2003, Foster & Brunt 2015). Czysta logika bez sieci i plików.
import { galactic } from '../src/lib/astro.ts'
import { hasDistance } from '../src/lib/distance.ts'
import { parseVizierTsv, separationDeg, type Choice, type Entry } from './catalogDistances.ts'
import { kinematicDistance, type Kda } from './kinematicDistance.ts'

const LY_PER_KPC = 3261.56
/** Największa odległość środka regionu WISE od obiektu przy dopasowaniu po pozycji. */
const WISE_MATCH_LIMIT_DEG = 0.25
/** Największa rozbieżność prędkości różnych tracerów tego samego obszaru. */
const MAX_VELOCITY_SPREAD_KMS = 10
/** W kierunku centrum Galaktyki (|l| < 15°) ruchy niekołowe (poprzeczka) psują odległość kinematyczną. */
const GALACTIC_CENTER_EXCLUSION_DEG = 15

const num = (value: string | undefined) => {
  if (value === undefined || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export interface FbRegion { name: string; kpc: number | null; sigmaKpc: number | null; vCO: number | null }

/** Foster & Brunt 2015, tabela 2 (J/AJ/150/147/table2): odległość spektrofotometryczna r ± dr i prędkość CO. */
export function parseFosterBrunt(text: string): Map<string, FbRegion> {
  const regions = new Map<string, FbRegion>()
  for (const row of parseVizierTsv(text)) {
    const name = row.HII ?? ''
    if (name && !regions.has(name)) regions.set(name, { name, kpc: num(row.r), sigmaKpc: num(row.dr), vCO: num(row.vCO) })
  }
  return regions
}

export interface WiseRegion {
  names: string[]
  raDeg: number
  decDeg: number
  radiusDeg: number
  /** Prędkość z linii rekombinacyjnych i z linii molekularnych [km/s]. */
  vRrl: number | null
  vMol: number | null
  kda: Kda
  kpc: number | null
  sigmaKpc: number | null
  /** Metoda odległości autorów (np. „Parallax”, „OG/Kin”). */
  method: string
}

/** Katalog H II WISE (J/ApJS/212/1/wisecat). */
export function parseWise(text: string): WiseRegion[] {
  return parseVizierTsv(text).flatMap((row): WiseRegion[] => {
    const ra = num(row['_RA.icrs']), dec = num(row['_DE.icrs'])
    if (ra === null || dec === null) return []
    const kda = row.KDA === 'N' || row.KDA === 'F' || row.KDA === 'T' ? row.KDA : null
    return [{
      names: (row.HIIName ?? '').split(/[;,]/).map((n) => n.trim()).filter(Boolean), raDeg: ra, decDeg: dec, radiusDeg: (num(row.Rad) ?? 0) / 3600,
      vRrl: num(row.Vi1), vMol: num(row.Vm1), kda, kpc: num(row.Dist), sigmaKpc: num(row.e_Dist), method: row.Meth ?? '',
    }]
  })
}

export interface RusseilVelocities { ha: number | null; rrl: number | null; co: number | null }

/** Russeil 2003, tabela 1 (J/A+A/397/133/table1): pierwsze prędkości Hα, linii rekombinacyjnych i CO (bez CO: H₂CO). */
export function parseRusseil(text: string): Map<string, RusseilVelocities> {
  const regions = new Map<string, RusseilVelocities>()
  for (const row of parseVizierTsv(text)) {
    const velocities = { ha: num(row.HaVLSR), rrl: num(row.RRvlsr), co: num(row.COvlsr) ?? num(row.H2COvlsr) }
    for (const name of (row.HaName ?? '').split('=').map((n) => n.trim())) {
      if (/^S\d+$/.test(name) && !regions.has(name)) regions.set(name, velocities)
    }
  }
  return regions
}

/** Oznaczenie Sharplessa w zapisie Russeil i WISE: „Sh2-25” → „S25”. */
export function sharplessKey(designation: string): string | null {
  const m = /^Sh2-(\d+)$/.exec(designation.trim())
  return m ? `S${m[1]}` : null
}

/**
 * Region WISE obiektu: po nazwie Sharplessa (z kilku regionów o tej nazwie ten z odległością, potem z prędkością,
 * potem najbliższy), a bez nazwy najbliższy region, w którego promieniu (najwyżej 0,25°) leży środek obiektu. Promień
 * obiektu się nie liczy: duża mgławica przejmowałaby małe regiony w tle (przegląd 14.11.2026: LBN 159 → 12,7 kpc).
 */
export function findWise(e: Entry, designations: string[], regions: WiseRegion[]): WiseRegion | null {
  const keys = designations.map(sharplessKey).filter((k): k is string => k !== null)
  const sep = (r: WiseRegion) => separationDeg(e.raDeg, e.decDeg, r.raDeg, r.decDeg)
  const named = keys.length ? regions.filter((r) => r.names.some((n) => keys.includes(n))) : []
  if (named.length) {
    const rank = (r: WiseRegion) => [r.kpc === null ? 1 : 0, r.vRrl === null && r.vMol === null ? 1 : 0, sep(r)]
    return named.map((r) => ({ r, k: rank(r) })).sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.k[2] - b.k[2])[0].r
  }
  let best: { r: WiseRegion; s: number } | null = null
  for (const r of regions) {
    if (Math.abs(r.decDeg - e.decDeg) > WISE_MATCH_LIMIT_DEG) continue
    const s = sep(r)
    if (s <= Math.min(r.radiusDeg, WISE_MATCH_LIMIT_DEG) && (!best || s < best.s)) best = { r, s }
  }
  return best?.r ?? null
}

type Tracer = 'rrl' | 'mol' | 'ha'
type Velocity = { v: number; source: string }

/** Prędkość główna: pierwsza z linii rekombinacyjnych, potem molekularnych, potem Hα. Rozbieżność innej > 10 km/s: null. */
export function pickVelocity(v: Record<Tracer, Velocity[]>): { vlsr: number; tracer: Tracer; source: string } | null {
  const tracer = (['rrl', 'mol', 'ha'] as const).find((t) => v[t].length)
  if (!tracer) return null
  const main = v[tracer][0]
  if ([...v.rrl, ...v.mol, ...v.ha].some((x) => Math.abs(x.v - main.v) > MAX_VELOCITY_SPREAD_KMS)) return null
  return { vlsr: main.v, tracer, source: main.source }
}

export interface HiiSources { fb: Map<string, FbRegion>; wise: WiseRegion[]; russeil: Map<string, RusseilVelocities> }
type Step = { key: string; choice: Choice }

const TRACER_LABELS: Record<Tracer, string> = { rrl: 'linii rekombinacyjnych', mol: 'linii molekularnych', ha: 'Hα' }
const ANDERSON = 'Anderson i in. 2014', RUSSEIL = 'Russeil 2003', FOSTER_BRUNT = 'Foster & Brunt 2015'

function wiseChoice(r: WiseRegion & { kpc: number }): Choice {
  const method = r.method === 'Parallax' ? 'paralaksa trygonometryczna' : r.method.includes('Kin') ? `odległość kinematyczna (WISE: ${r.method})` : `metoda WISE: ${r.method || 'niepodana'}`
  return {
    ly: r.kpc * LY_PER_KPC, sigmaLy: r.sigmaKpc === null ? null : r.sigmaKpc * LY_PER_KPC,
    source: { scope: 'object', method, source: 'Anderson i in. 2014, ApJS 212, 1 (katalog H II WISE)', ref: '2014ApJS..212....1A', verified: true },
  }
}

function fbChoice(r: FbRegion & { kpc: number }): Choice {
  // Ten sam wpis tabeli źródeł co wcześniejszy wyjątek dla Sh2-155 (kolejność pól ma znaczenie dla klucza).
  return {
    ly: r.kpc * LY_PER_KPC, sigmaLy: r.sigmaKpc === null ? null : r.sigmaKpc * LY_PER_KPC,
    source: { scope: 'object', method: 'odległość spektrofotometryczna gwiazd regionu H II', source: 'Foster & Brunt 2015, AJ 150, 147, tabela 2', ref: '2015AJ....150..147F', verified: true },
  }
}

function kinematicChoice(e: Entry, region: WiseRegion | null, fb: FbRegion | undefined, russeil: RusseilVelocities | undefined): Choice | null {
  const list = (...items: [number | null | undefined, string][]) => items.flatMap(([v, source]) => v === null || v === undefined ? [] : [{ v, source }])
  const velocity = pickVelocity({
    rrl: list([region?.vRrl, ANDERSON], [russeil?.rrl, RUSSEIL]),
    mol: list([region?.vMol, ANDERSON], [russeil?.co, RUSSEIL], [fb?.vCO, FOSTER_BRUNT]),
    ha: list([russeil?.ha, RUSSEIL]),
  })
  if (!velocity) return null
  const { lDeg, bDeg } = galactic({ raDeg: e.raDeg, decDeg: e.decDeg })
  if (lDeg < GALACTIC_CENTER_EXCLUSION_DEG || lDeg > 360 - GALACTIC_CENTER_EXCLUSION_DEG) return null
  const d = kinematicDistance({ seed: e.designations[0], lDeg, bDeg, vlsr: velocity.vlsr, kda: region?.kda ?? null })
  if (!d) return null
  return {
    ly: d.kpc * LY_PER_KPC, sigmaLy: d.sigmaKpc * LY_PER_KPC,
    source: {
      scope: 'object', method: `odległość kinematyczna: v_LSR z ${TRACER_LABELS[velocity.tracer]} (${velocity.source}), krzywa rotacji Reid i in. 2019 (A5), Monte Carlo`,
      source: 'Reid i in. 2019, ApJ 885, 131', ref: '2019ApJ...885..131R', verified: false,
    },
  }
}

/**
 * Krok H II łańcucha dla EN i CN: paralaksa WISE → Foster & Brunt → pozostałe odległości WISE → własna kinematyka.
 * Zwraca pierwszy krok z σ ≤ 50 %; gdy żaden jej nie ma, pierwszą wartość z literatury (dalej decyduje reguła
 * Wikidata). Własnej kinematyki z σ > 50 % nie zwraca: wartość w katalogu blokowałaby wynik regresora wycinka.
 */
export function hiiChoice(e: Entry, designations: string[], src: HiiSources): Step | null {
  if (e.type !== 'EN' && e.type !== 'CN') return null
  const region = findWise(e, designations, src.wise)
  const fb = designations.map((d) => src.fb.get(d)).find((r) => r !== undefined)
  const russeil = designations.map(sharplessKey).map((k) => k ? src.russeil.get(k) : undefined).find((r) => r !== undefined)
  const steps: (() => Step | null)[] = [
    () => region && region.kpc !== null && region.method === 'Parallax' ? { key: 'WISE paralaksa', choice: wiseChoice({ ...region, kpc: region.kpc }) } : null,
    () => fb && fb.kpc !== null ? { key: 'Foster & Brunt', choice: fbChoice({ ...fb, kpc: fb.kpc }) } : null,
    () => region && region.kpc !== null && region.method !== 'Parallax' ? { key: 'WISE', choice: wiseChoice({ ...region, kpc: region.kpc }) } : null,
    () => {
      const choice = kinematicChoice(e, region, fb, russeil)
      return choice && hasDistance({ distLy: choice.ly, uncertaintyLy: choice.sigmaLy }) ? { key: 'kinematyczna', choice } : null
    },
  ]
  let first: Step | null = null
  for (const step of steps) {
    const result = step()
    if (!result) continue
    if (hasDistance({ distLy: result.choice.ly, uncertaintyLy: result.choice.sigmaLy })) return result
    first ??= result
  }
  return first
}
