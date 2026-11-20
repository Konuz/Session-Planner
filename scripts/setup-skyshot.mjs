import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { runCommand } from './run-command.ts'

const revision = '76f01812fe0fc0fcdcbeba1ab89b339b19e1bc9e'
// Ścieżki względem tego pliku, nie katalogu uruchomienia: serwer szuka Skyshota tak samo (server/photo.ts).
const scripts = dirname(fileURLToPath(import.meta.url))
const cache = resolve(scripts, '.cache')
const source = resolve(cache, 'skyshot-solver')
mkdirSync(cache, { recursive: true })

async function installDirectory(destination, prepare) {
  // Sprawdzenie przed pobieraniem: pełny indeks pobiera się dziesiątki minut.
  if (existsSync(destination)) throw new Error(`Katalog instalacji już istnieje: ${destination}`)
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
const bridgeOnly = process.argv.includes('--bridge-only')
const dataOnly = process.argv.includes('--data-only')
const customBridge = process.env.SKYSHOT_BRIDGE
const bridge = customBridge ?? resolve(cache, 'skyshot-build/release', process.platform === 'win32' ? 'tracker-skyshot.exe' : 'tracker-skyshot')
const needBuild = !dataOnly && !(bridgeOnly && existsSync(bridge)) && !(customBridge && existsSync(customBridge))
const data = resolve(cache, 'skyshot-data')
if (!bridgeOnly && existsSync(join(data, '.incomplete'))) throw new Error(`Niepełna instalacja Skyshota: ${data}. Przenieś ją przed ponowieniem.`)
const needData = !bridgeOnly && !existsSync(join(data, 'index'))

if (needBuild) {
  const mingw = resolve(cache, 'mingw/mingw64/bin')
  const gnu = process.platform === 'win32' && existsSync(resolve(mingw, 'gcc.exe'))
  const env = gnu ? { ...process.env, PATH: `${mingw};${process.env.PATH}`, CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER: resolve(mingw, 'gcc.exe') } : process.env
  await runCommand('cargo', [...(gnu ? ['+stable-x86_64-pc-windows-gnu'] : []), 'build', '--release', '--locked', '--manifest-path', resolve(scripts, 'skyshot-bridge/Cargo.toml'), '--target-dir', resolve(cache, 'skyshot-build')], { env, timeoutMs: 30 * minute })
  if (gnu) for (const name of ['libwinpthread-1.dll', 'libgcc_s_seh-1.dll']) {
    if (existsSync(resolve(mingw, name))) copyFileSync(resolve(mingw, name), resolve(cache, 'skyshot-build/release', name))
  }
}

if (needData) {
  if (!existsSync(source)) {
    await installDirectory(source, (destination) => runCommand('git', ['clone', 'https://github.com/ashtree74/skyshot-solver.git', destination], { timeoutMs: 10 * minute }))
  }
  let hasRevision = false
  try {
    execFileSync('git', ['cat-file', '-e', `${revision}^{commit}`], { cwd: source, stdio: 'ignore' })
    hasRevision = true
  } catch {}
  if (!hasRevision) await runCommand('git', ['fetch', 'origin', revision], { cwd: source, timeoutMs: 5 * minute })
  await runCommand('git', ['checkout', '--detach', revision], { cwd: source, timeoutMs: minute })
  const resolveWinPython = () => {
    for (const cmd of ['py', 'python3', 'python']) {
      try {
        return execFileSync(cmd, ['-X', 'utf8', '-c', 'import sys; print(sys.executable)'], { encoding: 'utf8', timeout: 15_000, killSignal: 'SIGKILL', windowsHide: true }).trim()
      } catch {}
    }
    throw new Error('Brak Pythona 3 (py, python3, python) w PATH.')
  }
  const python = process.platform === 'win32' ? resolveWinPython() : 'python3'
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
console.log(bridgeOnly ? 'Skyshot (most) jest gotowy.' : 'Skyshot jest gotowy. Zdjęcia są rozwiązywane lokalnie, bez wysyłania do zewnętrznych usług.')
