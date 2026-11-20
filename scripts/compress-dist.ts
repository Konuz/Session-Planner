// Wstępna kompresja dist/ po vite build: obok plików tekstowych powyżej 1 KB powstają .br i .gz, które serwer
// produkcyjny (server/index.ts) podaje według Accept-Encoding. Bez tego każdy start pobiera dane w pełnym rozmiarze.
import { realpathSync } from 'node:fs'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompress, constants, gzip } from 'node:zlib'
import { promisify } from 'node:util'

const COMPRESSIBLE = new Set(['.js', '.css', '.html', '.json', '.svg', '.webmanifest'])
const MIN_BYTES = 1024
const brotli = promisify(brotliCompress)
const gz = promisify(gzip)

async function* files(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* files(path)
    else if (COMPRESSIBLE.has(extname(entry.name))) yield path
  }
}

export async function compressDist(dir: string): Promise<{ files: number; rawBytes: number; brBytes: number }> {
  let count = 0, rawBytes = 0, brBytes = 0
  for await (const path of files(dir)) {
    if ((await stat(path)).size < MIN_BYTES) continue
    const raw = await readFile(path)
    const [br, gzipped] = await Promise.all([
      brotli(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: raw.length } }),
      gz(raw, { level: 9 }),
    ])
    await Promise.all([writeFile(`${path}.br`, br), writeFile(`${path}.gz`, gzipped)])
    count++
    rawBytes += raw.length
    brBytes += br.length
  }
  return { files: count, rawBytes, brBytes }
}

if (import.meta.main || (Boolean(process.argv[1]) && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1])))) {
  const dir = fileURLToPath(new URL('../dist/', import.meta.url))
  const { files: n, rawBytes, brBytes } = await compressDist(dir)
  console.log(`compress-dist: ${n} plików, ${(rawBytes / 1048576).toFixed(2)} MB → ${(brBytes / 1048576).toFixed(2)} MB (brotli)`)
}
