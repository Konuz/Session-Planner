import { migratePhotoProject, type PhotoProject } from './photo'

let unsavedPhoto: { project: PhotoProject | null } | null = null
let saveQueue = Promise.resolve()

export function hasUnsavedPhoto(): boolean {
  return unsavedPhoto !== null
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
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('projects').objectStore('projects').get('current')
      request.onsuccess = () => {
        const stored = migratePhotoProject(request.result)
        resolve(unsavedPhoto ? unsavedPhoto.project : stored)
      }
      request.onerror = () => reject(request.error)
    })
  } finally { db.close() }
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
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('projects', 'readwrite')
      if (project) transaction.objectStore('projects').put(project, 'current')
      else transaction.objectStore('projects').delete('current')
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally { db.close() }
}
