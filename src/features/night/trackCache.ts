// Tory obiektów dla mini-wykresów katalogu, zapamiętane na noc: karty przelicza każdy ruch kursora i każde przewinięcie
// listy, a tor zależy tylko od nocy i obiektu. Klucz to model nocy (nowy przy zmianie lokalizacji, horyzontu, nocy
// i parametrów planowania), więc stare tory znikają razem z nim.
import { buildObjectTrack, type NightFrame, type ObjectTrack, type TrackOptions } from '../../services/nightChart'
import type { DsoObject } from '../../types'

const cache = new WeakMap<NightFrame, Map<string, ObjectTrack>>()

/** Tor obiektu w nocy `frame`; `options` muszą pochodzić z tych samych ustawień co `frame`. */
export function cachedTrack(frame: NightFrame, object: DsoObject, options: TrackOptions): ObjectTrack {
  let tracks = cache.get(frame)
  if (!tracks) {
    tracks = new Map()
    cache.set(frame, tracks)
  }
  let track = tracks.get(object.uid)
  if (!track) {
    track = buildObjectTrack(frame, object, options)
    tracks.set(object.uid, track)
  }
  return track
}
