// Własne teleskopy i kamery w katalogu sprzętu (6.5, wlasny-sprzet): czyste funkcje i cienkie akcje na bazie.
// Wartości formularza → wpis teleskopu / kamery, kopia wpisu wbudowanego, etykieta wpisu, lista własnych wpisów,
// sprawdzenie „wpis wbudowany”. Profile przechowują kopię wartości [Z26], więc zmiany wpisów ich nie zmieniają.
// Akcje najpierw sprawdzają wartości, potem zapisują w bazie; błąd = odrzucona obietnica z Error z komunikatem.
import type { PlannerDb } from '../../data/db'
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from '../../data/equipmentCatalog'
import { cameraRepository, telescopeRepository } from '../../data/repositories'
import { parseDecimal, uniqueName, validateEquipment, type EquipmentValues } from '../../services/equipment'
import type { CameraSpec, TelescopeSpec } from '../../types'
import type { ProfileForm } from './profileForm'

export const READ_ONLY_MESSAGE = 'Wpis wbudowany jest tylko do odczytu: możesz go zduplikować'
const TELESCOPE_NAME_ERROR = 'Nazwa teleskopu: wpisz nazwę'
const CAMERA_NAME_ERROR = 'Nazwa kamery: wpisz nazwę'

/** Wynik „Zapisz jako mój teleskop / moją kamerę”: nowy wpis i formularz wskazujący ten wpis. */
export interface SavedAs<T> {
  spec: T
  form: ProfileForm
}

type Labeled = { brand: string; model: string }

/** Etykieta wpisu: marka i model rozdzielone spacją, przy pustej marce sam model. */
export function equipmentLabel(spec: Labeled): string {
  return spec.brand === '' ? spec.model : `${spec.brand} ${spec.model}`
}

/** Czy id należy do wbudowanego teleskopu (tylko do odczytu). */
export function isBuiltinTelescope(id: string): boolean {
  return BUILTIN_TELESCOPES.some((spec) => spec.id === id)
}

/** Czy id należy do wbudowanej kamery (tylko do odczytu). */
export function isBuiltinCamera(id: string): boolean {
  return BUILTIN_CAMERAS.some((spec) => spec.id === id)
}

const byLabel = (a: Labeled, b: Labeled) => equipmentLabel(a).localeCompare(equipmentLabel(b), 'pl')

/** Własne teleskopy posortowane po etykiecie według polskich zasad. */
export async function listUserTelescopes(db: PlannerDb): Promise<TelescopeSpec[]> {
  return (await db.userTelescopes.toArray()).sort(byLabel)
}

/** Własne kamery posortowane po etykiecie według polskich zasad. */
export async function listUserCameras(db: PlannerDb): Promise<CameraSpec[]> {
  return (await db.userCameras.toArray()).sort(byLabel)
}

/** Błędy blokujące zapis wpisu: pusta nazwa i błędy zakresów (ostrzeżenia nie blokują). */
function check(nameEmpty: boolean, nameError: string, values: EquipmentValues): void {
  const errors = validateEquipment(values)
    .filter((issue) => issue.severity === 'error')
    .map((issue) => issue.message)
  if (nameEmpty) errors.unshift(nameError)
  if (errors.length > 0) throw new Error(errors.join('; '))
}

const checkTelescope = (spec: TelescopeSpec) =>
  check(equipmentLabel(spec).trim() === '', TELESCOPE_NAME_ERROR, {
    apertureMm: spec.apertureMm,
    focalLengthMm: spec.focalLengthMm,
  })

const checkCamera = (spec: CameraSpec) =>
  check(equipmentLabel(spec).trim() === '', CAMERA_NAME_ERROR, {
    resolutionXPx: spec.resolutionXPx,
    resolutionYPx: spec.resolutionYPx,
    pixelSizeUm: spec.pixelSizeUm,
  })

/** Nowe id wpisu, różne od wszystkich wpisów wbudowanych i własnych. */
function newSpecId(prefix: string, taken: readonly { id: string }[]): string {
  let id: string
  do id = `${prefix}-${crypto.randomUUID()}`
  while (taken.some((spec) => spec.id === id))
  return id
}

const NaNIfNull = (value: number | null) => value ?? Number.NaN

/** „Zapisz jako mój teleskop”: nowy własny wpis z pól teleskopu formularza; błąd pola odrzuca zapis (Error z komunikatem). */
export async function saveAsMyTelescope(db: PlannerDb, form: ProfileForm): Promise<SavedAs<TelescopeSpec>> {
  const draft: TelescopeSpec = {
    id: '',
    brand: '',
    model: form.telescopeLabel.trim(),
    design: 'other',
    apertureMm: NaNIfNull(parseDecimal(form.apertureMm)),
    focalLengthMm: NaNIfNull(parseDecimal(form.focalLengthMm)),
    origin: 'user',
  }
  checkTelescope(draft)
  const spec = { ...draft, id: newSpecId('teleskop', await telescopeRepository.list(db)) }
  await telescopeRepository.save(db, spec)
  return { spec, form: { ...form, telescopeSpecId: spec.id, telescopeLabel: equipmentLabel(spec) } }
}

/** „Zapisz jako moją kamerę”: nowy własny wpis z pól kamery formularza (bez binningu). */
export async function saveAsMyCamera(db: PlannerDb, form: ProfileForm): Promise<SavedAs<CameraSpec>> {
  const draft: CameraSpec = {
    id: '',
    brand: '',
    model: form.cameraLabel.trim(),
    sensorModel: null,
    sensor: form.sensor,
    resolutionXPx: NaNIfNull(parseDecimal(form.resolutionXPx)),
    resolutionYPx: NaNIfNull(parseDecimal(form.resolutionYPx)),
    pixelSizeUm: NaNIfNull(parseDecimal(form.pixelSizeUm)),
    origin: 'user',
  }
  checkCamera(draft)
  const spec = { ...draft, id: newSpecId('kamera', await cameraRepository.list(db)) }
  await cameraRepository.save(db, spec)
  return { spec, form: { ...form, cameraSpecId: spec.id, cameraLabel: equipmentLabel(spec) } }
}

function assertUserEntry(builtin: boolean): void {
  if (builtin) throw new Error(READ_ONLY_MESSAGE)
}

/** Edycja własnego teleskopu (to samo id); wpis wbudowany i błędne wartości są odrzucane. */
export async function editUserTelescope(db: PlannerDb, spec: TelescopeSpec): Promise<void> {
  assertUserEntry(isBuiltinTelescope(spec.id))
  const edited: TelescopeSpec = { ...spec, brand: spec.brand.trim(), model: spec.model.trim(), origin: 'user' }
  checkTelescope(edited)
  await telescopeRepository.save(db, edited)
}

/** Edycja własnej kamery (to samo id); wpis wbudowany i błędne wartości są odrzucane. */
export async function editUserCamera(db: PlannerDb, spec: CameraSpec): Promise<void> {
  assertUserEntry(isBuiltinCamera(spec.id))
  const edited: CameraSpec = { ...spec, brand: spec.brand.trim(), model: spec.model.trim(), origin: 'user' }
  checkCamera(edited)
  await cameraRepository.save(db, edited)
}

/** Usunięcie własnego teleskopu; wpis wbudowany jest odrzucany. */
export async function removeUserTelescope(db: PlannerDb, id: string): Promise<void> {
  assertUserEntry(isBuiltinTelescope(id))
  await telescopeRepository.remove(db, id)
}

/** Usunięcie własnej kamery; wpis wbudowany jest odrzucany. */
export async function removeUserCamera(db: PlannerDb, id: string): Promise<void> {
  assertUserEntry(isBuiltinCamera(id))
  await cameraRepository.remove(db, id)
}

/** Kopia wpisu pod nowym id, z dopiskiem „(kopia)”, „(kopia 2)”… do modelu (etykiety różne od własnych wpisów). */
function copyOf<T extends Labeled & { id: string; origin: 'builtin' | 'user' }>(
  all: readonly T[],
  id: string,
  prefix: string,
): T {
  const source = all.find((spec) => spec.id === id)
  if (source === undefined) throw new Error(`Brak wpisu ${id}`)
  const taken = all.filter((spec) => spec.origin === 'user').map(equipmentLabel)
  const base = equipmentLabel(source)
  const label = uniqueName(taken, `${base} (kopia)`, (n) => `${base} (kopia ${n})`)
  const model = source.brand === '' ? label : label.slice(source.brand.length + 1)
  return { ...structuredClone(source), id: newSpecId(prefix, all), model, origin: 'user' }
}

/** „Duplikuj jako własny”: kopia wpisu wbudowanego pod nowym id, z dopiskiem „(kopia)”, „(kopia 2)”… */
export async function duplicateTelescope(db: PlannerDb, id: string): Promise<TelescopeSpec> {
  const copy = copyOf(await telescopeRepository.list(db), id, 'teleskop')
  await telescopeRepository.save(db, copy)
  return copy
}

/** „Duplikuj jako własną”: kopia wbudowanej kamery pod nowym id, z dopiskiem „(kopia)”, „(kopia 2)”… */
export async function duplicateCamera(db: PlannerDb, id: string): Promise<CameraSpec> {
  const copy = copyOf(await cameraRepository.list(db), id, 'kamera')
  await cameraRepository.save(db, copy)
  return copy
}
