// Model danych z sekcji 5 specyfikacji: typy używane przez obecne moduły.

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

/** Pole `mount` profilu sprzętu (EquipmentProfile, sekcja 5). */
export interface Mount {
  type: 'gem' | 'fork' | 'altaz'
  flipMinutesAfterMeridian: number
}
