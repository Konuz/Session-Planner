// Własne teleskopy i kamery w katalogu sprzętu (6.5, wlasny-sprzet): czyste funkcje i cienkie akcje na bazie.
// Wartości formularza → wpis teleskopu / kamery, kopia wpisu wbudowanego, etykieta wpisu, lista własnych wpisów,
// sprawdzenie „wpis wbudowany”. Profile przechowują kopię wartości [Z26], więc zmiany wpisów ich nie zmieniają.
// ZAŚLEPKA: funkcje rzucają NotImplementedError; implementację dopisuje implementer.
import type { PlannerDb } from '../../data/db'
import type { CameraSpec, TelescopeSpec } from '../../types'
import type { ProfileForm } from './profileForm'

function notImplemented(name: string): Error {
  const error = new Error(`${name}: not implemented`)
  error.name = 'NotImplementedError'
  return error
}

/** Wynik „Zapisz jako mój teleskop / moją kamerę”: nowy wpis i formularz wskazujący ten wpis. */
export interface SavedAs<T> {
  spec: T
  form: ProfileForm
}

/** Etykieta wpisu: marka i model rozdzielone spacją, przy pustej marce sam model. */
export const equipmentLabel: (spec: { brand: string; model: string }) => string = () => {
  throw notImplemented('equipmentLabel')
}

/** Czy id należy do wbudowanego teleskopu (tylko do odczytu). */
export const isBuiltinTelescope: (id: string) => boolean = () => {
  throw notImplemented('isBuiltinTelescope')
}

/** Czy id należy do wbudowanej kamery (tylko do odczytu). */
export const isBuiltinCamera: (id: string) => boolean = () => {
  throw notImplemented('isBuiltinCamera')
}

/** Własne teleskopy posortowane po etykiecie według polskich zasad. */
export const listUserTelescopes: (db: PlannerDb) => Promise<TelescopeSpec[]> = () => {
  throw notImplemented('listUserTelescopes')
}

/** Własne kamery posortowane po etykiecie według polskich zasad. */
export const listUserCameras: (db: PlannerDb) => Promise<CameraSpec[]> = () => {
  throw notImplemented('listUserCameras')
}

/** „Zapisz jako mój teleskop”: nowy własny wpis z pól teleskopu formularza; błąd pola odrzuca zapis (Error z komunikatem). */
export const saveAsMyTelescope: (db: PlannerDb, form: ProfileForm) => Promise<SavedAs<TelescopeSpec>> = () => {
  throw notImplemented('saveAsMyTelescope')
}

/** „Zapisz jako moją kamerę”: nowy własny wpis z pól kamery formularza (bez binningu). */
export const saveAsMyCamera: (db: PlannerDb, form: ProfileForm) => Promise<SavedAs<CameraSpec>> = () => {
  throw notImplemented('saveAsMyCamera')
}

/** Edycja własnego teleskopu (to samo id); wpis wbudowany i błędne wartości są odrzucane. */
export const editUserTelescope: (db: PlannerDb, spec: TelescopeSpec) => Promise<void> = () => {
  throw notImplemented('editUserTelescope')
}

/** Edycja własnej kamery (to samo id); wpis wbudowany i błędne wartości są odrzucane. */
export const editUserCamera: (db: PlannerDb, spec: CameraSpec) => Promise<void> = () => {
  throw notImplemented('editUserCamera')
}

/** Usunięcie własnego teleskopu; wpis wbudowany jest odrzucany. */
export const removeUserTelescope: (db: PlannerDb, id: string) => Promise<void> = () => {
  throw notImplemented('removeUserTelescope')
}

/** Usunięcie własnej kamery; wpis wbudowany jest odrzucany. */
export const removeUserCamera: (db: PlannerDb, id: string) => Promise<void> = () => {
  throw notImplemented('removeUserCamera')
}

/** „Duplikuj jako własny”: kopia wpisu wbudowanego pod nowym id, z dopiskiem „(kopia)”, „(kopia 2)”… */
export const duplicateTelescope: (db: PlannerDb, id: string) => Promise<TelescopeSpec> = () => {
  throw notImplemented('duplicateTelescope')
}

/** „Duplikuj jako własną”: kopia wbudowanej kamery pod nowym id, z dopiskiem „(kopia)”, „(kopia 2)”… */
export const duplicateCamera: (db: PlannerDb, id: string) => Promise<CameraSpec> = () => {
  throw notImplemented('duplicateCamera')
}
