import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const cache = join(root, 'scripts', '.cache')
const args = new Set(process.argv.slice(2))
const dev = args.has('--dev')
const forceBuild = args.has('--build')
const fetchSkyshot = args.has('--fetch-skyshot')
const win = process.platform === 'win32'
const npmCmd = win ? 'npm.cmd' : 'npm'
const env: NodeJS.ProcessEnv = { ...process.env }

function run(cmd: string, cmdArgs: string[], cmdEnv: NodeJS.ProcessEnv): boolean {
  return spawnSync(cmd, cmdArgs, {
    cwd: root,
    env: cmdEnv,
    stdio: 'inherit',
    windowsHide: true,
    shell: win && cmd === npmCmd,
  }).status === 0
}

function hasCmd(cmd: string): boolean {
  return spawnSync(cmd, ['--version'], {
    cwd: root,
    env,
    stdio: 'ignore',
    windowsHide: true,
  }).status === 0
}

function findPixi(): string | undefined {
  return [env.PIXI, 'pixi', join(homedir(), '.pixi/bin', win ? 'pixi.exe' : 'pixi')]
    .filter((candidate): candidate is string => Boolean(candidate))
    .find(hasCmd)
}

if (!existsSync(join(root, 'node_modules'))) {
  const cmd = existsSync(join(root, 'package-lock.json')) ? 'ci' : 'install'
  if (!run(npmCmd, [cmd], env)) process.exit(1)
}

const bridge = env.SKYSHOT_BRIDGE ?? join(cache, 'skyshot-build/release', win ? 'tracker-skyshot.exe' : 'tracker-skyshot')
if (!existsSync(bridge)) {
  if (hasCmd('cargo')) {
    if (!run(process.execPath, [join(root, 'scripts/setup-skyshot.mjs'), '--bridge-only'], env)) {
      console.warn('[up] Skyshot bridge build failed — continuing without local plate solving')
    }
  } else {
    console.log('[up] cargo not found — skipping local Skyshot bridge build')
  }
}

const indexDir = env.SKYSHOT_INDEX ?? join(cache, 'skyshot-data/index')
if (!existsSync(indexDir)) {
  if (fetchSkyshot) {
    if (!run(process.execPath, [join(root, 'scripts/setup-skyshot.mjs'), '--data-only'], env)) process.exit(1)
  } else {
    console.log('[up] Skyshot star index not found — run "npm run setup:skyshot" (~842 MB) to enable local plate solving')
  }
}

const pixi = findPixi()
if (pixi) {
  if (!env.PIXI) env.PIXI = pixi
  if (!existsSync(join(root, 'astro-regressor-main/.pixi'))) {
    if (!run(pixi, ['install', '--manifest-path', 'astro-regressor-main/pixi.toml'], env)) {
      console.warn('[up] Pixi environment install failed — ML distance regressor may be unavailable')
    }
  }
} else {
  console.log('[up] pixi not found — ML distance regressor disabled')
}

if (!dev && (forceBuild || !existsSync(join(root, 'dist/index.html')))) {
  if (!run(npmCmd, ['run', 'build'], env)) process.exit(1)
}

const launchArgs = dev
  ? [join(root, 'node_modules/vite/bin/vite.js')]
  : ['--env-file-if-exists=.env.local', join(root, 'server/index.ts')]
const child = spawn(process.execPath, launchArgs, { cwd: root, env, stdio: 'inherit', windowsHide: true })

const forward = (signal: NodeJS.Signals) => {
  if (child.exitCode === null) child.kill(signal)
}
process.on('SIGINT', forward)
process.on('SIGTERM', forward)

child.on('exit', (code, signal) => {
  process.off('SIGINT', forward)
  process.off('SIGTERM', forward)
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})
