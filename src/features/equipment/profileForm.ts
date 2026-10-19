// Model edytora profilu sprzętu (7F, formularz-profilu): czyste funkcje bez wyglądu. Profil → tekst pól, tekst pól →
// profil albo null i lista błędów/ostrzeżeń, podgląd optyki, wyszukiwarka wpisów katalogu, przyciski mnożnika
// i oznaczenia „zmienione względem katalogu”.
// ZAŚLEPKA: funkcje rzucają NotImplementedError; implementację dopisuje implementer.
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

const notImplemented = (name: string) => new Error(`NotImplementedError: ${name}`)

/** Profil → tekst pól. Pola OAG są puste, gdy `oag: null`. */
export const profileToForm: (profile: EquipmentProfile) => ProfileForm = () => {
  throw notImplemented('profileToForm')
}

/** Tekst pól → profil albo null i lista błędów/ostrzeżeń. */
export const readProfileForm: (form: ProfileForm) => ProfileFormResult = () => {
  throw notImplemented('readProfileForm')
}

/** Podgląd optyki; seeing z `PlanningSettings.seeingArcsec`. */
export const profilePreview: (form: ProfileForm, seeingArcsec: number) => ProfilePreview = () => {
  throw notImplemented('profilePreview')
}

/** Wyszukiwarka teleskopów: „Własny” i pasujące wpisy z listy (wbudowane i własne użytkownika). */
export const searchTelescopes: (
  query: string,
  telescopes: readonly TelescopeSpec[],
) => SearchOption<TelescopeSpec>[] = () => {
  throw notImplemented('searchTelescopes')
}

/** Wyszukiwarka kamer: „Własna” i pasujące wpisy z listy (wbudowane i własne użytkownika). */
export const searchCameras: (query: string, cameras: readonly CameraSpec[]) => SearchOption<CameraSpec>[] = () => {
  throw notImplemented('searchCameras')
}

/** Wybór teleskopu z wyszukiwarki: wpis katalogu ustawia nazwę i wartości; null („Własny”) zostawia wartości. */
export const selectTelescope: (form: ProfileForm, spec: TelescopeSpec | null) => ProfileForm = () => {
  throw notImplemented('selectTelescope')
}

/** Wybór kamery z wyszukiwarki: wpis katalogu ustawia nazwę i wartości; null („Własna”) zostawia wartości. */
export const selectCamera: (form: ProfileForm, spec: CameraSpec | null) => ProfileForm = () => {
  throw notImplemented('selectCamera')
}

/** Wpisy katalogu, z których pochodzi formularz (szukane na podanych listach). */
export const formSources: (
  form: ProfileForm,
  telescopes: readonly TelescopeSpec[],
  cameras: readonly CameraSpec[],
) => FormSources = () => {
  throw notImplemented('formSources')
}

/** Pola „zmienione względem katalogu” (apertura, ogniskowa, typ, rozdzielczości, piksel). */
export const changedFields: (
  form: ProfileForm,
  telescopes: readonly TelescopeSpec[],
  cameras: readonly CameraSpec[],
) => ProfileFormField[] = () => {
  throw notImplemented('changedFields')
}

/** Przyciski mnożnika z `REDUCER_PRESETS`, z zaznaczeniem dla mnożnika w formularzu. */
export const reducerButtons: (form: ProfileForm) => ReducerButton[] = () => {
  throw notImplemented('reducerButtons')
}
