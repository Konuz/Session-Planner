// Buduje dane aplikacji w public/data z pobranych źródeł (pamięć w scripts/.cache):
// - catalog.json: katalog obiektów (OpenNGC + VizieR, zbudowany wcześniej do old-catalog.json, plus mgławice planetarne
//   spoza niego z V/84, scripts/planetaryNebulae.ts) z odległościami
//   (Hunt & Reffert 2023, Cosmicflows-4, z z SIMBAD, Zucker i in. 2020, Ranasinghe & Leahy 2022 dla SNR, Chornay & Walton 2021 dla PN,
//   na końcu Wikidata; scripts/catalogDistances.ts),
//   gwiazdami oświetlającymi vdB (VII/21) i tytułami artykułów Wikipedii z Wikidata,
// - docs/odleglosci/tozsamosc.json: rozbieżności tożsamości z SIMBAD (pozycje, aliasy, typy) do przeglądu,
// - sky.json: gwiazdy do ok. 6,5 mag (d3-celestial, BSD) z numerami HIP, linie i nazwy gwiazdozbiorów
//   (Stellarium modern, CC BY-SA 4.0; polskie nazwy z tłumaczenia Stellarium),
// - constellations3d.json: linie Stellarium z odległościami gwiazd z paralaks Hipparcosa (CDS I/239),
// - art/<IAU>.webp: ilustracje gwiazdozbiorów (Stellarium, Free Art License) jako biały rysunek z kanałem alfa,
// - outlines.json: kontury mgławic (OpenNGC outlines, CC BY-SA 4.0).
// - milkyway.png: jasność Drogi Mlecznej w siatce RA/Dec co 0,5° (kontury d3-celestial, BSD), rozmyta.
//
// Uruchom: node scripts/build-data.ts   (Node ≥ 23 uruchamia TypeScript bez kompilacji)
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as Astronomy from 'astronomy-engine'
import sharp from 'sharp'
import { simbadId } from '../src/lib/distance.ts'
import { checkIdentity, cf4Choice, clusterKey, cw21Choice, findCw21, findHr23, findRl22, parseCw21, parseRl22, rl22Choice, hr23Choice, ILLUMINATOR_MATCH_DEG, KNOWN_DISCREPANCIES, withWikidataFallback, matchCf4, parseCf4, parseHr23, parseSimbadIdents, parseVizierTsv, parseZucker, photoNebulaAliases, redshiftChoice, separationDeg, simbadKey, WIKIDATA, zuckerChoice, type Choice, type Entry, type Hr23Cluster, type SimbadObject, type SourceKey } from './catalogDistances.ts'
import { cachedBytes, cachedText } from './download.ts'
import { hiiChoice, parseFosterBrunt, parseRusseil, parseWise, type HiiSources } from './hiiDistances.ts'
import { newPlanetaryNebulae, parseV84 } from './planetaryNebulae.ts'

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
const VIZIER_MIRRORS = ['https://vizier.cfa.harvard.edu/viz-bin/asu-tsv', 'http://vizier.nao.ac.jp/viz-bin/asu-tsv']
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

/** Obiekty SIMBAD dla oznaczeń katalogu: zapytania po 400 identyfikatorów, każde w pamięci pod skrótem listy. */
async function simbadObjects(designations: string[]): Promise<Map<string, SimbadObject>> {
  const ids = [...new Set(designations.map(simbadId).filter((id): id is string => id !== null))].sort()
  const result = new Map<string, SimbadObject>()
  for (let i = 0; i < ids.length; i += 400) {
    const chunk = ids.slice(i, i + 400)
    const hash = createHash('sha1').update(chunk.join('\n')).digest('hex').slice(0, 12)
    const query = `SELECT i.id, b.main_id, b.otype, b.ra, b.dec, b.rvz_redshift, b.rvz_qual, b.nbref FROM ident AS i JOIN basic AS b ON b.oid = i.oidref WHERE i.id IN (${chunk.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')}) AND b.ra IS NOT NULL`
    const json = await cached(`simbad/ident-${hash}.json`, SIMBAD_TAP, { method: 'POST', body: new URLSearchParams({ request: 'doQuery', lang: 'adql', format: 'json', query }) })
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
  if (!existsSync(oldPath)) throw new Error(`Brak ${oldPath}. Utwórz go: git show 6c2fb33:public/catalog/catalog.v1.json > scripts/.cache/old-catalog.json`)
  const old: OldRecord[] = JSON.parse(readFileSync(oldPath, 'utf8'))
  // Mgławice planetarne spoza OpenNGC (V/84, np. HFG 1) na końcu: indeksy dotychczasowych obiektów się nie zmieniają.
  const pns = newPlanetaryNebulae(
    parseV84(await vizier('v84-main', '-source=V/84/main&-out.all'), await vizier('v84-diam', '-source=V/84/diam&-out.all')),
    old.map((o) => ({ designations: o.designations.map((d) => designation(d.catalog, d.id)), raDeg: o.raDeg, decDeg: o.decDeg, nebula: !['galaxy', 'galaxy_group', 'open_cluster', 'globular_cluster'].includes(o.type) })),
  )
  for (const pn of pns) {
    old.push({
      primary: { catalog: 'Other', id: pn.name }, designations: [{ catalog: 'Other', id: pn.name }, { catalog: 'Other', id: pn.png }], commonNames: [],
      type: 'planetary_nebula', raDeg: pn.raDeg, decDeg: pn.decDeg, sizeMajorArcmin: pn.diamArcmin ? r(pn.diamArcmin, 2) : null, sizeMinorArcmin: null,
      positionAngleDeg: null, magV: null, surfaceBrightness: null, constellation: Astronomy.Constellation(pn.raDeg / 15, pn.decDeg).symbol,
    })
  }
  console.log(`mgławice planetarne V/84: ${pns.length} nowych`)

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
  const appended = ['2015AJ....150..147F', '2021AJ....161..147B', '2014ApJS..212....1A', '2019ApJ...885..131R']
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
    const row: unknown[] = [
      primary,
      ids.filter((d) => d !== primary).join('|'),
      plName,
      o.commonNames.join('|'),
      TYPE_CODE[o.type] ?? 'X',
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
    if (choice || illuminator) row.push(choice?.sigmaLy ? Math.max(1, Math.round(choice.sigmaLy / choice.ly * 1000)) : 0, choice ? distancePlan.sourceIndex(choice.source) : -1)
    if (illuminator) row.push(illuminator)
    return row
  })
  const withDist = rows.filter((row) => row[13] !== 0).length
  writeFileSync(join(OUT, 'catalog.json'), JSON.stringify({ v: 2, sources: distancePlan.sources, unresolved: distancePlan.unresolved, photoAliases: distancePlan.photoAliases, rows }))
  mkdirSync(join(ROOT, 'docs', 'odleglosci'), { recursive: true })
  writeFileSync(join(ROOT, 'docs', 'odleglosci', 'tozsamosc.json'), JSON.stringify(distancePlan.review, null, 1) + '\n')
  console.log(`catalog: ${rows.length} obiektów, ${withDist} z odległością (${Object.entries(distancePlan.counts).map(([k, v]) => `${k} ${v}`).join(', ')})`)
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
  const cw21ByPng = new Map(cw21.map((pn) => [pn.png, pn]))
  const vdbStars = new Map(parseVizierTsv(await vizier('vdb-vii21', '-source=VII/21&-out=VdB,DM,HD')).map((row) => [Number(row.VdB), row.HD ? `HD ${row.HD}` : row.DM.replace(/\s+/g, ' ')]))
  // Obszary H II: Foster & Brunt 2015, katalog WISE (Anderson i in. 2014) i prędkości Russeil 2003 (scripts/hiiDistances.ts).
  const hii: HiiSources = {
    fb: parseFosterBrunt(await vizier('fb15-table2', '-source=J/AJ/150/147/table2&-out.all')),
    wise: parseWise(await vizier('wise14-hii', '-source=J/ApJS/212/1/wisecat&-out.all')),
    russeil: parseRusseil(await vizier('russeil03-v', '-source=J/A%2BA/397/133/table1&-out.all')),
  }
  const hr23ByKey = new Map<string, Hr23Cluster>()
  for (const c of hr23) for (const name of c.names) if (!hr23ByKey.has(clusterKey(name))) hr23ByKey.set(clusterKey(name), c)
  const cf4ByEntry = matchCf4(entries, cf4)

  const sources: [number, string, string, string, number][] = []
  const sourceKeys = new Map<string, number>()
  const SCOPES = ['object', 'population', 'illuminator', 'cloud', 'redshift']
  const sourceIndex = (key: SourceKey) => {
    const id = JSON.stringify(key)
    if (!sourceKeys.has(id)) { sourceKeys.set(id, sources.length); sources.push([SCOPES.indexOf(key.scope), key.method, key.source, key.ref, key.verified ? 1 : 0]) }
    return sourceKeys.get(id)!
  }
  const counts: Record<string, number> = { 'Hunt & Reffert': 0, CF4: 0, z: 0, Zucker: 0, 'Ranasinghe & Leahy': 0, 'Chornay & Walton': 0, 'WISE paralaksa': 0, 'Foster & Brunt': 0, WISE: 0, kinematyczna: 0, 'gwiazdy jonizujące': 0, Wikidata: 0, 'Wikidata zamiast σ > 50 %': 0, 'bez tożsamości': 0 }
  const review: { position: object[]; aliases: object[]; types: object[]; known: object[] } = { position: [], aliases: [], types: [], known: KNOWN_DISCREPANCIES }
  const clusters = new Map<number, Hr23Cluster>()
  const identities = entries.map((e) => checkIdentity(e, simbad))
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
      if (id === 'Sh2-101' && e.type === 'EN' && identity.verdict === 'ok' && identity.mainId === 'LBN 071.58+02.86') {
        // HD 227018 (Gaia DR3 2059434898612310656), Bailer-Jones r_med_geo i percentyle 16–84.
        return { key: 'gwiazdy jonizujące', choice: {
          ly: 2107.6736 * LY_PER_UNIT['http://www.wikidata.org/entity/Q12129'],
          sigmaLy: (2183.071 - 2044.608) / 2 * LY_PER_UNIT['http://www.wikidata.org/entity/Q12129'],
          source: { scope: 'illuminator', method: 'paralaksa gwiazdy jonizującej HD 227018 (Gaia DR3 2059434898612310656)', source: 'Bailer-Jones i in. 2021, odległość geometryczna', ref: '2021AJ....161..147B', verified: true },
        } satisfies Choice }
      }
      const cluster = findHr23(e, usable, hr23ByKey)
      if (cluster) { clusters.set(i, cluster); return { key: 'Hunt & Reffert', choice: hr23Choice(cluster) } }
      const hiiStep = hiiChoice(e, usable, hii)
      if (hiiStep) return hiiStep
      const galaxy = cf4ByEntry.get(i)
      if (galaxy) return { key: 'CF4', choice: cf4Choice(galaxy) }
      if (e.type === 'G' || e.type === 'GG') {
        const sid = simbadId(e.designations[0])
        const z = redshiftChoice(sid ? simbad.get(simbadKey(sid)) : undefined)
        if (z) return { key: 'z', choice: z }
      }
      const pn = findCw21(e, usable, cw21, cw21ByPng)
      if (pn) return { key: 'Chornay & Walton', choice: cw21Choice(pn) }
      const snr = findRl22(e, usable, rl22)
      if (snr) return { key: 'Ranasinghe & Leahy', choice: rl22Choice(snr) }
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
    photoAliases: photoNebulaAliases(entries, identities),
    unresolved: identities.flatMap((identity, i) => identity.verdict === 'position' ? [i] : []),
    objects: entries.map((_, i) => ({ choice: choices[i], illuminator: illuminators.get(i) ?? null })),
  }
}

// ---------- Niebo: gwiazdy, linie, nazwy, ilustracje ----------

interface StellariumConstellation {
  id: string
  lines: number[][]
  image?: { file: string; size: [number, number]; anchors: { pos: [number, number]; hip: number }[] }
  common_name: { english: string; native: string }
}

function polishNames(po: string): Map<string, string> {
  const names = new Map<string, string>()
  const re = /msgctxt "IAU constellation name"\s*\nmsgid "([^"]+)"\s*\nmsgstr "([^"]*)"/g
  for (const m of po.matchAll(re)) if (m[2]) names.set(m[1], m[2])
  return names
}

async function buildSky() {
  const ST = 'https://raw.githubusercontent.com/Stellarium/stellarium/master'
  const D3C = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data'
  const stars = JSON.parse(await cached('d3c-stars.6.json', `${D3C}/stars.6.json`)) as {
    features: { id: number; properties: { mag: number; bv: string }; geometry: { coordinates: [number, number] } }[]
  }
  const starNames = JSON.parse(await cached('d3c-starnames.json', `${D3C}/starnames.json`)) as Record<number, { name?: string; bayer?: string; flam?: string; c?: string }>
  const labels = JSON.parse(await cached('d3c-constellations.json', `${D3C}/constellations.json`)) as {
    features: { id: string; properties: { rank: string }; geometry: { coordinates: [number, number] } }[]
  }
  const modern = JSON.parse(await cached('st-modern-index.json', `${ST}/skycultures/modern/index.json`)) as {
    constellations: StellariumConstellation[]
  }
  const pl = polishNames(await cached('st-pl.po', `${ST}/po/stellarium-skycultures/pl.po`))

  const byHip = new Map<number, [number, number, number]>()
  for (const f of stars.features) {
    const [lon, lat] = f.geometry.coordinates
    byHip.set(f.id, [(lon + 360) % 360, lat, f.properties.mag])
  }
  // Gwiazdy linii słabsze niż 6 mag: Hipparcos z VizieR (I/239), zwykłe HTTP.
  const needed = new Set<number>()
  for (const c of modern.constellations) {
    for (const line of c.lines) for (const hip of line) needed.add(hip)
    for (const a of c.image?.anchors ?? []) needed.add(a.hip)
  }
  const missing = [...needed].filter((hip) => !byHip.has(hip))
  if (missing.length) {
    const tsv = await cached(
      'hip-missing.tsv',
      `https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=I/239/hip_main&-out=HIP,_RA.icrs,_DE.icrs,Vmag&-oc.form=d&HIP=${missing.join(',')}`,
    )
    for (const line of tsv.split('\n')) {
      const cols = line.trim().split(/\t/)
      if (cols.length >= 4 && /^\d+$/.test(cols[0].trim())) byHip.set(Number(cols[0]), [Number(cols[1]), Number(cols[2]), Number(cols[3])])
    }
  }

  // Hipparcos: paralaksa w mas; tylko dodatnie pomiary pozwalają oszacować odległość.
  const lineHips = [...new Set(modern.constellations.flatMap((c) => c.lines.flat()))]
  const distances = new Map<number, number>()
  for (let i = 0; i < lineHips.length; i += 100) {
    const parallaxes = await cached(
      `hip-constellation-parallax-${i}.tsv`,
      `https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=I/239/hip_main&-out=HIP,Plx&HIP=${lineHips.slice(i, i + 100).join(',')}`,
    )
    for (const line of parallaxes.split('\n')) {
      const cols = line.trim().split(/\t/)
      if (!/^\d+$/.test(cols[0]?.trim())) continue
      const parallax = Number(cols[1])
      if (Number.isFinite(parallax) && parallax > 0) distances.set(Number(cols[0]), 3261.56 / parallax)
    }
  }
  if (!distances.size) throw new Error('Brak paralaks Hipparcosa dla gwiazdozbiorów 3D')
  writeFileSync(join(OUT, 'constellations3d.json'), JSON.stringify({
    source: 'Nazwy: d3-celestial (BSD); odległości: Hipparcos I/239 (CDS); linie: Stellarium modern (CC BY-SA 4.0)',
    constellations: modern.constellations.map((c) => {
      const abbr = c.id.split(' ')[2]
      return {
        abbr,
        lines: c.lines.map((line) => line.map((hip) => {
          const star = byHip.get(hip)
          const dist = distances.get(hip)
          return star && dist ? [r(star[0], 3), r(star[1], 3), r(dist, 2)] : null
        })),
        stars: [...new Set(c.lines.flat())].flatMap((hip) => {
          const star = byHip.get(hip)
          const dist = distances.get(hip)
          const names = starNames[hip]
          if (names?.c && names.c !== abbr) return []
          const name = names?.name?.trim() || (names?.bayer ? `${names.bayer} ${abbr}` : names?.flam ? `${names.flam} ${abbr}` : '')
          return star && dist && name ? [{ raDeg: r(star[0], 3), decDeg: r(star[1], 3), distLy: r(dist, 2), name }] : []
        }),
      }
    }),
  }))

  // Gwiazdy: [ra, dec, mag, b-v, hip] posortowane od najjaśniejszej.
  const starRows = stars.features
    .map((f) => {
      const [ra, dec, mag] = byHip.get(f.id)!
      const bv = Number.parseFloat(f.properties.bv)
      return [r(ra, 3), r(dec, 3), r(mag, 2), Number.isFinite(bv) ? r(bv, 2) : 0.6, f.id]
    })
    .sort((a, b) => a[2] - b[2])

  const labelPos = new Map(labels.features.map((f) => [f.id, [r((f.geometry.coordinates[0] + 360) % 360, 2), r(f.geometry.coordinates[1], 2), Number(f.properties.rank)]]))

  const constellations = []
  for (const c of modern.constellations) {
    const abbr = c.id.split(' ')[2]
    const lines = c.lines.map((line) => line.map((hip) => byHip.get(hip)).filter((p) => p !== undefined).map(([ra, dec]) => [r(ra, 3), r(dec, 3)]))
    let art = null
    if (c.image) {
      const file = `${abbr}.webp`
      const target = join(OUT, 'art', file)
      if (!existsSync(target)) {
        const png = await cachedBinary(`art-${abbr}.png`, `${ST}/skycultures/modern/${c.image.file}`)
        const { data, info } = await sharp(png).greyscale().resize(384, 384, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
        const rgba = Buffer.alloc(info.width * info.height * 4)
        for (let i = 0; i < info.width * info.height; i++) {
          rgba[i * 4] = 225
          rgba[i * 4 + 1] = 245
          rgba[i * 4 + 2] = 255
          rgba[i * 4 + 3] = Math.min(255, Math.round(data[i * info.channels] * 2.4))
        }
        await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 70, alphaQuality: 60 }).toFile(target)
      }
      const scale = 384 / c.image.size[0]
      art = {
        file,
        anchors: c.image.anchors.map((a) => {
          const [ra, dec] = byHip.get(a.hip)!
          return [r(a.pos[0] * scale, 1), r(a.pos[1] * (384 / c.image!.size[1]), 1), r(ra, 3), r(dec, 3)]
        }),
      }
    }
    const english = c.common_name.english
    constellations.push({
      abbr,
      la: c.common_name.native,
      pl: pl.get(english) ?? pl.get(c.common_name.native) ?? c.common_name.native,
      label: labelPos.get(abbr) ?? null,
      lines,
      art,
    })
  }
  writeFileSync(join(OUT, 'sky.json'), JSON.stringify({ v: 1, stars: starRows, constellations }))
  const names = Object.fromEntries(constellations.map((c) => [c.abbr, c.pl]))
  writeFileSync(
    join(ROOT, 'src', 'lib', 'constellations.ts'),
    `// Polskie nazwy gwiazdozbiorów (z tłumaczenia Stellarium), generowane przez scripts/build-data.ts.\nexport const CONSTELLATION_PL: Record<string, string> = ${JSON.stringify(names, null, 1).replace(/"([A-Za-z]{3})":/g, '$1:')}\n`,
  )
  const noPl = constellations.filter((c) => c.pl === c.la).map((c) => c.abbr)
  console.log(`sky: ${starRows.length} gwiazd, ${constellations.length} gwiazdozbiorów, ${constellations.filter((c) => c.art).length} ilustracji; nazwa PL = łacińska: ${noPl.join(' ')}`)
}

// ---------- Kontury mgławic ----------

// OpenNGC outlines (Mattia Verga, CC BY-SA 4.0): obrysy narysowane w Aladin na DSS2, po trzy poziomy jasności
// (1: słaby zasięg, 2: standardowy, 3: jasne jądro). Pliki objects/*.txt to TSV z Aladin; wiersz z Cont_Flag „*”
// zamyka pierścień.
const ONGC_TAG = 'v20260501'
// Pliki nazwane od regionu nieba, nie od obiektu katalogu (bez odpowiednika w katalogu; nazwa do podpisu).
const REGIONS = new Map([
  ['Antlia', 'Pompa'], ['Cepheus', 'Cefeusz'], ['CoronaAustralis', 'Korona Południowa'], ['Cygnus', 'Łabędź'],
  ['LMC', 'Wielki Obłok Magellana'], ['Orion', 'Orion'], ['Puppis', 'Rufa'], ['Scorpion', 'Skorpion'], ['Vela', 'Żagiel'],
])
// Poziom 1 tylko dla dużych obrysów: promień od środka co najmniej tyle stopni.
const LARGE_LV1_DEG = 2
// Tolerancja uproszczenia w stopniach (przy najmniejszym polu kopuły 8° to ok. pół piksela).
const SIMPLIFY_DEG = 0.005

type RaDec = [number, number]

function parseAladin(tsv: string): RaDec[][] {
  const rings: RaDec[][] = [[]]
  for (const line of tsv.split('\n').slice(1)) {
    const cols = line.split('\t')
    if (cols.length < 4) continue
    const ring = rings[rings.length - 1]
    const p: RaDec = [Number(cols[2]), Number(cols[3])]
    const last = ring[ring.length - 1]
    if (!last || last[0] !== p[0] || last[1] !== p[1]) ring.push(p)
    if (cols[1] === '*') rings.push([])
  }
  return rings.filter((ring) => ring.length >= 3)
}

/** Środek pierścienia (średnia wektorów jednostkowych) i największa odległość kątowa od niego. */
function ringBounds(ring: RaDec[]): { centre: RaDec; radiusDeg: number } {
  const D = Math.PI / 180
  let x = 0, y = 0, z = 0
  for (const [ra, dec] of ring) {
    x += Math.cos(dec * D) * Math.cos(ra * D)
    y += Math.cos(dec * D) * Math.sin(ra * D)
    z += Math.sin(dec * D)
  }
  const n = Math.hypot(x, y, z)
  const centre: RaDec = [((Math.atan2(y, x) / D) + 360) % 360, Math.asin(z / n) / D]
  let radiusDeg = 0
  for (const [ra, dec] of ring) {
    const c = Math.sin(dec * D) * Math.sin(centre[1] * D) + Math.cos(dec * D) * Math.cos(centre[1] * D) * Math.cos((ra - centre[0]) * D)
    radiusDeg = Math.max(radiusDeg, Math.acos(Math.min(1, c)) / D)
  }
  return { centre, radiusDeg }
}

/** Douglas–Peucker w płaszczyźnie stycznej przy środku pierścienia (ΔRA·cos δ, Δδ), odporny na przejście RA przez 0°. */
function simplify(ring: RaDec[], centre: RaDec, tol: number): RaDec[] {
  const cosDec = Math.cos(centre[1] * Math.PI / 180)
  const xy = ring.map(([ra, dec]) => [(((ra - centre[0] + 540) % 360) - 180) * cosDec, dec - centre[1]])
  const keep = new Uint8Array(ring.length)
  keep[0] = keep[ring.length - 1] = 1
  const stack: [number, number][] = [[0, ring.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    const [ax, ay] = xy[a], [bx, by] = xy[b]
    const len = Math.hypot(bx - ax, by - ay)
    let best = -1, bestD = tol
    for (let i = a + 1; i < b; i++) {
      const [px, py] = xy[i]
      const d = len > 0 ? Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len : Math.hypot(px - ax, py - ay)
      if (d > bestD) { bestD = d; best = i }
    }
    if (best >= 0) {
      keep[best] = 1
      stack.push([a, best], [best, b])
    }
  }
  return ring.filter((_, i) => keep[i])
}

function angularDistance(a: RaDec, b: RaDec): number {
  const D = Math.PI / 180
  const c = Math.sin(a[1] * D) * Math.sin(b[1] * D) + Math.cos(a[1] * D) * Math.cos(b[1] * D) * Math.cos((a[0] - b[0]) * D)
  return Math.acos(Math.min(1, c)) / D
}

/** Punkt w pierścieniu (reguła parzystości) w płaszczyźnie stycznej przy jego środku. */
function insideRing(ring: RaDec[], centre: RaDec, ra: number, dec: number): boolean {
  const cosDec = Math.cos(centre[1] * Math.PI / 180)
  const xy = (a: number, d: number) => [(((a - centre[0] + 540) % 360) - 180) * cosDec, d - centre[1]]
  const [px, py] = xy(ra, dec)
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = xy(...ring[i]), [xj, yj] = xy(...ring[j])
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** „NGC0604” → „NGC 604”, „M045” → „M 45”, „IC0359A” → „IC 359A”, „C9” → „C 9”. */
function outlineId(base: string): string {
  const m = /^(NGC|IC|LBN|M|C)0*(\d+[A-Z]?)$/.exec(base)
  return m ? `${m[1]} ${m[2]}` : base
}

async function buildOutlines() {
  const list = JSON.parse(
    await cached('ongc-outlines-list.json', `https://api.github.com/repos/mattiaverga/OpenNGC/contents/outlines/objects?ref=${ONGC_TAG}`),
  ) as { name: string }[]
  const files = new Map<string, Map<number, string>>()
  for (const { name } of list) {
    const m = /^(.+?)_lv(\d)\.txt$/.exec(name)
    if (!m) continue
    if (!files.has(m[1])) files.set(m[1], new Map())
    files.get(m[1])!.set(Number(m[2]), name)
  }

  // Mgławice katalogu (zbudowanego wyżej): [id, …, typ, RA, Dec, wymiar a, …]. Bez ciemnych: obrysy OpenNGC
  // to jasne mgławice, a pierścień przypisany do LDN dostałby kolor pyłu (jak Cygnus#6 → LDN 900).
  const catalogRows = (JSON.parse(readFileSync(join(OUT, 'catalog.json'), 'utf8')) as { rows: [string, string, string, string, string, number, number, number][] }).rows
  const nebulae = catalogRows.filter((row) => ['EN', 'RN', 'SNR', 'CN'].includes(row[4]))
  const assigned: string[] = []

  const objects = []
  let points = 0
  const largeLv1: string[] = []
  for (const [base, levels] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    // Poziomy 2 (standardowy) i 3 (jasne jądro), a gdy obu brak — 1. Duże obrysy poziomu 1 dochodzą osobno.
    const picked = (REGIONS.has(base) ? [2] : [2, 3]).filter((lv) => levels.has(lv))
    if (levels.has(1)) picked.push(1)
    for (const level of picked) {
      const name = levels.get(level)!
      const raw = parseAladin(await cached(`ongc-${name}`, `https://raw.githubusercontent.com/mattiaverga/OpenNGC/${ONGC_TAG}/outlines/objects/${name}`))
      const bounds = raw.map(ringBounds)
      const extra = level === 1 && picked[0] !== 1
      if (extra && !REGIONS.has(base) && Math.max(...bounds.map((b) => b.radiusDeg)) < LARGE_LV1_DEG) continue
      if (extra) largeLv1.push(base)
      const rings = raw.map((ring, i) => simplify(ring, bounds[i].centre, SIMPLIFY_DEG).flatMap(([ra, dec]) => [r(ra, 3), r(dec, 3)]))
      points += rings.reduce((s, ring) => s + ring.length / 2, 0)
      if (!REGIONS.has(base)) {
        objects.push({ id: outlineId(base), level, rings })
        continue
      }
      // Pierścień regionu przypisany do największej mgławicy katalogu, której środek leży w środku pierścienia
      // (jak IC 434 z Płomieniem i B 33 w jednym obrysie) albo która obejmuje cały pierścień swoim promieniem
      // z katalogu i jest najwyżej dwa razy większa (łuk Barnarda: środek Sh2-276 leży poza obrysem łuku; bez
      // tej granicy całe kompleksy jak Cygnus X zagarniają wszystkie pierścienie). Bez takiej zostaje podpis regionu.
      raw.forEach((ring, i) => {
        const { centre, radiusDeg } = bounds[i]
        const inside = nebulae.filter((row) => {
          if (insideRing(ring, centre, row[5], row[6])) return true
          const objR = row[7] / 120
          return objR >= radiusDeg && objR <= 2 * radiusDeg && angularDistance(centre, [row[5], row[6]]) + radiusDeg <= objR * 1.1
        })
        const best = inside.sort((a, b) => b[7] - a[7])[0]
        if (best) assigned.push(`${base}#${i}→${best[0]}`)
        objects.push(best ? { id: best[0], level, rings: [rings[i]] } : { id: base, level, region: REGIONS.get(base), rings: [rings[i]] })
      })
    }
  }
  console.log(`outlines: pierścienie regionów: ${assigned.join(' ')}`)

  // Własne kontury: oryginalne obrysy SAM oraz zaakceptowane warstwy obłoków z map pyłu i ekstynkcji.
  // Jeden obiekt może mieć kilka poziomów i oznaczeń; replace usuwa wcześniejszy kontur OpenNGC tego obiektu.
  const darkPath = join(ROOT, 'scripts', 'data', 'dark-outlines.json')
  let darkCount = 0
  if (existsSync(darkPath)) {
    const dark = JSON.parse(readFileSync(darkPath, 'utf8')) as {
      objects: { id: string; also: string[]; name: string | null; bright?: boolean; replace?: boolean; level?: 1 | 2 | 3; rings: [number, number][][]; holes?: [number, number][][][] }[]
    }
    const replaced = new Set(dark.objects.filter((d) => d.replace).map((d) => d.id))
    for (let i = objects.length - 1; i >= 0; i--) if (replaced.has(objects[i].id)) objects.splice(i, 1)
    for (const d of dark.objects) {
      const rings = d.rings.map((ring) => ring.flatMap(([ra, dec]) => [r(ra, 4), r(dec, 4)]))
      const holes = d.holes?.map((group) => group.map((ring) => ring.flatMap(([ra, dec]) => [r(ra, 4), r(dec, 4)])))
      points += rings.reduce((s, ring) => s + ring.length / 2, 0)
      objects.push({ id: d.id, level: d.level ?? 2, ...(d.bright ? {} : { dark: 1 }), ...(d.also.length ? { also: d.also } : {}), ...(d.name ? { name: d.name } : {}), rings, ...(holes ? { holes } : {}) })
      if (!d.bright) darkCount++
    }
  }
  writeFileSync(
    join(OUT, 'outlines.json'),
    JSON.stringify({
      v: 1,
      source: {
        url: `https://github.com/mattiaverga/OpenNGC/tree/${ONGC_TAG}/outlines`,
        licence: 'CC-BY-SA-4.0',
        credit: 'OpenNGC, Mattia Verga; obrysy na DSS2 w Aladin (CDS, Strasbourg)',
        changes: `Poziomy 2 i 3 (bez nich 1) oraz poziom 1 regionów i obrysów o promieniu ≥ ${LARGE_LV1_DEG}°; pierścienie regionów przypisane do największej mgławicy katalogu w środku; uproszczone do ${SIMPLIFY_DEG}°, zaokrąglone do 0,001°.`,
      },
      darkSource: 'Kontury własne: wcześniejsze obrysy SAM 3 oraz zaakceptowane warstwy wyznaczone z map DSS, Planck, IRIS i atlasu Dobashiego; źródła i metoda poszczególnych obiektów w scripts/data/dark-outlines.json.',
      objects,
    }),
  )
  console.log(`outlines: ${objects.length} obrysów (w tym ${darkCount} mgławic ciemnych), ${points} wierzchołków; poziom 1 dodatkowo: ${largeLv1.join(' ')}`)
}

// Droga Mleczna: pięć poziomów konturów jasności z d3-celestial (mw.json, współrzędne [RA −180…180, Dec]) zliczone
// w siatce 720 × 360 (x: RA 0…360° co 0,5°, y: Dec +90…−90°), potem rozmyte. Wnętrze: parzystość przecięć promienia
// od bieguna północnego (poza pasem) w dół południka; działa też dla pierścieni poziomu 1, które obiegają całe niebo.
// Wynik: PNG w skali szarości, 0 = brak, 255 = najjaśniejsza część pasa.
async function buildMilkyWay() {
  const mw = JSON.parse(await cached('d3c-mw.json', 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/mw.json')) as {
    features: { id: string; geometry: { coordinates: [number, number][][][] } }[]
  }
  const W = 720
  const H = 360
  const levels = new Uint8Array(W * H)
  for (const f of mw.features) {
    // Krawędzie rozwinięte przez szew ±180° (krótszy łuk), sprawdzane dla RA, RA ± 360°.
    const edges: [number, number, number, number][] = []
    for (const ring of f.geometry.coordinates.flat()) {
      for (let i = 0; i < ring.length; i++) {
        const [a0, d0] = ring[i]
        let [a1, d1] = ring[(i + 1) % ring.length]
        if (a1 - a0 > 180) a1 -= 360
        else if (a0 - a1 > 180) a1 += 360
        edges.push([a0, d0, a1, d1])
      }
    }
    for (let x = 0; x < W; x++) {
      const ra = (x + 0.5) / 2
      const lon = ra > 180 ? ra - 360 : ra
      const decs: number[] = []
      for (const [a0, d0, a1, d1] of edges) {
        for (const l of [lon, lon - 360, lon + 360]) {
          if (a0 > l === a1 > l) continue
          decs.push(d0 + ((l - a0) / (a1 - a0)) * (d1 - d0))
        }
      }
      decs.sort((p, q) => q - p)
      let k = 0
      for (let y = 0; y < H; y++) {
        const dec = 90 - (y + 0.5) / 2
        while (k < decs.length && decs[k] > dec) k++
        if (k % 2) levels[y * W + x]++
      }
    }
  }
  const pixels = Buffer.from(levels.map((n) => Math.min(255, n * 51)))
  await sharp(pixels, { raw: { width: W, height: H, channels: 1 } }).blur(2).png({ compressionLevel: 9 }).toFile(join(OUT, 'milkyway.png'))
  console.log(`milkyway: ${W}×${H}, piksele z pasem: ${levels.filter((n) => n > 0).length}`)
}

// Dane testu geometrii kafelków HiPS (src/lib/hips.real.test.ts): kafelki DSS2 rzędu 7 z ESA i wzorce SkyView DSS2 red.
const HIPS_FIELDS: { name: string; ra: number; dec: number; tiles: number[] }[] = [
  { name: 'm27', ra: 299.9016, dec: 22.721, tiles: [51927, 51932, 51933, 51935, 52104] },
  { name: 'ngc188', ra: 12.11, dec: 85.255, tiles: [16301, 16306, 16307, 16312, 16313] },
  { name: 'ngc253', ra: 11.888, dec: -25.288, tiles: [66615, 66621, 66658, 66664] },
  { name: 'ngc7814', ra: 0.8125, dec: 16.145, tiles: [78789, 78791, 78797, 78802, 78808] },
  { name: 'ngc2070', ra: 84.676, dec: -69.101, tiles: [132377, 132378, 132379, 132382] },
]

async function buildHipsFixtures() {
  mkdirSync(join(CACHE, 'hips'), { recursive: true })
  // SkyView zwraca czasem stronę HTML zamiast obrazu: plik bez nagłówka JPEG (FF D8) pobieramy ponownie.
  const jpeg = async (name: string, url: string) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const buf = await cachedBinary(name, url)
      if (buf[0] === 0xff && buf[1] === 0xd8) return
      rmSync(join(CACHE, name))
    }
    throw new Error(`${url}: brak obrazu JPEG`)
  }
  for (const f of HIPS_FIELDS) {
    for (const n of f.tiles) await jpeg(`hips/dss2-7-${n}.jpg`, `https://cdn.skies.esac.esa.int/DSSColor/Norder7/Dir${Math.floor(n / 10000) * 10000}/Npix${n}.jpg`)
    await jpeg(`hips/skyview-${f.name}.jpg`, `https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?Survey=DSS2+Red&Position=${f.ra},${f.dec}&Size=0.4&Pixels=300&Return=JPG&Scaling=Linear`)
  }
  console.log(`hips: ${HIPS_FIELDS.reduce((s, f) => s + f.tiles.length, 0)} kafelków, ${HIPS_FIELDS.length} wzorców`)
}

const only = process.argv[2]
if (!only || only === 'catalog') await buildCatalog()
if (!only || only === 'sky') await buildSky()
if (!only || only === 'outlines') await buildOutlines()
if (!only || only === 'milkyway') await buildMilkyWay()
if (only === 'hips') await buildHipsFixtures()
