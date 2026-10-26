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

export async function getAstroBinPhoto(subject: string, signal?: AbortSignal): Promise<AstroBinPhoto | null> {
  const response = await fetch(`/api/astrobin-photo?subject=${encodeURIComponent(subject)}`, { signal })
  if (!response.ok || response.status === 204) return null
  const photo = await response.json() as Partial<AstroBinPhoto>
  if (!isAstroBinUrl(photo.imageUrl) || !isAstroBinUrl(photo.galleryUrl)) return null
  return {
    imageUrl: photo.imageUrl,
    galleryUrl: photo.galleryUrl,
    title: typeof photo.title === 'string' ? photo.title : subject,
  }
}
