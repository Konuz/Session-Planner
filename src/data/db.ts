// Baza IndexedDB danych użytkownika (Dexie): warstwa katalogu z importu (6.3) i własny sprzęt (6.5).
import Dexie, { type EntityTable } from 'dexie'
import type { CameraSpec, DsoObject, TelescopeSpec } from '../types'

export type PlannerDb = Dexie & {
  userObjects: EntityTable<DsoObject, 'uid'>
  userTelescopes: EntityTable<TelescopeSpec, 'id'>
  userCameras: EntityTable<CameraSpec, 'id'>
}

export function openPlannerDb(name = 'astrophotography-planner'): PlannerDb {
  const db = new Dexie(name) as PlannerDb
  db.version(1).stores({ userObjects: 'uid', userTelescopes: 'id', userCameras: 'id' })
  return db
}
