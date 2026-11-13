export interface AstroBinPhoto {
  imageUrl: string
  galleryUrl: string
  title: string
}

function isAstroBinUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'astrobin.com' || url.hostname.endsWith('.astrobin.com'))
  } catch {
    return false
  }
}

// Wyniki z tej sesji (także brak zdjęcia): ponowne zamontowanie miniatury nie pyta serwera drugi raz (audyt C11).
const known = new Map<string, AstroBinPhoto | null>()

export async function getAstroBinPhoto(subject: string, signal?: AbortSignal): Promise<AstroBinPhoto | null> {
  if (known.has(subject)) return known.get(subject)!
  const response = await fetch(`/api/astrobin-photo?subject=${encodeURIComponent(subject)}`, { signal })
  // Awarie (5xx, brak kluczy) nie są zapamiętywane: następne otwarcie spróbuje ponownie.
  if (!response.ok) return null
  if (response.status === 204) { known.set(subject, null); return null }
  const photo = await response.json() as Partial<AstroBinPhoto>
  const result = isAstroBinUrl(photo.imageUrl) && isAstroBinUrl(photo.galleryUrl)
    ? { imageUrl: photo.imageUrl, galleryUrl: photo.galleryUrl, title: typeof photo.title === 'string' ? photo.title : subject }
    : null
  known.set(subject, result)
  return result
}
