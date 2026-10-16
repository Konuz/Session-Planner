// Buduje public/catalog/catalog.v1.json i meta.json z OpenNGC i katalogów VizieR (6.1–6.4).
// Uruchomienie: npm run build:catalog. Pobrane pliki zostają w scripts/.cache; brakujące są dociągane,
// a --refresh pobiera wszystkie ponownie.
import { existsSync } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { mergeRecords, type AliasPair } from '../src/services/catalog/merge.ts'
import { parseOpenNgc } from '../src/services/catalog/parsers/openNgc.ts'
import { parseVizier } from '../src/services/catalog/parsers/vizier.ts'
import { designationKey, formatDesignation, type ParseResult } from '../src/services/catalog/records.ts'
import type { Designation } from '../src/types.ts'

const ROOT = join(import.meta.dirname, '..')
const CACHE_DIR = join(import.meta.dirname, '.cache')
const OUTPUT_DIR = join(ROOT, 'public', 'catalog')
// Serwery CDS odrzucają narzędzia udające przeglądarkę; zwykłe zapytanie z własnym User-Agent działa (6.1).
const USER_AGENT = 'astrophotography-planner-catalog-build/1.0 (Node.js)'
const TIMEOUT_MS = 15 * 60_000
const MAX_ATTEMPTS = 3
const OPENNGC_REPO = 'mattiaverga/OpenNGC'
const VIZIER_URL = 'https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-out.max=unlimited&-out.all&-out.add=_RAJ,_DEJ&-oc.form=d&-source='

interface Source {
  id: string // nazwa źródła w meta.json
  file: string // plik w scripts/.cache
  url: (openNgcCommit: string) => string
  parse: (text: string) => ParseResult
  license: string
}

const VIZIER_LICENSE = 'Dane VizieR (CDS); przy wykorzystaniu cytuj autorów katalogu'

const SOURCES: Source[] = [
  ...['NGC.csv', 'addendum.csv'].map((file) => ({
    id: `OpenNGC ${file}`,
    file,
    url: (commit: string) => `https://raw.githubusercontent.com/${OPENNGC_REPO}/${commit}/database_files/${file}`,
    parse: parseOpenNgc,
    license: 'CC BY-SA 4.0',
  })),
  ...['VII/20/catalog', 'VII/7A/ldn', 'VII/9/catalog', 'VII/21/catalog', 'VII/220A/barnard', 'VII/297/snrs'].map((table) => ({
    id: `VizieR ${table}`,
    file: `${table.replaceAll('/', '_')}.tsv`,
    url: () => VIZIER_URL + table,
    parse: parseVizier,
    license: VIZIER_LICENSE,
  })),
]

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return response.text()
}

async function fetchWithRetry(url: string, label: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchText(url)
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error
      console.log(`  ${label}: ${error instanceof Error ? error.message : String(error)}; próba ${attempt + 1}/${MAX_ATTEMPTS}`)
      await new Promise((resolve) => setTimeout(resolve, 10_000 * attempt))
    }
  }
}

interface OpenNgcCommit {
  sha: string
  date: string
}

interface LoadedSource {
  source: Source
  text: string
  retrievedAt: string
}

const COMMIT_FILE = join(CACHE_DIR, 'openngc-commit.json')
const cacheFile = (source: Source) => join(CACHE_DIR, source.file)
const isOpenNgc = (source: Source) => source.id.startsWith('OpenNGC')

async function download(source: Source, url: string): Promise<void> {
  const text = await fetchWithRetry(url, source.id)
  await writeFile(cacheFile(source), text)
  console.log(`  ${source.id}: ${text.length} B`)
}

/** Pliki z scripts/.cache; brakujące (przy --refresh wszystkie) są pobierane po kolei, bo CDS źle znosi równoległe zapytania. */
async function loadSources(refresh: boolean): Promise<{ loaded: LoadedSource[]; commit: OpenNgcCommit }> {
  await mkdir(CACHE_DIR, { recursive: true })
  const openNgcSources = SOURCES.filter(isOpenNgc)
  let commit: OpenNgcCommit
  if (!refresh && existsSync(COMMIT_FILE) && openNgcSources.every((source) => existsSync(cacheFile(source)))) {
    commit = JSON.parse(await readFile(COMMIT_FILE, 'utf8')) as OpenNgcCommit
  } else {
    const latest = JSON.parse(await fetchWithRetry(`https://api.github.com/repos/${OPENNGC_REPO}/commits/master`, 'OpenNGC')) as {
      sha: string
      commit: { committer: { date: string } }
    }
    commit = { sha: latest.sha, date: latest.commit.committer.date }
    for (const source of openNgcSources) await download(source, source.url(commit.sha))
    // Zapis dopiero po pobraniu obu plików z tego samego commita.
    await writeFile(COMMIT_FILE, JSON.stringify(commit, null, 2))
  }
  for (const source of SOURCES.filter((entry) => !isOpenNgc(entry))) {
    if (refresh || !existsSync(cacheFile(source))) await download(source, source.url(commit.sha))
  }
  const loaded = await Promise.all(
    SOURCES.map(async (source) => ({
      source,
      text: await readFile(cacheFile(source), 'utf8'),
      retrievedAt: (await stat(cacheFile(source))).mtime.toISOString(),
    })),
  )
  return { loaded, commit }
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(join(ROOT, path), 'utf8')) as T
}

function catalogTitle(text: string): string | null {
  return /^#Title:\s*(.+)$/m.exec(text)?.[1].trim() ?? null
}

async function main(): Promise<void> {
  const { loaded, commit } = await loadSources(process.argv.includes('--refresh'))
  const parsed = loaded.map((entry) => ({ ...entry, result: entry.source.parse(entry.text) }))

  for (const { source, result } of parsed) {
    console.log(`${source.id}: ${result.records.length} rekordów, odrzucone ${result.rejected.length}, pominięte ${result.skipped}`)
    for (const row of result.rejected) console.log(`  linia ${row.line}: ${row.reason}`)
    if (result.records.length === 0) throw new Error(`${source.id}: brak rekordów; sprawdź odpowiedź serwera w scripts/.cache`)
  }

  const aliases = await readJson<AliasPair[]>('src/data/aliases.json')
  const { objects, conflicts } = mergeRecords(
    parsed.flatMap(({ result }) => result.records),
    aliases,
  )
  console.log(`Po scaleniu: ${objects.length} obiektów; pominięte powiązania: ${conflicts.length}`)
  for (const conflict of conflicts) console.log(`  ${conflict}`)

  const owners = new Map<string, string>()
  for (const object of objects) {
    for (const designation of object.designations) {
      const key = designationKey(designation)
      const other = owners.get(key)
      if (other !== undefined) throw new Error(`${formatDesignation(designation)} w dwóch obiektach: ${other}, ${object.uid}`)
      owners.set(key, object.uid)
    }
  }
  const featured = await readJson<Designation[]>('src/data/featured.json')
  const missing = featured.filter((designation) => !owners.has(designationKey(designation)))
  if (missing.length > 0) throw new Error(`Brak w katalogu obiektów z listy „Klasyki”: ${missing.map(formatDesignation).join(', ')}`)

  const meta = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    objectCount: objects.length,
    sources: parsed.map(({ source, text, retrievedAt, result }) => ({
      id: source.id,
      title: catalogTitle(text),
      url: source.url(commit.sha),
      version: isOpenNgc(source) ? `${commit.sha} (${commit.date})` : null,
      retrievedAt,
      license: source.license,
      records: result.records.length,
      rejected: result.rejected.length,
      skipped: result.skipped,
    })),
    aliases: aliases.length,
    skippedLinks: conflicts.length,
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(join(OUTPUT_DIR, 'catalog.v1.json'), JSON.stringify(objects))
  await writeFile(join(OUTPUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2) + '\n')
  console.log(`Zapisano public/catalog/catalog.v1.json (${objects.length} obiektów) i meta.json`)
}

await main()
