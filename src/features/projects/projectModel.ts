// Model zakładki Projekty (7E): projekt (obiekt, kadr, zestaw), dziennik akwizycji, sumy h:mm i cele na filtr,
// współrzędne HMS/DMS, eksport CSV dla N.I.N.A. i plik JSON projektu. Czyste funkcje; komponenty tylko renderują.
import { formatDesignation } from '../../services/catalog/records'
import { FILTER_IDS, isEquipmentProfile, parseDecimal } from '../../services/equipment'
import { MOSAIC_NEEDS_PROFILE, ninaCsv, ninaPanes } from '../../services/export/ninaCsv'
import { formatDeg, formatNightLabel } from '../../services/format'
import { normalizeFraming } from '../../services/framing'
import { MAX_EXPOSURE_S, MAX_SUBS, isFilter, isNightDate, isObject, isProject, newProjectId } from '../../services/projects'
import { pad2, raHours, secondsText, sexagesimal } from '../../services/sexagesimal'
import type { AcquisitionEntry, DsoObject, EquipmentProfile, FilterId, Framing, Project } from '../../types'

export const PROJECT_FILE_FORMAT = 'astrophotography-planner-project'
const PROJECT_FILE_VERSION = 1

// ---------- Projekt ----------

/** Projekt z kadru zakładki Kadr: nazwa = oznaczenie obiektu, kadr jako przycięta kopia, zestaw = podany profil. */
export function createProject(input: {
  object: DsoObject
  framing: Framing
  profile: EquipmentProfile
  nowIso: string
  taken: readonly string[]
}): Project {
  return {
    id: newProjectId(input.taken),
    name: formatDesignation(input.object.primary),
    objectUid: input.object.uid,
    equipmentId: input.profile.id,
    framing: structuredClone(normalizeFraming(input.framing)),
    log: [],
    goalMinutes: {},
    notes: '',
    createdAtIso: input.nowIso,
  }
}

/** Zestaw projektu z listy profili; usunięty albo nieznany → null. */
export function projectEquipment(project: Project, profiles: readonly EquipmentProfile[]): EquipmentProfile | null {
  return profiles.find((profile) => profile.id === project.equipmentId) ?? null
}

// ---------- Dziennik, sumy i cele ----------

/** Czas w h:mm, minuty zaokrąglone (65 → „1:05”, 6000 → „100:00”). */
export function formatHoursMinutes(minutes: number): string {
  const rounded = Math.round(minutes)
  return `${Math.floor(rounded / 60)}:${pad2(rounded % 60)}`
}

const entryMinutes = (entry: AcquisitionEntry) => (entry.subs * entry.exposureS) / 60
const percent = (fraction: number) => `${Math.round(fraction * 100)}%`
const numberText = (value: number) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 3, useGrouping: false }).format(value)

export interface FilterRow {
  filter: FilterId
  subs: number
  minutes: number
  /** Suma h:mm. */
  total: string
  /** Cel h:mm albo null (bez celu). */
  goal: string | null
  goalMinutes: number | null
  /** Zebrane / cel (może przekroczyć 1); null bez celu. */
  progress: number | null
  progressText: string | null
}

/** Wiersze filtrów: filtry zestawu, dziennika i celów w kolejności L…DualBand. */
export function filterRows(project: Project, profileFilters: readonly FilterId[]): FilterRow[] {
  const used = new Set<FilterId>([...profileFilters, ...project.log.map((entry) => entry.filter), ...(Object.keys(project.goalMinutes) as FilterId[])])
  return FILTER_IDS.filter((filter) => used.has(filter)).map((filter) => {
    const entries = project.log.filter((entry) => entry.filter === filter)
    const minutes = entries.reduce((sum, entry) => sum + entryMinutes(entry), 0)
    const goalMinutes = project.goalMinutes[filter] ?? null
    const progress = goalMinutes === null ? null : minutes / goalMinutes
    return {
      filter,
      subs: entries.reduce((sum, entry) => sum + entry.subs, 0),
      minutes,
      total: formatHoursMinutes(minutes),
      goal: goalMinutes === null ? null : formatHoursMinutes(goalMinutes),
      goalMinutes,
      progress,
      progressText: progress === null ? null : percent(progress),
    }
  })
}

/** Suma wszystkich wpisów w h:mm. */
export function totalText(project: Project): string {
  return formatHoursMinutes(project.log.reduce((sum, entry) => sum + entryMinutes(entry), 0))
}

export interface LogRow {
  index: number
  night: string
  filter: FilterId
  subs: string
  exposure: string
  total: string
}

export function logRows(project: Project): LogRow[] {
  return project.log.map((entry, index) => ({
    index,
    night: formatNightLabel(entry.nightDate),
    filter: entry.filter,
    subs: String(entry.subs),
    exposure: `${numberText(entry.exposureS)} s`,
    total: formatHoursMinutes(entryMinutes(entry)),
  }))
}

/** Nowy wpis w kolejności nocy; wpisy z tej samej nocy w kolejności dodania. */
export function addLogEntry(project: Project, entry: AcquisitionEntry): Project {
  const log = [...project.log, { ...entry }]
  // Array.prototype.sort jest stabilne, więc wpisy z tej samej nocy zostają w kolejności dodania.
  log.sort((a, b) => a.nightDate.localeCompare(b.nightDate))
  return { ...project, log }
}

export function removeLogEntry(project: Project, index: number): Project {
  return { ...project, log: project.log.filter((_, i) => i !== index) }
}

export interface LogForm {
  nightDate: string
  filter: string
  subs: string
  exposureS: string
}

export type LogField = keyof LogForm

export interface LogIssue {
  field: LogField
  message: string
}

const LOG_MESSAGES: Record<LogField, string> = {
  nightDate: 'Podaj datę nocy w formacie RRRR-MM-DD',
  filter: 'Wybierz filtr',
  subs: 'Liczba klatek: liczba całkowita od 1 do 100 000',
  exposureS: `Czas klatki: liczba sekund większa od 0, najwyżej ${MAX_EXPOSURE_S}`,
}

/** Formularz wpisu dziennika → wpis albo błędy (pod polami). */
export function readLogForm(form: LogForm): { entry: AcquisitionEntry | null; issues: LogIssue[] } {
  const subs = parseDecimal(form.subs)
  const exposureS = parseDecimal(form.exposureS)
  const valid: Record<LogField, boolean> = {
    nightDate: isNightDate(form.nightDate),
    filter: isFilter(form.filter),
    subs: subs !== null && Number.isInteger(subs) && subs >= 1 && subs <= MAX_SUBS,
    exposureS: exposureS !== null && exposureS > 0 && exposureS <= MAX_EXPOSURE_S,
  }
  const issues = (Object.keys(valid) as LogField[]).filter((field) => !valid[field]).map((field) => ({ field, message: LOG_MESSAGES[field] }))
  if (issues.length > 0) return { entry: null, issues }
  return { entry: { nightDate: form.nightDate, filter: form.filter as FilterId, subs: subs as number, exposureS: exposureS as number }, issues }
}

export const GOAL_ERROR = 'Cel: liczba minut większa od 0 (puste pole = bez celu)'

/** Pole celu w minutach: puste = bez celu. */
export function readGoalInput(text: string): { minutes: number | null; error: string | null } {
  if (text.trim() === '') return { minutes: null, error: null }
  const minutes = parseDecimal(text)
  return minutes !== null && minutes > 0 ? { minutes, error: null } : { minutes: null, error: GOAL_ERROR }
}

export function setGoal(project: Project, filter: FilterId, minutes: number | null): Project {
  const goalMinutes = { ...project.goalMinutes }
  if (minutes === null) delete goalMinutes[filter]
  else goalMinutes[filter] = minutes
  return { ...project, goalMinutes }
}

// ---------- Współrzędne ----------

const signText = (negative: boolean) => (negative ? '−' : '+')
const decimalSign = (value: number) => (value >= 0 ? '+' : '')

/** Środek kadru jako HMS/DMS i w stopniach dziesiętnych (pl-PL, przecinek dziesiętny, minus U+2212). */
export function coordinateTexts(framing: Framing): { ra: string; dec: string; raDecimal: string; decDecimal: string } {
  const ra = raHours(framing.centerRaDeg, 2)
  const dec = sexagesimal(framing.centerDecDeg, 1)
  return {
    ra: `${pad2(ra.whole)}h ${pad2(ra.minutes)}m ${secondsText(ra.seconds, 2, ',')}s`,
    dec: `${signText(dec.negative)}${pad2(dec.whole)}° ${pad2(dec.minutes)}′ ${secondsText(dec.seconds, 1, ',')}″`,
    raDecimal: formatDeg(framing.centerRaDeg, 4),
    decDecimal: `${decimalSign(framing.centerDecDeg)}${formatDeg(framing.centerDecDeg, 4)}`,
  }
}

// ---------- Pliki ----------

/** Nazwa pliku bez znaków niedozwolonych w Windows (litery, cyfry, „-”, „_”, „.”). */
export function projectFileName(name: string, extension: string): string {
  const base = name.replace(/[^\p{L}\p{N}._-]+/gu, '_').replace(/^[_.]+|[_.]+$/g, '')
  return `${base || 'projekt'}.${extension}`
}

/** CSV dla N.I.N.A. z kadru projektu; mozaika potrzebuje zestawu projektu. */
export function projectCsv(project: Project, profiles: readonly EquipmentProfile[]): { csv: string; fileName: string } | { error: string } {
  try {
    return { csv: ninaCsv(ninaPanes(project.name, projectEquipment(project, profiles), project.framing)), fileName: projectFileName(project.name, 'csv') }
  } catch (error) {
    if (error instanceof Error && error.message === MOSAIC_NEEDS_PROFILE) {
      return { error: 'Zestaw projektu nie istnieje; wybierz zestaw, żeby wyeksportować mozaikę.' }
    }
    throw error
  }
}

/** Plik JSON projektu: projekt i kopia jego zestawu (żeby kadr mozaiki dało się odtworzyć na innym urządzeniu). */
export function projectToFile(project: Project, equipment: EquipmentProfile | null): string {
  return `${JSON.stringify({ format: PROJECT_FILE_FORMAT, version: PROJECT_FILE_VERSION, project, equipment }, null, 2)}\n`
}

/**
 * Odczyt pliku projektu. Projekt o zajętym id dostaje nowe id. Gdy zestawu projektu nie ma na liście, a plik go zawiera,
 * wynik ma `addProfile` (zestaw do dodania); zestaw z pliku o innym id niż `equipmentId` jest pomijany.
 */
export function readProjectFile(
  text: string,
  existing: { projectIds: readonly string[]; profiles: readonly EquipmentProfile[] },
): { project: Project; addProfile: EquipmentProfile | null } | { error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { error: 'To nie jest plik JSON.' }
  }
  if (!isObject(raw) || raw.format !== PROJECT_FILE_FORMAT) return { error: 'To nie jest plik projektu tej aplikacji.' }
  if (raw.version !== PROJECT_FILE_VERSION) return { error: `Plik projektu ma nieobsługiwaną wersję ${String(raw.version)}.` }
  const equipment = raw.equipment ?? null
  if (!isProject(raw.project) || (equipment !== null && !isEquipmentProfile(equipment))) {
    return { error: 'Plik projektu jest uszkodzony albo niepełny.' }
  }
  const project = raw.project
  const id = existing.projectIds.includes(project.id) ? newProjectId(existing.projectIds) : project.id
  const known = existing.profiles.some((profile) => profile.id === project.equipmentId)
  const addProfile = !known && equipment !== null && equipment.id === project.equipmentId ? equipment : null
  return { project: { ...project, id }, addProfile }
}

// ---------- Kadr projektu ----------

/** PA i mozaika kadru projektu, np. „30,0°” i „2×1, zakładka 20%”. */
export function framingTexts(framing: Framing): { pa: string; mosaic: string } {
  const { paDeg, mosaic } = normalizeFraming(framing)
  return {
    pa: formatDeg(paDeg, 1),
    mosaic: mosaic.cols * mosaic.rows === 1 ? 'pojedynczy kadr (1×1)' : `${mosaic.cols}×${mosaic.rows}, zakładka ${formatDeg(mosaic.overlapPct, 0).replace('°', '%')}`,
  }
}

/** Kadr z zakładki Kadr można przenieść do projektu, gdy ustawiono go dla obiektu projektu. */
export function canTakeFraming(project: Project, framing: Framing | null, framingObjectUid: string | null): framing is Framing {
  return framing !== null && framingObjectUid === project.objectUid
}

/** Projekt z kadrem z zakładki Kadr i zestawem, dla którego go ustawiono (kopia, przycięta do zakresów). */
export function takeFraming(project: Project, framing: Framing, profileId: string): Project {
  return { ...project, framing: structuredClone(normalizeFraming(framing)), equipmentId: profileId }
}
