import { createServer } from 'node:http'
import { expect, it, vi } from 'vitest'
import { fetchBuildData } from '../../scripts/download.ts'
import { runCommand } from '../../scripts/run-command.ts'

it('przerywa pobieranie danych również po otrzymaniu nagłówków', async () => {
  const server = createServer((_req, res) => { res.write('fragment') })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('listen')
  const abort = new AbortController()
  const deadline = vi.spyOn(AbortSignal, 'timeout').mockReturnValueOnce(abort.signal)
  try {
    const response = await fetchBuildData(`http://127.0.0.1:${address.port}`)
    expect(deadline).toHaveBeenCalledWith(120_000)
    const body = response.text()
    abort.abort()
    await expect(body).rejects.toMatchObject({ name: 'AbortError' })
  } finally {
    deadline.mockRestore()
    const closed = new Promise<void>((resolve) => server.close(() => resolve()))
    server.closeAllConnections()
    await closed
  }
})

// Limit testu musi przekraczać budżet samego runCommand: 200 ms + taskkill (spawnSync do 5 s) na Windows.
// Przy domyślnych 5 s test bywał niestabilny podczas równoległego przebiegu całego zestawu.
it('kończy zawieszone polecenie z komunikatem o przekroczeniu limitu', async () => {
  await expect(runCommand(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { timeoutMs: 200 }))
    .rejects.toThrow('Przekroczono limit czasu polecenia')
}, 15_000)
