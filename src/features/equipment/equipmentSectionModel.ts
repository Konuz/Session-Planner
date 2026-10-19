// Model sekcji „Sprzęt” (zakladka-sprzet): czyste funkcje widoku. Niezapisane zmiany, napis źródła wartości
// („Z katalogu: …”, „Mój wpis: …”, „Własny (wpis ręczny)”), teksty wyników wyszukiwarki i wpisów „Mój sprzęt”,
// pola edycji własnego wpisu i ich walidacja.
import { parseDecimal, validateEquipment, type EquipmentField } from '../../services/equipment'
import type { CameraSpec, EquipmentProfile, TelescopeSpec } from '../../types'
import type { OwnCameraForm, OwnTelescopeForm } from './OwnEquipmentList'
import { profileToForm, type ProfileForm } from './profileForm'
import { equipmentLabel } from './userEquipment'

const MICRO = 'µ'

/** Liczba w tekście pl-PL bez grupowania (3.76 → „3,76”). */
export const numberText = (value: number) => String(value).replace('.', ',')

/** Czy formularz różni się od zapisanego zestawu (filtry porównywane jako zbiór). */
export function isDirty(form: ProfileForm, saved: EquipmentProfile): boolean {
  const base = profileToForm(saved)
  return (Object.keys(base) as (keyof ProfileForm)[]).some((key) => {
    if (key === 'filters') {
      const a = new Set(form.filters)
      const b = new Set(base.filters)
      return a.size !== b.size || [...a].some((id) => !b.has(id))
    }
    return form[key] !== base[key]
  })
}

/** Napis źródła wartości: wpis wbudowany, własny wpis albo wpis ręczny (także po usunięciu wpisu). */
export interface SourceInfo {
  text: string
  /** Id wpisu wbudowanego (przycisk „Duplikuj jako własny”); null dla własnego wpisu i wpisu ręcznego. */
  builtinId: string | null
}

export function sourceInfo(spec: TelescopeSpec | CameraSpec | null, manual: string): SourceInfo {
  if (spec === null) return { text: manual, builtinId: null }
  const label = equipmentLabel(spec)
  return spec.origin === 'user' ? { text: `Mój wpis: ${label}`, builtinId: null } : { text: `Z katalogu: ${label}`, builtinId: spec.id }
}

export const TELESCOPE_MANUAL = 'Własny (wpis ręczny)'
export const CAMERA_MANUAL = 'Własna (wpis ręczny)'

/** „Sky-Watcher Esprit 100ED — 100/550 mm”. */
export function telescopeText(spec: TelescopeSpec): string {
  return `${equipmentLabel(spec)} — ${numberText(spec.apertureMm)}/${numberText(spec.focalLengthMm)} mm`
}

/** „ZWO ASI6200MM Pro — 9576 × 6388 px, 3,76 µm, mono”. */
export function cameraText(spec: CameraSpec): string {
  const sensor = spec.sensor === 'osc' ? 'OSC' : 'mono'
  return `${equipmentLabel(spec)} — ${spec.resolutionXPx} × ${spec.resolutionYPx} px, ${numberText(spec.pixelSizeUm)} ${MICRO}m, ${sensor}`
}

/** Tekst wyniku wyszukiwarki: własny wpis z dopiskiem „(mój)”. */
export function resultText<T extends TelescopeSpec | CameraSpec>(spec: T, text: (spec: T) => string): string {
  return spec.origin === 'user' ? `${text(spec)} (mój)` : text(spec)
}

export function telescopeEditForm(spec: TelescopeSpec): OwnTelescopeForm {
  return { name: equipmentLabel(spec), apertureMm: numberText(spec.apertureMm), focalLengthMm: numberText(spec.focalLengthMm) }
}

export function cameraEditForm(spec: CameraSpec): OwnCameraForm {
  return {
    name: equipmentLabel(spec),
    resolutionXPx: numberText(spec.resolutionXPx),
    resolutionYPx: numberText(spec.resolutionYPx),
    pixelSizeUm: numberText(spec.pixelSizeUm),
  }
}

/** Błędy i ostrzeżenia pól edycji wpisu według klucza pola. */
export function editIssues(form: OwnTelescopeForm | OwnCameraForm): { field: string; severity: 'error' | 'warning'; message: string }[] {
  const telescope = 'apertureMm' in form
  const fields: EquipmentField[] = telescope ? ['apertureMm', 'focalLengthMm'] : ['resolutionXPx', 'resolutionYPx', 'pixelSizeUm']
  const values = Object.fromEntries(fields.map((field) => [field, parseDecimal((form as unknown as Record<string, string>)[field])]))
  const issues: { field: string; severity: 'error' | 'warning'; message: string }[] = validateEquipment(values)
  if (form.name.trim() === '') {
    issues.unshift({ field: 'name', severity: 'error', message: telescope ? 'Nazwa teleskopu: wpisz nazwę' : 'Nazwa kamery: wpisz nazwę' })
  }
  return issues
}

/** Nazwa z pola edycji → marka i model: niezmieniona etykieta zostawia markę, nowa nazwa trafia do modelu. */
function named<T extends TelescopeSpec | CameraSpec>(spec: T, name: string): T {
  const trimmed = name.trim()
  return trimmed === equipmentLabel(spec) ? spec : { ...spec, brand: '', model: trimmed }
}

const num = (text: string) => parseDecimal(text) ?? Number.NaN

export function editedTelescope(spec: TelescopeSpec, form: OwnTelescopeForm): TelescopeSpec {
  return { ...named(spec, form.name), apertureMm: num(form.apertureMm), focalLengthMm: num(form.focalLengthMm) }
}

export function editedCamera(spec: CameraSpec, form: OwnCameraForm): CameraSpec {
  return {
    ...named(spec, form.name),
    resolutionXPx: num(form.resolutionXPx),
    resolutionYPx: num(form.resolutionYPx),
    pixelSizeUm: num(form.pixelSizeUm),
  }
}
