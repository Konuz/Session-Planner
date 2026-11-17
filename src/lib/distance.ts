// Odległości obiektów: zakres i pochodzenie wartości, warunek pokazania w 3D, odległość z przesunięcia ku czerwieni,
// gwiazda oświetlająca z gwiazd Gaia pola zdjęcia i identyfikatory SIMBAD. Moduł bez importów wartości
// (używa go serwer i skrypt budowy danych bez bundlera).
import type { DSO } from './catalog.ts'
import type { PhotoCut, PhotoStar } from './photo.ts'

/** Czego dotyczy wartość: obiektu, populacji (gromady, asocjacji), gwiazdy oświetlającej, obłoku pyłu
 *  na linii widzenia albo przesunięcia ku czerwieni (oszacowanie pośrednie z przepływu Hubble’a). */
export type DistanceScope = 'object' | 'population' | 'illuminator' | 'cloud' | 'redshift'
export const SCOPE_LABELS: Record<DistanceScope, string> = {
  object: 'obiekt', population: 'populacja', illuminator: 'gwiazda oświetlająca', cloud: 'obłok', redshift: 'z przesunięcia ku czerwieni',
}

/** Wpis tabeli źródeł katalogu: wspólny dla wielu obiektów (zwięzły zapis w catalog.json). */
export interface DistanceInfo {
  scope: DistanceScope
  /** Metoda, krótko (np. „TRGB (Cosmicflows-4)”). */
  method: string
  /** Publikacja lub katalog. */
  source: string
  /** Bibcode ADS; '' gdy brak. */
  ref: string
  /** false: wartość niesprawdzona lub pośrednia (Wikidata, odległość kinematyczna); gwiazda oświetlająca z pola ma przed nią pierwszeństwo. */
  verified: boolean
}

/** Pola odległości wycinka zdjęcia. */
export type CutDistance = Pick<PhotoCut, 'distLy' | 'uncertaintyLy' | 'distanceScope' | 'distanceMethod' | 'distanceSource' | 'distanceRef' | 'distanceOrigin'>
export const NO_DISTANCE: CutDistance = { distLy: null, uncertaintyLy: null, distanceScope: 'object', distanceMethod: '', distanceSource: '', distanceRef: '', distanceOrigin: 'catalog' }

/** Największa względna niepewność (1σ) odległości pokazywanej w 3D. */
export const MAX_RELATIVE_UNCERTAINTY = 0.5

/** Ustalona odległość: dodatnia i (gdy niepewność jest znana) z σ ≤ 50 % (decyzja 14.11.2026; wcześniej 20 %). Obiektów bez niej nie pokazujemy w 3D. */
export function hasDistance(d: { distLy: number | null; uncertaintyLy: number | null }): boolean {
  if (d.distLy === null || !Number.isFinite(d.distLy) || d.distLy <= 0) return false
  return d.uncertaintyLy === null || d.uncertaintyLy <= d.distLy * MAX_RELATIVE_UNCERTAINTY
}

export const adsUrl = (bibcode: string) => bibcode ? `https://ui.adsabs.harvard.edu/abs/${encodeURIComponent(bibcode)}/abstract` : ''

const LY_PER_PC = 3.26156
const LY_PER_MPC = 3.26156e6
const C_KMS = 299792.458
/** Dipol CMB (Planck: l = 264,021°, b = 48,253°, 369,82 km/s) w ICRS. */
const CMB_APEX = { raDeg: 167.9419, decDeg: -6.9443, kms: 369.82 }
/** Poniżej tej prędkości w układzie CMB prędkości własne (σ 300 km/s) dają ponad 10 % niepewności. */
export const MIN_CZ_CMB = 3000
const PECULIAR_KMS = 300

export function separationDeg(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const r = Math.PI / 180
  const s = Math.sin((dec2 - dec1) * r / 2) ** 2 + Math.cos(dec1 * r) * Math.cos(dec2 * r) * Math.sin((ra2 - ra1) * r / 2) ** 2
  return 2 * Math.asin(Math.min(1, Math.sqrt(s))) / r
}

/** Odległość współporuszająca z heliocentrycznego z (układ CMB, płaski ΛCDM: H₀ = 70, Ωm = 0,3) i σ z prędkości
 *  własnej 300 km/s; null przy cz_CMB < 3000 km/s. Jak w pilotażu 6.11.2026 (astropy FlatLambdaCDM). */
export function redshiftDistance(z: number, raDeg: number, decDeg: number): { distLy: number; uncertaintyLy: number; czCmb: number } | null {
  if (!Number.isFinite(z) || z <= 0) return null
  const cos = Math.cos(separationDeg(raDeg, decDeg, CMB_APEX.raDeg, CMB_APEX.decDeg) * Math.PI / 180)
  const zCmb = (1 + z) * (1 + CMB_APEX.kms * cos / C_KMS) - 1
  const czCmb = C_KMS * zCmb
  if (czCmb < MIN_CZ_CMB) return null
  const distLy = comovingDistanceLy(zCmb)
  return { distLy, uncertaintyLy: distLy * PECULIAR_KMS / czCmb, czCmb }
}

/** Odległość współporuszająca w płaskim ΛCDM (H₀ = 70, Ωm = 0,3) dla z w podanym układzie. */
export function comovingDistanceLy(z: number): number {
  const e = (x: number) => 1 / Math.sqrt(0.3 * (1 + x) ** 3 + 0.7)
  const n = z < 0.3 ? 64 : 256
  const h = z / n
  let sum = e(0) + e(z)
  for (let i = 1; i < n; i++) sum += e(i * h) * (i % 2 ? 4 : 2)
  return C_KMS / 70 * sum * h / 3 * LY_PER_MPC
}

/** Mgławice planetarne odkryte przez amatorów (Le Dû i in. 2022, lista ręczna): „StDr 56”, „Ou 4”, „StDr Objet 1”. */
export const AMATEUR_PN = /^(StDr|StDrBl|PaStDr|StRas|Pre|PreDr|PrePa|PreMo|Ra|Rai|Ras|RaMul|RaBel|RaEMol|Dr|St|LDu|LDuPa|LDu-IR|Mul|Mul-IR|MulPre|MulPreLDu|Ou|Pa|PaGo|PaMo|Fe|KnFe|SuFe|Su|DeGaPe|Hu|Tan|Kan|Ro|CaVa|Ch|Ga|Zol|MoMi|Mo|Jo|Zie)( Objet)? \d+$/

/** Identyfikator w zapisie SIMBAD („Sh2-277” → „SH 2-277”, „B 33” → „Barnard 33”); null dla katalogów, których SIMBAD nie zna. */
export function simbadId(designation: string): string | null {
  const id = designation.trim()
  if (/^C \d/.test(id)) return null
  // „Abell N” w katalogu to tylko mgławice planetarne Abella (1966); w SIMBAD „PN A66 N” (samo „Abell N” to gromada galaktyk).
  // Gromady z Hunt & Reffert 2023 (scripts/openClusters.ts): w SIMBAD „Cl Collinder 135”, „Cl VDBH 85”, „Cl Pal 5”.
  const clusters = /^(Collinder|Trumpler|Berkeley|Stock|King|Dolidze|Czernik|Ruprecht|Haffner|Pismis|Basel|Bochum|Hogg|Lynga|Tombaugh|Waterloo|Westerlund|Roslund|Alessi|Ferrero|Harvard|Loden|Terzan) (\d+)$/
  // Mgławice planetarne odkryte przez amatorów (Le Dû i in. 2022, lista ręczna): w SIMBAD „NAME PN Fe 6”; samo „Dr 21”
  // czy „Hu 2” to tam źródło radiowe i obłok HI.
  if (AMATEUR_PN.test(id)) return `NAME PN ${id}`
  const rules: [RegExp, string][] = [[/^Sh2-(\d+)$/, 'SH 2-$1'], [/^B (\d+)$/, 'Barnard $1'], [/^vdB (\d+)$/, 'VDB $1'], [/^Mel (\d+)$/, 'Cl Melotte $1'], [/^Abell (\d+)$/, 'PN A66 $1'],
    [clusters, 'Cl $1 $2'], [/^vdBH (\d+)$/, 'Cl VDBH $1'], [/^Palomar (\d+)$/, 'Cl Pal $1']]
  for (const [re, to] of rules) if (re.test(id)) return id.replace(re, to)
  return id
}

/** Typ SIMBAD gwiazdy (np. „*”, „Or*”, „Be*”, „Y*O”); gromady, asocjacje i strumienie gwiazd nie są gwiazdami. */
export function isStarOtype(otype: string): boolean {
  const t = otype.trim()
  return t.includes('*') && !['Cl*', 'As*', 'St*', 'C?*', 'Cl?', 'As?'].includes(t)
}

/** Odległość wycinka z katalogu aplikacji (bez gwiazd pola). */
export function catalogDistance(object: Pick<DSO, 'distLy' | 'distUncLy' | 'distInfo'>): CutDistance {
  if (!object.distLy || !object.distInfo) return NO_DISTANCE
  const { scope, method, source, ref } = object.distInfo
  return { distLy: object.distLy, uncertaintyLy: object.distUncLy, distanceScope: scope, distanceMethod: method, distanceSource: source, distanceRef: ref, distanceOrigin: 'catalog' }
}

/** Promień dopasowania gwiazdy oświetlającej (pozycje van den Bergha 1966) do gwiazdy Gaia z pola. */
const ILLUMINATOR_MATCH_DEG = 20 / 3600

/**
 * Odległość gwiazdy oświetlającej z gwiazd Gaia pola zdjęcia. Gwiazda należąca do gromady z katalogu (odległość zgodna
 * w 3σ albo 10 %) dostaje odległość gromady: paralaksy jasnych gwiazd są mniej pewne niż średnia z setek członków.
 * Gwiazda bez wiarygodnej paralaksy (ϖ/σ < 5) albo nieodnaleziona w polu: brak odległości.
 */
export function illuminatorDistance(object: Pick<DSO, 'illuminator'>, stars: PhotoStar[], cluster: Pick<DSO, 'id' | 'distLy' | 'distUncLy' | 'distInfo'> | null): CutDistance | null {
  const ill = object.illuminator
  if (!ill) return null
  const star = stars
    .filter((s) => separationDeg(s.raDeg, s.decDeg, ill.raDeg, ill.decDeg) <= ILLUMINATOR_MATCH_DEG && (ill.vMag === null || Math.abs(s.gMag - ill.vMag) <= 1.5))
    .sort((a, b) => a.gMag - b.gMag)[0]
  if (!star || star.distLy === null) return null
  const sigma = star.distLoLy !== null && star.distHiLy !== null ? (star.distHiLy - star.distLoLy) / 2 : null
  if (cluster?.distLy && cluster.distInfo?.verified && Math.abs(star.distLy - cluster.distLy) <= Math.max(3 * (sigma ?? 0), 0.1 * cluster.distLy)) {
    return { distLy: cluster.distLy, uncertaintyLy: cluster.distUncLy, distanceScope: 'illuminator', distanceMethod: `${ill.star} w gromadzie ${cluster.id}: odległość gromady`, distanceSource: cluster.distInfo.source, distanceRef: cluster.distInfo.ref, distanceOrigin: 'stars' }
  }
  return { distLy: star.distLy, uncertaintyLy: sigma, distanceScope: 'illuminator', distanceMethod: `paralaksa ${ill.star} (${star.id})`, distanceSource: 'Bailer-Jones i in. 2021, odległość geometryczna', distanceRef: '2021AJ....161..147B', distanceOrigin: 'stars' }
}

/**
 * Najlepsza odległość wycinka ustalana przez aplikację: sprawdzona wartość katalogu, potem gwiazda oświetlająca z pola
 * zdjęcia, na końcu niesprawdzona wartość katalogu (Wikidata).
 */
export function cutDistance(object: Pick<DSO, 'distLy' | 'distUncLy' | 'distInfo' | 'illuminator'>, stars: PhotoStar[] | null, cluster: Pick<DSO, 'id' | 'distLy' | 'distUncLy' | 'distInfo'> | null): CutDistance {
  if (object.distInfo?.verified) return catalogDistance(object)
  return (stars && illuminatorDistance(object, stars, cluster)) || catalogDistance(object)
}

const CUT_FIELDS = ['distLy', 'uncertaintyLy', 'distanceScope', 'distanceMethod', 'distanceSource', 'distanceRef', 'distanceOrigin'] as const

/** Scala potwierdzone oznaczenia tego samego regionu H II. Zachowuje geometrię głównego wpisu i ręczny wybór odległości. */
export function canonicalPhotoCuts(cuts: PhotoCut[], byId: ReadonlyMap<string, DSO>): PhotoCut[] {
  const groups = new Map<string, { geometry: PhotoCut; distance: PhotoCut }>()
  let changed = false
  for (const cut of cuts) {
    const primary = byId.get(byId.get(cut.id)?.photoPrimaryId ?? '')
    const id = primary?.id ?? cut.id
    const group = groups.get(id)
    if (!group) {
      groups.set(id, { geometry: cut, distance: cut })
      changed ||= !!primary
      continue
    }
    changed = true
    if (cut.id === id) group.geometry = cut
    const current = group.distance
    const manual = cut.distanceOrigin === 'user'
    const currentManual = current.distanceOrigin === 'user'
    if (manual !== currentManual ? manual : cut.id === id) group.distance = cut
  }
  if (!changed) return cuts
  return [...groups].map(([id, { geometry, distance }]) => {
    if (geometry.id === id && geometry === distance) return geometry
    const primary = byId.get(id)
    const fields = Object.fromEntries(CUT_FIELDS.map((field) => [field, distance[field]])) as CutDistance
    return { ...geometry, ...fields, id, raDeg: primary?.raDeg ?? geometry.raDeg, decDeg: primary?.decDeg ?? geometry.decDeg }
  })
}

/** Odległości wycinków ustalane przez aplikację odświeżone z bieżącego katalogu i gwiazd Gaia pola (gwiazda
 *  oświetlająca); wybór z edycji i wartość regresora (gdy łańcuch nic nie daje) zostają. Bez zmian zwraca ten sam projekt. */
export function refreshCutDistances<P extends { cuts: PhotoCut[]; stars: { stars: PhotoStar[] } | null }>(project: P, catalog: DSO[], byId: Map<string, DSO>): P {
  const stars = project.stars?.stars ?? null
  const canonical = canonicalPhotoCuts(project.cuts, byId)
  let changed = canonical !== project.cuts
  const cuts = canonical.map((cut) => {
    const object = cut.distanceOrigin === 'user' ? undefined : byId.get(cut.id)
    if (!object) return cut
    const next = cutDistance(object, stars, object.illuminator?.cluster != null ? catalog[object.illuminator.cluster] ?? null : null)
    // Wartość regresora zostaje, dopóki katalog lub gwiazda oświetlająca nie dadzą lepszej.
    if (next.distLy === null && cut.distanceOrigin === 'regressor' && !object.unresolved) return cut
    if (CUT_FIELDS.every((field) => next[field] === cut[field])) return cut
    changed = true
    return { ...cut, ...next }
  })
  return changed ? { ...project, cuts } : project
}

/** Wynik wrappera regresora (scripts/regressor/cut_distance.py). */
export type RegressorResult =
  | { status: 'ok'; kind: 'group'; members: number; distance_pc: number; lo_pc: number; hi_pc: number; cone_deg: number; sigma_vt_kms?: number | null }
  | { status: 'ok'; kind: 'cf4'; distance_pc: number; lo_pc: number; hi_pc: number }
  | { status: 'ok'; kind: 'sdss_z'; z_helio: number }
  | { status: 'abstain'; reason: string }
  | { status: 'error'; message: string }

/** Typy, dla których regresor ma sens (populacja gwiazd w stożku albo z i CF4 galaktyki). */
export const REGRESSOR_TYPES: readonly string[] = ['EN', 'RN', 'CN', 'OC', 'GC', 'G', 'GG']

/**
 * Stan zadań zdjęcia na serwerze po zgłoszeniu albo ostatnim odpytaniu: `running` — stały proces liczy któryś z jego
 * wycinków (3–5 s na wycinek); `queued` — wszystkie czekają w kolejce (za innym zdjęciem albo na start procesu: od ok. 20 s
 * do kilku minut); `error` — odpytanie nie doszło do serwera.
 */
export type RegressorPollState = 'running' | 'queued' | 'error'
export const REGRESSOR_POLL_RUNNING_MS = 3_000
export const REGRESSOR_POLL_QUEUED_MS = 5_000
export const REGRESSOR_POLL_MS = 15_000
export const REGRESSOR_POLL_MAX_MS = 120_000

/**
 * Odstęp następnego odpytania regresora w ms; `previous` to poprzedni odstęp (null przy pierwszym po zgłoszeniu).
 * Liczony wycinek: co 3 s, bo wynik przychodzi po 3–5 s, a odpytanie to tylko odczyt mapy w pamięci serwera.
 * Kolejka: od 5 s, potem × 1,5 do 15 s (start procesu albo inne zdjęcie mogą trwać minuty). Błąd: od 15 s
 * podwojenie do 2 min (C08); po powrocie serwera kolejka wraca od razu do najwyżej 15 s.
 */
export function regressorPollDelay(previous: number | null, state: RegressorPollState): number {
  if (state === 'error') return Math.min(REGRESSOR_POLL_MAX_MS, Math.max(REGRESSOR_POLL_MS, (previous ?? 0) * 2))
  if (state === 'running') return REGRESSOR_POLL_RUNNING_MS
  return previous === null ? REGRESSOR_POLL_QUEUED_MS : Math.min(REGRESSOR_POLL_MS, Math.max(REGRESSOR_POLL_QUEUED_MS, previous * 1.5))
}

/** Wycinek do regresora: bez odległości z łańcucha i bez wyboru użytkownika, z rozstrzygniętą tożsamością. */
export function regressorEligible(cut: PhotoCut, object: Pick<DSO, 'unresolved'> | undefined): boolean {
  return !!object && !object.unresolved && cut.distLy === null && cut.distanceOrigin !== 'user' && REGRESSOR_TYPES.includes(cut.type)
}

const regressorFields = (distLy: number, uncertaintyLy: number | null, scope: DistanceScope, method: string): CutDistance =>
  ({ distLy, uncertaintyLy, distanceScope: scope, distanceMethod: `regresor, niezweryfikowane: ${method}`, distanceSource: 'astro-regressor (model)', distanceRef: '', distanceOrigin: 'regressor' })

/** Wartość regresora do pokazania (zawsze jako niezweryfikowana, z metodą modelu) albo null, gdy nie jest sensowna:
 *  odmowa, błąd, grupa poniżej 5 gwiazd albo niepewność ponad 50 %. */
export function regressorDistance(result: RegressorResult, raDeg: number, decDeg: number): CutDistance | null {
  if (result.status !== 'ok') return null
  let d: CutDistance
  if (result.kind === 'sdss_z') {
    const z = redshiftDistance(result.z_helio, raDeg, decDeg)
    if (!z) return null
    d = regressorFields(z.distLy, z.uncertaintyLy, 'redshift', `z = ${result.z_helio.toFixed(5).replace('.', ',')} z widma SDSS, cz_CMB = ${Math.round(z.czCmb)} km/s, H₀ = 70`)
  } else {
    if (![result.distance_pc, result.lo_pc, result.hi_pc].every(Number.isFinite) || result.distance_pc <= 0) return null
    if (result.kind === 'group' && result.members < 5) return null
    const sigma = (result.hi_pc - result.lo_pc) / 2 * LY_PER_PC
    d = result.kind === 'group'
      ? regressorFields(result.distance_pc * LY_PER_PC, sigma, 'population', `grupa ${result.members} gwiazd Gaia DR3 (HDBSCAN 5D + MLE paralaks${result.sigma_vt_kms ? `, σv ${result.sigma_vt_kms.toFixed(1).replace('.', ',')} km/s` : ''}), stożek ${result.cone_deg.toFixed(2).replace('.', ',')}°`)
      : regressorFields(result.distance_pc * LY_PER_PC, sigma, 'object', 'moduł odległości Cosmicflows-4 (dopasowanie ≤ 15″)')
  }
  return hasDistance(d) ? d : null
}
