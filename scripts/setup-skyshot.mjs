import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { runCommand } from './run-command.ts'

const revision = '76f01812fe0fc0fcdcbeba1ab89b339b19e1bc9e'
const cache = resolve('scripts/.cache')
const source = resolve(cache, 'skyshot-solver')
mkdirSync(cache, { recursive: true })

async function installDirectory(destination, prepare) {
  const staging = resolve(mkdtempSync(join(cache, 'skyshot-stage-')))
  if (dirname(realpathSync(staging)) !== realpathSync(cache) || dirname(destination) !== cache) {
    throw new Error('Niepoprawna ścieżka instalacji Skyshota.')
  }
  try {
    const result = join(staging, 'data')
    await prepare(result)
    if (existsSync(destination)) throw new Error(`Katalog instalacji już istnieje: ${destination}`)
    renameSync(result, destination)
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}

const minute = 60_000
if (!existsSync(source)) {
  await installDirectory(source, (destination) => runCommand('git', ['clone', 'https://github.com/ashtree74/skyshot-solver.git', destination], { timeoutMs: 10 * minute }))
}
await runCommand('git', ['checkout', '--detach', revision], { cwd: source, timeoutMs: minute })
const mingw = resolve(cache, 'mingw/mingw64/bin')
const gnu = process.platform === 'win32' && existsSync(resolve(mingw, 'gcc.exe'))
const env = gnu ? { ...process.env, PATH: `${mingw};${process.env.PATH}`, CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER: resolve(mingw, 'gcc.exe') } : process.env
await runCommand('cargo', [...(gnu ? ['+stable-x86_64-pc-windows-gnu'] : []), 'build', '--release', '--locked', '--manifest-path', 'scripts/skyshot-bridge/Cargo.toml', '--target-dir', 'scripts/.cache/skyshot-build'], { env, timeoutMs: 30 * minute })
if (gnu) for (const name of ['libwinpthread-1.dll', 'libgcc_s_seh-1.dll']) {
  if (existsSync(resolve(mingw, name))) copyFileSync(resolve(mingw, name), resolve(cache, 'skyshot-build/release', name))
}
const data = resolve(cache, 'skyshot-data')
if (existsSync(join(data, '.incomplete'))) throw new Error(`Niepełna instalacja Skyshota: ${data}. Przenieś ją przed ponowieniem.`)
if (!existsSync(join(data, 'index'))) {
  const python = process.platform === 'win32'
    ? execFileSync('py', ['-X', 'utf8', '-c', 'import sys; print(sys.executable)'], { encoding: 'utf8', timeout: 15_000, killSignal: 'SIGKILL', windowsHide: true }).trim()
    : 'python3'
  const downloads = resolve(cache, 'skyshot-download-cache')
  const lock = join(downloads, '.download.lock')
  await installDirectory(data, async (destination) => {
    try {
      await runCommand(python, ['tools/fetch_data.py', '--preset', 'full', '--dest', destination, '--cache', downloads], { cwd: source, timeoutMs: 90 * minute })
    } catch (error) {
      // Instalator zapisuje PID Pythona. Po wymuszonym zakończeniu zwalniamy wyłącznie jego blokadę.
      if (Number.isInteger(error?.interruptedPid) && existsSync(lock) && lstatSync(lock).isFile()
        && readFileSync(lock, 'utf8').trim() === String(error.interruptedPid)) unlinkSync(lock)
      throw error
    }
  })
}
console.log('Skyshot jest gotowy. Zdjęcia są rozwiązywane lokalnie, bez wysyłania do zewnętrznych usług.')
