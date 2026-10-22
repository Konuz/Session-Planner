// Kopia zapasowa wszystkich danych użytkownika w JSON (sekcja 10): wszystkie tabele IndexedDB w jednym pliku.
// Import sprawdza każdy wpis, zanim cokolwiek zmieni, i zastępuje dane w jednej transakcji (błąd = dane bez zmian).
import { isEquipmentProfile } from '../services/equipment'
import { formatCount } from '../services/format'
import { isPlanningSettings } from '../services/planningSettings'
import { isObject, isProject } from '../services/projects'
import type { CameraSpec, DsoObject, ObserverLocation, Project, TelescopeSpec } from '../types'
import type { PlannerDb, SettingsEntry } from './db'

export const BACKUP_FORMAT = 'astrophotography-planner-backup'
const BACKUP_VERSION = 1

export interface BackupTables {
  locations: ObserverLocation[]
  settings: SettingsEntry[]
  userTelescopes: TelescopeSpec[]
  userCameras: CameraSpec[]
  userObjects: DsoObject[]
  projects: Project[]
}

type TableName = keyof BackupTables

const TABLE_NAMES: readonly TableName[] = ['locations', 'settings', 'userTelescopes', 'userCameras', 'userObjects', 'projects']

const tablesOf = (db: PlannerDb) => TABLE_NAMES.map((name) => db[name])

export async function readAllTables(db: PlannerDb): Promise<BackupTables> {
  const [locations, settings, userTelescopes, userCameras, userObjects, projects] = await db.transaction('r', tablesOf(db), () =>
    Promise.all([
      db.locations.toArray(),
      db.settings.toArray(),
      db.userTelescopes.toArray(),
      db.userCameras.toArray(),
      db.userObjects.toArray(),
      db.projects.toArray(),
    ]),
  )
  return { locations, settings, userTelescopes, userCameras, userObjects, projects }
}

/** Zastąpienie wszystkich tabel w jednej transakcji; błąd wycofuje całość. */
export async function replaceAllTables(db: PlannerDb, tables: BackupTables): Promise<void> {
  await db.transaction('rw', tablesOf(db), async () => {
    await Promise.all(tablesOf(db).map((table) => table.clear()))
    await db.locations.bulkPut(tables.locations)
    await db.settings.bulkPut(tables.settings)
    await db.userTelescopes.bulkPut(tables.userTelescopes)
    await db.userCameras.bulkPut(tables.userCameras)
    await db.userObjects.bulkPut(tables.userObjects)
    await db.projects.bulkPut(tables.projects)
  })
}

export function backupToFile(tables: BackupTables, nowIso: string): string {
  return `${JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAtIso: nowIso, tables }, null, 2)}\n`
}

export function backupFileName(nowIso: string): string {
  return `astro-planner-kopia-${nowIso.slice(0, 10)}.json`
}

const isString = (value: unknown): value is string => typeof value === 'string'
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isOptionalNumber = (value: unknown) => value === null || isFiniteNumber(value)

function isLocation(raw: unknown): boolean {
  return (
    isObject(raw) && isString(raw.id) && isString(raw.name) && isString(raw.timezone) &&
    isFiniteNumber(raw.latDeg) && isFiniteNumber(raw.lonDegEast) && isFiniteNumber(raw.elevationM) &&
    Array.isArray(raw.horizon) && raw.horizon.every((point) => isObject(point) && isFiniteNumber(point.azDeg) && isFiniteNumber(point.altDeg)) &&
    isOptionalNumber(raw.bortle) && isOptionalNumber(raw.sqm)
  )
}

function isSettingsEntry(raw: unknown): boolean {
  if (!isObject(raw) || !isString(raw.id)) return false
  if (raw.id === 'planning') return isPlanningSettings(raw.value)
  if (raw.id === 'profiles') return Array.isArray(raw.value) && raw.value.length > 0 && raw.value.every(isEquipmentProfile)
  return true
}

const isUserSpec = (raw: unknown): raw is Record<string, unknown> =>
  isObject(raw) && isString(raw.id) && isString(raw.brand) && isString(raw.model) && raw.origin === 'user'

function isTelescope(raw: unknown): boolean {
  return isUserSpec(raw) && isString(raw.design) && isFiniteNumber(raw.apertureMm) && isFiniteNumber(raw.focalLengthMm)
}

function isCamera(raw: unknown): boolean {
  return (
    isUserSpec(raw) && (raw.sensorModel === null || isString(raw.sensorModel)) && (raw.sensor === 'mono' || raw.sensor === 'osc') &&
    isFiniteNumber(raw.resolutionXPx) && isFiniteNumber(raw.resolutionYPx) && isFiniteNumber(raw.pixelSizeUm)
  )
}

function isObjectEntry(raw: unknown): boolean {
  return (
    isObject(raw) && isString(raw.uid) && isObject(raw.primary) && Array.isArray(raw.designations) &&
    Array.isArray(raw.commonNames) && isString(raw.type) && isFiniteNumber(raw.raDeg) && isFiniteNumber(raw.decDeg)
  )
}

const ENTRY_CHECKS: Record<TableName, (raw: unknown) => boolean> = {
  locations: isLocation,
  settings: isSettingsEntry,
  userTelescopes: isTelescope,
  userCameras: isCamera,
  userObjects: isObjectEntry,
  projects: isProject,
}

/** Odczyt pliku kopii: wszystkie tabele i każdy wpis sprawdzone; pierwszy błąd → komunikat z tabelą i numerem wpisu. */
export function readBackupFile(text: string): { tables: BackupTables; exportedAtIso: string } | { error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { error: 'To nie jest plik JSON.' }
  }
  if (!isObject(raw) || raw.format !== BACKUP_FORMAT) return { error: 'To nie jest kopia zapasowa tej aplikacji.' }
  if (raw.version !== BACKUP_VERSION) return { error: `Kopia ma nieobsługiwaną wersję ${String(raw.version)}.` }
  const tables = isObject(raw.tables) ? raw.tables : {}
  for (const name of TABLE_NAMES) {
    const rows = tables[name]
    if (!Array.isArray(rows)) return { error: `Kopia jest uszkodzona: tabela „${name}”.` }
    const bad = rows.findIndex((row) => !ENTRY_CHECKS[name](row))
    if (bad >= 0) return { error: `Kopia jest uszkodzona: tabela „${name}”, wpis ${bad + 1}.` }
  }
  return { tables: tables as unknown as BackupTables, exportedAtIso: isString(raw.exportedAtIso) ? raw.exportedAtIso : '' }
}

/** Zawartość kopii jednym zdaniem, np. „2 lokalizacje, 4 zestawy, 1 projekt, własny sprzęt: 1 teleskop i 1 kamera”. */
export function backupSummary(tables: BackupTables): string {
  const profiles = tables.settings.find((entry) => entry.id === 'profiles')?.value
  const parts = [
    formatCount(tables.locations.length, ['lokalizacja', 'lokalizacje', 'lokalizacji']),
    formatCount(Array.isArray(profiles) ? profiles.length : 0, ['zestaw', 'zestawy', 'zestawów']),
    formatCount(tables.projects.length, ['projekt', 'projekty', 'projektów']),
  ]
  const own = [
    tables.userTelescopes.length > 0 ? formatCount(tables.userTelescopes.length, ['teleskop', 'teleskopy', 'teleskopów']) : null,
    tables.userCameras.length > 0 ? formatCount(tables.userCameras.length, ['kamera', 'kamery', 'kamer']) : null,
  ].filter((part) => part !== null)
  if (own.length > 0) parts.push(`własny sprzęt: ${own.join(' i ')}`)
  if (tables.userObjects.length > 0) parts.push(formatCount(tables.userObjects.length, ['obiekt z importu', 'obiekty z importu', 'obiektów z importu']))
  return parts.join(', ')
}
