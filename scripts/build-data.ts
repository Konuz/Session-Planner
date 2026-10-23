// Buduje dane aplikacji w public/data z pobranych źródeł (pamięć w scripts/.cache):
// - catalog.json: katalog obiektów (OpenNGC + VizieR, zbudowany wcześniej do old-catalog.json) z odległościami
//   i tytułami artykułów Wikipedii z Wikidata,
// - sky.json: gwiazdy do ok. 6,5 mag (d3-celestial, BSD) z numerami HIP, linie i nazwy gwiazdozbiorów
//   (Stellarium modern, CC BY-SA 4.0; polskie nazwy z tłumaczenia Stellarium),
// - art/<IAU>.webp: ilustracje gwiazdozbiorów (Stellarium, Free Art License) jako biały rysunek z kanałem alfa,
// - outlines.json: kontury mgławic (OpenNGC outlines, CC BY-SA 4.0).
//
// Uruchom: node scripts/build-data.ts   (Node ≥ 23 uruchamia TypeScript bez kompilacji)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = join(import.meta.dirname, '..')
const CACHE = join(ROOT, 'scripts', '.cache')
const OUT = join(ROOT, 'public', 'data')
const UA = 'konuzastro-tracker-build/0.1 (https://konuzastro.pl)'

mkdirSync(join(OUT, 'art'), { recursive: true })

async function cached(name: string, url: string, init?: RequestInit): Promise<string> {
  const path = join(CACHE, name)
  if (existsSync(path)) return readFileSync(path, 'utf8')
  const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...init?.headers } })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const text = await res.text()
  writeFileSync(path, text)
  return text
}

async function cachedBinary(name: string, url: string): Promise<Buffer> {
  const path = join(CACHE, name)
  if (existsSync(path)) return readFileSync(path)
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(path, buf)
  return buf
}

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
  const old: OldRecord[] = JSON.parse(readFileSync(join(CACHE, 'old-catalog.json'), 'utf8'))

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

  const looksLikeCode = (title: string) => /^(M|NGC|IC|Sh ?2|Barnard|B|LDN|LBN|Messier)\s*-?\s*\d/i.test(title)

  // Kolumny: id, oznaczenia, nazwa PL, nazwy EN, typ, RA, Dec, wymiar a, b, PA, mag, jasność pow., gwiazdozbiór,
  // odległość [ly], artykuł pl, artykuł en.
  const rows = old.map((o) => {
    const ids = o.designations.map((d) => designation(d.catalog, d.id))
    const primary = designation(o.primary.catalog, o.primary.id)
    const keys = o.designations.map((d) => joinKey(designation(d.catalog, d.id))).filter((k): k is string => k !== null)
    const dist = keys.map((k) => distances.get(k)).find((d) => d !== undefined)
    const w = keys.map((k) => wiki.get(k)).find((d) => d !== undefined)
    const plName = w?.pl && !looksLikeCode(w.pl) ? w.pl.replace(/\s*\(.*\)$/, '') : ''
    return [
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
      dist === undefined ? 0 : Math.round(median(dist)),
      w?.pl ?? '',
      w?.en ?? '',
    ]
  })
  const withDist = rows.filter((row) => row[13] !== 0).length
  writeFileSync(join(OUT, 'catalog.json'), JSON.stringify({ v: 1, rows }))
  console.log(`catalog: ${rows.length} obiektów, ${withDist} z odległością`)
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
// (1 — słaby zasięg, 2 — standardowy, 3 — jasne jądro). Pliki objects/*.txt to TSV z Aladin; wiersz z Cont_Flag „*”
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

  // Mgławice katalogu (zbudowanego wyżej): [id, …, typ, RA, Dec, wymiar a, …].
  const catalogRows = (JSON.parse(readFileSync(join(OUT, 'catalog.json'), 'utf8')) as { rows: [string, string, string, string, string, number, number, number][] }).rows
  const nebulae = catalogRows.filter((row) => ['EN', 'RN', 'DN', 'SNR', 'CN'].includes(row[4]))
  const assigned: string[] = []

  const objects = []
  let points = 0
  const largeLv1: string[] = []
  for (const [base, levels] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    // Jeden poziom na obiekt: 2, a gdy go brak — 3 (jądro), potem 1. Duże obrysy poziomu 1 dochodzą osobno.
    const picked = [[2, 3, 1].find((lv) => levels.has(lv))!]
    if (levels.has(1) && picked[0] !== 1) picked.push(1)
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
  writeFileSync(
    join(OUT, 'outlines.json'),
    JSON.stringify({
      v: 1,
      source: {
        url: `https://github.com/mattiaverga/OpenNGC/tree/${ONGC_TAG}/outlines`,
        licence: 'CC-BY-SA-4.0',
        credit: 'OpenNGC, Mattia Verga; obrysy na DSS2 w Aladin (CDS, Strasbourg)',
        changes: `Poziom 2 (bez niego 3, potem 1) oraz poziom 1 regionów i obrysów o promieniu ≥ ${LARGE_LV1_DEG}°; pierścienie regionów przypisane do największej mgławicy katalogu w środku; uproszczone do ${SIMPLIFY_DEG}°, zaokrąglone do 0,001°.`,
      },
      objects,
    }),
  )
  console.log(`outlines: ${objects.length} obrysów, ${points} wierzchołków; poziom 1 dodatkowo: ${largeLv1.join(' ')}`)
}

await buildCatalog()
await buildSky()
await buildOutlines()
