// Odległości wycinków bez odległości z astro-regressor (Python przez pixi): kolejka zadań w tle, jedno naraz
// (Gaia dla mgławic i gromad, dodatkowe katalogi dla galaktyk). Wyniki „ok” i odmowy modelu w scripts/.cache/regressor;
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
export const REGRESSOR_VERSION = 2
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const RUN_MS = 10 * 60_000
const STELLAR_RUN_MS = 90_000
const MAX_TARGETS = 40
const MAX_QUEUE = 200
const MAX_BODY = 64 * 1024
/** Zakończone zadania trzymane w pamięci (odpytywanie); starsze są usuwane, wynik zostaje w pliku. */
const MAX_FINISHED = 1000

export interface RegressorTarget { raDeg: number; decDeg: number; radiusDeg: number; type: string }
export type RegressorRunner = (target: RegressorTarget) => Promise<RegressorResult>
export type RegressorEnv = { REGRESSOR_DIR?: string; PIXI?: string }
type JobStatus = 'queued' | 'running' | 'done' | 'error'
interface Job { status: JobStatus; target: RegressorTarget; result?: RegressorResult; group?: string }

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
    const runMs = ['G', 'GG'].includes(t.type) ? RUN_MS : STELLAR_RUN_MS
    const args = ['run', '--manifest-path', manifest, 'python', wrapper, '--ra', String(t.raDeg), '--dec', String(t.decDeg), '--radius', String(t.radiusDeg), '--type', t.type]
    const child = spawn(env.PIXI ?? 'pixi', args, { cwd: ROOT, env: { ...process.env, REGRESSOR_DIR: dir }, windowsHide: true, detached: process.platform !== 'win32' })
    let stdout = ''
    child.stdout.on('data', (chunk: Buffer) => { if (stdout.length < 1_000_000) stdout += chunk })
    child.stderr.resume()
    let timedOut = false
    const timer = setTimeout(() => {
      if (!child.pid) return
      timedOut = true
      done({ status: 'error', message: `Przekroczono limit czasu regresora (${runMs / 1000} s).` })
      if (process.platform === 'win32') spawnSync(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 5000 })
      else try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
    }, runMs)
    child.on('error', (error) => { clearTimeout(timer); done({ status: 'error', message: error.message }) })
    child.on('close', () => {
      clearTimeout(timer)
      if (timedOut) return
      try { done(parseResult(stdout)) } catch { done({ status: 'error', message: 'Proces regresora zakończył się bez wyniku.' }) }
    })
  })
}

export interface RegressorService {
  ready(): boolean | Promise<boolean>
  /** `group`: identyfikator zdjęcia; zadania ostatnio zgłoszonej grupy idą przed starszymi (audyt C08). */
  submit(targets: RegressorTarget[], group?: string): Promise<{ key: string; status: JobStatus; result?: RegressorResult }[] | null>
  status(keys: string[]): { key: string; status: JobStatus | 'unknown'; result?: RegressorResult }[]
}

export function createRegressorService({ runner, cacheDir, ready }: { runner: RegressorRunner; cacheDir: string; ready: () => boolean | Promise<boolean> }): RegressorService {
  const jobs = new Map<string, Job>()
  const queue: string[] = []
  let working = false
  /** Grupa (zdjęcie) ostatniego zgłoszenia: użytkownik patrzy na nie teraz, więc jego wycinki mają pierwszeństwo. */
  let currentGroup: string | undefined
  const file = (key: string) => join(cacheDir, `${key}.json`)

  /** Następne zadanie: najpierw bieżącej grupy, potem w kolejności zgłoszeń. */
  function next(): string | undefined {
    const i = currentGroup === undefined ? -1 : queue.findIndex((key) => jobs.get(key)?.group === currentGroup)
    return queue.splice(i >= 0 ? i : 0, 1)[0]
  }

  /** Mapa zadań nie rośnie bez końca w długo działającym serwerze: najstarsze zakończone wypadają. */
  function prune() {
    if (jobs.size <= MAX_FINISHED + queue.length + 1) return
    for (const [key, job] of jobs) {
      if (jobs.size <= MAX_FINISHED + queue.length + 1) break
      if (job.status === 'done' || job.status === 'error') jobs.delete(key)
    }
  }

  async function work() {
    if (working) return
    working = true
    try {
      for (let key = next(); key; key = next()) {
        const job = jobs.get(key)!
        job.status = 'running'
        const result = await runner(job.target).catch((error: Error): RegressorResult => ({ status: 'error', message: error.message }))
        job.result = result
        job.status = result.status === 'error' ? 'error' : 'done'
        // Awarie (usługi, środowisko) nie trafiają do pamięci: następne zgłoszenie uruchomi przebieg ponownie.
        if (result.status !== 'error') await mkdir(cacheDir, { recursive: true }).then(() => writeFile(file(key), JSON.stringify(result))).catch(() => console.warn('Nie udało się zapisać wyniku regresora.'))
        prune()
      }
    } finally { working = false }
  }

  return {
    ready,
    async submit(targets, group) {
      // Najpierw ustalić, co trzeba dopisać do kolejki, i dopiero potem ją zmienić: przy braku miejsca (429)
      // żadne zadanie z partii nie zostaje w kolejce bez klucza po stronie klienta (audyt C08, S8).
      const planned: { key: string; target: RegressorTarget; job: Job | undefined }[] = []
      let toQueue = 0
      for (const target of targets) {
        const key = regressorKey(target)
        let job = jobs.get(key)
        if (!job || job.status === 'error') {
          const cached = await readFile(file(key), 'utf8').then((text) => JSON.parse(text) as RegressorResult).catch(() => null)
          job = cached ? { status: 'done', target, result: cached } : undefined
          if (!job && !planned.some((p) => p.key === key)) toQueue++
        }
        planned.push({ key, target, job })
      }
      if (queue.length + toQueue > MAX_QUEUE) return null
      if (group !== undefined) currentGroup = group
      const out = []
      for (const { key, target } of planned) {
        let job = jobs.get(key)
        const fresh = planned.find((p) => p.key === key)!.job
        if (!job || job.status === 'error') {
          job = fresh ?? { status: 'queued', target }
          if (job.status === 'queued') queue.push(key)
          jobs.set(key, job)
        }
        if (job.status === 'queued' && group !== undefined) job.group = group
        out.push({ key, status: job.status, result: job.result })
      }
      prune()
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
  let available: Promise<boolean> | null = null
  defaultService = createRegressorService({
    runner: pixiRunner(env),
    cacheDir: join(ROOT, 'scripts', '.cache', 'regressor'),
    // `pixi --version` asynchronicznie: zimny start pixi trwał do 10 s i blokował cały serwer (audyt C09).
    ready: () => available ??= !existsSync(join(dir, 'pixi.toml')) || !existsSync(join(ROOT, 'scripts', 'regressor', 'cut_distance.py'))
      ? Promise.resolve(false)
      : new Promise<boolean>((done) => {
        const child = spawn(env.PIXI ?? 'pixi', ['--version'], { windowsHide: true, stdio: 'ignore' })
        const timer = setTimeout(() => { child.kill(); done(false) }, 10_000)
        child.on('error', () => { clearTimeout(timer); done(false) })
        child.on('close', (code) => { clearTimeout(timer); done(code === 0) })
      }),
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
    json(200, { ready: await service.ready(), jobs: service.status(keys) })
    return
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); json(405, { error: 'Wymagane zapytanie GET lub POST.' }); return }
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') { json(415, { error: 'Wymagany JSON z listą wycinków.' }); return }
  const body = await readBody(req)
  if (body === null) { json(413, { error: 'Zbyt duże zapytanie.' }); return }
  let targets: unknown, group: unknown
  try { ({ targets, group } = JSON.parse(body) as { targets?: unknown; group?: unknown }) } catch { json(400, { error: 'Niepoprawny JSON.' }); return }
  if (!Array.isArray(targets) || !targets.length || targets.length > MAX_TARGETS || !targets.every(validTarget)) { json(400, { error: 'Niepoprawna lista wycinków.' }); return }
  if (group !== undefined && (typeof group !== 'string' || !group || group.length > 128)) { json(400, { error: 'Niepoprawny identyfikator zdjęcia.' }); return }
  if (!(await service.ready())) { json(503, { error: 'Regresor jest niedostępny na tym serwerze.' }); return }
  const jobs = await service.submit(targets.map(({ raDeg, decDeg, radiusDeg, type }) => ({ raDeg, decDeg, radiusDeg, type })), group)
  if (!jobs) { json(429, { error: 'Kolejka regresora jest pełna. Spróbuj później.' }); return }
  json(200, { ready: true, jobs })
}
