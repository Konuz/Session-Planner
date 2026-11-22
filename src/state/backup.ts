// Kopia zapasowa stanu aplikacji: to, co `persist` trzyma w localStorage, w pliku JSON (bez zdjęć z IndexedDB).
// Przywracanie idzie przez `merge` tej samej konfiguracji, więc dane są sprawdzane jak przy starcie aplikacji.
import { useStore, type State } from './store'

const APP = 'konuzastro-tracker'
const FORMAT = 1
const FOREIGN = 'To nie jest plik kopii zapasowej KONUZASTRO Tracker.'

export interface Backup {
  savedAtMs: number
  state: Partial<State>
}

export function backupFileName(nowMs: number): string {
  return `konuzastro-kopia-${new Date(nowMs).toLocaleDateString('sv-SE')}.json`
}

export function backupText(nowMs: number): string {
  const state = useStore.persist.getOptions().partialize!(useStore.getState())
  return JSON.stringify({ app: APP, format: FORMAT, savedAt: new Date(nowMs).toISOString(), state }, null, 2)
}

export function parseBackup(text: string): Backup {
  let file: unknown
  try {
    file = JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch {
    throw new Error(FOREIGN)
  }
  const { app, format, savedAt, state } = (file && typeof file === 'object' ? file : {}) as Record<string, unknown>
  const savedAtMs = typeof savedAt === 'string' ? Date.parse(savedAt) : NaN
  if (app !== APP || typeof format !== 'number' || !state || typeof state !== 'object' || !Number.isFinite(savedAtMs)) throw new Error(FOREIGN)
  if (format > FORMAT) throw new Error('Kopia pochodzi z nowszej wersji aplikacji. Zaktualizuj aplikację i spróbuj ponownie.')
  return { savedAtMs, state: state as Partial<State> }
}

/**
 * Zastępuje utrwalany stan kopią. Zdjęcia własne są w bazie tej przeglądarki, więc `ownPhotos` idzie za nią:
 * bieżące wpisy zostają, a z kopii dochodzą tylko te, których zdjęcie (`photoId`) jest w bazie.
 * `localPhotoId` zwraca `photoId` zdjęcia obiektu w bazie albo null.
 */
export async function restoreBackup(backup: Backup, localPhotoId: (objectId: string) => Promise<string | null>): Promise<void> {
  const { partialize, merge } = useStore.persist.getOptions()
  const initial = useStore.getInitialState()
  // Z pliku tylko pola utrwalane: plik nie nadpisze widoku ani akcji store.
  const keys = Object.keys(partialize!(initial)).filter((key) => key in backup.state)
  const persisted = Object.fromEntries(keys.map((key) => [key, backup.state[key as keyof State]])) as Partial<State>
  const photoIds = persisted.ownPhotos && typeof persisted.ownPhotos === 'object' ? Object.keys(persisted.ownPhotos) : []
  // Błąd bazy (undefined) nie usuwa wpisu: nie wiadomo, czy zdjęcie istnieje.
  const local = new Map(await Promise.all(photoIds.map(async (id) => [id, await localPhotoId(id).catch(() => undefined)] as const)))

  // Stan liczony po odczycie bazy, synchronicznie: zmiany z czasu oczekiwania nie są cofane.
  const current = useStore.getState()
  // Pola utrwalane wracają do domyślnych. Widok (zakładka, tryb środka, okna) zostaje bieżący, a kadr,
  // kursor czasu i historia wyboru należą do poprzedniego celu, więc wracają do stanu początkowego.
  const base = {
    ...current, ...partialize!(initial),
    framing: initial.framing, framingView: initial.framingView, timeMs: initial.timeMs,
    history: initial.history, historyPos: initial.historyPos, framePinned: initial.framePinned,
  } as State
  const next = merge!(persisted, base)
  const restored = Object.entries(next.ownPhotos).filter(([id, entry]) => local.get(id) === undefined || local.get(id) === entry.photoId)
  useStore.setState({ ...next, ownPhotos: { ...Object.fromEntries(restored), ...current.ownPhotos } }, true)
}
