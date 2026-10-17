// Repozytoria danych użytkownika: własny sprzęt widoczny razem z wbudowanym (6.5), warstwa katalogu z importu (6.3)
// i lokalizacje z horyzontem (7C).
import type { EntityTable } from 'dexie'
import type { DsoObject, ObserverLocation } from '../types'
import type { PlannerDb } from './db'
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from './equipmentCatalog'

interface EquipmentSpec {
  id: string
  origin: 'builtin' | 'user'
}

function equipmentRepository<T extends EquipmentSpec>(builtin: readonly T[], table: (db: PlannerDb) => EntityTable<T, 'id'>) {
  return {
    async list(db: PlannerDb): Promise<T[]> {
      return [...builtin, ...(await table(db).toArray())]
    },
    /** Zapis albo edycja własnego wpisu; wpisy wbudowane są tylko do odczytu (można je zduplikować pod nowym id). */
    async save(db: PlannerDb, spec: T): Promise<void> {
      if (builtin.some((entry) => entry.id === spec.id)) throw new Error(`Wpis wbudowany ${spec.id} jest tylko do odczytu`)
      await table(db).put({ ...spec, origin: 'user' })
    },
    /** Profile przechowują kopię wartości [Z26], więc usunięcie wpisu ich nie zmienia. */
    async remove(db: PlannerDb, id: T['id']): Promise<void> {
      await table(db).where('id').equals(id).delete()
    },
  }
}

export const telescopeRepository = equipmentRepository(BUILTIN_TELESCOPES, (db) => db.userTelescopes)
export const cameraRepository = equipmentRepository(BUILTIN_CAMERAS, (db) => db.userCameras)

export const userCatalogRepository = {
  list(db: PlannerDb): Promise<DsoObject[]> {
    return db.userObjects.toArray()
  },
  async save(db: PlannerDb, objects: readonly DsoObject[]): Promise<void> {
    await db.userObjects.bulkPut([...objects])
  },
  async clear(db: PlannerDb): Promise<void> {
    await db.userObjects.clear()
  },
}

export const locationRepository = {
  /** Lokalizacje posortowane po nazwie (pl-PL). */
  async list(db: PlannerDb): Promise<ObserverLocation[]> {
    return (await db.locations.toArray()).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  },
  /** Przy pierwszym uruchomieniu zapisuje lokalizacje startowe; zapis po id, więc podwójne wywołanie nie dubluje wpisów. */
  async seed(db: PlannerDb, defaults: readonly ObserverLocation[]): Promise<ObserverLocation[]> {
    if ((await db.locations.count()) === 0) await db.locations.bulkPut([...defaults])
    return locationRepository.list(db)
  },
  async save(db: PlannerDb, location: ObserverLocation): Promise<void> {
    await db.locations.put(location)
  },
  async remove(db: PlannerDb, id: string): Promise<void> {
    await db.locations.delete(id)
  },
}
