import { createServer } from 'node:http'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, expect, it, vi } from 'vitest'
import { createRegressorService, regressorApi, regressorKey, workerRunner, type RegressorRunner, type RegressorService, type WorkerLimits } from '../../server/regressor.ts'
import type { RegressorResult } from './distance'

const dir = mkdtempSync(join(tmpdir(), 'regressor-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

async function call(service: RegressorService, method: string, body?: unknown, query = '') {
  const server = createServer((req, res) => { void regressorApi(req, res, service) })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('listen')
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/photo/regressor${query}`, body === undefined ? { method } : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return { status: response.status, data: await response.json() }
  } finally { await new Promise<void>((r) => server.close(() => r())) }
}

const lbn950 = { raDeg: 84.3794, decDeg: -2.3045, radiusDeg: 0.3, type: 'EN' }

it('kolejkuje wycinki, zapamiętuje wynik i odmowę, a awarii nie', async () => {
  const results: RegressorResult[] = [
    { status: 'ok', kind: 'group', members: 89, distance_pc: 379.5, lo_pc: 355.4, hi_pc: 401.6, cone_deg: 0.45 },
    { status: 'abstain', reason: 'NO_KINEMATICALLY_COHERENT_CLUSTER' },
    { status: 'error', message: 'base: 503 Service Unavailable' },
  ]
  const runner = vi.fn<RegressorRunner>(async () => results.shift()!)
  const cacheDir = join(dir, 'a')
  const service = createRegressorService({ runner, cacheDir, ready: () => true })
  const targets = [lbn950, { ...lbn950, raDeg: 58.7532, decDeg: 25.4793 }, { ...lbn950, raDeg: 202.6, decDeg: 47.3, type: 'G' }]
  const first = await call(service, 'POST', { targets })
  expect(first.status).toBe(200)
  expect(first.data.jobs.map((j: { status: string }) => j.status)).toEqual(['queued', 'queued', 'queued'])
  const keys = targets.map(regressorKey)
  // Kolejka pracuje w tle: czekamy na zapis wyników (pod obciążeniem całego zestawu testów trwa to dłużej).
  await vi.waitFor(async () => {
    const polled = await call(service, 'GET', undefined, `?keys=${keys.join(',')}`)
    expect(polled.data.jobs.map((j: { status: string }) => j.status)).toEqual(['done', 'done', 'error'])
    expect(existsSync(join(cacheDir, `${keys[1]}.json`))).toBe(true)
  }, { timeout: 5000 })
  expect(existsSync(join(cacheDir, `${keys[0]}.json`))).toBe(true)
  expect(existsSync(join(cacheDir, `${keys[1]}.json`))).toBe(true)
  expect(existsSync(join(cacheDir, `${keys[2]}.json`))).toBe(false)
  // Nowa usługa (np. po restarcie) czyta wyniki z pamięci podręcznej; awarię uruchamia ponownie.
  const runner2 = vi.fn<RegressorRunner>(async () => ({ status: 'abstain', reason: 'NO_MATCHED_EXTRAGALACTIC_DISTANCE' }))
  const again = await call(createRegressorService({ runner: runner2, cacheDir, ready: () => true }), 'POST', { targets })
  expect(again.data.jobs.map((j: { status: string }) => j.status)).toEqual(['done', 'done', 'queued'])
  expect(again.data.jobs[0].result.distance_pc).toBe(379.5)
  await vi.waitFor(() => expect(runner2).toHaveBeenCalledTimes(1), { timeout: 5000 })
})

it('daje pierwszeństwo wycinkom ostatnio zgłoszonego zdjęcia (audyt C08)', async () => {
  const order: number[] = []
  let release!: () => void
  const gate = new Promise<void>((r) => { release = r })
  const runner = vi.fn<RegressorRunner>(async (t) => {
    order.push(t.raDeg)
    if (order.length === 1) await gate
    return { status: 'abstain', reason: 'NO_KINEMATICALLY_COHERENT_CLUSTER' }
  })
  const service = createRegressorService({ runner, cacheDir: join(dir, 'd'), ready: () => true })
  const at = (raDeg: number) => ({ ...lbn950, raDeg })
  // Stare zdjęcie: pierwszy wycinek już liczony, dwa czekają. Nowe zdjęcie: jego wycinki idą przed nimi.
  await service.submit([at(1), at(2), at(3)], 'stare')
  await vi.waitFor(() => expect(order).toEqual([1]))
  await service.submit([at(10), at(11)], 'nowe')
  release()
  await vi.waitFor(() => expect(order).toHaveLength(5))
  expect(order).toEqual([1, 10, 11, 2, 3])
})

it('przy pełnej kolejce nie zostawia w niej części partii (audyt C08)', async () => {
  let release!: () => void
  const gate = new Promise<void>((r) => { release = r })
  const runner = vi.fn<RegressorRunner>(async () => { await gate; return { status: 'abstain', reason: 'x' } })
  const service = createRegressorService({ runner, cacheDir: join(dir, 'e'), ready: () => true })
  const batch = (from: number) => Array.from({ length: 40 }, (_, i) => ({ ...lbn950, raDeg: from + i * 0.01 }))
  for (let b = 0; b < 5; b++) expect(await service.submit(batch(b + 1))).not.toBeNull()
  // 200 zgłoszonych (1 liczony, 199 w kolejce): partia 40 nie mieści się w całości, więc żadna jej część nie wchodzi.
  expect(await service.submit(batch(100))).toBeNull()
  expect(service.status([regressorKey({ ...lbn950, raDeg: 100 })])[0].status).toBe('unknown')
  release()
})

// Udawany wrapper `--serve`: wiersz gotowości, potem odpowiedź z pid procesu; ra 1 to zawieszenie, ra 2 awaria procesu.
const FAKE_WORKER = `
const lines = require('node:readline').createInterface({ input: process.stdin })
console.log(JSON.stringify({ ready: true }))
lines.on('line', (line) => {
  const job = JSON.parse(line)
  if (job.ra === 2) process.exit(1)
  if (job.ra !== 1) console.log(JSON.stringify({ id: job.id, result: { status: 'abstain', reason: String(process.pid) } }))
})`
const fakeRunner = (script = FAKE_WORKER, limits: WorkerLimits = {}) =>
  // Krótki limit tylko dla zawieszonego zadania; reszta ma zapas na start procesów pod obciążeniem całego zestawu testów.
  workerRunner({ command: process.execPath, args: ['-e', script] }, { startupMs: 10_000, idleMs: 200, runMs: (t) => t.raDeg === 1 ? 500 : 10_000, ...limits })

it('stały proces: kolejne zadania w jednym procesie, po limicie, awarii i bezczynności nowy proces', async () => {
  const run = fakeRunner()
  const at = (raDeg: number) => run({ ...lbn950, raDeg })
  const first = await at(10)
  expect(first.status).toBe('abstain')
  expect(await at(11)).toEqual(first)
  expect(await at(1)).toEqual({ status: 'error', message: 'Przekroczono limit czasu regresora (0.5 s).' })
  const afterTimeout = await at(12)
  expect(afterTimeout).toMatchObject({ status: 'abstain' })
  expect(afterTimeout).not.toEqual(first)
  expect((await at(2)).status).toBe('error')
  const afterCrash = await at(13)
  expect(afterCrash).toMatchObject({ status: 'abstain' })
  expect(afterCrash).not.toEqual(afterTimeout)
  await new Promise((r) => setTimeout(r, 600))
  const afterIdle = await at(14)
  expect(afterIdle).toMatchObject({ status: 'abstain' })
  expect(afterIdle).not.toEqual(afterCrash)
}, 60_000)

it('stały proces: brak gotowości w limicie startu albo brak programu to błąd do ponowienia', async () => {
  const silent = fakeRunner('setInterval(() => {}, 1000)', { startupMs: 300 })
  expect(await silent(lbn950)).toEqual({ status: 'error', message: 'Regresor nie wystartował w 0.3 s.' })
  expect((await workerRunner({ command: join(dir, 'brak-pixi.exe'), args: [] })(lbn950)).status).toBe('error')
})

it('odrzuca złe dane i zgłasza niedostępność bez uruchamiania regresora', async () => {
  const runner = vi.fn<RegressorRunner>()
  const service = createRegressorService({ runner, cacheDir: join(dir, 'b'), ready: () => true })
  for (const targets of [[], [{ ...lbn950, decDeg: 95 }], [{ ...lbn950, type: 'PN' }], [{ ...lbn950, radiusDeg: 0 }], Array.from({ length: 41 }, () => lbn950), 'x']) {
    expect((await call(service, 'POST', { targets })).status).toBe(400)
  }
  const off = createRegressorService({ runner, cacheDir: join(dir, 'c'), ready: () => false })
  expect((await call(off, 'POST', { targets: [lbn950] })).status).toBe(503)
  expect((await call(off, 'GET')).data).toEqual({ ready: false, jobs: [] })
  expect(runner).not.toHaveBeenCalled()
})
