// Dane demonstracyjne z sekcji 6.4: lokalizacja [Z5] z horyzontem [Z13] i profile sprzętu [Z2].
import { findSpec } from '../services/equipment'
import type { CameraSpec, EquipmentProfile, FilterId, ObserverLocation, TelescopeSpec } from '../types'
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES } from './equipmentCatalog'

export const DEMO_LOCATION: ObserverLocation = {
  id: 'demo-polska-centralna',
  name: 'Polska centralna (demo)',
  latDeg: 52,
  lonDegEast: 19,
  elevationM: 150,
  timezone: 'Europe/Warsaw',
  // Drzewa na N i NE, budynek na SE, otwarte południe.
  horizon: [
    [0, 12], [15, 14], [30, 18], [45, 22], [60, 25], [75, 20],
    [90, 15], [105, 12], [120, 28], [135, 35], [150, 30], [165, 10],
    [180, 8], [195, 6], [210, 9], [225, 14], [240, 20], [255, 24],
    [270, 18], [285, 15], [300, 11], [315, 9], [330, 10], [345, 11],
  ].map(([azDeg, altDeg]) => ({ azDeg, altDeg })),
  bortle: null,
  sqm: null,
}

const LRGB_SHO: readonly FilterId[] = ['L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII']

function builtin<T extends { id: string }>(specs: readonly T[], id: string): T {
  const spec = findSpec(specs, id)
  if (!spec) throw new Error(`Brak wpisu ${id} w katalogu sprzętu`)
  return spec
}

// Profil przechowuje kopię wartości wpisu katalogu [Z26].
function telescopeFrom(spec: TelescopeSpec): EquipmentProfile['telescope'] {
  return { specId: spec.id, label: `${spec.brand} ${spec.model}`, apertureMm: spec.apertureMm, focalLengthMm: spec.focalLengthMm }
}

function cameraFrom(spec: CameraSpec): EquipmentProfile['camera'] {
  return {
    specId: spec.id,
    label: `${spec.brand} ${spec.model}`,
    sensor: spec.sensor,
    resolutionXPx: spec.resolutionXPx,
    resolutionYPx: spec.resolutionYPx,
    pixelSizeUm: spec.pixelSizeUm,
    binning: 1,
  }
}

function profile(
  id: string,
  name: string,
  telescope: EquipmentProfile['telescope'],
  cameraId: string,
  filters: readonly FilterId[],
): EquipmentProfile {
  return {
    id,
    name,
    telescope,
    reducerFactor: 1,
    camera: cameraFrom(builtin(BUILTIN_CAMERAS, cameraId)),
    mount: { type: 'gem', flipMinutesAfterMeridian: 10 }, // [Z10]
    filters: [...filters],
    oag: null,
  }
}

export const DEMO_PROFILES: EquipmentProfile[] = [
  profile(
    'demo-moj-zestaw',
    'Mój zestaw',
    { specId: null, label: 'Newton 150/600', apertureMm: 150, focalLengthMm: 600 },
    'player-one-ares-m-pro',
    LRGB_SHO,
  ),
  profile(
    'demo-redcat51-asi2600mc',
    'RedCat 51 + ASI2600MC Pro',
    telescopeFrom(builtin(BUILTIN_TELESCOPES, 'william-optics-redcat-51')),
    'zwo-asi2600mc-pro',
    ['OSC', 'DualBand'],
  ),
  profile(
    'demo-newton200-asi533mm',
    'Newton 200/1000 + ASI533MM Pro',
    telescopeFrom(builtin(BUILTIN_TELESCOPES, 'skywatcher-explorer-200pds')),
    'zwo-asi533mm-pro',
    LRGB_SHO,
  ),
  profile(
    'demo-esprit100-asi6200mm',
    'Esprit 100ED + ASI6200MM Pro',
    telescopeFrom(builtin(BUILTIN_TELESCOPES, 'skywatcher-esprit-100ed')),
    'zwo-asi6200mm-pro',
    LRGB_SHO,
  ),
]

/** Profil aktywny domyślnie [Z2]. */
export const DEFAULT_PROFILE_ID = 'demo-moj-zestaw'
