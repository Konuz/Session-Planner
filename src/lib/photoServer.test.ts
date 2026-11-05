import { createServer, request as httpRequest } from 'node:http'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { photoApi } from '../../server/photo.ts'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { access, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { crc32, deflateSync } from 'node:zlib'

const solve = vi.hoisted(() => vi.fn<() => Promise<never>>())
vi.mock('node:child_process', () => ({
  execFile: Object.assign(() => {}, { [Symbol.for('nodejs.util.promisify.custom')]: solve }),
}))

beforeEach(() => { solve.mockReset().mockRejectedValue(new Error('Brak rozwiązania w atrapie solvera')) })
afterEach(() => vi.restoreAllMocks())

vi.mock('node:fs/promises', async (original) => {
  const fs = await original<typeof import('node:fs/promises')>()
  return { ...fs, access: vi.fn(fs.access), rm: vi.fn(fs.rm) }
})

it('szuka domyślnej instalacji Skyshota względem modułu niezależnie od cwd', async () => {
  const server = createServer((req, res) => { void photoApi(req, res, {}) })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('listen')
  vi.mocked(access).mockClear().mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined)
  const cwd = vi.spyOn(process, 'cwd').mockReturnValue(tmpdir())
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/photo/status`)
    expect(await response.json()).toEqual({ ready: true })
    const binary = process.platform === 'win32' ? 'tracker-skyshot.exe' : 'tracker-skyshot'
    expect(access).toHaveBeenCalledWith(fileURLToPath(new URL(`../../scripts/.cache/skyshot-build/release/${binary}`, import.meta.url)))
    expect(access).toHaveBeenCalledWith(fileURLToPath(new URL('../../scripts/.cache/skyshot-data/index', import.meta.url)))
  } finally {
    cwd.mockRestore()
    await new Promise<void>((r) => server.close(() => r()))
  }
})

it('odrzuca obcy origin i niepoprawny obraz przed uruchomieniem solvera', async () => {
  const server = createServer((req, res) => { void photoApi(req, res) })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('listen')
  const base = `http://127.0.0.1:${address.port}`
  try {
    expect((await fetch(`${base}/api/photo/solve`, { method: 'POST', headers: { Origin: 'https://foreign.example' }, body: 'invalid' })).status).toBe(403)
    expect((await fetch(`${base}/api/photo/solve`)).status).toBe(405)
    const response = await fetch(`${base}/api/photo/solve`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'invalid' })
    expect(response.status).toBe(415)
    expect((await response.json()).error).toBeTruthy()
  } finally {
    await new Promise<void>((r) => server.close(() => r()))
  }
})

async function solveServer() {
  const jobs: Promise<void>[] = []
  const server = createServer((req, res) => { jobs.push(photoApi(req, res, { SKYSHOT_BRIDGE: process.execPath, SKYSHOT_INDEX: tmpdir() })) })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('listen')
  const url = `http://127.0.0.1:${address.port}/api/photo/solve`
  const upload = (body: BodyInit = 'invalid') => fetch(url, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body })
  const close = async () => {
    const closed = new Promise<void>((r) => server.close(() => r()))
    server.closeAllConnections()
    await closed
    await Promise.all(jobs)
  }
  return { url, jobs, upload, close }
}

const testImage = async () => new Uint8Array(await sharp({ create: { width: 32, height: 32, channels: 3, background: '#000000' } }).png().toBuffer())

it('przy równoczesnym imporcie uruchamia tylko jedno rozwiązywanie', async () => {
  const image = await testImage()
  const { upload, close } = await solveServer()
  let started!: () => void
  let release!: () => void
  const inSolver = new Promise<void>((resolve) => { started = resolve })
  const blocked = new Promise<void>((resolve) => { release = resolve })
  solve.mockImplementationOnce(async () => { started(); await blocked; throw new Error('Brak rozwiązania') })
  const first = upload(image)
  void first.catch(() => {})
  try {
    await Promise.race([inSolver, first.then((res) => { throw new Error(`Solver nie wystartował, HTTP ${res.status}`) })])
    expect((await upload(image)).status).toBe(409)
    expect(solve).toHaveBeenCalledTimes(1)
    release()
    expect((await first).status).toBe(422)
  } finally {
    release()
    await close()
  }
})

it('błąd sprzątania nie blokuje kolejnych importów', async () => {
  const image = await testImage()
  const { jobs, upload, close } = await solveServer()
  const cleanup = vi.mocked(rm).getMockImplementation()!
  let failedPath: Parameters<typeof rm>[0] | undefined
  vi.mocked(rm).mockImplementationOnce(async (path) => { failedPath = path; throw new Error('EPERM') })
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    expect((await upload(image)).status).toBe(422)
    await jobs[0]
    expect((await upload(image)).status).toBe(422)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(solve).toHaveBeenCalledTimes(2)
  } finally {
    await close()
    if (failedPath) await cleanup(failedPath, { recursive: true, force: true })
    warn.mockRestore()
  }
})

it.each(['bezczynność', 'cały transfer', 'rozłączenie'] as const)('zwalnia slot przesyłania: %s', async (reason) => {
  const { url, jobs, upload, close } = await solveServer()
  const timer = vi.spyOn(globalThis, 'setTimeout')
  const client = httpRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png', 'Content-Length': '1024' },
    signal: AbortSignal.timeout(3000),
  })
  const response = new Promise<{ status?: number; connection?: string }>((resolve, reject) => {
    client.once('response', (res) => { res.resume(); resolve({ status: res.statusCode, connection: res.headers.connection }) })
    client.once('error', reject)
  })
  void response.catch(() => {})
  client.write('początek zdjęcia')
  try {
    const delay = reason === 'cały transfer' ? 120_000 : 15_000
    const expire = await vi.waitFor(() => {
      const match = timer.mock.calls.find(([, ms]) => ms === delay)
      expect(match).toBeDefined()
      return match![0]
    })
    if (reason === 'rozłączenie') client.destroy()
    else {
      expire()
      expect(await response).toEqual({ status: 408, connection: 'close' })
    }
    await jobs[0]
    expect((await upload()).status).toBe(422)
    expect(solve).not.toHaveBeenCalled()
  } finally {
    client.destroy()
    timer.mockRestore()
    await close()
  }
})

it('zwraca 413 i zwalnia slot po przekroczeniu 40 MiB w strumieniu bez Content-Length', async () => {
  const { url, upload, close } = await solveServer()
  const client = httpRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png', 'Transfer-Encoding': 'chunked' },
    signal: AbortSignal.timeout(4000),
  })
  try {
    const status = await new Promise<number | undefined>((resolve, reject) => {
      client.once('response', (res) => { res.resume(); resolve(res.statusCode) })
      client.once('error', reject)
      client.end(Buffer.alloc(40 * 1024 * 1024 + 1))
    })
    expect(status).toBe(413)
    expect((await upload()).status).toBe(422)
    expect(solve).not.toHaveBeenCalled()
  } finally {
    client.destroy()
    await close()
  }
})

it('odrzuca skompresowany raster powyżej 64 MP przed solverem', async () => {
  const width = 8001, height = 8000
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 1 // Jednobitowa skala szarości utrzymuje mały rozmiar próbki.
  const chunk = (type: string, data: Buffer) => {
    const packet = Buffer.alloc(data.length + 12)
    packet.writeUInt32BE(data.length)
    packet.write(type, 4)
    data.copy(packet, 8)
    packet.writeUInt32BE(crc32(packet.subarray(4, -4)), packet.length - 4)
    return packet
  }
  const image = Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.alloc((1 + Math.ceil(width / 8)) * height))),
    chunk('IEND', Buffer.alloc(0)),
  ])
  const { upload, close } = await solveServer()
  try {
    const response = await upload(new Uint8Array(image))
    expect(response.status).toBe(422)
    expect((await response.json()).error).toContain('64 MP')
    expect(solve).not.toHaveBeenCalled()
  } finally {
    await close()
  }
})
