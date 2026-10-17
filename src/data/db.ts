// Baza IndexedDB danych użytkownika (Dexie): warstwa katalogu z importu (6.3), własny sprzęt (6.5), lokalizacje (7C)
// i parametry planowania (sekcja 5).
import Dexie, { type EntityTable } from 'dexie'
import type { CameraSpec, DsoObject, ObserverLocation, TelescopeSpec } from '../types'

export type PlannerDb = Dexie & {
  userObjects: EntityTable<DsoObject, 'uid'>
  userTelescopes: EntityTable<TelescopeSpec, 'id'>
  userCameras: EntityTable<CameraSpec, 'id'>
  locations: EntityTable<ObserverLocation, 'id'>
  settings: EntityTable<SettingsEntry, 'id'>
}

/** Wpis tabeli `settings`: jeden rekord na rodzaj ustawień (parametry planowania pod kluczem `planning`). */
export interface SettingsEntry {
  id: string
  value: unknown
}

export function openPlannerDb(name = 'astrophotography-planner'): PlannerDb {
  const db = new Dexie(name) as PlannerDb
  db.version(1).stores({ userObjects: 'uid', userTelescopes: 'id', userCameras: 'id' })
  db.version(2).stores({ locations: 'id' })
  db.version(3).stores({ settings: 'id' })
  return db
}
