import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const revision = '76f01812fe0fc0fcdcbeba1ab89b339b19e1bc9e'
const cache = resolve('scripts/.cache')
const source = resolve(cache, 'skyshot-solver')
mkdirSync(cache, { recursive: true })
function run(command, args, cwd = process.cwd(), env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit', windowsHide: true })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
if (!existsSync(source)) run('git', ['clone', 'https://github.com/ashtree74/skyshot-solver.git', source])
run('git', ['checkout', '--detach', revision], source)
const mingw = resolve(cache, 'mingw/mingw64/bin')
const gnu = process.platform === 'win32' && existsSync(resolve(mingw, 'gcc.exe'))
const env = gnu ? { ...process.env, PATH: `${mingw};${process.env.PATH}`, CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER: resolve(mingw, 'gcc.exe') } : process.env
run('cargo', [...(gnu ? ['+stable-x86_64-pc-windows-gnu'] : []), 'build', '--release', '--locked', '--manifest-path', 'scripts/skyshot-bridge/Cargo.toml', '--target-dir', 'scripts/.cache/skyshot-build'], process.cwd(), env)
if (gnu) for (const name of ['libwinpthread-1.dll', 'libgcc_s_seh-1.dll']) {
  if (existsSync(resolve(mingw, name))) copyFileSync(resolve(mingw, name), resolve(cache, 'skyshot-build/release', name))
}
if (!existsSync(resolve(cache, 'skyshot-data/index'))) {
  run(process.platform === 'win32' ? 'py' : 'python3', ['tools/fetch_data.py', '--preset', 'full', '--dest', resolve(cache, 'skyshot-data'), '--cache', resolve(cache, 'skyshot-download-cache')], source)
}
console.log('Skyshot jest gotowy. Zdjęcia są rozwiązywane lokalnie, bez wysyłania do zewnętrznych usług.')
