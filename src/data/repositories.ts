// Repozytoria danych użytkownika: własny sprzęt widoczny razem z wbudowanym (6.5) i warstwa katalogu z importu (6.3).
import type { EntityTable } from 'dexie'
import type { DsoObject } from '../types'
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
