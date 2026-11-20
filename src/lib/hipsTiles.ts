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
async function tryMirror(url: string, timeoutMs: number): Promise<Blob | 'missing' | 'failed'> {
  const ctrl = new AbortController()
  let timer = setTimeout(() => ctrl.abort(), timeoutMs)
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

async function load(survey: Survey, order: number, npix: number, key: string, ready: (blob: Blob) => void): Promise<void> {
  const hit = await cache.get(key)
  if (hit) return ready(hit)
  let sawMissing = false
  let sawFailed = false
  for (const mirror of mirrorOrder(survey)) {
    const result = await tryMirror(tileUrl(mirror, order, npix), survey.timeoutMs ?? TILE_TIMEOUT_MS)
    if (result === 'missing') {
      sawMissing = true
      continue
    }
    if (result === 'failed') {
      sawFailed = true
      demote(survey, mirror)
      continue
    }
    ready(result)
    return cache.put(key, result)
  }
  throw sawMissing && !sawFailed
    ? Object.assign(new Error('brak kafelka'), { missing: true })
    : new Error('brak kafelka')
}

export function fetchTile(survey: Survey, order: number, npix: number): Promise<Blob> {
  const key = `/hips/${survey.id}/${order}/${npix}`
  const known = inFlight.get(key)
  if (known) return known
  // Dekodowanie rusza po pobraniu. Do końca zapisu kolejne wywołania nadal dostają ten sam obraz.
  const promise = new Promise<Blob>((resolve, reject) => {
    void load(survey, order, npix, key, resolve).finally(() => inFlight.delete(key)).catch(reject)
  })
  inFlight.set(key, promise)
  return promise
}
