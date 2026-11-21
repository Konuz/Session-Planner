import { displayName, type DSO } from './catalog'
import { validExposure, type Exposure } from './exposures'
import { fieldId, isFieldName } from './fieldTarget'
import { EXPOSURE_HEADER, NINA_HEADER, ninaName, SCHEDULER_HEADER } from './nina'
import { localTimeToMs } from './planner'
import type { Framing, PlanItem } from '../state/storeHelpers'

interface SavedTarget {
  name: string
  framing: Framing
  startMs: number | null
  endMs: number | null
  exposures?: Exposure[]
  note: string
}

function invalid(): never {
  throw new Error('Nie można odczytać planu. Wybierz poprawny plik CSV lub TXT zapisany w planerze.')
}

function csvRows(text: string, columns: number): string[][] {
  const field = /(?:"((?:[^"]|"")*)"|([^",\r\n]*))(,|\r?\n|$)/y
  const rows: string[][] = []
  let row: string[] = []
  while (field.lastIndex < text.length) {
    const cell = field.exec(text)
    if (!cell) invalid()
    row.push(cell[1]?.replace(/""/g, '"') ?? cell[2])
    if (cell[3] === ',') continue
    if (row.length !== columns) invalid()
    rows.push(row)
    row = []
  }
  if (row.length) invalid()
  return rows
}

function angle(value: string, hours: boolean): number {
  const parts = /^([+−-]?)(\d+)[:h°]\s*(\d+)[:m′]\s*(\d+(?:\.\d+)?)[s″]?$/.exec(value)
  if (!parts) invalid()
  const [, sign, units, minutes, seconds] = parts
  const magnitude = +units + +minutes / 60 + +seconds / 3600
  if (+minutes >= 60 || +seconds >= 60 || (hours ? !!sign || magnitude >= 24 : magnitude > 90)) invalid()
  return magnitude * (hours ? 15 : sign === '+' || sign === '' ? 1 : -1)
}

function target(name: string, ra: string, dec: string, pa: string): SavedTarget {
  if (!name.trim() || !pa.trim() || !Number.isFinite(Number(pa))) invalid()
  return { name, framing: { raDeg: angle(ra, true), decDeg: angle(dec, false), paDeg: Number(pa) }, startMs: null, endMs: null, note: '' }
}

function exposure(filter: string, frames: string, seconds: string): Exposure {
  const result = { filter, count: Number(frames), seconds: Number(seconds) }
  if (!frames.trim() || !validExposure(result)) invalid()
  return result
}

function utc(value: string): number | null {
  if (!value) return null
  const ms = Date.parse(value)
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) invalid()
  return ms
}

const unescapeCsvText = (text: string) => text.replace(/^'(?=[ \t\r]*[=+\-@])/, '')

function csvTargets(header: string, body: string): SavedTarget[] {
  if (header === NINA_HEADER) return csvRows(body, 4).map(([name, ra, dec, pa]) => target(name, ra, dec, pa))
  if (header === SCHEDULER_HEADER) return csvRows(body, 6).map(([, name, ra, dec, pa]) => target(name, ra, dec, pa))
  if (header !== EXPOSURE_HEADER) invalid()

  // Każdy panel ma własny numer, powtarzany w wierszach kolejnych filtrów.
  const groups = new Map<number, { target: SavedTarget; signature: string }>()
  for (const [order, name, ra, dec, pa, filter, frames, seconds, , start, end, zone, note] of csvRows(body, 13)) {
    const index = Number(order)
    if (!Number.isSafeInteger(index) || index < 1) invalid()
    const signature = JSON.stringify([name, ra, dec, pa, start, end, zone, note])
    const entry = exposure(unescapeCsvText(filter), frames, seconds)
    const group = groups.get(index)
    if (group) {
      if (group.signature !== signature) invalid()
      group.target.exposures!.push(entry)
    } else {
      groups.set(index, {
        signature,
        target: { ...target(unescapeCsvText(name), ra, dec, pa), startMs: utc(start), endMs: utc(end), exposures: [entry], note: unescapeCsvText(note) },
      })
    }
  }
  return [...groups.entries()].sort(([a], [b]) => a - b).map(([, group]) => group.target)
}

function textTargets(date: string, body: string): SavedTarget[] {
  const zone = /^Miejsce: .+, strefa (\S+)\r?$/m.exec(body)?.[1]
  if (!zone || !Number.isFinite(Date.parse(date))) invalid()
  const blocks = body.replace(/\r\n/g, '\n').split(/^\d+\. /m).slice(1)
  return blocks.map((block) => {
    const [title, ...lines] = block.split('\n')
    const name = /^(.+) \([^()]+\)$/.exec(title)?.[1]
    const center = lines.find((line) => line.startsWith('   Środek: '))
    const coords = /^   Środek: RA (.+), Dec (.+), PA (.+)°$/.exec(center ?? '')
    const window = lines.find((line) => line.startsWith('   Okno: '))
    if (!name || !coords || !window) invalid()
    const entry = target(name, coords[1], coords[2], coords[3])
    if (window !== '   Okno: brak') {
      const times = /^   Okno: (\d{2}:\d{2})–(\d{2}:\d{2})$/.exec(window)
      if (!times) invalid()
      entry.startMs = localTimeToMs(date, times[1], zone)
      entry.endMs = localTimeToMs(date, times[2], zone)
      if (entry.startMs === null || entry.endMs === null) invalid()
    }
    entry.exposures = []
    for (const line of lines.slice(3)) {
      const match = /^   (.+): (\d+) × (\S+) s = (?:\d+ h )?\d+ min$/.exec(line)
      if (!match) break
      entry.exposures.push(exposure(match[1], match[2], match[3]))
    }
    if (!entry.exposures.length) invalid()
    entry.note = lines.find((line) => line.startsWith('   Notatka: '))?.slice('   Notatka: '.length) ?? ''
    return entry
  })
}

export function readSavedPlan(text: string, catalog: readonly DSO[], defaultFilters: string): Omit<PlanItem, 'key'>[] {
  const input = text.replace(/^\uFEFF/, '').trimEnd()
  const firstLine = input.indexOf('\n')
  if (firstLine < 0) invalid()
  const header = input.slice(0, firstLine).trimEnd()
  const body = input.slice(firstLine + 1)
  const date = /^KONUZASTRO: plan sesji, noc (\d{4}-\d{2}-\d{2})$/.exec(header)?.[1]
  const targets = date ? textTargets(date, body) : csvTargets(header, body)
  if (!targets.length) throw new Error('Plik nie zawiera celów do wczytania.')

  const names = new Map<string, DSO>()
  const ids = new Map<string, DSO>()
  for (const object of catalog) {
    const name = (object.id + ' ' + displayName(object)).trim()
    names.set(name, object)
    names.set(ninaName(name), object)
    ids.set(object.id, object)
  }
  return targets.map(({ name, exposures, ...settings }) => {
    const filters = exposures?.map((entry) => entry.filter).join(', ') ?? defaultFilters
    if (isFieldName(name)) {
      // Swobodne pole (każdy panel mozaiki osobno): środkiem pola jest zapisany środek kadru.
      const field = { raDeg: settings.framing.raDeg!, decDeg: settings.framing.decDeg! }
      return { ...settings, framing: { ...settings.framing, raDeg: null, decDeg: null }, objectId: fieldId(field), objectIndex: -1, field, filters, exposures }
    }
    const baseName = name.replace(/ Panel \d+$/, '')
    // Starszy eksport może podawać inną nazwę zwyczajową. Identyfikator jest na początku.
    let object = names.get(name) ?? names.get(baseName)
    let prefix = baseName
    while (!object && prefix) {
      object = ids.get(prefix)
      const split = prefix.lastIndexOf(' ')
      prefix = split < 0 ? '' : prefix.slice(0, split)
    }
    if (!object) throw new Error('Brak celu w aktualnym katalogu: ' + name)
    return {
      ...settings,
      objectId: object.id,
      objectIndex: object.i,
      filters,
      exposures,
    }
  })
}
