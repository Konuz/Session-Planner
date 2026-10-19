// Model edytora profilu sprzętu (7F, formularz-profilu): czyste funkcje bez wyglądu. Profil → tekst pól, tekst pól →
// profil albo null i lista błędów/ostrzeżeń, podgląd optyki, wyszukiwarka wpisów katalogu, przyciski mnożnika
// i oznaczenia „zmienione względem katalogu”.
// Liczby czyta `parseDecimal`, zakresy sprzętu i ostrzeżenia z `validateEquipment`, optyka z `computeOptics`.
import { REDUCER_PRESETS } from '../../data/equipmentCatalog'
import { assessSampling, computeOptics, type Sampling } from '../../services/astroMath'
import {
  changedCameraFields,
  changedTelescopeFields,
  findSpec,
  parseDecimal,
  validateEquipment,
  type EquipmentField,
} from '../../services/equipment'
import type { CameraSpec, EquipmentProfile, FilterId, Mount, TelescopeSpec } from '../../types'

/** Stan formularza: pola liczbowe jako tekst (przecinek albo kropka dziesiętna), reszta jako wybór. */
export interface ProfileForm {
  id: string
  /** Nazwa profilu. */
  name: string
  /** Wpis katalogu teleskopu, z którego powstały wartości; null = „Własny” (wpis ręczny). */
  telescopeSpecId: string | null
  /** Nazwa teleskopu (dla wpisu katalogu: marka i model). */
  telescopeLabel: string
  apertureMm: string
  focalLengthMm: string
  reducerFactor: string
  /** Wpis katalogu kamery; null = „Własna” (wpis ręczny). */
  cameraSpecId: string | null
  /** Nazwa kamery (dla wpisu katalogu: marka i model). */
  cameraLabel: string
  sensor: 'mono' | 'osc'
  resolutionXPx: string
  resolutionYPx: string
  pixelSizeUm: string
  binning: 1 | 2 | 3 | 4
  mountType: Mount['type']
  /** Przerzut po południku [min]. */
  flipMinutes: string
  /** Zaznaczone filtry (dowolna kolejność). */
  filters: FilterId[]
  /** Pole wyboru „OAG”; false → `oag: null`. */
  oagEnabled: boolean
  oagPrismWidthMm: string
  oagPrismHeightMm: string
  /** Odległość od środka matrycy do środka pryzmatu [mm]. */
  oagOffsetMm: string
  oagAngleDeg: string
}

export type ProfileFormField = keyof ProfileForm

/** Błąd (blokuje zapis) albo ostrzeżenie (nie blokuje) przy polu formularza. */
export interface ProfileFormIssue {
  field: ProfileFormField
  severity: 'error' | 'warning'
  message: string
}

/** Wynik odczytu formularza: profil (null, gdy jest choć jeden błąd) oraz błędy i ostrzeżenia. */
export interface ProfileFormResult {
  profile: EquipmentProfile | null
  issues: ProfileFormIssue[]
}

/** Podgląd na żywo (teksty pl-PL); „—” w wartości, której nie da się policzyć. */
export interface ProfilePreview {
  /** F_eff, np. „384 mm”. */
  effectiveFocalLength: string
  /** Np. „f/4,80”. */
  focalRatio: string
  /** Wymiary matrycy, np. „19,19 × 13,07 mm”. */
  sensor: string
  /** Przekątna matrycy, np. „23,21 mm”. */
  sensorDiagonal: string
  /** Np. „2,862° × 1,949°”. */
  fieldOfViewDeg: string
  /** Np. „171,7′ × 117,0′”. */
  fieldOfViewArcmin: string
  /** Np. „2,487″/px”. */
  scale: string
  /** „nadpróbkowanie”, „idealne” albo „podpróbkowanie”. */
  sampling: string
  /** Uwaga dla kamery OSC; null dla mono. */
  oscNote: string | null
}

/** Pozycja wyników wyszukiwarki: wpis katalogu albo „Własny”/„Własna” (spec null). */
export interface SearchOption<T> {
  spec: T | null
  label: string
}

/** Przycisk szybkiego wyboru mnożnika. */
export interface ReducerButton {
  /** Np. „0,85×”, „1,0×”. */
  label: string
  /** Tekst wpisywany do pola Mnożnik po kliknięciu, np. „0,85”. */
  text: string
  /** Czy przycisk jest zaznaczony (mnożnik w formularzu ma tę wartość). */
  pressed: boolean
}

/** Wpisy katalogu, z których pochodzi formularz; null = „Własny” albo specId bez wpisu na liście. */
export interface FormSources {
  telescope: TelescopeSpec | null
  camera: CameraSpec | null
}


/** Kanoniczna kolejność filtrów w zapisanym profilu (P18). */
const FILTER_ORDER: readonly FilterId[] = ['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII', 'OSC', 'DualBand']

const EQUIPMENT_FIELDS: readonly EquipmentField[] = [
  'apertureMm',
  'focalLengthMm',
  'reducerFactor',
  'resolutionXPx',
  'resolutionYPx',
  'pixelSizeUm',
]

const FLIP_MAX_MIN = 60
const OAG_ANGLE_MAX_DEG = 360

const SAMPLING_LABELS: Record<Sampling, string> = {
  oversampled: 'nadpróbkowanie',
  ideal: 'idealne',
  undersampled: 'podpróbkowanie',
}

const OSC_NOTE = 'Kamera kolorowa (OSC): efektywna rozdzielczość jest niższa, niż wynika ze skali.'
const DASH = '—'

/** Liczba w polu: przecinek dziesiętny, bez spacji tysięcy (10000 → „10000”, 3.76 → „3,76”). */
const toText = (value: number) => String(value).replace('.', ',')

/** Liczba pl-PL z ustaloną liczbą miejsc po przecinku (`min` = `max`, chyba że podano inaczej), bez grupowania. */
function fixed(value: number, digits: number, minDigits = digits): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: digits,
    useGrouping: false,
  }).format(value)
}

const specLabel = (spec: { brand: string; model: string }) => `${spec.brand} ${spec.model}`

/** Profil → tekst pól. Pola OAG są puste, gdy `oag: null`. */
export function profileToForm(profile: EquipmentProfile): ProfileForm {
  const { telescope, camera, mount, oag } = profile
  return {
    id: profile.id,
    name: profile.name,
    telescopeSpecId: telescope.specId,
    telescopeLabel: telescope.label,
    apertureMm: toText(telescope.apertureMm),
    focalLengthMm: toText(telescope.focalLengthMm),
    reducerFactor: toText(profile.reducerFactor),
    cameraSpecId: camera.specId,
    cameraLabel: camera.label,
    sensor: camera.sensor,
    resolutionXPx: toText(camera.resolutionXPx),
    resolutionYPx: toText(camera.resolutionYPx),
    pixelSizeUm: toText(camera.pixelSizeUm),
    binning: camera.binning,
    mountType: mount.type,
    flipMinutes: toText(mount.flipMinutesAfterMeridian),
    filters: [...profile.filters],
    oagEnabled: oag !== null,
    oagPrismWidthMm: oag ? toText(oag.prismWidthMm) : '',
    oagPrismHeightMm: oag ? toText(oag.prismHeightMm) : '',
    oagOffsetMm: oag ? toText(oag.offsetFromCenterMm) : '',
    oagAngleDeg: oag ? toText(oag.angleDeg) : '',
  }
}

/** Liczby pól sprzętu z formularza; null = tekst, który nie jest liczbą. */
function equipmentValues(form: ProfileForm): Record<EquipmentField, number | null> {
  return Object.fromEntries(EQUIPMENT_FIELDS.map((field) => [field, parseDecimal(form[field])])) as Record<
    EquipmentField,
    number | null
  >
}

/** Pole liczbowe spoza `validateEquipment` (przerzut, OAG): błąd albo liczba. */
function checkNumber(
  form: ProfileForm,
  field: ProfileFormField,
  label: string,
  rule: (value: number) => string | null,
  issues: ProfileFormIssue[],
): number {
  const value = parseDecimal(form[field] as string)
  const message = value === null ? `${label}: wpisz liczbę` : rule(value)
  if (message !== null) issues.push({ field, severity: 'error', message })
  return value ?? Number.NaN
}

const inRange = (label: string, min: number, max: number, unit: string) => (value: number) =>
  value < min || value > max ? `${label}: dozwolony zakres ${min}–${max}${unit}` : null

const positive = (label: string) => (value: number) => (value > 0 ? null : `${label}: wartość musi być > 0 mm`)
const nonNegative = (label: string) => (value: number) => (value >= 0 ? null : `${label}: wartość musi być ≥ 0 mm`)

/** Tekst pól → profil albo null i lista błędów/ostrzeżeń. */
export function readProfileForm(form: ProfileForm): ProfileFormResult {
  const issues: ProfileFormIssue[] = []
  const name = form.name.trim()
  const telescopeLabel = form.telescopeLabel.trim()
  const cameraLabel = form.cameraLabel.trim()
  if (name === '') issues.push({ field: 'name', severity: 'error', message: 'Nazwa profilu: wpisz nazwę' })
  if (telescopeLabel === '') {
    issues.push({ field: 'telescopeLabel', severity: 'error', message: 'Nazwa teleskopu: wpisz nazwę' })
  }
  if (cameraLabel === '') issues.push({ field: 'cameraLabel', severity: 'error', message: 'Nazwa kamery: wpisz nazwę' })

  const values = equipmentValues(form)
  issues.push(...validateEquipment(values))
  const flip = checkNumber(form, 'flipMinutes', 'Przerzut', inRange('Przerzut', 0, FLIP_MAX_MIN, ' min'), issues)

  let oag: EquipmentProfile['oag'] = null
  if (form.oagEnabled) {
    oag = {
      prismWidthMm: checkNumber(form, 'oagPrismWidthMm', 'Szerokość pryzmatu OAG', positive('Szerokość pryzmatu OAG'), issues),
      prismHeightMm: checkNumber(form, 'oagPrismHeightMm', 'Wysokość pryzmatu OAG', positive('Wysokość pryzmatu OAG'), issues),
      offsetFromCenterMm: checkNumber(form, 'oagOffsetMm', 'Odległość OAG od środka', nonNegative('Odległość OAG od środka'), issues),
      angleDeg: checkNumber(form, 'oagAngleDeg', 'Kąt OAG', inRange('Kąt OAG', 0, OAG_ANGLE_MAX_DEG, '°'), issues),
    }
  }

  if (issues.some((issue) => issue.severity === 'error')) return { profile: null, issues }
  const num = (field: EquipmentField) => values[field] as number
  const profile: EquipmentProfile = {
    id: form.id,
    name,
    telescope: {
      specId: form.telescopeSpecId,
      label: telescopeLabel,
      apertureMm: num('apertureMm'),
      focalLengthMm: num('focalLengthMm'),
    },
    reducerFactor: num('reducerFactor'),
    camera: {
      specId: form.cameraSpecId,
      label: cameraLabel,
      sensor: form.sensor,
      resolutionXPx: num('resolutionXPx'),
      resolutionYPx: num('resolutionYPx'),
      pixelSizeUm: num('pixelSizeUm'),
      binning: form.binning,
    },
    mount: { type: form.mountType, flipMinutesAfterMeridian: flip },
    filters: FILTER_ORDER.filter((filter) => form.filters.includes(filter)),
    oag,
  }
  return { profile, issues }
}

/** Podgląd optyki; seeing z `PlanningSettings.seeingArcsec`. Pole z błędem daje „—” w wartościach od niego zależnych. */
export function profilePreview(form: ProfileForm, seeingArcsec: number): ProfilePreview {
  const values = equipmentValues(form)
  const invalid = new Set(
    validateEquipment(values)
      .filter((issue) => issue.severity === 'error')
      .map((issue) => issue.field),
  )
  const ok = (...fields: EquipmentField[]) => fields.every((field) => !invalid.has(field))
  const optics = computeOptics({
    apertureMm: values.apertureMm ?? Number.NaN,
    focalLengthMm: values.focalLengthMm ?? Number.NaN,
    reducerFactor: values.reducerFactor ?? Number.NaN,
    resolutionXPx: values.resolutionXPx ?? Number.NaN,
    resolutionYPx: values.resolutionYPx ?? Number.NaN,
    pixelSizeUm: values.pixelSizeUm ?? Number.NaN,
    binning: form.binning,
  })
  const focal = ok('focalLengthMm', 'reducerFactor')
  const sensor = ok('resolutionXPx', 'resolutionYPx', 'pixelSizeUm')
  const pixel = ok('pixelSizeUm')
  const show = (valid: boolean, text: () => string) => (valid ? text() : DASH)
  const { sensorWidthMm: w, sensorHeightMm: h, fovWidthDeg, fovHeightDeg, scaleArcsecPerPx } = optics
  return {
    effectiveFocalLength: show(focal, () => `${fixed(optics.effectiveFocalLengthMm, 1, 0)} mm`),
    focalRatio: show(focal && ok('apertureMm'), () => `f/${fixed(optics.focalRatio, 2)}`),
    sensor: show(sensor, () => `${fixed(w, 2)} × ${fixed(h, 2)} mm`),
    sensorDiagonal: show(sensor, () => `${fixed(Math.hypot(w, h), 2)} mm`),
    fieldOfViewDeg: show(sensor && focal, () => `${fixed(fovWidthDeg, 3)}° × ${fixed(fovHeightDeg, 3)}°`),
    fieldOfViewArcmin: show(sensor && focal, () => `${fixed(fovWidthDeg * 60, 1)}′ × ${fixed(fovHeightDeg * 60, 1)}′`),
    scale: show(pixel && focal, () => `${fixed(scaleArcsecPerPx, 3)}″/px`),
    sampling: show(pixel && focal, () => SAMPLING_LABELS[assessSampling(scaleArcsecPerPx, seeingArcsec)]),
    oscNote: form.sensor === 'osc' ? OSC_NOTE : null,
  }
}

/** Wpisy, których marka i model razem zawierają każde słowo frazy (bez względu na wielkość liter). */
function search<T extends { brand: string; model: string }>(query: string, specs: readonly T[]): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return specs.filter((spec) => {
    const text = specLabel(spec).toLowerCase()
    return words.every((word) => text.includes(word))
  })
}

/** Wyszukiwarka teleskopów: „Własny” i pasujące wpisy z listy (wbudowane i własne użytkownika). */
export function searchTelescopes(query: string, telescopes: readonly TelescopeSpec[]): SearchOption<TelescopeSpec>[] {
  return [{ spec: null, label: 'Własny' }, ...search(query, telescopes).map((spec) => ({ spec, label: specLabel(spec) }))]
}

/** Wyszukiwarka kamer: „Własna” i pasujące wpisy z listy (wbudowane i własne użytkownika). */
export function searchCameras(query: string, cameras: readonly CameraSpec[]): SearchOption<CameraSpec>[] {
  return [{ spec: null, label: 'Własna' }, ...search(query, cameras).map((spec) => ({ spec, label: specLabel(spec) }))]
}

/** Wybór teleskopu z wyszukiwarki: wpis katalogu ustawia nazwę i wartości; null („Własny”) zostawia wartości. */
export function selectTelescope(form: ProfileForm, spec: TelescopeSpec | null): ProfileForm {
  if (spec === null) return { ...form, telescopeSpecId: null }
  return {
    ...form,
    telescopeSpecId: spec.id,
    telescopeLabel: specLabel(spec),
    apertureMm: toText(spec.apertureMm),
    focalLengthMm: toText(spec.focalLengthMm),
  }
}

/** Wybór kamery z wyszukiwarki: wpis katalogu ustawia nazwę i wartości; null („Własna”) zostawia wartości. */
export function selectCamera(form: ProfileForm, spec: CameraSpec | null): ProfileForm {
  if (spec === null) return { ...form, cameraSpecId: null }
  return {
    ...form,
    cameraSpecId: spec.id,
    cameraLabel: specLabel(spec),
    sensor: spec.sensor,
    resolutionXPx: toText(spec.resolutionXPx),
    resolutionYPx: toText(spec.resolutionYPx),
    pixelSizeUm: toText(spec.pixelSizeUm),
  }
}

/** Wpisy katalogu, z których pochodzi formularz (szukane na podanych listach). */
export function formSources(
  form: ProfileForm,
  telescopes: readonly TelescopeSpec[],
  cameras: readonly CameraSpec[],
): FormSources {
  return { telescope: findSpec(telescopes, form.telescopeSpecId), camera: findSpec(cameras, form.cameraSpecId) }
}

/** Pola „zmienione względem katalogu” (apertura, ogniskowa, typ, rozdzielczości, piksel); tekst bez liczby pomija. */
export function changedFields(
  form: ProfileForm,
  telescopes: readonly TelescopeSpec[],
  cameras: readonly CameraSpec[],
): ProfileFormField[] {
  const { telescope, camera } = formSources(form, telescopes, cameras)
  const values = equipmentValues(form)
  const readable = (field: string) => !(EQUIPMENT_FIELDS as readonly string[]).includes(field) || values[field as EquipmentField] !== null
  const changed: ProfileFormField[] = []
  if (telescope) {
    const current = { specId: telescope.id, label: '', apertureMm: values.apertureMm ?? 0, focalLengthMm: values.focalLengthMm ?? 0 }
    changed.push(...changedTelescopeFields(current, telescope).filter(readable))
  }
  if (camera) {
    const current = {
      specId: camera.id,
      label: '',
      sensor: form.sensor,
      resolutionXPx: values.resolutionXPx ?? 0,
      resolutionYPx: values.resolutionYPx ?? 0,
      pixelSizeUm: values.pixelSizeUm ?? 0,
      binning: form.binning,
    }
    changed.push(...changedCameraFields(current, camera).filter(readable))
  }
  return changed
}

/** Przyciski mnożnika z `REDUCER_PRESETS`, z zaznaczeniem dla mnożnika w formularzu. */
export function reducerButtons(form: ProfileForm): ReducerButton[] {
  const current = parseDecimal(form.reducerFactor)
  return REDUCER_PRESETS.map(({ factor }) => {
    const text = fixed(factor, 2, 1)
    return { label: `${text}×`, text, pressed: current === factor }
  })
}
