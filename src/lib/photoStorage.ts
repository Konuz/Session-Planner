import { migratePhotoProject, type PhotoProject } from './photo'

// Obraz projektu (JPEG do 3200 px, kilka MB) leży jako Blob pod osobnym kluczem i jest zapisywany tylko przy zmianie
// zdjęcia. Rekord projektu ma wtedy `image: ''`, więc zapis po edycji wycinka klonuje kilkadziesiąt KB, a w pamięci
// i w DOM obraz jest krótkim adresem blob: zamiast napisu base64 (audyt C06). Starsze zapisy z obrazem w rekordzie
// są przenoszone przy pierwszym odczycie.
const PROJECT_KEY = 'current'
const IMAGE_KEY = 'current-image'

let unsavedPhoto: { project: PhotoProject | null } | null = null
let saveQueue = Promise.resolve()
/** Adresy blob: utworzone tutaj i ich treść (do zapisu bez ponownego pobierania). */
const blobs = new Map<string, Blob>()
/** `project.image` obrazu, który jest już w bazie (zapis pomija wtedy obraz). */
let storedImage: string | null = null
/** Projekt, którego obraz ma już adres blob: (ponowny odczyt nie tworzy nowego adresu). */
let hydrated: { id: string; url: string } | null = null

export function hasUnsavedPhoto(): boolean {
  return unsavedPhoto !== null
}

function register(blob: Blob): string {
  const url = URL.createObjectURL(blob)
  blobs.set(url, blob)
  // Trzy ostatnie adresy zostają; starsze zwalniane z opóźnieniem, bo widok może jeszcze rysować poprzedni obraz.
  for (const old of [...blobs.keys()].slice(0, -3)) {
    blobs.delete(old)
    setTimeout(() => URL.revokeObjectURL(old), 10_000)
  }
  return url
}

/** Adres data: z serwera (albo inny) → adres blob: obrazu projektu. */
export async function photoImageUrl(image: string): Promise<string> {
  if (blobs.has(image)) return image
  return register(await (await fetch(image)).blob())
}

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tracker-photo', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('projects')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function readPhoto(): Promise<PhotoProject | null> {
  await saveQueue
  if (unsavedPhoto) return unsavedPhoto.project
  const db = await database()
  let record: unknown, image: unknown
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('projects')
      const store = transaction.objectStore('projects')
      const projectRequest = store.get(PROJECT_KEY)
      const imageRequest = store.get(IMAGE_KEY)
      transaction.oncomplete = () => { record = projectRequest.result; image = imageRequest.result; resolve() }
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally { db.close() }
  if (unsavedPhoto) return (unsavedPhoto as { project: PhotoProject | null }).project
  const stored = migratePhotoProject(record)
  if (!stored) return null
  if (stored.image) {
    // Zapis sprzed C06: obraz w rekordzie. Przeniesienie do osobnego klucza przy najbliższym zapisie.
    const project = { ...stored, image: await photoImageUrl(stored.image) }
    storedImage = null
    void writePhoto(project).catch(() => {})
    return project
  }
  if (!(image instanceof Blob)) return null
  let url = hydrated?.id === stored.id && blobs.has(hydrated.url) ? hydrated.url : null
  if (!url) {
    url = register(image)
    hydrated = { id: stored.id, url }
  }
  storedImage = url
  return { ...stored, image: url }
}

export function writePhoto(project: PhotoProject | null): Promise<void> {
  const draft = { project }
  unsavedPhoto = draft
  const saving = saveQueue.then(() => persistPhoto(project)).then(() => {
    if (unsavedPhoto === draft) unsavedPhoto = null
  })
  saveQueue = saving.catch(() => {})
  return saving
}

async function persistPhoto(project: PhotoProject | null): Promise<void> {
  // Blob przed otwarciem transakcji: IndexedDB zatwierdza transakcję przy pierwszym await poza nią.
  const image = project && project.image !== storedImage
    ? blobs.get(project.image) ?? await (await fetch(project.image)).blob()
    : null
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('projects', 'readwrite')
      const store = transaction.objectStore('projects')
      if (project) {
        store.put({ ...project, image: '' }, PROJECT_KEY)
        if (image) store.put(image, IMAGE_KEY)
      } else {
        store.delete(PROJECT_KEY)
        store.delete(IMAGE_KEY)
      }
      transaction.oncomplete = () => {
        storedImage = project?.image ?? null
        if (project) hydrated = { id: project.id, url: project.image }
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally { db.close() }
}
