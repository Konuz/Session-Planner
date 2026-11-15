// Ustawienia widoku „Pozycja 3D” wspólne dla paska narzędzi okna i sceny Space3D: skala, gwiazdozbiory, filtry tła.
import { useEffect, useState } from 'react'
import { TYPE_INFO, type DSO, type ObjectType } from '../../lib/catalog'
import type { PhotoProject } from '../../lib/photo'
import { GALACTIC_LIMIT_LY, type SpaceScale } from '../../lib/space3d'

export type ConstellationStar = { raDeg: number; decDeg: number; distLy: number; name: string }
export type Constellations3D = { constellations: { abbr: string; lines: ([number, number, number] | null)[][]; stars?: ConstellationStar[] }[] }

// Suwak liczby galaktyk (skala Wszechświat lokalny): górna granica odległości na każdym poziomie.
export const GALAXY_LEVELS = [
  { maxLy: 5e6, title: 'Galaktyki 0: tylko Grupa Lokalna (do 5 mln lś)' },
  { maxLy: 5e7, title: 'Galaktyki 1: do 50 mln lś' },
  { maxLy: 5e8, title: 'Galaktyki 2: do 500 mln lś' },
  { maxLy: Infinity, title: 'Galaktyki 3: wszystkie z odległością' },
]

// Linie gwiazdozbiorów 3D wczytane raz na sesję: każde otwarcie okna pobierało i parsowało plik od nowa (C22).
// Błąd nie zostaje w pamięci, więc następne otwarcie spróbuje ponownie.
let constellations3D: Promise<Constellations3D> | null = null
function loadConstellations3D(): Promise<Constellations3D> {
  constellations3D ??= fetch('/data/constellations3d.json').then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json() as Promise<Constellations3D>
  })
  constellations3D.catch(() => { constellations3D = null })
  return constellations3D
}

export interface SpaceSettings {
  scale: SpaceScale
  showConstellations: boolean
  constellationChoice: string
  showStarNames: boolean
  /** Rodzaje obiektów tła ukryte w skali Drogi Mlecznej (domyślnie wszystkie). */
  hiddenTypes: ObjectType[]
  /** Poziom suwaka liczby galaktyk (Wszechświat lokalny). */
  galaxyLevel: number
  constellations: Constellations3D | null
  constellationError: boolean
}

export interface SpaceSettingsState extends SpaceSettings {
  /** null: skala z odległości obiektu. */
  setScale(scale: SpaceScale | null): void
  setShowConstellations(show: boolean): void
  setConstellationChoice(abbr: string): void
  setShowStarNames(show: boolean): void
  setHiddenTypes(update: (hidden: ObjectType[]) => ObjectType[]): void
  setGalaxyLevel(level: number): void
}

/** Źródło widoku skali: wybrany obiekt katalogowy, wczytane zdjęcie i czy zdjęcie jest aktywne w scenie 3D. */
export type SpaceScaleSource = { object: number | undefined; photo: string | undefined; active: boolean }

/** Automatyczna skala z odległości obiektu lub aktywnego zdjęcia. */
export function autoSpaceScale(o: DSO | null, photo: PhotoProject | null, photoActive = true): SpaceScale {
  const activePhoto = photoActive ? photo : null
  const dist = o?.distLy ?? null
  const distances = activePhoto?.cuts.map((c) => c.distLy).filter((d): d is number => d !== null) ?? []
  return activePhoto
    ? distances.length && distances.every((d) => d >= GALACTIC_LIMIT_LY) ? 'universe' : 'galaxy'
    : dist !== null && dist > GALACTIC_LIMIT_LY ? 'universe' : 'galaxy'
}

/** Wybór skali po zmianie obiektu, zdjęcia lub jego aktywności: „Pokaż zdjęcie” utrzymuje bieżącą skalę. */
export function nextScaleChoice(
  prev: SpaceScaleSource,
  next: SpaceScaleSource,
  scaleChoice: SpaceScale | null,
  o: DSO | null,
): SpaceScale | null {
  // Reaktywacja wczytanego zdjęcia nie przełącza między Drogą Mleczną a Wszechświatem lokalnym.
  if (prev.object === next.object && prev.photo === next.photo && !prev.active && next.active) {
    return scaleChoice ?? autoSpaceScale(o, null, false)
  }
  return null
}

/** Stan paska narzędzi okna: skala wynika z odległości obiektu, a po wczytaniu aktywnego zdjęcia z odległości jego wycinków. */
export function useSpaceSettings(o: DSO | null, photo: PhotoProject | null, photoActive = true): SpaceSettingsState {
  const auto = autoSpaceScale(o, photo, photoActive)
  const [scaleChoice, setScale] = useState<SpaceScale | null>(null)
  const [source, setSource] = useState<SpaceScaleSource>({ object: o?.i, photo: photo?.id, active: photoActive })
  const nextSource: SpaceScaleSource = { object: o?.i, photo: photo?.id, active: photoActive }
  // Reset przed zatwierdzeniem widoku, żeby zmiana źródła nie tworzyła sceny w poprzedniej skali.
  if (source.object !== nextSource.object || source.photo !== nextSource.photo || source.active !== nextSource.active) {
    setSource(nextSource)
    setScale(nextScaleChoice(source, nextSource, scaleChoice, o))
  }
  const [showConstellations, setShowConstellations] = useState(false)
  const [constellationChoice, setConstellationChoice] = useState(o?.con ?? 'Ori')
  const [showStarNames, setShowStarNames] = useState(false)
  const [hiddenTypes, setHiddenTypes] = useState<ObjectType[]>(() => Object.keys(TYPE_INFO) as ObjectType[])
  const [galaxyLevel, setGalaxyLevel] = useState(0)
  const [constellations, setConstellations] = useState<Constellations3D | null>(null)
  const [constellationError, setConstellationError] = useState(false)

  useEffect(() => {
    let live = true
    loadConstellations3D()
      .then((data) => { if (live) setConstellations(data) })
      .catch(() => { if (live) setConstellationError(true) })
    return () => { live = false }
  }, [])

  return {
    scale: scaleChoice ?? auto, showConstellations, constellationChoice, showStarNames, hiddenTypes, galaxyLevel, constellations, constellationError,
    setScale, setShowConstellations, setConstellationChoice, setShowStarNames, setHiddenTypes, setGalaxyLevel,
  }
}
