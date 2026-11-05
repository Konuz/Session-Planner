import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { ViteDevServer } from 'vite'
import { expect, it, vi } from 'vitest'
import viteConfig from '../../vite.config'
import { photoApi } from '../../server/photo'
import { astrobinPhoto } from '../../server/astrobin'

vi.mock('../../server/photo', () => ({ photoApi: vi.fn() }))
vi.mock('../../server/astrobin', () => ({ astrobinPhoto: vi.fn() }))
vi.mock('vite', async (original) => ({ ...await original<typeof import('vite')>(), loadEnv: () => ({}) }))

it.each(['/api/photo', '/api/astrobin-photo'])('zwraca ogólny błąd 500 i loguje diagnostykę dla %s', async (path) => {
  const failure = new Error('private/filesystem/secret-value')
  vi.mocked(photoApi).mockRejectedValue(failure)
  vi.mocked(astrobinPhoto).mockRejectedValue(failure)
  if (typeof viteConfig !== 'function') throw new Error('Brak konfiguracji Vite')
  const config = await viteConfig({ command: 'serve', mode: 'test' })
  const api = config.plugins?.find((plugin) => plugin && 'name' in plugin && plugin.name === 'astrobin-photo-api')
  if (!api || !('configureServer' in api) || typeof api.configureServer !== 'function') throw new Error('Brak middleware API')
  const handlers = new Map<string, (req: IncomingMessage, res: ServerResponse) => void>()
  const log = vi.fn()
  api.configureServer.call({} as ThisParameterType<typeof api.configureServer>, {
    middlewares: { use: (route: string, handler: (req: IncomingMessage, res: ServerResponse) => void) => handlers.set(route, handler) },
    config: { logger: { error: log } },
  } as unknown as ViteDevServer)
  const server = createServer((req, res) => handlers.get(path)!(req, res))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('listen')
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}`)
    expect(response.status).toBe(500)
    expect(response.headers.get('content-type')).toContain('application/json')
    const body = await response.json()
    expect(body).toEqual({ error: expect.any(String) })
    expect(JSON.stringify(body)).not.toContain('secret-value')
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0]).toContain('secret-value')
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})
