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
  const compact = subject.replace(/\s+/g, '')
  const queries = [['subjects', subject], ...(compact === subject ? [] : [['subjects', compact]]), ['title__icontains', subject]]
  for (const [filter, value] of queries) {
    const url = new URL('https://www.astrobin.com/api/v1/image/')
    url.search = new URLSearchParams({ user: 'Konuz', [filter]: value, limit: '10', format: 'json', api_key: env.ASTROBIN_API_KEY, api_secret: env.ASTROBIN_API_SECRET }).toString()
    try {
      const response = await fetchImpl(url, { headers: { 'User-Agent': 'KONUZASTRO Tracker (AstroBin API)' }, signal: AbortSignal.timeout(10_000) })
      const data = JSON.parse(await readResponseText(response, maxResponseBytes)) as { objects?: Array<{ url_regular?: unknown; url_thumb?: unknown; url_gallery?: unknown; title?: unknown }> }
      const image = data.objects?.find((item) => astroBinUrl(item.url_regular ?? item.url_thumb) && astroBinUrl(item.url_gallery))
      if (!image) continue
      res.setHeader('Cache-Control', 'private, max-age=3600')
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ imageUrl: image.url_regular ?? image.url_thumb, galleryUrl: image.url_gallery, title: typeof image.title === 'string' ? image.title : subject }))
      return
    } catch { return end(502) }
  }
  end(204)
}
