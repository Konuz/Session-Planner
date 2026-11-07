import { createServer } from 'node:http'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, expect, it, vi } from 'vitest'
import { createRegressorService, regressorApi, regressorKey, type RegressorRunner, type RegressorService } from '../../server/regressor.ts'
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
