// Pomocnicze funkcje testów katalog-gwiazd.
// - `runBuildStars` uruchamia `node scripts/build-stars.ts --cache <c> --out <o> [...]` w osobnym procesie z globalnym
//   `fetch` podmienionym przez fakeFetchPreload.ts (tryb offline / symulator TAP / stałe odpowiedzi) i zwraca
//   kod wyjścia, wyjście i listę żądań sieciowych skryptu.
// - `mulberry32` i `randomStars` dają powtarzalne sztuczne katalogi (stałe ziarno, bez Math.random).
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Star } from '../../../src/services/stars'

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
export const SCRIPT = join(ROOT, 'scripts', 'build-stars.ts')
const PRELOAD = pathToFileURL(fileURLToPath(new URL('./fakeFetchPreload.ts', import.meta.url))).href

export const TAP_SYNC = 'https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync'
export const CITATION = 'Høg i in. 2000 (ESA, CDS)'
export const M42 = { raDeg: 83.8221, decDeg: -5.3911 }
export const THETA1_ORI_C = { raDeg: 83.8186, decDeg: -5.3897 }
export const IOTA_ORI = { raDeg: 83.8583, decDeg: -5.9099 }

export interface FakeTapConfig {
  mode: 'offline' | 'simulator' | 'fixed'
  /** Tryb 'fixed': tabela → liczba wierszy odpowiedzi danych i wynik COUNT. */
  fixed?: Record<string, { rows: number; count: number }>
}

export interface LoggedRequest {
  url: string
  method: string
  userAgent: string | null
  query: string | null
  status: number
  isCount: boolean
  table: string | null
  /** Kolumna recno wierszy zwróconych przez symulator. */
  recnos: number[]
  error: string | null
}

export interface BuildRun {
  status: number | null
  stdout: string
  stderr: string
  requests: LoggedRequest[]
}

export interface StarsMetaTable {
  table: string
  query: string
  rows: number
  stars: number
  skipped: number
}

export interface StarsMeta {
  count: number
  builtAt: string
  citation: string
  tables: StarsMetaTable[]
}

/** Nowy pusty katalog tymczasowy. */
export function tempDir(label: string): string {
  return mkdtempSync(join(tmpdir(), `katalog-gwiazd-${label}-`))
}

/** Katalogi podręczny i wynikowy w jednym katalogu tymczasowym. */
export function buildDirs(): { cache: string; out: string; work: string } {
  const work = tempDir('build')
  const cache = join(work, 'cache')
  const out = join(work, 'out')
  mkdirSync(cache)
  mkdirSync(out)
  return { cache, out, work }
}

/** Nazwa pliku odpowiedzi w katalogu podręcznym (tabela z `/` zamienionym na `_`). */
export function cacheFile(cache: string, table: string): string {
  return join(cache, `${table.replaceAll('/', '_')}.csv`)
}

export function runBuildStars(args: string[], fake: FakeTapConfig): BuildRun {
  const work = tempDir('fake')
  const logFile = join(work, 'requests.jsonl')
  writeFileSync(logFile, '')
  const configFile = join(work, 'config.json')
  writeFileSync(configFile, JSON.stringify({ ...fake, logFile }))
  const result = spawnSync(process.execPath, ['--import', PRELOAD, SCRIPT, ...args], {
    cwd: ROOT,
    env: { ...process.env, KATALOG_GWIAZD_FAKE: configFile },
    encoding: 'utf8',
    timeout: 90_000,
  })
  const requests = readFileSync(logFile, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as LoggedRequest)
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, requests }
}

/** Opis uruchomienia do komunikatów asercji. */
export function describeRun(run: BuildRun): string {
  return `kod ${String(run.status)}\nstdout:\n${run.stdout.slice(-2000)}\nstderr:\n${run.stderr.slice(-2000)}`
}

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

export function readStarsMeta(out: string): StarsMeta {
  return (readJson(join(out, 'meta.json')) as { stars: StarsMeta }).stars
}

export function starFileBytes(out: string): Uint8Array {
  return new Uint8Array(readFileSync(join(out, 'stars.v1.bin')))
}

export function starFileExists(out: string): boolean {
  return existsSync(join(out, 'stars.v1.bin'))
}

/** Generator liczb [0, 1) ze stałym ziarnem. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Sztuczne gwiazdy równomiernie na sferze; V zaokrąglone do 0,1 mag w [−1,5; 10] (dużo remisów jasności). */
export function randomStars(count: number, seed: number): Star[] {
  const random = mulberry32(seed)
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    const raDeg = random() * 360
    const decDeg = (Math.asin(2 * random() - 1) * 180) / Math.PI
    const mag = Math.round((-1.5 + random() * 11.5) * 10) / 10
    stars.push({ raDeg, decDeg, mag })
  }
  return stars
}

/** Środki pól równomiernie na sferze. */
export function randomCenters(count: number, seed: number): { raDeg: number; decDeg: number }[] {
  const random = mulberry32(seed)
  return Array.from({ length: count }, () => ({
    raDeg: random() * 360,
    decDeg: (Math.asin(2 * random() - 1) * 180) / Math.PI,
  }))
}

/** V ze wzoru 6.7 (niezależne od programu): brak BT → VT, brak VT → BT, brak obu → null. */
export function expectedV(bt: number | null, vt: number | null): number | null {
  if (bt === null && vt === null) return null
  if (bt === null) return vt
  if (vt === null) return bt
  return vt - 0.09 * (bt - vt)
}
