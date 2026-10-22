// Projekt (7E, sekcja 5): id i sprawdzenie kształtu przy odczycie z bazy, z pliku projektu i z kopii zapasowej.
import type { AcquisitionEntry, FilterId, Framing, Project } from '../types'
import { FILTER_IDS } from './equipment'

/** Nowe id projektu, różne od zajętych. */
export function newProjectId(taken: readonly string[]): string {
  let id: string
  do id = `projekt-${crypto.randomUUID()}`
  while (taken.includes(id))
  return id
}

export const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isString = (value: unknown): value is string => typeof value === 'string'
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
export const isFilter = (value: unknown): value is FilterId => FILTER_IDS.includes(value as FilterId)

/** Data 'RRRR-MM-DD', która istnieje w kalendarzu. */
export function isNightDate(value: unknown): value is string {
  if (!isString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

export const MAX_SUBS = 100_000
export const MAX_EXPOSURE_S = 3600

function isEntry(raw: unknown): raw is AcquisitionEntry {
  return (
    isObject(raw) &&
    isNightDate(raw.nightDate) &&
    isFilter(raw.filter) &&
    Number.isInteger(raw.subs) && (raw.subs as number) >= 1 && (raw.subs as number) <= MAX_SUBS &&
    isFiniteNumber(raw.exposureS) && raw.exposureS > 0 && raw.exposureS <= MAX_EXPOSURE_S
  )
}

function isFraming(raw: unknown): raw is Framing {
  if (!isObject(raw) || !isObject(raw.mosaic)) return false
  const { cols, rows, overlapPct } = raw.mosaic
  return (
    isFiniteNumber(raw.centerRaDeg) && isFiniteNumber(raw.centerDecDeg) && Math.abs(raw.centerDecDeg) <= 90 &&
    isFiniteNumber(raw.paDeg) && isFiniteNumber(cols) && isFiniteNumber(rows) && isFiniteNumber(overlapPct)
  )
}

/** Czy wartość (z bazy albo z pliku) jest kompletnym, poprawnym projektem. */
export function isProject(raw: unknown): raw is Project {
  return (
    isObject(raw) &&
    isString(raw.id) && isString(raw.name) && isString(raw.objectUid) && isString(raw.equipmentId) &&
    isString(raw.notes) && isString(raw.createdAtIso) &&
    isFraming(raw.framing) &&
    Array.isArray(raw.log) && raw.log.every(isEntry) &&
    isObject(raw.goalMinutes) &&
    Object.entries(raw.goalMinutes).every(([filter, minutes]) => isFilter(filter) && isFiniteNumber(minutes) && minutes > 0)
  )
}
