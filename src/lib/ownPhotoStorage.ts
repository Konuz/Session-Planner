// Własne zdjęcia obiektów w IndexedDB, osobno od projektu Eksploratora zdjęć (`tracker-photo`).
import type { OwnPhotoRecord, OwnPhotoSolved } from './ownPhoto'

const STORE = 'photos'

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tracker-own-photos', 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function change(apply: (store: IDBObjectStore) => void): Promise<void> {
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite')
      apply(transaction.objectStore(STORE))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
    })
  } finally { db.close() }
}

export async function readOwnPhoto(objectId: string): Promise<OwnPhotoRecord | null> {
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(objectId)
      request.onsuccess = () => resolve((request.result as OwnPhotoRecord | undefined) ?? null)
      request.onerror = () => reject(request.error)
    })
  } finally { db.close() }
}

/** Zapis zastępuje poprzednie zdjęcie obiektu (najwyżej jedno na obiekt). */
export function writeOwnPhoto(record: OwnPhotoRecord): Promise<void> {
  return change((store) => store.put(record, record.objectId))
}

export function deleteOwnPhoto(objectId: string): Promise<void> {
  return change((store) => store.delete(objectId))
}

/** Odpowiedź solvera → rekord; obiekt z odpowiedzi serwera, nie z bieżącego zaznaczenia. */
export async function recordFromSolved(solved: OwnPhotoSolved): Promise<OwnPhotoRecord> {
  const blob = (url: string) => fetch(url).then((r) => r.blob())
  const [image, mask] = await Promise.all([blob(solved.image), solved.mask ? blob(solved.mask) : null])
  return { ...solved, image, mask }
}
