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

/** Stan paska narzędzi okna: skala wynika z odległości obiektu, a po wczytaniu zdjęcia z odległości jego wycinków. */
export function useSpaceSettings(o: DSO | null, photo: PhotoProject | null): SpaceSettingsState {
  const dist = o?.distLy ?? null
  const distances = photo?.cuts.map((c) => c.distLy).filter((d): d is number => d !== null) ?? []
  const auto: SpaceScale = photo
    ? distances.length && distances.every((d) => d >= GALACTIC_LIMIT_LY) ? 'universe' : 'galaxy'
    : dist !== null && dist > GALACTIC_LIMIT_LY ? 'universe' : 'galaxy'
  const [scaleChoice, setScale] = useState<SpaceScale | null>(null)
  const [source, setSource] = useState({ object: o?.i, photo: photo?.id })
  // Reset przed zatwierdzeniem widoku, żeby zmiana źródła nie tworzyła sceny w poprzedniej skali.
  if (source.object !== o?.i || source.photo !== photo?.id) {
    setSource({ object: o?.i, photo: photo?.id })
    setScale(null)
  }
  const [showConstellations, setShowConstellations] = useState(false)
  const [constellationChoice, setConstellationChoice] = useState(o?.con ?? 'Ori')
  const [showStarNames, setShowStarNames] = useState(false)
  const [hiddenTypes, setHiddenTypes] = useState<ObjectType[]>(() => Object.keys(TYPE_INFO) as ObjectType[])
  const [galaxyLevel, setGalaxyLevel] = useState(0)
  const [constellations, setConstellations] = useState<Constellations3D | null>(null)
  const [constellationError, setConstellationError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/constellations3d.json', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<Constellations3D>
      })
      .then(setConstellations)
      .catch((e: Error) => { if (e.name !== 'AbortError') setConstellationError(true) })
    return () => controller.abort()
  }, [])

  return {
    scale: scaleChoice ?? auto, showConstellations, constellationChoice, showStarNames, hiddenTypes, galaxyLevel, constellations, constellationError,
    setScale, setShowConstellations, setConstellationChoice, setShowStarNames, setHiddenTypes, setGalaxyLevel,
  }
}
