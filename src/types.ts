// Model danych z sekcji 5 specyfikacji: typy używane przez obecne moduły.

export type CatalogId = 'M' | 'NGC' | 'IC' | 'Sh2' | 'VdB' | 'LDN' | 'LBN' | 'B' | 'Simeis' | 'SNR-G' | 'Other'

export interface Designation {
  catalog: CatalogId
  id: string // '1976', '240', 'G180.0-01.7'
}

export type DsoType =
  | 'galaxy'
  | 'galaxy_group'
  | 'emission_nebula'
  | 'reflection_nebula'
  | 'dark_nebula'
  | 'planetary_nebula'
  | 'supernova_remnant'
  | 'open_cluster'
  | 'globular_cluster'
  | 'cluster_nebula'
  | 'other'

export interface DsoObject {
  uid: string // stabilny klucz, np. 'NGC1976'
  primary: Designation
  designations: Designation[] // wszystkie oznaczenia, łącznie z primary
  commonNames: string[]
  type: DsoType
  raDeg: number // J2000
  decDeg: number // J2000
  sizeMajorArcmin: number | null
  sizeMinorArcmin: number | null
  positionAngleDeg: number | null // oś wielka, od N przez E
  magV: number | null // null, gdy katalog nie podaje jasności
  surfaceBrightness: number | null // mag/arcsec² (w OpenNGC tylko galaktyki)
  ldnOpacity: number | null // LDN: 1–6
  sh2Brightness: number | null // Sh2: 1–3, 1 = najsłabsze
  lbnBrightness: number | null // LBN: 1–6
  vdbStarMagV: number | null // VdB: jasność gwiazdy oświetlającej
  constellation: string // skrót IAU z Constellation()
  sources: string[] // np. ['OpenNGC', 'VizieR VII/20']
}

export interface HorizonPoint {
  azDeg: number
  altDeg: number
}

export interface ObserverLocation {
  id: string
  name: string
  latDeg: number
  lonDegEast: number
  elevationM: number
  timezone: string // IANA, np. 'Europe/Warsaw'
  horizon: HorizonPoint[] // posortowane po azDeg; [] = horyzont 0°
  bortle: number | null // 1–9, informacyjnie [Z19]
  sqm: number | null // mag/arcsec², informacyjnie [Z19]
}

export type FilterId = 'L' | 'R' | 'G' | 'B' | 'Ha' | 'OIII' | 'SII' | 'OSC' | 'DualBand'

export type TelescopeDesign = 'refractor' | 'newtonian' | 'sct' | 'rasa' | 'ritchey_chretien' | 'camera_lens' | 'other'

export interface TelescopeSpec {
  // wpis katalogu sprzętu (6.5)
  id: string // np. 'skywatcher-esprit-100ed'
  brand: string
  model: string
  design: TelescopeDesign
  apertureMm: number
  focalLengthMm: number // natywna, bez reduktora
  origin: 'builtin' | 'user' // wbudowany (tylko do odczytu) albo dodany przez użytkownika
}

export interface CameraSpec {
  // wpis katalogu sprzętu (6.5)
  id: string // np. 'zwo-asi2600mm-pro'
  brand: string
  model: string
  sensorModel: string | null // np. 'IMX571'
  sensor: 'mono' | 'osc'
  resolutionXPx: number
  resolutionYPx: number
  pixelSizeUm: number
  origin: 'builtin' | 'user'
}

/** Pole `mount` profilu sprzętu (EquipmentProfile, sekcja 5). */
export interface Mount {
  type: 'gem' | 'fork' | 'altaz'
  flipMinutesAfterMeridian: number
}

// Profil przechowuje kopię wartości [Z26]; specId mówi tylko, z którego wpisu katalogu powstał.
export interface EquipmentProfile {
  id: string
  name: string
  telescope: {
    specId: string | null // null = wartości wpisane ręcznie
    label: string // np. 'Sky-Watcher Esprit 100ED' albo nazwa własna
    apertureMm: number
    focalLengthMm: number
  }
  reducerFactor: number // 1.0 = bez zmiany; < 1 reduktor; > 1 ekstender lub soczewka Barlowa
  camera: {
    specId: string | null
    label: string
    sensor: 'mono' | 'osc'
    resolutionXPx: number
    resolutionYPx: number
    pixelSizeUm: number
    binning: 1 | 2 | 3 | 4
  }
  mount: Mount
  filters: FilterId[]
  oag: {
    prismWidthMm: number
    prismHeightMm: number
    offsetFromCenterMm: number // od środka matrycy do środka pryzmatu
    angleDeg: number // 0° = nad górną krawędzią matrycy, rośnie zgodnie z ruchem wskazówek zegara w układzie matrycy [Z20]
  } | null
}

export interface PlanningSettings {
  darknessThresholdDeg: -18 | -15 | -12 // [Z6]
  autoLowerThreshold: boolean // [Z6]
  minAltitudeDeg: number // [Z7]
  minEffectiveHours: number // [Z7]
  catalogStepMin: number // [Z8]
  detailStepMin: number // [Z8]
  seeingArcsec: number // [Z9]
  fitRange: [number, number] // [Z21], części całości krótszego boku kadru (domyślnie 0,25 i 0,8)
  moonRules: MoonRuleThresholds // [Z12], sekcja 7A
}

// Progi rekomendacji filtrów z tabeli w 7A [Z12].
// illum = oświetlenie Księżyca (0–1) w środku okna efektywnego; sep = minimalna topocentryczna separacja w oknie [°].
// Porównania: pola *Max* są wyłączne (illum < max), pola *Min* włączne (wartość ≥ min).
// Wartości domyślne (stała DEFAULT_MOON_RULES) podano w komentarzach.
export interface MoonRuleThresholds {
  moonDownMinFraction: number // 0.8: Księżyc pod horyzontem przez ≥ tę część okna → wszystkie filtry zielone
  broadband: {
    // L, R, G, B, OSC; obiekty inne niż mgławice refleksyjne i ciemne
    greenMaxIllum: number // 0.15
    yellowMaxIllum: number // 0.5
    yellowMinSepDeg: number // 90
  }
  broadbandFaintNebula: {
    // L, R, G, B, OSC dla mgławic refleksyjnych i ciemnych; bez stanu żółtego
    greenMaxIllum: number // 0.15
  }
  hydrogenSulfur: {
    // Ha, SII
    greenMinSepDeg: number // 50
    yellowMinSepDeg: number // 25
  }
  oxygen: {
    // OIII, DualBand
    greenMinSepDeg: number // 70
    greenMaxIllum: number // 0.75
    yellowMinSepDeg: number // 40
  }
}
