// Kafelek HiPS z kolejnych luster: limit czasu na lustro, lustro zawodne spada na koniec kolejki do końca sesji,
// zapis w Cache Storage. Bez AbortSignal: kafelek zawsze kończy się wynikiem albo limitem, więc przerwanie
// jednego obrazu nie psuje drugiego, który czeka na ten sam kafelek.
import { tileUrl, type Survey, type SurveyId } from './hips'
import { imageCache } from './imageCache'

export const TILE_TIMEOUT_MS = 3000
// Treść liczona osobno: na słabym łączu kafelek ładuje się dłużej niż 3 s, choć lustro działa.
const BODY_TIMEOUT_MS = 30000
const cache = imageCache('tracker-hips-v1', 512)

const failed = new Map<SurveyId, Set<string>>()
const inFlight = new Map<string, Promise<Blob>>()

function mirrorOrder(survey: Survey): string[] {
  const bad = failed.get(survey.id) ?? new Set()
  return [...survey.mirrors.filter((m) => !bad.has(m)), ...survey.mirrors.filter((m) => bad.has(m))]
}

function demote(survey: Survey, mirror: string) {
  const bad = failed.get(survey.id) ?? new Set<string>()
  bad.delete(mirror) // ponowna porażka przesuwa na sam koniec
  bad.add(mirror)
  failed.set(survey.id, bad)
}

/** 'ok' z obrazem, 'missing' przy 404 (bez degradacji), 'failed' przy limicie czasu, błędzie sieci, 5xx albo nie-obrazie. */
async function tryMirror(url: string): Promise<Blob | 'missing' | 'failed'> {
  const ctrl = new AbortController()
  let timer = setTimeout(() => ctrl.abort(), TILE_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    timer = setTimeout(() => ctrl.abort(), BODY_TIMEOUT_MS)
    if (res.status === 404) return 'missing'
    if (!res.ok || !(res.headers.get('Content-Type') ?? '').startsWith('image/')) return 'failed'
    const blob = await res.blob()
    return blob.size >= 200 ? blob : 'failed'
  } catch {
    return 'failed'
  } finally {
    clearTimeout(timer)
  }
}

async function load(survey: Survey, order: number, npix: number, key: string): Promise<Blob> {
  const hit = await cache.get(key)
  if (hit) return hit
  for (const mirror of mirrorOrder(survey)) {
    const result = await tryMirror(tileUrl(mirror, order, npix))
    if (result === 'missing') continue
    if (result === 'failed') {
      demote(survey, mirror)
      continue
    }
    await cache.put(key, result)
    return result
  }
  throw new Error('brak kafelka')
}

export function fetchTile(survey: Survey, order: number, npix: number): Promise<Blob> {
  const key = `/hips/${survey.id}/${order}/${npix}`
  const known = inFlight.get(key)
  if (known) return known
  const promise = load(survey, order, npix, key).finally(() => inFlight.delete(key))
  inFlight.set(key, promise)
  return promise
}
