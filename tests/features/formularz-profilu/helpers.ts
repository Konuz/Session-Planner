// Wspólne narzędzia testów funkcji „formularz-profilu”.
// Nazwy, których spec nie podaje (wybrane przez test-author), w src/features/equipment/profileForm.ts:
// - `ProfileForm`: płaski formularz; pola liczbowe jako tekst (`apertureMm`, `focalLengthMm`, `reducerFactor`,
//   `resolutionXPx`, `resolutionYPx`, `pixelSizeUm`, `flipMinutes`, `oagPrismWidthMm`, `oagPrismHeightMm`, `oagOffsetMm`,
//   `oagAngleDeg`), `name`, `telescopeSpecId`/`telescopeLabel`, `cameraSpecId`/`cameraLabel`, `sensor`, `binning`,
//   `mountType`, `filters`, `oagEnabled`.
// - `profileToForm(profile)`, `readProfileForm(form)` → `{ profile, issues }` (issue: `field` = klucz formularza,
//   `severity` 'error' | 'warning', `message`).
// - `profilePreview(form, seeingArcsec)` → teksty `effectiveFocalLength`, `focalRatio`, `sensor`, `sensorDiagonal`,
//   `fieldOfViewDeg`, `fieldOfViewArcmin`, `scale`, `sampling`, `oscNote`.
// - `searchTelescopes(query, list)` / `searchCameras(query, list)` → `{ spec, label }[]`, pierwsza pozycja to
//   „Własny” / „Własna” (`spec: null`).
// - `selectTelescope(form, spec | null)` / `selectCamera(form, spec | null)`: wybór z wyszukiwarki (null = „Własny”).
// - `formSources(form, telescopes, cameras)`: wpisy, z których pochodzi formularz (null = pokazany jako „Własny”).
// - `changedFields(form, telescopes, cameras)`: pola „zmienione względem katalogu”.
// - `reducerButtons(form)` → `{ label, text, pressed }[]`; kliknięcie = wpisanie `text` w pole Mnożnik.
// Helpery wołają funkcje modelu tylko wewnątrz testów (nie przy imporcie modułu).
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from '../../../src/data/equipmentCatalog'
import { DEMO_PROFILES } from '../../../src/data/demo'
import {
  profileToForm,
  readProfileForm,
  type ProfileForm,
  type ProfileFormField,
  type ProfileFormIssue,
} from '../../../src/features/equipment/profileForm'
import type { CameraSpec, EquipmentProfile, TelescopeSpec } from '../../../src/types'

export const MOJ_ID = 'demo-moj-zestaw' // Newton 150/600 (własny) + Ares-M Pro
export const REDCAT_ID = 'demo-redcat51-asi2600mc'
export const NEWTON_ID = 'demo-newton200-asi533mm'
export const ESPRIT_ID = 'demo-esprit100-asi6200mm'

export const ESPRIT_100 = 'skywatcher-esprit-100ed'
export const ASI6200MM = 'zwo-asi6200mm-pro'

export const OSC_NOTE = 'Kamera kolorowa (OSC): efektywna rozdzielczość jest niższa, niż wynika ze skali.'

/** Głęboka kopia profilu z 6.4 o danym id. */
export function demo(id: string): EquipmentProfile {
  const found = DEMO_PROFILES.find((profile) => profile.id === id)
  if (found === undefined) throw new Error(`Brak profilu ${id} w DEMO_PROFILES`)
  return structuredClone(found)
}

export function telescope(id: string): TelescopeSpec {
  const found = BUILTIN_TELESCOPES.find((spec) => spec.id === id)
  if (found === undefined) throw new Error(`Brak teleskopu ${id}`)
  return found
}

export function camera(id: string): CameraSpec {
  const found = BUILTIN_CAMERAS.find((spec) => spec.id === id)
  if (found === undefined) throw new Error(`Brak kamery ${id}`)
  return found
}

/** Formularz profilu z 6.4 z nadpisanymi polami. */
export function formOf(id: string, patch: Partial<ProfileForm> = {}): ProfileForm {
  return { ...profileToForm(demo(id)), ...patch }
}

/** „Mój zestaw” (150/600 + Ares-M Pro) z nadpisanymi polami. */
export function moj(patch: Partial<ProfileForm> = {}): ProfileForm {
  return formOf(MOJ_ID, patch)
}

/** Komunikaty błędów (bez ostrzeżeń). */
export function errors(form: ProfileForm): string[] {
  return readProfileForm(form)
    .issues.filter((issue) => issue.severity === 'error')
    .map((issue) => issue.message)
}

/** Błędy i ostrzeżenia przy jednym polu. */
export function issuesAt(form: ProfileForm, field: ProfileFormField): ProfileFormIssue[] {
  return readProfileForm(form).issues.filter((issue) => issue.field === field)
}

export function warnings(form: ProfileForm): ProfileFormIssue[] {
  return readProfileForm(form).issues.filter((issue) => issue.severity === 'warning')
}

/** Profil zapisany z formularza; rzuca, gdy formularz ma błędy. */
export function saved(form: ProfileForm): EquipmentProfile {
  const { profile, issues } = readProfileForm(form)
  if (profile === null) throw new Error(`Formularz ma błędy: ${issues.map((issue) => issue.message).join('; ')}`)
  return profile
}
