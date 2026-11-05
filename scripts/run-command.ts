import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { join } from 'node:path'

export async function runCommand(command: string, args: string[], options: { timeoutMs: number; cwd?: string; env?: NodeJS.ProcessEnv }) {
  const windows = process.platform === 'win32'
  const child = spawn(command, args, { cwd: options.cwd, env: options.env, stdio: 'inherit', windowsHide: true, detached: !windows })
  let interruption: string | undefined

  function stop(reason: string) {
    if (!child.pid || child.exitCode !== null || child.signalCode !== null || interruption) return
    interruption = reason
    if (windows) {
      const taskkill = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe')
      const result = spawnSync(taskkill, ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 5000, killSignal: 'SIGKILL' })
      if (result.status !== 0) child.kill('SIGKILL')
    } else {
      try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
    }
  }

  const interrupt = () => stop('Przerwano polecenie')
  const timer = setTimeout(() => stop('Przekroczono limit czasu polecenia'), options.timeoutMs)
  process.once('SIGINT', interrupt)
  process.once('SIGTERM', interrupt)
  try {
    const [code, signal] = await once(child, 'close')
    if (interruption) throw Object.assign(new Error(`${interruption}: ${command}`), { interruptedPid: child.pid })
    if (code !== 0) throw new Error(`${command}: ${signal ?? `kod zakończenia ${code}`}`)
  } finally {
    clearTimeout(timer)
    process.off('SIGINT', interrupt)
    process.off('SIGTERM', interrupt)
  }
}
