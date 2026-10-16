// Walidacja wartości sprzętu wpisywanych ręcznie (7F, Z25) i porównanie profilu z wpisem katalogu (Z26).
import type { CameraSpec, EquipmentProfile, TelescopeSpec } from '../types'

const EQUIPMENT_FIELDS = [
  'apertureMm',
  'focalLengthMm',
  'reducerFactor',
  'resolutionXPx',
  'resolutionYPx',
  'pixelSizeUm',
] as const

export type EquipmentField = (typeof EQUIPMENT_FIELDS)[number]

export interface FieldIssue {
  field: EquipmentField
  severity: 'error' | 'warning' // błąd blokuje zapis, ostrzeżenie nie blokuje
  message: string
}

/** Wartości pól; null = wpis, który nie jest liczbą; pole pominięte nie jest sprawdzane. */
export type EquipmentValues = Partial<Record<EquipmentField, number | null>>

interface FieldRule {
  label: string
  min: number
  max: number
  unit: string
  integer: boolean
}

const RULES: Record<EquipmentField, FieldRule> = {
  apertureMm: { label: 'Apertura', min: 5, max: 1500, unit: 'mm', integer: false },
  focalLengthMm: { label: 'Ogniskowa', min: 5, max: 10_000, unit: 'mm', integer: false },
  reducerFactor: { label: 'Mnożnik', min: 0.3, max: 3, unit: '×', integer: false },
  resolutionXPx: { label: 'Rozdzielczość X', min: 100, max: 20_000, unit: 'px', integer: true },
  resolutionYPx: { label: 'Rozdzielczość Y', min: 100, max: 20_000, unit: 'px', integer: true },
  pixelSizeUm: { label: 'Rozmiar piksela', min: 1, max: 30, unit: 'µm', integer: false },
}

const FOCAL_RATIO_MIN = 1
const FOCAL_RATIO_MAX = 30
const SENSOR_LONG_SIDE_MAX_MM = 60

const numberFormat = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })
const formatNumber = (value: number) => numberFormat.format(value)

/** Liczba z pola tekstowego; przecinek i kropka dziesiętna są równoważne („3,76” = „3.76”). */
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.')
  return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(normalized) ? Number(normalized) : null
}

function rangeError(rule: FieldRule, value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) return `${rule.label}: wpisz liczbę`
  if (rule.integer && !Number.isInteger(value)) return `${rule.label}: wpisz liczbę całkowitą`
  if (value < rule.min || value > rule.max) {
    return `${rule.label}: dozwolony zakres ${formatNumber(rule.min)}–${formatNumber(rule.max)} ${rule.unit}`
  }
  return null
}

/** Błędy zakresów z 7F oraz ostrzeżenia o f/ i długości boku matrycy (tylko dla pól bez błędów). */
export function validateEquipment(values: EquipmentValues): FieldIssue[] {
  const issues: FieldIssue[] = []
  const valid: Partial<Record<EquipmentField, number>> = {}
  for (const field of EQUIPMENT_FIELDS) {
    const value = values[field]
    if (value === undefined) continue
    const message = rangeError(RULES[field], value)
    if (message !== null) issues.push({ field, severity: 'error', message })
    else if (value !== null) valid[field] = value
  }

  const { apertureMm, focalLengthMm, resolutionXPx, resolutionYPx, pixelSizeUm } = valid
  if (apertureMm !== undefined && focalLengthMm !== undefined) {
    const focalRatio = focalLengthMm / apertureMm
    if (focalRatio < FOCAL_RATIO_MIN || focalRatio > FOCAL_RATIO_MAX) {
      issues.push({
        field: 'focalLengthMm',
        severity: 'warning',
        message: `Nietypowa światłosiła f/${formatNumber(focalRatio)}: sprawdź ogniskową i aperturę`,
      })
    }
  }
  if (resolutionXPx !== undefined && resolutionYPx !== undefined && pixelSizeUm !== undefined) {
    const longSideMm = (Math.max(resolutionXPx, resolutionYPx) * pixelSizeUm) / 1000
    if (longSideMm > SENSOR_LONG_SIDE_MAX_MM) {
      issues.push({
        field: 'pixelSizeUm',
        severity: 'warning',
        message: `Dłuższy bok matrycy ma ${formatNumber(longSideMm)} mm: sprawdź rozmiar piksela i rozdzielczość`,
      })
    }
  }
  return issues
}

export function hasErrors(issues: readonly FieldIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error')
}

/** Wpis katalogu, z którego powstał profil; specId bez odpowiadającego wpisu jest traktowany jak null (7F). */
export function findSpec<T extends { id: string }>(specs: readonly T[], specId: string | null): T | null {
  return specs.find((spec) => spec.id === specId) ?? null
}

const TELESCOPE_FIELDS = ['apertureMm', 'focalLengthMm'] as const
const CAMERA_FIELDS = ['sensor', 'resolutionXPx', 'resolutionYPx', 'pixelSizeUm'] as const

/** Pola teleskopu w profilu różne od wpisu katalogu („zmienione względem katalogu”); wyliczane, nie zapisywane. */
export function changedTelescopeFields(
  telescope: EquipmentProfile['telescope'],
  spec: TelescopeSpec,
): (typeof TELESCOPE_FIELDS)[number][] {
  return TELESCOPE_FIELDS.filter((field) => telescope[field] !== spec[field])
}

/** Pola kamery w profilu różne od wpisu katalogu (binning nie należy do wpisu katalogu). */
export function changedCameraFields(camera: EquipmentProfile['camera'], spec: CameraSpec): (typeof CAMERA_FIELDS)[number][] {
  return CAMERA_FIELDS.filter((field) => camera[field] !== spec[field])
}
