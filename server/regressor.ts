// Odległości wycinków bez odległości z astro-regressor (Python przez pixi): kolejka zadań w tle, jedno naraz, w jednym
// stałym procesie wrappera (Gaia dla mgławic i gromad, widma SDSS i Cosmicflows-4 dla galaktyk). Wyniki „ok” i odmowy
// modelu w scripts/.cache/regressor; awarie usług nie trafiają do pamięci i można je ponowić. Bez pixi lub katalogu
// regresora usługa jest wyłączona.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { REGRESSOR_TYPES, type RegressorResult } from '../src/lib/distance.ts'

/** Wersja wrappera i poprawek regresora: zmiana unieważnia zapamiętane wyniki. */
export const REGRESSOR_VERSION = 3
const ROOT = fileURLToPath(new URL('..', import.meta.url))
/** Galaktyki: SDSS i CF4 równolegle, CF4 z trzema lustrami VizieR (każde zapytanie ma własny limit). */
const RUN_MS = 2 * 60_000
const STELLAR_RUN_MS = 90_000
/** Start stałego procesu: pixi i importy Pythona (pomiar 2026-11-14 na HDD pod obciążeniem: 20 s – ok. 4 min). */
const STARTUP_MS = 5 * 60_000
/** Proces bez zadań przez ten czas kończy się i zwalnia pamięć; następne zadanie uruchomi go od nowa. */
const IDLE_MS = 10 * 60_000
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

function checkResult(value: unknown): RegressorResult {
  const result = value as RegressorResult
  return ['ok', 'abstain', 'error'].includes(result?.status) ? result : { status: 'error', message: 'Nieoczekiwany wynik regresora.' }
}

/** Zabicie całego drzewa procesów (pixi → python). */
function killTree(child: ChildProcess) {
  if (!child.pid || child.exitCode !== null) return
  if (process.platform === 'win32') spawnSync(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 5000 })
  else try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
}

/** Polecenie stałego procesu wrappera (`cut_distance.py --serve`); w testach udawany proces. */
export interface WorkerCommand { command: string; args: string[]; cwd?: string; env?: NodeJS.ProcessEnv }
export interface WorkerLimits { startupMs?: number; idleMs?: number; runMs?: (target: RegressorTarget) => number }
interface Worker { child: ChildProcess; ready: Promise<void>; pending: Map<number, (result: RegressorResult) => void>; idle?: ReturnType<typeof setTimeout> }

/**
 * Jeden stały proces wrappera: pixi i importy Pythona raz, a nie przy każdym wycinku (pomiar 2026-11-14: 25–80 s → 3–5 s
 * na wycinek). Wiersz JSON na zadanie w obie strony. Limit zadania liczy się od wysłania do gotowego procesu; po jego
 * przekroczeniu albo awarii proces jest zabijany, zadania w toku dostają wynik „error” (do ponowienia), a następne
 * zadanie uruchamia nowy proces.
 */
export function workerRunner(spec: WorkerCommand, { startupMs = STARTUP_MS, idleMs = IDLE_MS, runMs = (t) => ['G', 'GG'].includes(t.type) ? RUN_MS : STELLAR_RUN_MS }: WorkerLimits = {}): RegressorRunner {
  let current: Worker | null = null
  let seq = 0

  function stop(worker: Worker, message: string) {
    if (current === worker) current = null
    clearTimeout(worker.idle)
    killTree(worker.child)
    for (const done of worker.pending.values()) done({ status: 'error', message })
  }

  function start(): Worker {
    const child = spawn(spec.command, spec.args, { cwd: spec.cwd, env: spec.env, windowsHide: true, detached: process.platform !== 'win32' })
    let markReady!: () => void
    let failStart!: (error: Error) => void
    const ready = new Promise<void>((resolve, reject) => { markReady = resolve; failStart = reject })
    ready.catch(() => {})
    const worker: Worker = { child, ready, pending: new Map() }
    const startup = setTimeout(() => {
      const message = `Regresor nie wystartował w ${startupMs / 1000} s.`
      failStart(new Error(message))
      stop(worker, message)
    }, startupMs)
    let buffer = ''
    child.stdout!.setEncoding('utf8').on('data', (chunk: string) => {
      const lines = (buffer + chunk).split(/\r?\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        let message: { ready?: unknown; id?: unknown; result?: unknown }
        try {
          message = JSON.parse(line)
        } catch {
          const msg = 'Niepoprawna odpowiedź procesu regresora.'
          clearTimeout(startup)
          failStart(new Error(msg))
          stop(worker, msg)
          return
        }
        if (message.ready === true) { clearTimeout(startup); markReady() }
        else if (typeof message.id === 'number') worker.pending.get(message.id)?.(checkResult(message.result))
        else {
          const msg = 'Nieoczekiwana odpowiedź procesu regresora.'
          clearTimeout(startup)
          failStart(new Error(msg))
          stop(worker, msg)
          return
        }
      }
    })
    child.stderr!.resume()
    // Zapis do procesu, który właśnie padł (EPIPE): wynik i tak przyjdzie z obsługi zamknięcia.
    child.stdin!.on('error', () => {})
    const exited = (message: string) => {
      clearTimeout(startup)
      failStart(new Error(message))
      stop(worker, message)
    }
    child.on('error', (error) => exited(error.message))
    child.on('close', () => exited('Proces regresora zakończył się bez wyniku.'))
    return worker
  }

  return async (t) => {
    const worker = current ??= start()
    clearTimeout(worker.idle)
    try { await worker.ready } catch (error) { return { status: 'error', message: (error as Error).message } }
    return new Promise((done) => {
      const id = ++seq
      const limit = runMs(t)
      const timer = setTimeout(() => stop(worker, `Przekroczono limit czasu regresora (${limit / 1000} s).`), limit)
      worker.pending.set(id, (result) => {
        clearTimeout(timer)
        worker.pending.delete(id)
        if (!worker.pending.size && current === worker) worker.idle = setTimeout(() => stop(worker, 'Proces regresora zatrzymany.'), idleMs)
        done(result)
      })
      worker.child.stdin!.write(JSON.stringify({ id, ra: t.raDeg, dec: t.decDeg, radius: t.radiusDeg, type: t.type }) + '\n')
    })
  }
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

const services = new Map<string, RegressorService>()
export function regressorService(env: RegressorEnv): RegressorService {
  const dir = resolve(env.REGRESSOR_DIR ?? join(ROOT, 'astro-regressor-main'))
  const command = env.PIXI ?? 'pixi'
  const key = `${dir}\0${command}`
  const cached = services.get(key)
  if (cached) return cached
  let available: Promise<boolean> | null = null
  const wrapper = join(ROOT, 'scripts', 'regressor', 'cut_distance.py')
  const service = createRegressorService({
    runner: workerRunner({ command, args: ['run', '--manifest-path', join(dir, 'pixi.toml'), 'python', wrapper, '--serve'], cwd: ROOT, env: { ...process.env, REGRESSOR_DIR: dir } }),
    cacheDir: join(ROOT, 'scripts', '.cache', 'regressor'),
    ready: () => available ??= !existsSync(join(dir, 'pixi.toml')) || !existsSync(wrapper)
      ? Promise.resolve(false)
      : new Promise<boolean>((done) => {
        const child = spawn(command, ['--version'], { windowsHide: true, stdio: 'ignore' })
        const timer = setTimeout(() => { child.kill(); done(false) }, 10_000)
        child.on('error', () => { clearTimeout(timer); done(false) })
        child.on('close', (code) => { clearTimeout(timer); done(code === 0) })
      }),
  })
  services.set(key, service)
  return service
}

function readBody(req: IncomingMessage): Promise<Buffer | 408 | 413 | null> {
  return new Promise((done) => {
    const chunks: Buffer[] = []
    let size = 0
    const finish = (result: Buffer | 408 | 413 | null) => {
      clearTimeout(idle)
      clearTimeout(deadline)
      req.off('data', onData)
      req.off('end', onEnd)
      req.off('close', onClose)
      req.off('error', onClose)
      if (typeof result === 'number') req.pause()
      done(result)
    }
    const idle = setTimeout(() => finish(408), 15_000)
    const deadline = setTimeout(() => finish(408), 30_000)
    const onData = (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY) { finish(413); return }
      chunks.push(chunk)
      idle.refresh()
    }
    const onEnd = () => finish(Buffer.concat(chunks, size))
    const onClose = () => finish(null)
    req.once('end', onEnd)
    req.once('close', onClose)
    req.once('error', onClose)
    req.on('data', onData)
  })
}

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
  if (body === null || res.destroyed) return
  if (typeof body === 'number') {
    res.setHeader('Connection', 'close')
    json(body, { error: body === 408 ? 'Przekroczono czas zapytania.' : 'Zbyt duże zapytanie.' })
    return
  }
  let targets: unknown, group: unknown
  try { ({ targets, group } = JSON.parse(body.toString('utf8')) as { targets?: unknown; group?: unknown }) } catch { json(400, { error: 'Niepoprawny JSON.' }); return }
  if (!Array.isArray(targets) || !targets.length || targets.length > MAX_TARGETS || !targets.every(validTarget)) { json(400, { error: 'Niepoprawna lista wycinków.' }); return }
  if (group !== undefined && (typeof group !== 'string' || !group || group.length > 128)) { json(400, { error: 'Niepoprawny identyfikator zdjęcia.' }); return }
  if (!(await service.ready())) { json(503, { error: 'Regresor jest niedostępny na tym serwerze.' }); return }
  const jobs = await service.submit(targets.map(({ raDeg, decDeg, radiusDeg, type }) => ({ raDeg, decDeg, radiusDeg, type })), group)
  if (!jobs) { json(429, { error: 'Kolejka regresora jest pełna. Spróbuj później.' }); return }
  json(200, { ready: true, jobs })
}
