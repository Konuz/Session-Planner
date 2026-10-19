// Wspólne narzędzia testów funkcji „wlasny-sprzet”.
// Nazwy, których spec nie podaje (wybrane przez test-author), w src/features/equipment/userEquipment.ts.
// Akcje biorą bazę jako pierwszy argument (jak repozytoria), błąd = odrzucona obietnica z Error, którego treść
// zawiera komunikat (np. „Apertura: dozwolony zakres 5–1500 mm”):
// - `saveAsMyTelescope(db, form)` / `saveAsMyCamera(db, form)` → `{ spec, form }`: nowy wpis i formularz wskazujący
//   ten wpis (P6). Sprawdzane są tylko pola wpisu (P3).
// - `editUserTelescope(db, spec)` / `editUserCamera(db, spec)`: edycja wpisu o tym samym id (wartości liczbowe wpisu).
// - `removeUserTelescope(db, id)` / `removeUserCamera(db, id)`.
// - `duplicateTelescope(db, id)` / `duplicateCamera(db, id)` → nowy własny wpis (kopia wbudowanego).
// - `listUserTelescopes(db)` / `listUserCameras(db)`: własne wpisy posortowane po etykiecie (pl).
// - `equipmentLabel(spec)`: etykieta wpisu; `isBuiltinTelescope(id)` / `isBuiltinCamera(id)`.
// Każdy test dostaje własną bazę (`openPlannerDb` z unikalną nazwą); „ponowne otwarcie aplikacji” = zamknięcie bazy
// i `openPlannerDb` o tej samej nazwie.
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from '../../../src/data/equipmentCatalog'
import { openPlannerDb, type PlannerDb } from '../../../src/data/db'
import { DEMO_PROFILES } from '../../../src/data/demo'
import { profileToForm, type ProfileForm } from '../../../src/features/equipment/profileForm'
import type { CameraSpec, EquipmentProfile, TelescopeSpec } from '../../../src/types'

export const MOJ_ID = 'demo-moj-zestaw' // Newton 150/600 (własny) + Player One Ares-M Pro (z katalogu)
export const ESPRIT_100 = 'skywatcher-esprit-100ed'
export const ASI6200MM = 'zwo-asi6200mm-pro'

export const READ_ONLY = 'Wpis wbudowany jest tylko do odczytu: możesz go zduplikować'

let counter = 0

/** Nowa, pusta baza o unikalnej nazwie. */
export function freshDb(): { db: PlannerDb; name: string } {
  counter += 1
  const name = `wlasny-sprzet-${counter}`
  return { db: openPlannerDb(name), name }
}

/** „Ponowne otwarcie aplikacji”: zamknięcie bazy i otwarcie nowej instancji o tej samej nazwie. */
export function reopenDb(db: PlannerDb, name: string): PlannerDb {
  db.close()
  return openPlannerDb(name)
}

/** Głęboka kopia profilu z 6.4 o danym id. */
export function demo(id: string): EquipmentProfile {
  const found = DEMO_PROFILES.find((profile) => profile.id === id)
  if (found === undefined) throw new Error(`Brak profilu ${id} w DEMO_PROFILES`)
  return structuredClone(found)
}

/** Formularz „Mój zestaw” z nadpisanymi polami. */
export function moj(patch: Partial<ProfileForm> = {}): ProfileForm {
  return { ...profileToForm(demo(MOJ_ID)), ...patch }
}

/** Formularz z teleskopem „Mój Newton 80/480” z P1 (apertura 80, ogniskowa 480, mnożnik 0,8). */
export function newtonForm(patch: Partial<ProfileForm> = {}): ProfileForm {
  return moj({
    telescopeSpecId: null,
    telescopeLabel: 'Mój Newton 80/480',
    apertureMm: '80',
    focalLengthMm: '480',
    reducerFactor: '0,8',
    ...patch,
  })
}

/** Formularz z kamerą „Moja 294” z P2 (4144 × 2822 px, piksel „4.63”, OSC, binning 2). */
export function camera294Form(patch: Partial<ProfileForm> = {}): ProfileForm {
  return moj({
    cameraSpecId: null,
    cameraLabel: 'Moja 294',
    resolutionXPx: '4144',
    resolutionYPx: '2822',
    pixelSizeUm: '4.63',
    sensor: 'osc',
    binning: 2,
    ...patch,
  })
}

export function builtinTelescope(id: string): TelescopeSpec {
  const found = BUILTIN_TELESCOPES.find((spec) => spec.id === id)
  if (found === undefined) throw new Error(`Brak teleskopu ${id}`)
  return found
}

export function builtinCamera(id: string): CameraSpec {
  const found = BUILTIN_CAMERAS.find((spec) => spec.id === id)
  if (found === undefined) throw new Error(`Brak kamery ${id}`)
  return found
}

/** Etykieta liczona wprost z reguły spec („Pytania”): marka i model, przy pustej marce sam model. */
export function labelOf(spec: { brand: string; model: string }): string {
  return spec.brand === '' ? spec.model : `${spec.brand} ${spec.model}`
}

export const BUILTIN_TELESCOPE_IDS: readonly string[] = BUILTIN_TELESCOPES.map((spec) => spec.id)
export const BUILTIN_CAMERA_IDS: readonly string[] = BUILTIN_CAMERAS.map((spec) => spec.id)
