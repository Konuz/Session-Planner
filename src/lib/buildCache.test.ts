import { createServer } from 'node:http'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { cachedBytes, cachedText } from '../../scripts/download.ts'

const bodies: Record<string, string | Buffer> = {
  '/html': '<!DOCTYPE html><html><body>Service unavailable</body></html>',
  '/bad-json': '{"objects": [',
  '/json': '{"objects": []}',
  '/not-png': 'GIF89a',
  '/png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
}
let hits = 0
const server = createServer((req, res) => { hits++; res.end(bodies[req.url ?? ''] ?? '') })
let base = ''
const dir = mkdtempSync(join(tmpdir(), 'build-cache-'))
const cache = join(dir, 'nie-istnieje-jeszcze')

beforeAll(async () => {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('listen')
  base = `http://127.0.0.1:${address.port}`
})
afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()))
  rmSync(dir, { recursive: true, force: true })
})

it('nie zapisuje do pamięci strony HTML ani niepoprawnego JSON (B10)', async () => {
  await expect(cachedText(cache, 'a.json', `${base}/html`)).rejects.toThrow('strona HTML')
  await expect(cachedText(cache, 'b.json', `${base}/bad-json`)).rejects.toThrow()
  await expect(cachedText(cache, 'c.tsv', `${base}/html`)).rejects.toThrow('strona HTML')
  expect(existsSync(join(cache, 'a.json')) || existsSync(join(cache, 'b.json')) || existsSync(join(cache, 'c.tsv'))).toBe(false)
})

it('tworzy katalog pamięci i przy drugim wywołaniu nie sięga do sieci', async () => {
  expect(await cachedText(cache, 'ok.json', `${base}/json`)).toBe('{"objects": []}')
  const before = hits
  expect(await cachedText(cache, 'ok.json', `${base}/json`)).toBe('{"objects": []}')
  expect(hits).toBe(before)
  expect(readFileSync(join(cache, 'ok.json'), 'utf8')).toBe('{"objects": []}')
})

it('przyjmuje do pamięci tylko PNG z poprawną sygnaturą', async () => {
  await expect(cachedBytes(cache, 'art-x.png', `${base}/not-png`)).rejects.toThrow('brak obrazu PNG')
  expect(existsSync(join(cache, 'art-x.png'))).toBe(false)
  expect((await cachedBytes(cache, 'art-y.png', `${base}/png`)).length).toBe(8)
})

it('odrzuca odpowiedź, której nie przyjęło własne sprawdzenie (np. błąd zapytania VizieR)', async () => {
  const reject = (text: string) => { if (text.includes('objects')) throw new Error('VizieR: błąd zapytania') }
  await expect(cachedText(cache, 'vizier-error.tsv', `${base}/json`, undefined, reject)).rejects.toThrow('VizieR')
  expect(existsSync(join(cache, 'vizier-error.tsv'))).toBe(false)
})
