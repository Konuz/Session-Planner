import { createServer } from 'node:http'
import { expect, it, vi } from 'vitest'
import { photoApi } from '../../server/photo.ts'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { rm } from 'node:fs/promises'

vi.mock('node:fs/promises', async (original) => {
  const fs = await original<typeof import('node:fs/promises')>()
  return { ...fs, rm: vi.fn(fs.rm) }
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

it('przy równoczesnym imporcie uruchamia tylko jedno rozwiązywanie', async () => {
  const jobs: Promise<void>[] = []
  const server = createServer((req, res) => { jobs.push(photoApi(req, res, { SKYSHOT_BRIDGE: process.execPath, SKYSHOT_INDEX: tmpdir() })) })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('listen')
  const image = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#000000' } }).png().toBuffer()
  const url = `http://127.0.0.1:${address.port}/api/photo/solve`
  try {
    const responses = await Promise.all([1, 2].map(() => fetch(url, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: new Uint8Array(image) })))
    expect(responses.map((r) => r.status).sort()).toEqual([409, 422])
  } finally {
    await new Promise<void>((r) => server.close(() => r()))
    await Promise.all(jobs)
  }
})

it('błąd sprzątania nie blokuje kolejnych importów', async () => {
  const jobs: Promise<void>[] = []
  const server = createServer((req, res) => { jobs.push(photoApi(req, res, { SKYSHOT_BRIDGE: process.execPath, SKYSHOT_INDEX: tmpdir() }).catch(() => {})) })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('listen')
  const image = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#000000' } }).png().toBuffer()
  const request = () => fetch(`http://127.0.0.1:${address.port}/api/photo/solve`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: new Uint8Array(image) })
  const cleanup = vi.mocked(rm).getMockImplementation()!
  let failedPath: Parameters<typeof rm>[0] | undefined
  vi.mocked(rm).mockImplementationOnce(async (path) => { failedPath = path; throw new Error('EPERM') })
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    expect((await request()).status).toBe(422)
    await jobs[0]
    expect((await request()).status).toBe(422)
  } finally {
    await new Promise<void>((r) => server.close(() => r()))
    await Promise.all(jobs)
    if (failedPath) await cleanup(failedPath, { recursive: true, force: true })
    warn.mockRestore()
  }
})
