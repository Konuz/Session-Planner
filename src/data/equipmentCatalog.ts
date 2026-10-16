// Wbudowany katalog sprzętu (6.5, załącznik B): tylko do odczytu; poprawność danych sprawdza test T20.
import type { CameraSpec, TelescopeSpec } from '../types'
import cameras from './equipment/cameras.json'
import reducers from './equipment/reducers.json'
import telescopes from './equipment/telescopes.json'

/** Mnożnik reduktora lub ekstendera do szybkiego wyboru [Z24]. */
export interface ReducerPreset {
  factor: number
  note: string | null
}

export const BUILTIN_TELESCOPES = telescopes as readonly TelescopeSpec[]
export const BUILTIN_CAMERAS = cameras as readonly CameraSpec[]
export const REDUCER_PRESETS: readonly ReducerPreset[] = reducers
