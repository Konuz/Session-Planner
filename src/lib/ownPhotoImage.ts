// Obraz nieba z wklejonym własnym zdjęciem: tło z przeglądu (getSkyImage) + zdjęcie przez siatkę WCS.
import { imageCache } from './imageCache'
import type { TanView } from './ownPhoto'
import { composeOwnPhoto } from './ownPhotoCompose'
import { readOwnPhoto } from './ownPhotoStorage'
import { getSkyImage, isCompleteSkyImage, type SkyImageOptions } from './thumbs'

// Osobny bufor: klucze tła zależą tylko od współrzędnych, a te obrazy także od zdjęcia.
const cache = imageCache('tracker-own-thumbs-v1', 64)

/** Indeks w Zustand wskazuje zdjęcie, którego nie ma w IndexedDB (np. wyczyszczone dane witryny). */
export class OwnPhotoMissingError extends Error {
  constructor(objectId: string) {
    super(`Brak zapisanego zdjęcia obiektu ${objectId}`)
    this.name = 'OwnPhotoMissingError'
  }
}

export function ownImageKey(photoId: string, view: TanView, opts: SkyImageOptions): string {
  const { survey = 'dss2', mode = 'color', coarser = 0 } = opts
  return `/own/${photoId}/${survey}/${mode}/${coarser}/${view.raDeg.toFixed(4)}/${view.decDeg.toFixed(4)}/${view.fovDeg}/${view.sizePx}`
}

/** Brak tła (kafelki, sieć) nie ukrywa zdjęcia: reszta pola jest czarna. Wynik bez pełnego tła nie trafia do bufora. */
export async function getOwnSkyImage(objectId: string, photoId: string, view: TanView, signal?: AbortSignal, opts: SkyImageOptions = {}): Promise<Blob> {
  const key = ownImageKey(photoId, view, opts)
  const cached = await cache.get(key)
  if (cached) return cached
  const background = await getSkyImage(view.raDeg, view.decDeg, view.fovDeg, view.sizePx, signal, opts).catch((e: unknown) => {
    if (e instanceof Error && e.name === 'AbortError') throw e
    return null
  })
  const record = await readOwnPhoto(objectId)
  if (!record || record.photoId !== photoId) throw new OwnPhotoMissingError(objectId)
  signal?.throwIfAborted()
  const blob = await composeOwnPhoto(background, record, view)
  if (background && isCompleteSkyImage(background)) await cache.put(key, blob)
  return blob
}
