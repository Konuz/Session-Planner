// Lokalizacje zapisywane przy pierwszym uruchomieniu (Z5, rozstrzygnięte 16.10.2026).
import type { ObserverLocation } from '../types'
import { DEMO_LOCATION } from './demo'

/**
 * Miejsce obserwacji użytkownika: współrzędne środka wsi (pl.wikipedia.org, 51°05′44″N 17°18′08″E), wysokość z EU-DEM 25 m.
 * Horyzont płaski do czasu wczytania pliku z N.I.N.A. w Ustawieniach.
 */
export const HOME_LOCATION: ObserverLocation = {
  id: 'chrzastawa-wielka',
  name: 'Chrząstawa Wielka',
  latDeg: 51.0956,
  lonDegEast: 17.3022,
  elevationM: 125,
  timezone: 'Europe/Warsaw',
  horizon: [],
  bortle: null,
  sqm: null,
}

/** Lokalizacja demonstracyjna z horyzontem Z13 zostaje obok, jako miejsce wektorów testowych z załącznika A. */
export const DEFAULT_LOCATIONS: readonly ObserverLocation[] = [HOME_LOCATION, DEMO_LOCATION]

export const DEFAULT_LOCATION_ID = HOME_LOCATION.id
