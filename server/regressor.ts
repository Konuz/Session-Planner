// Odległości wycinków bez odległości z astro-regressor (Python przez pixi): kolejka zadań w tle, jedno naraz
// (2–5 min na obiekt, zapytania do Gaia, VizieR, IRSA, SDSS). Wyniki „ok” i odmowy modelu w scripts/.cache/regressor;
// awarie usług nie trafiają do pamięci i można je ponowić. Bez pixi lub katalogu regresora usługa jest wyłączona.
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { REGRESSOR_TYPES, type RegressorResult } from '../src/lib/distance.ts'

/** Wersja wrappera i poprawek regresora: zmiana unieważnia zapamiętane wyniki. */
export const REGRESSOR_VERSION = 1
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const RUN_MS = 10 * 60_000
const MAX_TARGETS = 40
const MAX_QUEUE = 200
const MAX_BODY = 64 * 1024

export interface RegressorTarget { raDeg: number; decDeg: number; radiusDeg: number; type: string }
export type RegressorRunner = (target: RegressorTarget) => Promise<RegressorResult>
export type RegressorEnv = { REGRESSOR_DIR?: string; PIXI?: string }
type JobStatus = 'queued' | 'running' | 'done' | 'error'
interface Job { status: JobStatus; target: RegressorTarget; result?: RegressorResult }

export function regressorKey(t: RegressorTarget): string {
  return createHash('sha1').update(JSON.stringify([REGRESSOR_VERSION, t.raDeg.toFixed(4), t.decDeg.toFixed(4), t.radiusDeg.toFixed(3), t.type])).digest('hex').slice(0, 20)
}

function validTarget(value: unknown): value is RegressorTarget {
  const t = value as RegressorTarget
  return !!t && typeof t === 'object' && Number.isFinite(t.raDeg) && t.raDeg >= 0 && t.raDeg < 360 && Number.isFinite(t.decDeg) && Math.abs(t.decDeg) <= 90
    && Number.isFinite(t.radiusDeg) && t.radiusDeg > 0 && t.radiusDeg <= 2 && REGRESSOR_TYPES.includes(t.type)
}

function parseResult(stdout: string): RegressorResult {
  const line = stdout.trim().split(/\r?\n/).pop() ?? ''
  const result = JSON.parse(line) as RegressorResult
  if (!['ok', 'abstain', 'error'].includes(result?.status)) throw new Error('Nieoczekiwany wynik regresora.')
  return result
}

/** Uruchomienie wrappera przez pixi: tablica argumentów bez powłoki, limit czasu z zabiciem całego drzewa procesów. */
export function pixiRunner(env: RegressorEnv = process.env as RegressorEnv): RegressorRunner {
  const dir = resolve(env.REGRESSOR_DIR ?? join(ROOT, 'astro-regressor-main'))
  const manifest = join(dir, 'pixi.toml')
  const wrapper = join(ROOT, 'scripts', 'regressor', 'cut_distance.py')
  return (t) => new Promise((done) => {
    const args = ['run', '--manifest-path', manifest, 'python', wrapper, '--ra', String(t.raDeg), '--dec', String(t.decDeg), '--radius', String(t.radiusDeg), '--type', t.type]
    const child = spawn(env.PIXI ?? 'pixi', args, { cwd: ROOT, env: { ...process.env, REGRESSOR_DIR: dir }, windowsHide: true, detached: process.platform !== 'win32' })
    let stdout = ''
    child.stdout.on('data', (chunk: Buffer) => { if (stdout.length < 1_000_000) stdout += chunk })
    child.stderr.resume()
    const timer = setTimeout(() => {
      if (!child.pid) return
      if (process.platform === 'win32') spawnSync(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 5000 })
      else try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
    }, RUN_MS)
    child.on('error', (error) => { clearTimeout(timer); done({ status: 'error', message: error.message }) })
    child.on('close', () => {
      clearTimeout(timer)
      try { done(parseResult(stdout)) } catch { done({ status: 'error', message: 'Regresor zakończył się bez wyniku (limit czasu lub błąd środowiska).' }) }
    })
  })
}

export interface RegressorService {
  ready(): boolean
  submit(targets: RegressorTarget[]): Promise<{ key: string; status: JobStatus; result?: RegressorResult }[] | null>
  status(keys: string[]): { key: string; status: JobStatus | 'unknown'; result?: RegressorResult }[]
}

export function createRegressorService({ runner, cacheDir, ready }: { runner: RegressorRunner; cacheDir: string; ready: () => boolean }): RegressorService {
  const jobs = new Map<string, Job>()
  const queue: string[] = []
  let working = false
  const file = (key: string) => join(cacheDir, `${key}.json`)

  async function work() {
    if (working) return
    working = true
    try {
      for (let key = queue.shift(); key; key = queue.shift()) {
        const job = jobs.get(key)!
        job.status = 'running'
        const result = await runner(job.target).catch((error: Error): RegressorResult => ({ status: 'error', message: error.message }))
        job.result = result
        job.status = result.status === 'error' ? 'error' : 'done'
        // Awarie (usługi, środowisko) nie trafiają do pamięci: następne zgłoszenie uruchomi przebieg ponownie.
        if (result.status !== 'error') await mkdir(cacheDir, { recursive: true }).then(() => writeFile(file(key), JSON.stringify(result))).catch(() => console.warn('Nie udało się zapisać wyniku regresora.'))
      }
    } finally { working = false }
  }

  return {
    ready,
    async submit(targets) {
      const out = []
      for (const target of targets) {
        const key = regressorKey(target)
        let job = jobs.get(key)
        if (!job || job.status === 'error') {
          const cached = await readFile(file(key), 'utf8').then((text) => JSON.parse(text) as RegressorResult).catch(() => null)
          if (cached) job = { status: 'done', target, result: cached }
          else {
            if (queue.length >= MAX_QUEUE) return null
            job = { status: 'queued', target }
            queue.push(key)
          }
          jobs.set(key, job)
        }
        out.push({ key, status: job.status, result: job.result })
      }
      void work()
      return out
    },
    status(keys) {
      return keys.map((key) => { const job = jobs.get(key); return { key, status: job?.status ?? 'unknown', result: job?.result } })
    },
  }
}

let defaultService: RegressorService | null = null
/** Usługa z pixi i katalogiem regresora obok repozytorium (REGRESSOR_DIR, PIXI); gotowość sprawdzana raz. */
export function regressorService(env: RegressorEnv): RegressorService {
  if (defaultService) return defaultService
  const dir = resolve(env.REGRESSOR_DIR ?? join(ROOT, 'astro-regressor-main'))
  let available: boolean | null = null
  defaultService = createRegressorService({
    runner: pixiRunner(env),
    cacheDir: join(ROOT, 'scripts', '.cache', 'regressor'),
    ready: () => available ??= existsSync(join(dir, 'pixi.toml')) && existsSync(join(ROOT, 'scripts', 'regressor', 'cut_distance.py'))
      && spawnSync(env.PIXI ?? 'pixi', ['--version'], { windowsHide: true, timeout: 10_000 }).status === 0,
  })
  return defaultService
}

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((done) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk; if (body.length > MAX_BODY) { req.pause(); done(null) } })
    req.on('end', () => done(body))
    req.on('error', () => done(null))
  })
}

/** GET ?keys=a,b: gotowość i stan zadań; POST {targets}: zgłoszenie wycinków (wyniki zapamiętane od razu). */
export async function regressorApi(req: IncomingMessage, res: ServerResponse, service: RegressorService) {
  const json = (status: number, value: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify(value)) }
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (req.method === 'GET') {
    const keys = (url.searchParams.get('keys') ?? '').split(',').filter((k) => /^[0-9a-f]{20}$/.test(k)).slice(0, MAX_TARGETS)
    json(200, { ready: service.ready(), jobs: service.status(keys) })
    return
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); json(405, { error: 'Wymagane zapytanie GET lub POST.' }); return }
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') { json(415, { error: 'Wymagany JSON z listą wycinków.' }); return }
  const body = await readBody(req)
  if (body === null) { json(413, { error: 'Zbyt duże zapytanie.' }); return }
  let targets: unknown
  try { targets = (JSON.parse(body) as { targets?: unknown }).targets } catch { json(400, { error: 'Niepoprawny JSON.' }); return }
  if (!Array.isArray(targets) || !targets.length || targets.length > MAX_TARGETS || !targets.every(validTarget)) { json(400, { error: 'Niepoprawna lista wycinków.' }); return }
  if (!service.ready()) { json(503, { error: 'Regresor jest niedostępny na tym serwerze.' }); return }
  const jobs = await service.submit(targets.map(({ raDeg, decDeg, radiusDeg, type }) => ({ raDeg, decDeg, radiusDeg, type })))
  if (!jobs) { json(429, { error: 'Kolejka regresora jest pełna. Spróbuj później.' }); return }
  json(200, { ready: true, jobs })
}
