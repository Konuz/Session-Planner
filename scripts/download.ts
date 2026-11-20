import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

function writeAtomic(path: string, data: string | Buffer) {
  mkdirSync(dirname(path), { recursive: true })
  const temp = `${path}.${process.pid}.${Date.now()}.tmp`
  try {
    writeFileSync(temp, data)
    renameSync(temp, path)
  } catch (err) {
    rmSync(temp, { force: true })
    throw err
  }
}

export function fetchBuildData(url: string, init?: RequestInit): Promise<Response> {
  const deadline = AbortSignal.timeout(120_000)
  const signal = init?.signal ? AbortSignal.any([init.signal, deadline]) : deadline
  return fetch(url, { ...init, signal })
}

const looksLikeHtml = (text: string) => /^\s*<(!doctype html|html)/i.test(text.slice(0, 512))
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47]

/**
 * Tekst z pamięci podręcznej albo z sieci. Do pamięci trafia tylko odpowiedź, która przeszła sprawdzenie
 * (nie strona HTML, a dla `.json` poprawny JSON; `check` może dodać własne, np. błąd zapytania VizieR),
 * więc chwilowa awaria źródła nie zostaje w niej na stałe.
 */
export async function cachedText(cacheDir: string, name: string, url: string, init?: RequestInit, check?: (text: string) => void): Promise<string> {
  const path = join(cacheDir, name)
  if (existsSync(path) && statSync(path).size > 0) return readFileSync(path, 'utf8')
  const res = await fetchBuildData(url, init)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const text = await res.text()
  if (looksLikeHtml(text)) throw new Error(`${url}: zamiast danych przyszła strona HTML`)
  if (name.endsWith('.json')) JSON.parse(text)
  check?.(text)
  writeAtomic(path, text)
  return text
}

/** Plik binarny z pamięci podręcznej albo z sieci; `.png` musi mieć sygnaturę PNG. */
export async function cachedBytes(cacheDir: string, name: string, url: string, init?: RequestInit): Promise<Buffer> {
  const path = join(cacheDir, name)
  if (existsSync(path) && statSync(path).size > 0) return readFileSync(path)
  const res = await fetchBuildData(url, init)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (name.endsWith('.png') && !PNG_SIGNATURE.every((byte, i) => buf[i] === byte)) throw new Error(`${url}: brak obrazu PNG`)
  writeAtomic(path, buf)
  return buf
}
