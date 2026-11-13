import type { IncomingMessage, ServerResponse } from 'node:http'
import { readResponseText } from './readResponseText.ts'

export interface AstroBinEnv { ASTROBIN_API_KEY?: string; ASTROBIN_API_SECRET?: string }
const maxResponseBytes = 1024 * 1024

function astroBinUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'astrobin.com' || url.hostname.endsWith('.astrobin.com'))
  } catch { return false }
}

interface Photo { imageUrl: string; galleryUrl: string; title: string }
/** Wynik dla obiektu: zdjęcie albo jego brak (null). Awarie (502) nie są zapamiętywane. */
type Lookup = { photo: Photo | null } | { failed: true }

// Pamięć wyników (także „brak zdjęcia”) i wspólne zapytanie w locie: każda miniatura z `preferAstroBin` pytała
// wcześniej do 3 razy API AstroBin z kluczem, także o obiekty bez zdjęć (audyt C11).
const HIT_MS = 6 * 3_600_000
const MISS_MS = 3_600_000
const MAX_ENTRIES = 500
const remembered = new Map<string, { at: number; photo: Photo | null }>()
const inFlight = new Map<string, { promise: Promise<Lookup>; waiters: number; abort: AbortController }>()

async function lookup(subject: string, env: Required<AstroBinEnv>, fetchImpl: typeof fetch, signal: AbortSignal): Promise<Lookup> {
  const compact = subject.replace(/\s+/g, '')
  const queries = [['subjects', subject], ...(compact === subject ? [] : [['subjects', compact]]), ['title__icontains', subject]]
  for (const [filter, value] of queries) {
    const url = new URL('https://www.astrobin.com/api/v1/image/')
    url.search = new URLSearchParams({ user: 'Konuz', [filter]: value, limit: '10', format: 'json', api_key: env.ASTROBIN_API_KEY, api_secret: env.ASTROBIN_API_SECRET }).toString()
    try {
      const response = await fetchImpl(url, { headers: { 'User-Agent': 'KONUZASTRO Tracker (AstroBin API)' }, signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]) })
      const data = JSON.parse(await readResponseText(response, maxResponseBytes)) as { objects?: Array<{ url_regular?: unknown; url_thumb?: unknown; url_gallery?: unknown; title?: unknown }> }
      const image = data.objects?.find((item) => astroBinUrl(item.url_regular ?? item.url_thumb) && astroBinUrl(item.url_gallery))
      if (!image) continue
      return { photo: { imageUrl: (image.url_regular ?? image.url_thumb) as string, galleryUrl: image.url_gallery as string, title: typeof image.title === 'string' ? image.title : subject } }
    } catch { return { failed: true } }
  }
  return { photo: null }
}

function remember(subject: string, photo: Photo | null) {
  remembered.delete(subject)
  remembered.set(subject, { at: Date.now(), photo })
  while (remembered.size > MAX_ENTRIES) remembered.delete(remembered.keys().next().value!)
}

/** Wspólny endpoint dla Vite i serwera produkcyjnego. Klucze nigdy nie trafiają do bundla. */
export async function astrobinPhoto(req: IncomingMessage, res: ServerResponse, env: AstroBinEnv, fetchImpl: typeof fetch = fetch) {
  const end = (status: number) => { res.statusCode = status; res.end() }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return end(405)
  }
  const subject = new URL(req.url ?? '/', 'http://localhost').searchParams.get('subject')?.trim()
  if (!subject || subject.length > 80) return end(400)
  if (!env.ASTROBIN_API_KEY || !env.ASTROBIN_API_SECRET) return end(503)
  const send = (photo: Photo | null) => {
    res.setHeader('Cache-Control', 'private, max-age=3600')
    if (!photo) return end(204)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(photo))
  }
  const known = remembered.get(subject)
  if (known && Date.now() - known.at < (known.photo ? HIT_MS : MISS_MS)) return send(known.photo)
  let running = inFlight.get(subject)
  if (!running) {
    const abort = new AbortController()
    const promise = lookup(subject, env as Required<AstroBinEnv>, fetchImpl, abort.signal).then((result) => {
      if ('photo' in result) remember(subject, result.photo)
      return result
    }).finally(() => inFlight.delete(subject))
    running = { promise, waiters: 0, abort }
    inFlight.set(subject, running)
  }
  // Rozłączenie ostatniego oczekującego klienta przerywa zapytania do AstroBin (B20).
  const shared = running
  shared.waiters++
  const onClose = () => { if (!res.writableEnded && --shared.waiters === 0) shared.abort.abort() }
  res.once('close', onClose)
  const result = await shared.promise
  res.off('close', onClose)
  if (res.destroyed) return
  if ('failed' in result) return end(502)
  send(result.photo)
}
