// Baza IndexedDB danych użytkownika (Dexie): warstwa katalogu z importu (6.3), własny sprzęt (6.5) i lokalizacje (7C).
import Dexie, { type EntityTable } from 'dexie'
import type { CameraSpec, DsoObject, ObserverLocation, TelescopeSpec } from '../types'

export type PlannerDb = Dexie & {
  userObjects: EntityTable<DsoObject, 'uid'>
  userTelescopes: EntityTable<TelescopeSpec, 'id'>
  userCameras: EntityTable<CameraSpec, 'id'>
  locations: EntityTable<ObserverLocation, 'id'>
}

export function openPlannerDb(name = 'astrophotography-planner'): PlannerDb {
  const db = new Dexie(name) as PlannerDb
  db.version(1).stores({ userObjects: 'uid', userTelescopes: 'id', userCameras: 'id' })
  db.version(2).stores({ locations: 'id' })
  return db
}
