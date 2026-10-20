// Buduje stars.v1.bin i wpis `stars` w meta.json z Tycho-2 (I/259/tyc2 i I/259/suppl_1) przez TAP VizieR (6.7).
// Uruchomienie: node scripts/build-stars.ts [--cache <katalog>] [--out <katalog>] [--refresh]
// Odpowiedzi TAP zostają w katalogu podręcznym (domyślnie scripts/.cache) jako `I_259_tyc2.csv` i `I_259_suppl_1.csv`;
// brakujące (przy --refresh wszystkie) są pobierane razem z zapytaniem COUNT o ten sam warunek. Gdy liczby się różnią
// (odpowiedź obcięta), skrypt kończy się błędem i niczego nie zapisuje.
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { encodeStarFile, parseStarsCsv } from '../src/services/stars.ts'

const ROOT = join(import.meta.dirname, '..')
const TAP_SYNC = 'https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync'
// Serwery CDS odrzucają narzędzia udające przeglądarkę; zwykłe zapytanie z własnym User-Agent działa (6.1).
const USER_AGENT = 'astrophotography-planner-stars-build/1.0 (Node.js)'
const TIMEOUT_MS = 15 * 60_000
const MAX_ATTEMPTS = 3
const CITATION = 'Høg i in. 2000 (ESA, CDS)'

// Ograniczenie jasności luźniejsze niż V ≤ 10 (zapas 0,1 mag) i bez gubienia wierszy z pustym BT albo VT;
// ostateczny odsiew robi parseStarsCsv. TAPVizieR nie zna COALESCE ani CASE, stąd OR.
const MAG_CONDITION =
  '(VTmag - 0.09 * (BTmag - VTmag) <= 10.1) OR (BTmag IS NULL AND VTmag <= 10.1) OR (VTmag IS NULL AND BTmag <= 10.1)'

interface TableSource {
  table: string
  /** Kolumny SELECT z aliasami `ra`, `dec`, `bt`, `vt` (i zastępczymi `ra_obs`, `dec_obs`). */
  columns: string
}

const TABLES: TableSource[] = [
  {
    // Gwiazdy bez średniej pozycji J2000 (pflag X) mają tylko pozycję obserwowaną RA(ICRS)/DE(ICRS).
    table: 'I/259/tyc2',
    columns: 'RAmdeg AS "ra", DEmdeg AS "dec", "RA(ICRS)" AS "ra_obs", "DE(ICRS)" AS "dec_obs", BTmag AS "bt", VTmag AS "vt"',
  },
  { table: 'I/259/suppl_1', columns: '"RA(ICRS)" AS "ra", "DE(ICRS)" AS "dec", BTmag AS "bt", VTmag AS "vt"' },
]

const fromWhere = (table: string) => `FROM "${table}" WHERE ${MAG_CONDITION}`
const dataQuery = (source: TableSource) => `SELECT ${source.columns} ${fromWhere(source.table)}`
const countQuery = (source: TableSource) => `SELECT COUNT(*) ${fromWhere(source.table)}`
const cacheName = (table: string) => `${table.replaceAll('/', '_')}.csv`

function argValue(name: string): string | null {
  const at = process.argv.indexOf(name)
  return at >= 0 && at + 1 < process.argv.length ? process.argv[at + 1] : null
}

async function runQuery(query: string): Promise<string> {
  const body = new URLSearchParams({ REQUEST: 'doQuery', LANG: 'ADQL', FORMAT: 'csv', MAXREC: '2000000', QUERY: query })
  const response = await fetch(TAP_SYNC, {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`TAP VizieR: HTTP ${response.status} dla zapytania ${query}\n${text.slice(0, 500)}`)
  return text
}

async function queryWithRetry(query: string, label: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await runQuery(query)
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error
      console.log(`  ${label}: ${error instanceof Error ? error.message : String(error)}; próba ${attempt + 1}/${MAX_ATTEMPTS}`)
      await new Promise((done) => setTimeout(done, 10_000 * attempt))
    }
  }
}

/** Pobiera odpowiedź danych i sprawdza ją zapytaniem COUNT; obcięta odpowiedź → błąd. */
async function download(source: TableSource): Promise<string> {
  const text = await queryWithRetry(dataQuery(source), source.table)
  const rows = parseStarsCsv(text).rows
  const countText = await queryWithRetry(countQuery(source), `${source.table} COUNT`)
  const count = Number(countText.split(/\r?\n/)[1]?.split(',')[0]?.replaceAll('"', '').trim())
  if (rows !== count) {
    throw new Error(`${source.table}: pobrano ${rows} wierszy, a COUNT podaje ${count}; odpowiedź jest niepełna`)
  }
  console.log(`  ${source.table}: ${rows} wierszy`)
  return text
}

async function main(): Promise<void> {
  const cacheDir = resolve(argValue('--cache') ?? join(import.meta.dirname, '.cache'))
  const outDir = resolve(argValue('--out') ?? join(ROOT, 'public', 'catalog'))
  const refresh = process.argv.includes('--refresh')
  await mkdir(cacheDir, { recursive: true })

  // Najpierw wszystkie odpowiedzi (po kolei, CDS źle znosi równoległe zapytania), zapis dopiero po sprawdzeniu.
  const texts: string[] = []
  for (const source of TABLES) {
    const file = join(cacheDir, cacheName(source.table))
    if (!refresh && existsSync(file)) texts.push(await readFile(file, 'utf8'))
    else {
      const text = await download(source)
      await writeFile(file, text)
      texts.push(text)
    }
  }

  const parsed = TABLES.map((source, i) => ({ source, result: parseStarsCsv(texts[i]) }))
  const stars = parsed.flatMap(({ result }) => result.stars)
  for (const { source, result } of parsed) {
    console.log(`${source.table}: ${result.rows} wierszy, ${result.stars.length} gwiazd V ≤ 10, pominięte ${result.skipped}`)
  }

  const metaFile = join(outDir, 'meta.json')
  const meta = existsSync(metaFile) ? (JSON.parse(await readFile(metaFile, 'utf8')) as Record<string, unknown>) : {}
  meta.stars = {
    count: stars.length,
    builtAt: new Date().toISOString(),
    citation: CITATION,
    tables: parsed.map(({ source, result }) => ({
      table: source.table,
      query: dataQuery(source),
      rows: result.rows,
      stars: result.stars.length,
      skipped: result.skipped,
    })),
  }

  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'stars.v1.bin'), encodeStarFile(stars))
  await writeFile(metaFile, JSON.stringify(meta, null, 2) + '\n')
  console.log(`Zapisano ${join(outDir, 'stars.v1.bin')} (${stars.length} gwiazd) i wpis stars w meta.json`)
}

await main()
