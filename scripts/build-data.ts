// Buduje dane aplikacji w public/data z pobranych źródeł (pamięć w scripts/.cache):
// - catalog.json: katalog obiektów (OpenNGC + VizieR, zbudowany wcześniej do old-catalog.json, plus mgławice planetarne
//   spoza niego z V/84, scripts/planetaryNebulae.ts) z odległościami
//   (Hunt & Reffert 2023, Cosmicflows-4, z z SIMBAD, Zucker i in. 2020, Ranasinghe & Leahy 2022 dla SNR, Chornay & Walton 2021 dla PN,
//   na końcu Wikidata; scripts/catalogDistances.ts),
//   gwiazdami oświetlającymi vdB (VII/21) i tytułami artykułów Wikipedii z Wikidata,
// - docs/odleglosci/tozsamosc.json: rozbieżności tożsamości z SIMBAD (pozycje, aliasy, typy) do przeglądu,
// - sky.json: gwiazdy do ok. 6,5 mag (d3-celestial, BSD) z numerami HIP, linie i nazwy gwiazdozbiorów
//   (Stellarium modern, CC BY-SA 4.0; polskie nazwy IAU CC0),
// - constellations3d.json: linie Stellarium z odległościami gwiazd z paralaks Hipparcosa (CDS I/239),
// - art/<IAU>.webp: ilustracje gwiazdozbiorów (Stellarium, Free Art License) jako biały rysunek z kanałem alfa,
// - outlines.json: kontury mgławic (OpenNGC outlines, CC BY-SA 4.0).
// - milkyway.png: jasność Drogi Mlecznej w siatce RA/Dec co 0,5° (kontury d3-celestial, BSD), rozmyta.
//
// Uruchom: node scripts/build-data.ts   (Node ≥ 23 uruchamia TypeScript bez kompilacji)
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import * as Astronomy from 'astronomy-engine'
import { CATALOG_DISTANCE_SCOPES, type CatalogRow } from '../src/lib/catalog.ts'
import { isStarOtype, simbadId } from '../src/lib/distance.ts'
import { buildHipsFixtures, buildMilkyWay, buildOutlines, buildSky } from './buildSkyOverlays.ts'
import { checkIdentity, cf4Choice, cw21Choice, findCw21, findHr23, findRl22, hr23ByName, identityLimitDeg, parseCw21, parseRl22, rl22Choice, hr23Choice, ILLUMINATOR_MATCH_DEG, KNOWN_DISCREPANCIES, withWikidataFallback, matchCf4, parseCf4, parseHr23, parseSimbadIdents, parseVizierTsv, parseZucker, catalogAliases, darkCloudIds, redshiftChoice, separationDeg, simbadKey, WIKIDATA, zuckerChoice, type Choice, type Entry, type Hr23Cluster, type SimbadObject, type SourceKey } from './catalogDistances.ts'
import { cachedBytes, cachedText } from './download.ts'
import { hiiChoice, parseFosterBrunt, parseRusseil, parseWise, type HiiSources } from './hiiDistances.ts'
import { GALAXY_TYPES, parseArp, parseCederblad, parseHcg, parseRcw, planNebulae } from './brightNebulae.ts'
import { MANUAL_OBJECTS, WR_NEBULAE } from './manualObjects.ts'
import { newPlanetaryNebulae, parseLeDu, parseV84, planLeDu, type PlanetaryNebula } from './planetaryNebulae.ts'
import { displayOf, parseHr23Catalog, planClusters, type Hr23Entry } from './openClusters.ts'
import { inheritSnrComponentDistances, SNR_COMPONENT_PARENT_DISTANCES } from './snrComponents.ts'

const ROOT = join(import.meta.dirname, '..')
const CACHE = join(ROOT, 'scripts', '.cache')
const OUT = join(ROOT, 'public', 'data')
const UA = 'konuzastro-tracker-build/0.1 (https://konuzastro.pl)'

mkdirSync(join(OUT, 'art'), { recursive: true })

const cached = (name: string, url: string, init?: RequestInit, check?: (text: string) => void) =>
  cachedText(CACHE, name, url, { ...init, headers: { 'User-Agent': UA, ...init?.headers } }, check)
const cachedBinary = (name: string, url: string) => cachedBytes(CACHE, name, url, { headers: { 'User-Agent': UA } })

async function sparql(name: string, query: string): Promise<string[][]> {
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`
  const csv = await cached(name, url, { headers: { Accept: 'text/csv' } })
  return parseCsv(csv).slice(1)
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += ch
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

const r = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d

// Lustra VizieR (CDS w Strasburgu bywa nieosiągalny, lustro bywa bez bazy); te same tabele i format asu-tsv.
const VIZIER_MIRRORS = ['https://vizier.cds.unistra.fr/viz-bin/asu-tsv', 'https://vizier.cfa.harvard.edu/viz-bin/asu-tsv', 'https://vizier.nao.ac.jp/viz-bin/asu-tsv', 'https://vizier.china-vo.org/viz-bin/asu-tsv']
/** Odpowiedź VizieR z błędem zapytania albo bez wierszy danych nie trafia do pamięci. */
function checkVizier(text: string) {
  if (/QUERY_STATUS=ERROR|^#INFO\tError=/m.test(text)) throw new Error('VizieR: błąd zapytania')
  if (text.split(/\r?\n/).filter((line) => line && !line.startsWith('#')).length < 4) throw new Error('VizieR: brak wierszy')
}
async function vizier(name: string, query: string): Promise<string> {
  let error: unknown
  for (const base of VIZIER_MIRRORS) {
    try { return await cached(`vizier/${name}.tsv`, `${base}?${query}&-out.max=unlimited`, undefined, checkVizier) } catch (e) { error = e }
  }
  throw error
}
// Oficjalna kopia SIMBAD (IDIA); format i zawartość jak w CDS.
const SIMBAD_TAP = 'https://simbad.idia.ac.za/simbad/sim-tap/sync'

function checkSimbad(text: string) {
  const parsed = JSON.parse(text) as { metadata?: unknown; data?: unknown }
  if (!Array.isArray(parsed?.metadata) || !Array.isArray(parsed?.data)) throw new Error('SIMBAD: niepoprawna odpowiedź JSON')
}

/** Obiekty SIMBAD dla oznaczeń katalogu: zapytania po 400 identyfikatorów, każde w pamięci pod skrótem listy. */
async function simbadObjects(designations: string[]): Promise<Map<string, SimbadObject>> {
  const ids = [...new Set(designations.map(simbadId).filter((id): id is string => id !== null))].sort()
  const result = new Map<string, SimbadObject>()
  for (let i = 0; i < ids.length; i += 400) {
    const chunk = ids.slice(i, i + 400)
    const hash = createHash('sha1').update(chunk.join('\n')).digest('hex').slice(0, 12)
    const query = `SELECT i.id, b.main_id, b.otype, b.ra, b.dec, b.rvz_redshift, b.rvz_qual, b.nbref FROM ident AS i JOIN basic AS b ON b.oid = i.oidref WHERE i.id IN (${chunk.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')}) AND b.ra IS NOT NULL`
    const json = await cached(`simbad/ident-${hash}.json`, SIMBAD_TAP, { method: 'POST', body: new URLSearchParams({ request: 'doQuery', lang: 'adql', format: 'json', query }) }, checkSimbad)
    for (const [key, value] of parseSimbadIdents(json)) result.set(key, value)
  }
  return result
}

// ---------- Katalog ----------

interface OldRecord {
  primary: { catalog: string; id: string }
  designations: { catalog: string; id: string }[]
  commonNames: string[]
  type: string
  raDeg: number
  decDeg: number
  sizeMajorArcmin: number | null
  sizeMinorArcmin: number | null
  positionAngleDeg: number | null
  magV: number | null
  surfaceBrightness: number | null
  vdbStarMagV?: number | null
  constellation: string | null
}

const TYPE_CODE: Record<string, string> = {
  galaxy: 'G', galaxy_group: 'GG', emission_nebula: 'EN', reflection_nebula: 'RN', dark_nebula: 'DN',
  planetary_nebula: 'PN', supernova_remnant: 'SNR', open_cluster: 'OC', globular_cluster: 'GC',
  cluster_nebula: 'CN', other: 'X',
}

/** Oznaczenie w postaci wyświetlanej: „M 51”, „NGC 5194”, „Sh2-105”, „SNR G184.6-05.8”. */
function designation(catalog: string, id: string): string {
  switch (catalog) {
    case 'Sh2': return `Sh2-${id}`
    case 'SNR-G': return `SNR ${id}`
    case 'VdB': return `vdB ${id}`
    case 'Other': return id
    default: return `${catalog} ${id}`
  }
}

/** Klucz do łączenia z Wikidata: wielkie litery, bez spacji i myślników („SH2105”, „M51”, „B33”). */
function joinKey(code: string): string | null {
  const m = /^(M|NGC|IC|SH ?2|B|BARNARD)\s*-?\s*(\d+)$/.exec(code.trim().toUpperCase())
  if (!m) return null
  const cat = m[1] === 'BARNARD' ? 'B' : m[1].replace(' ', '')
  return `${cat}${Number(m[2])}`
}

const LY_PER_UNIT: Record<string, number> = {
  'http://www.wikidata.org/entity/Q531': 1, // rok świetlny
  'http://www.wikidata.org/entity/Q12129': 3.26156, // parsek
  'http://www.wikidata.org/entity/Q11929860': 3261.56, // kiloparsek
  'http://www.wikidata.org/entity/Q3773454': 3.26156e6, // megaparsek
}

const CATALOG_QIDS = 'wd:Q14534 wd:Q741672 wd:Q14530 wd:Q2565783 wd:Q3247327' // NGC, IC, Messier, Sh2, Barnard

async function buildCatalog() {
  const oldPath = join(CACHE, 'old-catalog.json')
  const seedPath = join(ROOT, 'scripts', 'data', 'base-catalog.json.gz')
  const old: OldRecord[] = existsSync(oldPath)
    ? JSON.parse(readFileSync(oldPath, 'utf8'))
    : JSON.parse(gunzipSync(readFileSync(seedPath)).toString('utf8'))
  // Mgławice planetarne spoza OpenNGC (V/84, np. HFG 1) na końcu: indeksy dotychczasowych obiektów się nie zmieniają.
  const pns = newPlanetaryNebulae(
    parseV84(await vizier('v84-main', '-source=V/84/main&-out.all'), await vizier('v84-diam', '-source=V/84/diam&-out.all')),
    old.map((o) => ({ designations: o.designations.map((d) => designation(d.catalog, d.id)), raDeg: o.raDeg, decDeg: o.decDeg, nebula: !['galaxy', 'galaxy_group', 'open_cluster', 'globular_cluster'].includes(o.type) })),
  )
  const appendPn = (pn: PlanetaryNebula) => old.push({
    primary: { catalog: 'Other', id: pn.name }, designations: [pn.name, pn.png, ...pn.idents].map((id) => ({ catalog: 'Other', id })), commonNames: [],
    type: 'planetary_nebula', raDeg: pn.raDeg, decDeg: pn.decDeg, sizeMajorArcmin: pn.diamArcmin ? r(pn.diamArcmin, 2) : null,
    sizeMinorArcmin: pn.minorArcmin ? r(pn.minorArcmin, 2) : null,
    positionAngleDeg: null, magV: null, surfaceBrightness: null, constellation: Astronomy.Constellation(pn.raDeg / 15, pn.decDeg).symbol,
  })
  for (const pn of pns) appendPn({ ...pn, idents: [] })
  console.log(`mgławice planetarne V/84: ${pns.length} nowych`)

  // Gromady Hunt & Reffert 2023 z katalogów optycznych i odkryć amatorów (scripts/openClusters.ts) po mgławicach
  // planetarnych. Obiekty katalogu dostają tylko aliasy; gromada na pozycji gromady katalogu bez wspólnej nazwy jest
  // tym samym obiektem albo nową gromadą według głównych identyfikatorów SIMBAD (bez nich ją pomijamy).
  const hr23Catalog = parseHr23Catalog(await vizier('hr23-catalog', '-source=J/A%2BA/673/A114/clusters&-out=Name,AllNames,Type,CST,N,RA_ICRS,DE_ICRS,r50,rc,rt,CMDCl50,dist50'))
  // Gromady dopisujemy w dwóch blokach: spełniające próg CMD w dotychczasowym miejscu, klasyczne bez progu na końcu
  // katalogu, żeby nie przesuwać indeksów obiektów dopisanych wcześniej.
  const appendClusters = async (list: Hr23Entry[], owners: Hr23Entry[], label: string) => {
    const knownObjects = old.map((o) => ({ designations: o.designations.map((d) => designation(d.catalog, d.id)), type: TYPE_CODE[o.type] ?? 'X', raDeg: o.raDeg, decDeg: o.decDeg, majArcmin: o.sizeMajorArcmin ?? 0 }))
    // Nazwy obiektu katalogu dla SIMBAD: oznaczenia i nazwy zwyczajowe („NAME Hyades” dla C 41).
    const hostNames = (i: number) => [...knownObjects[i].designations, ...old[i].commonNames.map((n) => `NAME ${n}`)]
    const probe = planClusters(list, knownObjects, undefined, owners)
    const clusterSimbad = await simbadObjects([
      ...probe.nearby.flatMap((n) => [n.cluster.primary, ...n.cluster.aliases, ...hostNames(n.known)]),
      ...[...probe.aliases].flatMap(([i, aliases]) => [...aliases, ...hostNames(i)]),
      ...probe.added.flatMap((c) => [c.primary, ...c.aliases]),
    ])
    const hit = (d: string) => { const id = simbadId(d); return id ? clusterSimbad.get(simbadKey(id)) : undefined }
    const mainId = (names: string[]) => names.map(hit).find((h) => h !== undefined)?.mainId ?? null
    const verdicts: string[] = []
    const clusterPlan = planClusters(list, knownObjects, (cluster, i) => {
      const a = mainId([cluster.primary, ...cluster.aliases]), b = mainId(hostNames(i))
      const verdict = a === null || b === null ? null : a === b
      verdicts.push(`${cluster.primary} ↔ ${knownObjects[i].designations[0]}: ${verdict === null ? 'pominięta (brak w SIMBAD)' : verdict ? 'aliasy' : 'nowa'}`)
      return verdict
    }, owners)
    // AllNames łączy czasem sąsiednie gromady (Czernik 43 przy M 52): alias, który SIMBAD stawia jako inny obiekt poza
    // granicą tożsamości gospodarza, odrzucamy razem ze skrótem („Cz 43” idzie za „Czernik 43”).
    const dropped: string[] = []
    const ownAliases = (aliases: string[], host: string[], raDeg: number, decDeg: number, type: string, majArcmin: number) => aliases.filter((alias) => {
      const h = hit(displayOf(alias))
      const own = !h || h.mainId === mainId(host) || separationDeg(raDeg, decDeg, h.raDeg, h.decDeg) <= identityLimitDeg(type, majArcmin)
      if (!own) dropped.push(`${host[0]}: ${alias} (SIMBAD ${h.mainId})`)
      return own
    })
    for (const [i, aliases] of clusterPlan.aliases) {
      const k = knownObjects[i]
      old[i].designations.push(...ownAliases(aliases, hostNames(i), k.raDeg, k.decDeg, k.type, k.majArcmin).map((id) => ({ catalog: 'Other', id })))
    }
    for (const c of clusterPlan.added) c.aliases = ownAliases(c.aliases, [c.primary], c.raDeg, c.decDeg, c.type, c.diamArcmin)
    for (const c of clusterPlan.added) {
      old.push({
        primary: { catalog: 'Other', id: c.primary }, designations: [c.primary, ...c.aliases].map((id) => ({ catalog: 'Other', id })), commonNames: [],
        type: c.type === 'GC' ? 'globular_cluster' : 'open_cluster', raDeg: c.raDeg, decDeg: c.decDeg, sizeMajorArcmin: c.diamArcmin || null, sizeMinorArcmin: null,
        positionAngleDeg: null, magV: null, surfaceBrightness: null, constellation: Astronomy.Constellation(c.raDeg / 15, c.decDeg).symbol,
      })
    }
    console.log(`gromady HR23 (${label}): ${clusterPlan.added.length} nowych, aliasy dla ${clusterPlan.aliases.size} obiektów; na pozycji gromady katalogu:\n  ${verdicts.join('\n  ')}\n  odrzucone aliasy (${dropped.length}): ${dropped.join('; ')}`)
  }
  // Pierwszy blok rozdziela nazwy tylko między gromady z progiem CMD, jak przed dodaniem drugiego bloku.
  const cmdOk = hr23Catalog.filter((c) => c.cmdOk)
  await appendClusters(cmdOk, cmdOk, 'próg CMD')

  // Mgławice planetarne odkryte przez amatorów (Le Dû i in. 2022) po gromadach, potem lista ręczna (scripts/manualObjects.ts).
  const known = () => old.map((o) => ({ designations: o.designations.map((d) => designation(d.catalog, d.id)), raDeg: o.raDeg, decDeg: o.decDeg, nebula: !['galaxy', 'galaxy_group', 'open_cluster', 'globular_cluster'].includes(o.type) }))
  const leDu = parseLeDu(await vizier('ledu22-pn', '-source=J/A%2BA/666/A152/table1&-out.all'))
  const leDuPlan = planLeDu(leDu, known())
  for (const [i, aliases] of leDuPlan.aliases) old[i].designations.push(...aliases.map((id) => ({ catalog: 'Other', id })))
  for (const pn of leDuPlan.added) appendPn(pn)
  console.log(`mgławice planetarne Le Dû 2022: ${leDuPlan.added.length} nowych z ${leDu.length}; aliasy: ${[...leDuPlan.aliases].map(([i, a]) => `${designation(old[i].primary.catalog, old[i].primary.id)} ← ${a.join(', ')}`).join('; ')}`)
  const taken = new Set(known().flatMap((k) => k.designations.map((d) => d.toUpperCase().replace(/\s+/g, ''))))
  for (const m of MANUAL_OBJECTS) {
    const ids = [m.primary, ...m.aliases]
    if (ids.some((d) => taken.has(d.toUpperCase().replace(/\s+/g, '')))) { console.log(`lista ręczna: ${m.primary} już w katalogu, pomijam`); continue }
    old.push({
      primary: { catalog: 'Other', id: m.primary }, designations: ids.map((id) => ({ catalog: 'Other', id })), commonNames: m.commonNames,
      type: m.type === 'PN' ? 'planetary_nebula' : 'emission_nebula', raDeg: m.raDeg, decDeg: m.decDeg, sizeMajorArcmin: m.majArcmin,
      sizeMinorArcmin: m.minArcmin, positionAngleDeg: m.paDeg, magV: null, surfaceBrightness: null, constellation: Astronomy.Constellation(m.raDeg / 15, m.decDeg).symbol,
    })
  }
  await appendClusters(hr23Catalog.filter((c) => !c.cmdOk), hr23Catalog, 'klasyczne bez progu CMD')

  // Mgławice jasne Cederblada i RCW (scripts/brightNebulae.ts) na końcu: obiekt katalogu, który SIMBAD uznaje za ten sam
  // (albo przy braku rozstrzygnięcia ma wspólne oznaczenie NGC/IC), dostaje aliasy z numerami Gum.
  {
    // Pozycje Cederblada (1900, z literówkami w tablicy: Ced 6b z deklinacją −61° zamiast +61°, Ced 176d przesunięty o 1ʰ)
    // bierzemy z SIMBAD, gdy zna obiekt; RCW zostaje z pozycjami katalogu, rozbieżności pokaże przegląd tożsamości.
    const ced = parseCederblad(await vizier('ced-vii231', '-source=VII/231/catalog&-out.all'))
    const cedSim = await simbadObjects(ced.map((n) => n.primary))
    let moved = 0
    for (const n of ced) {
      const s = cedSim.get(simbadKey(n.primary))
      if (!s) continue
      if (separationDeg(n.raDeg, n.decDeg, s.raDeg, s.decDeg) > 0.25) moved++
      n.raDeg = s.raDeg
      n.decDeg = s.decDeg
      // Typ z SIMBAD, gdy to mgławica: tablica Cederblada często nie podaje widma (wtedy przyjmujemy emisyjną).
      if (n.type !== 'CN' && s.otype === 'RNe') n.type = 'RN'
      if (n.type !== 'CN' && (s.otype === 'HII' || s.otype === 'GNe')) n.type = 'EN'
    }
    console.log(`Cederblad: pozycje z SIMBAD dla ${ced.filter((n) => cedSim.has(simbadKey(n.primary))).length} z ${ced.length}, ${moved} przesuniętych o > 0,25°`)
    const list = [...ced, ...parseRcw(await vizier('rcw-vii216', '-source=VII/216/rcw&-out.all'))]
    // Nazwy zwyczajowe też się liczą: „RCW 86” jest nazwą SNR G315.4-02.3 z OpenNGC, nie jej oznaczeniem.
    const known = old.map((o) => ({ designations: [...o.designations.map((d) => designation(d.catalog, d.id)), ...o.commonNames], type: TYPE_CODE[o.type] ?? 'X', raDeg: o.raDeg, decDeg: o.decDeg, majArcmin: o.sizeMajorArcmin ?? 0 }))
    const hostNames = (i: number) => [...known[i].designations, ...old[i].commonNames.map((n) => `NAME ${n}`)]
    const options = { searchDeg: 0.5, closeDeg: 1 / 60 }
    const probe = planNebulae(list, known, () => false, undefined, { searchDeg: options.searchDeg })
    const sim = await simbadObjects([...list.map((n) => n.primary), ...probe.checked.flatMap((c) => hostNames(c.known))])
    const lookup = (names: string[]) => names.map((d) => { const id = simbadId(d); return id ? sim.get(simbadKey(id)) : undefined }).find((h) => h !== undefined)
    // Mgławica, którą SIMBAD utożsamia z gwiazdą (Ced 135a, RCW 107 → HD 148937), nie rozstrzyga: decyduje wspólne NGC/IC.
    const plan = planNebulae(list, known, (n, i) => {
      const a = lookup([n.primary]), b = lookup(hostNames(i))
      return !a || !b || isStarOtype(a.otype) ? null : a.mainId === b.mainId
    }, undefined, options)
    for (const [i, aliases] of plan.aliases) old[i].designations.push(...aliases.map((id) => ({ catalog: 'Other', id })))
    for (const n of plan.added) {
      old.push({
        primary: { catalog: 'Other', id: n.primary }, designations: [n.primary, ...n.aliases].map((id) => ({ catalog: 'Other', id })), commonNames: [],
        type: n.type === 'CN' ? 'cluster_nebula' : n.type === 'RN' ? 'reflection_nebula' : 'emission_nebula', raDeg: n.raDeg, decDeg: n.decDeg,
        sizeMajorArcmin: n.majArcmin || null, sizeMinorArcmin: n.minArcmin, positionAngleDeg: null, magV: null, surfaceBrightness: null,
        constellation: Astronomy.Constellation(n.raDeg / 15, n.decDeg).symbol,
      })
    }
    console.log(`Cederblad i RCW: ${plan.added.length} nowych z ${list.length}, aliasy dla ${plan.aliases.size} obiektów`)
  }

  // Numery WR przy mgławicach z tabeli Toalá i in. 2015 (scripts/manualObjects.ts).
  {
    const ids = old.map((o) => o.designations.map((d) => designation(d.catalog, d.id)))
    const missing: string[] = []
    let added = 0
    for (const [wr, nebula] of WR_NEBULAE) {
      if (ids.some((list) => list.includes(wr))) continue
      const i = ids.findIndex((list) => list.includes(nebula))
      if (i < 0) { missing.push(nebula); continue }
      old[i].designations.push({ catalog: 'Other', id: wr })
      added++
    }
    console.log(`WR: ${added} aliasów${missing.length ? `, bez mgławicy w katalogu: ${missing.join(', ')}` : ''}`)
  }

  // Galaktyki osobliwe Arpa i zwarte grupy Hicksona (scripts/brightNebulae.ts): ten sam obiekt według SIMBAD (albo
  // wspólne oznaczenie M/NGC/IC/UGC) dostaje alias, reszta to nowe galaktyki i grupy.
  {
    const list = [
      ...parseArp(await vizier('arp-vii192', '-source=VII/192/arpord&-out.all&-out.add=_RAJ,_DEJ&-oc.form=d')),
      ...parseHcg(await vizier('hcg-vii213', '-source=VII/213/groups&-out.all&-out.add=_RAJ,_DEJ&-oc.form=d')),
    ]
    const known = old.map((o) => ({ designations: [...o.designations.map((d) => designation(d.catalog, d.id)), ...o.commonNames], type: TYPE_CODE[o.type] ?? 'X', raDeg: o.raDeg, decDeg: o.decDeg, majArcmin: o.sizeMajorArcmin ?? 0 }))
    const probe = planNebulae(list, known, () => false, GALAXY_TYPES)
    // (próba bez skrótów nazw i odległości, żeby SIMBAD dostał wszystkich kandydatów)
    const sim = await simbadObjects([...list.map((n) => n.primary), ...probe.checked.flatMap((c) => known[c.known].designations)])
    const mainId = (names: string[]) => names.map((d) => { const id = simbadId(d); return id ? sim.get(simbadKey(id)) : undefined }).find((h) => h !== undefined)?.mainId ?? null
    const plan = planNebulae(list, known, (n, i) => {
      const a = mainId([n.primary]), b = mainId(known[i].designations)
      return a === null || b === null ? null : a === b
    }, GALAXY_TYPES, { nameFirst: true, closeDeg: 0.5 / 60 })
    for (const [i, aliases] of plan.aliases) old[i].designations.push(...aliases.map((id) => ({ catalog: 'Other', id })))
    for (const n of plan.added) {
      old.push({
        primary: { catalog: 'Other', id: n.primary }, designations: [{ catalog: 'Other', id: n.primary }], commonNames: [],
        type: n.type === 'GG' ? 'galaxy_group' : 'galaxy', raDeg: n.raDeg, decDeg: n.decDeg, sizeMajorArcmin: n.majArcmin || null, sizeMinorArcmin: null,
        positionAngleDeg: null, magV: n.mag ?? null, surfaceBrightness: null, constellation: Astronomy.Constellation(n.raDeg / 15, n.decDeg).symbol,
      })
    }
    console.log(`Arp i HCG: ${plan.added.length} nowych z ${list.length}, aliasy dla ${plan.aliases.size} obiektów`)
  }

  const distRows = await sparql('wd-dist.csv', `SELECT ?code ?dist ?unit WHERE {
    VALUES ?cat { ${CATALOG_QIDS} }
    ?item p:P528 ?cs . ?cs ps:P528 ?code ; pq:P972 ?cat .
    ?item p:P2583 ?ds . ?ds psv:P2583 ?dv . ?dv wikibase:quantityAmount ?dist ; wikibase:quantityUnit ?unit . }`)
  const distances = new Map<string, number[]>()
  for (const [code, dist, unit] of distRows) {
    const key = joinKey(code)
    const factor = LY_PER_UNIT[unit]
    if (!key || !factor || !(Number(dist) > 0)) continue
    const list = distances.get(key) ?? []
    list.push(Number(dist) * factor)
    distances.set(key, list)
  }
  const median = (list: number[]) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)]

  const wikiRows = await sparql('wd-wiki.csv', `SELECT ?code ?plTitle ?enTitle WHERE {
    VALUES ?cat { ${CATALOG_QIDS} }
    ?item p:P528 ?cs . ?cs ps:P528 ?code ; pq:P972 ?cat .
    OPTIONAL { ?pl schema:about ?item ; schema:isPartOf <https://pl.wikipedia.org/> ; schema:name ?plTitle }
    OPTIONAL { ?en schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?enTitle }
    FILTER(BOUND(?plTitle) || BOUND(?enTitle)) }`)
  const wiki = new Map<string, { pl?: string; en?: string }>()
  for (const [code, pl, en] of wikiRows) {
    const key = joinKey(code)
    if (!key) continue
    const entry = wiki.get(key) ?? {}
    if (pl && !entry.pl) entry.pl = pl
    if (en && !entry.en) entry.en = en
    wiki.set(key, entry)
  }

  // Obiekty bez oznaczenia NGC/IC/M/Sh2/B w Wikidata: tytuły artykułów (sprawdzone w API Wikipedii 13.11.2026).
  const WIKI_EXTRA: Record<string, { pl: string; en: string }> = {
    'ESO 56-115': { pl: 'Wielki Obłok Magellana', en: 'Large Magellanic Cloud' },
  }
  const looksLikeCode = (title: string) => /^(M|NGC|IC|Sh ?2|Barnard|B|LDN|LBN|Messier)\s*-?\s*\d/i.test(title)

  const entries: Entry[] = old.map((o) => {
    const primary = designation(o.primary.catalog, o.primary.id)
    const ids = o.designations.map((d) => designation(d.catalog, d.id))
    return {
      designations: [primary, ...ids.filter((d) => d !== primary)], type: TYPE_CODE[o.type] ?? 'X', raDeg: o.raDeg, decDeg: o.decDeg,
      majArcmin: o.sizeMajorArcmin ?? 0, vdbStarMagV: o.vdbStarMagV ?? null,
    }
  })
  const distancePlan = await planDistances(entries, (designations) => {
    const list = designations.map(joinKey).filter((k): k is string => k !== null).map((k) => distances.get(k)).find((d) => d !== undefined)
    return list ? Math.round(median(list)) : null
  })
  // Nowe źródła dopisujemy po dotychczasowych, w kolejności dodania, żeby zachować indeksy w zapisanym katalogu.
  const appended = ['2015AJ....150..147F', '2021AJ....161..147B', '2014ApJS..212....1A', '2019ApJ...885..131R', ...MANUAL_OBJECTS.flatMap((m) => m.distance ? [m.distance.ref] : [])]
  for (const { ref } of SNR_COMPONENT_PARENT_DISTANCES.values()) appended.push(ref)
  for (const ref of [null, ...appended]) {
    for (const { choice } of distancePlan.objects) {
      if (choice && (ref === null ? !appended.includes(choice.source.ref) : choice.source.ref === ref)) distancePlan.sourceIndex(choice.source)
    }
  }

  // Kolumny: id, oznaczenia, nazwa PL, nazwy EN, typ, RA, Dec, wymiar a, b, PA, mag, jasność pow., gwiazdozbiór,
  // odległość [ly], artykuł pl, artykuł en; tylko przy odległości lub gwieździe oświetlającej: względna niepewność [‰],
  // indeks tabeli źródeł, gwiazda oświetlająca (src/lib/catalog.ts).
  const rows = old.map((o, i) => {
    const ids = o.designations.map((d) => designation(d.catalog, d.id))
    const primary = designation(o.primary.catalog, o.primary.id)
    const keys = o.designations.map((d) => joinKey(designation(d.catalog, d.id))).filter((k): k is string => k !== null)
    const w = WIKI_EXTRA[primary] ?? keys.map((k) => wiki.get(k)).find((d) => d !== undefined)
    const plName = w?.pl && !looksLikeCode(w.pl) ? w.pl.replace(/\s*\(.*\)$/, '') : ''
    const { choice, illuminator } = distancePlan.objects[i]
    const row: CatalogRow = [
      primary,
      ids.filter((d) => d !== primary).join('|'),
      plName,
      o.commonNames.join('|'),
      entries[i].type as CatalogRow[4],
      r(o.raDeg, 4),
      r(o.decDeg, 4),
      o.sizeMajorArcmin === null ? 0 : r(o.sizeMajorArcmin, 1),
      o.sizeMinorArcmin === null ? 0 : r(o.sizeMinorArcmin, 1),
      o.positionAngleDeg ?? -1,
      o.magV === null ? 99 : r(o.magV, 1),
      o.surfaceBrightness === null ? 99 : r(o.surfaceBrightness, 1),
      o.constellation ?? '',
      choice ? Math.round(choice.ly) : 0,
      w?.pl ?? '',
      w?.en ?? '',
    ]
    if (choice || illuminator) {
      row[16] = choice?.sigmaLy ? Math.max(1, Math.round(choice.sigmaLy / choice.ly * 1000)) : 0
      row[17] = choice ? distancePlan.sourceIndex(choice.source) : -1
    }
    if (illuminator) row[18] = illuminator
    return row
  })
  const inherited = inheritSnrComponentDistances(rows, distancePlan.sources, distancePlan.unresolved, distancePlan.photoAliases)
  const withDist = rows.filter((row) => row[13] !== 0).length
  writeFileSync(join(OUT, 'catalog.json'), JSON.stringify({ v: 2, sources: distancePlan.sources, unresolved: distancePlan.unresolved, photoAliases: distancePlan.photoAliases, rows }))
  mkdirSync(join(ROOT, 'docs', 'odleglosci'), { recursive: true })
  writeFileSync(join(ROOT, 'docs', 'odleglosci', 'tozsamosc.json'), JSON.stringify(distancePlan.review, null, 1) + '\n')
  console.log(`catalog: ${rows.length} obiektów, ${withDist} z odległością (składowe SNR: ${inherited}; ${Object.entries(distancePlan.counts).map(([k, v]) => `${k} ${v}`).join(', ')})`)
}

/**
 * Odległości katalogu: kontrola tożsamości z SIMBAD, łańcuch źródeł (scripts/catalogDistances.ts) i gwiazdy
 * oświetlające vdB. Obiekt z nierozstrzygniętą tożsamością (pozycja SIMBAD > 0,25° od katalogu) zostaje bez odległości.
 */
async function planDistances(entries: Entry[], wikidata: (designations: string[]) => number | null) {
  const simbad = await simbadObjects(entries.flatMap((e) => e.designations))
  const hr23 = parseHr23(await vizier('hr23-clusters', '-source=J/A%2BA/673/A114/clusters&-out=Name,AllNames,Type,CST,RA_ICRS,DE_ICRS,rt,dist16,dist50,dist84'))
  const cf4 = parseCf4(await vizier('cf4-table2', '-source=J/ApJ/944/94/table2&-out=PGC,DM,e_DM,DMsnIa,DMtf,DMfp,DMsbf,DMsnII,DMtrgb,DMceph,DMmas,RAJ2000,DEJ2000'))
  const zucker = parseZucker(await vizier('zucker2020-handbook', '-source=J/A%2BA/633/A51/handbook&-out.all'))
  const rl22 = new Map(parseRl22(await vizier('rl22-snr', '-source=J/ApJ/940/63/table1&-out.all')).map((snr) => [snr.key, snr]))
  const cw21 = parseCw21(await vizier('cw21-pn', '-source=J/A%2BA/656/A110/tablea1&-out=PNG,Name,Rel,RUWE,pnRAdeg,pnDEdeg,pnRad,rcomb,b_rcomb,B_rcomb'))
  const clouds = darkCloudIds(await vizier('db02-cloud-names', '-source=J/A%2BA/383/631/cdn&-out=Names'))
  const cw21ByPng = new Map(cw21.map((pn) => [pn.png, pn]))
  const vdbStars = new Map(parseVizierTsv(await vizier('vdb-vii21', '-source=VII/21&-out=VdB,DM,HD')).map((row) => [Number(row.VdB), row.HD ? `HD ${row.HD}` : row.DM.replace(/\s+/g, ' ')]))
  // Obszary H II: Foster & Brunt 2015, katalog WISE (Anderson i in. 2014) i prędkości Russeil 2003 (scripts/hiiDistances.ts).
  const hii: HiiSources = {
    fb: parseFosterBrunt(await vizier('fb15-table2', '-source=J/AJ/150/147/table2&-out.all')),
    wise: parseWise(await vizier('wise14-hii', '-source=J/ApJS/212/1/wisecat&-out.all')),
    russeil: parseRusseil(await vizier('russeil03-v', '-source=J/A%2BA/397/133/table1&-out.all')),
  }
  const hr23ByKey = hr23ByName(hr23)
  const cf4ByEntry = matchCf4(entries, cf4)

  const sources: [number, string, string, string, number][] = []
  const sourceKeys = new Map<string, number>()
  const sourceIndex = (key: SourceKey) => {
    const id = JSON.stringify(key)
    if (!sourceKeys.has(id)) { sourceKeys.set(id, sources.length); sources.push([CATALOG_DISTANCE_SCOPES.indexOf(key.scope), key.method, key.source, key.ref, key.verified ? 1 : 0]) }
    return sourceKeys.get(id)!
  }
  const counts: Record<string, number> = { 'Hunt & Reffert': 0, CF4: 0, z: 0, Zucker: 0, 'Ranasinghe & Leahy': 0, 'Chornay & Walton': 0, 'WISE paralaksa': 0, 'Foster & Brunt': 0, WISE: 0, kinematyczna: 0, 'gwiazdy jonizujące': 0, publikacja: 0, Wikidata: 0, 'Wikidata zamiast σ > 50 %': 0, 'bez tożsamości': 0 }
  const review: { position: object[]; aliases: object[]; types: object[]; known: object[] } = { position: [], aliases: [], types: [], known: KNOWN_DISCREPANCIES }
  const clusters = new Map<number, Hr23Cluster>()
  const centralStars = new Map<number, (typeof cw21)[number]>()
  const identities = entries.map((e, i) => {
    const identity = checkIdentity(e, simbad)
    if (identity.otype !== 'PN' || !['EN', 'RN', 'PN'].includes(e.type)) return identity
    // Dla rozległej PN SIMBAD może podawać pozycję gwiazdy centralnej, a Lynds środek jasnego łuku.
    // Wymagamy tej samej nazwy w CW21 i SIMBAD oraz środka wpisu wewnątrz opublikowanego promienia PN.
    const named = cw21.filter((pn) => simbadKey(pn.name) === simbadKey(identity.mainId)
      && separationDeg(e.raDeg, e.decDeg, pn.raDeg, pn.decDeg) <= Math.max(1 / 60, pn.radiusDeg))
    if (named.length !== 1 || identity.foreignAliases.length) return identity
    centralStars.set(i, named[0])
    e.type = 'PN'
    return { ...identity, verdict: 'ok' as const, typeNote: '' }
  })
  const choices = entries.map((e, i): Choice | null => {
    const identity = identities[i]
    const id = e.designations[0]
    if (identity.typeNote) review.types.push({ id, simbad: identity.mainId, note: identity.typeNote })
    for (const a of identity.foreignAliases) review.aliases.push({ id, alias: a.alias, simbad: a.mainId, sepDeg: r(a.sepDeg, 3) })
    if (identity.verdict === 'position') {
      review.position.push({ id, simbad: identity.mainId, otype: identity.otype, sepDeg: r(identity.sepDeg!, 3) })
      counts['bez tożsamości']++
      return null
    }
    const usable = e.designations.filter((d) => !identity.foreignAliases.some((a) => a.alias === d))
    const measured = (() => {
      // Lista ręczna: odległość z publikacji (scripts/manualObjects.ts).
      const manual = MANUAL_OBJECTS.find((m) => m.primary === id)?.distance
      if (manual) {
        const pc = LY_PER_UNIT['http://www.wikidata.org/entity/Q12129']
        return { key: 'publikacja', choice: {
          ly: manual.pc * pc, sigmaLy: manual.sigmaPc === null ? null : manual.sigmaPc * pc,
          source: { scope: 'object', method: manual.method, source: manual.source, ref: manual.ref, verified: true },
        } satisfies Choice }
      }
      if (id === 'Sh2-101' && e.type === 'EN' && identity.verdict === 'ok' && identity.mainId === 'LBN 071.58+02.86') {
        // HD 227018 (Gaia DR3 2059434898612310656), Bailer-Jones r_med_geo i percentyle 16–84.
        return { key: 'gwiazdy jonizujące', choice: {
          ly: 2107.6736 * LY_PER_UNIT['http://www.wikidata.org/entity/Q12129'],
          sigmaLy: (2183.071 - 2044.608) / 2 * LY_PER_UNIT['http://www.wikidata.org/entity/Q12129'],
          source: { scope: 'illuminator', method: 'paralaksa gwiazdy jonizującej HD 227018 (Gaia DR3 2059434898612310656)', source: 'Bailer-Jones i in. 2021, odległość geometryczna', ref: '2021AJ....161..147B', verified: true },
        } satisfies Choice }
      }
      const central = centralStars.get(i)
      if (central) return { key: 'Chornay & Walton', choice: cw21Choice(central) }
      const cluster = findHr23(e, usable, hr23ByKey)
      if (cluster) { clusters.set(i, cluster); return { key: 'Hunt & Reffert', choice: hr23Choice(cluster) } }
      const hiiStep = hiiChoice(e, usable, hii)
      if (hiiStep) return hiiStep
      const galaxy = cf4ByEntry.get(i)
      if (galaxy) return { key: 'CF4', choice: cf4Choice(galaxy) }
      if (e.type === 'G' || e.type === 'GG') {
        for (const des of usable) {
          const sid = simbadId(des)
          const z = redshiftChoice(sid ? simbad.get(simbadKey(sid)) : undefined)
          if (z) return { key: 'z', choice: z }
        }
      }
      const pn = findCw21(e, usable, cw21, cw21ByPng)
      if (pn) return { key: 'Chornay & Walton', choice: cw21Choice(pn) }
      const snr = findRl22(e, usable, rl22)
      if (snr) {
        const measured = SNR_COMPONENT_PARENT_DISTANCES.get(id)
        if (measured) {
          const { pc, sigmaPc, method, source, ref } = measured
          const lyPerPc = LY_PER_UNIT['http://www.wikidata.org/entity/Q12129']
          return { key: 'publikacja', choice: { ly: pc * lyPerPc, sigmaLy: sigmaPc * lyPerPc, source: { scope: 'object', method, source, ref, verified: true } } satisfies Choice }
        }
        return { key: 'Ranasinghe & Leahy', choice: rl22Choice(snr) }
      }
      const cloud = e.type === 'DN' ? zuckerChoice(e, zucker) : null
      return cloud ? { key: 'Zucker', choice: cloud } : null
    })()
    const choice = withWikidataFallback(measured?.choice ?? null, wikidata(usable))
    if (choice?.source === WIKIDATA) counts[measured ? 'Wikidata zamiast σ > 50 %' : 'Wikidata']++
    else if (measured) counts[measured.key]++
    return choice
  })
  // Gromady HR23 w katalogu: zakres pływowy do sprawdzenia, czy gwiazda oświetlająca może należeć do gromady.
  const clusterOf = (raDeg: number, decDeg: number) => {
    let best: { i: number; sep: number } | null = null
    for (const [i, c] of clusters) {
      const sep = separationDeg(raDeg, decDeg, c.raDeg, c.decDeg)
      if (sep <= c.rtDeg && (!best || sep < best.sep)) best = { i, sep }
    }
    return best?.i ?? -1
  }
  const illuminators = new Map<number, [string, number, number, number, number]>()
  entries.forEach((e, i) => {
    const vdb = /^vdB (\d+)$/.exec(e.designations[0])
    if (!vdb || identities[i].verdict === 'position') return
    illuminators.set(i, [vdbStars.get(Number(vdb[1])) ?? `gwiazda vdB ${vdb[1]}`, r(e.raDeg, 5), r(e.decDeg, 5), e.vdbStarMagV ?? 99, clusterOf(e.raDeg, e.decDeg)])
  })
  const stars = [...illuminators.entries()]
  entries.forEach((e, i) => {
    if (illuminators.has(i) || !/^(NGC|IC) /.test(e.designations[0]) || !['RN', 'EN', 'CN'].includes(e.type) || identities[i].verdict === 'position') return
    const near = stars.map(([, s]) => ({ s, sep: separationDeg(e.raDeg, e.decDeg, s[1], s[2]) })).filter((x) => x.sep <= ILLUMINATOR_MATCH_DEG).sort((a, b) => a.sep - b.sep)[0]
    if (near) illuminators.set(i, near.s)
  })
  return {
    sources, sourceIndex, review, counts: { ...counts, 'gwiazdy oświetlające': illuminators.size },
    photoAliases: catalogAliases(entries, identities, clouds, clusters),
    unresolved: identities.flatMap((identity, i) => identity.verdict === 'position' ? [i] : []),
    objects: entries.map((_, i) => ({ choice: choices[i], illuminator: illuminators.get(i) ?? null })),
  }
}

const deps = { rootDir: ROOT, cacheDir: CACHE, outDir: OUT, cached, cachedBinary, vizier }
const only = process.argv[2]
if (!only || only === 'catalog') await buildCatalog()
if (!only || only === 'sky') await buildSky(deps)
if (!only || only === 'outlines') await buildOutlines(deps)
if (!only || only === 'milkyway') await buildMilkyWay(deps)
if (only === 'hips') await buildHipsFixtures(deps)
