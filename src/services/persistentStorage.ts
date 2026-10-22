// Pamięć trwała (sekcja 10): `navigator.storage.persist()` chroni IndexedDB i Cache Storage przed usunięciem przez
// przeglądarkę przy braku miejsca. Obiekt `storage` jest wstrzykiwany (w przeglądarce `navigator.storage`).

export interface StorageManagerLike {
  persist?: () => Promise<boolean>
  persisted?: () => Promise<boolean>
  estimate?: () => Promise<{ usage?: number; quota?: number }>
}

export type PersistenceState = 'granted' | 'not-granted' | 'unsupported'

/** Prośba o pamięć trwałą (bez ponownej, gdy już przyznana); błąd przeglądarki = nieprzyznana. */
export async function requestPersistence(storage: StorageManagerLike | undefined): Promise<PersistenceState> {
  if (!storage?.persist) return 'unsupported'
  try {
    if (await storage.persisted?.()) return 'granted'
    return (await storage.persist()) ? 'granted' : 'not-granted'
  } catch {
    return 'not-granted'
  }
}

/** Stan pamięci trwałej bez proszenia o nią. */
export async function persistenceState(storage: StorageManagerLike | undefined): Promise<PersistenceState> {
  if (!storage?.persisted) return 'unsupported'
  try {
    return (await storage.persisted()) ? 'granted' : 'not-granted'
  } catch {
    return 'not-granted'
  }
}

export const PERSISTENCE_TEXT: Record<PersistenceState, string> = {
  granted: 'Pamięć trwała: przyznana. Przeglądarka nie usunie danych aplikacji przy braku miejsca.',
  'not-granted':
    'Pamięć trwała: nieprzyznana. Przy braku miejsca przeglądarka może usunąć dane aplikacji; rób kopie zapasowe. Zainstalowana aplikacja zwykle dostaje ją automatycznie.',
  unsupported: 'Pamięć trwała: ta przeglądarka jej nie obsługuje; rób kopie zapasowe.',
}

const decimal = (value: number) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(value)

/** Rozmiar w jednostkach dziesiętnych (kB = 1000 B), np. „12,3 MB”. */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`
  if (bytes < 1e6) return `${Math.round(bytes / 1000)} kB`
  if (bytes < 1e9) return `${decimal(bytes / 1e6)} MB`
  return `${decimal(bytes / 1e9)} GB`
}

/** „Zajęte: 12,3 MB z 1,2 GB”; null, gdy przeglądarka nie podaje zajętości. */
export async function usageText(storage: StorageManagerLike | undefined): Promise<string | null> {
  if (!storage?.estimate) return null
  try {
    const { usage, quota } = await storage.estimate()
    if (usage === undefined || quota === undefined) return null
    return `Zajęte: ${formatBytes(usage)} z ${formatBytes(quota)}`
  } catch {
    return null
  }
}
