// Jedna instancja bazy IndexedDB dla całej aplikacji.
import { openPlannerDb } from './db'

export const appDb = openPlannerDb()
