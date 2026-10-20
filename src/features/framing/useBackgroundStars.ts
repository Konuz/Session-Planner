// Gwiazdy tła dla zakładki Kadr (tlo-mapy): katalog gwiazd wczytywany w efekcie (render w Node niczego nie pobiera),
// potem wybór `starsInField` wokół środka kadru w promieniu połowy przekątnej widoku (pole · √2 / 2).
//
// - W trakcie wczytywania i po błędzie wynik to null (widok rysuje samą siatkę, bez komunikatu).
// - W trakcie gestu (przeciąganie, szczypanie, kółko) zostaje wybór sprzed gestu, a nowy liczy się po jego końcu:
//   przy szerokim polu (do 60°) zapytanie trwa 40–100 ms i blokowałoby przesuwanie. Odsłonięty brzeg widoku
//   dostaje gwiazdy po puszczeniu.
import { useEffect, useMemo, useState } from 'react'
import { loadStarCatalog } from '../../data/starCatalog'
import type { EquatorialDeg } from '../../services/astroMath'
import { starsInField, type Star, type StarIndex } from '../../services/stars'

/** Pamięć ostatniego wyboru; w trakcie gestu zwraca go bez nowego zapytania. */
function createFieldSelector() {
  let last: { index: StarIndex; stars: Star[] } | null = null
  return (index: StarIndex, center: EquatorialDeg, radiusDeg: number, gesture: boolean): Star[] => {
    if (gesture && last?.index === index) return last.stars
    last = { index, stars: starsInField(index, center, radiusDeg) }
    return last.stars
  }
}

function useStarIndex(): StarIndex | null {
  const [index, setIndex] = useState<StarIndex | null>(null)
  useEffect(() => {
    let active = true
    loadStarCatalog().then(
      (loaded) => {
        if (active) setIndex(loaded)
      },
      () => undefined,
    )
    return () => {
      active = false
    }
  }, [])
  return index
}

export function useBackgroundStars(center: EquatorialDeg, fovDeg: number, gesture: boolean): readonly Star[] | null {
  const index = useStarIndex()
  const [select] = useState(createFieldSelector)
  const { raDeg, decDeg } = center
  return useMemo(
    () => (index ? select(index, { raDeg, decDeg }, (fovDeg * Math.SQRT2) / 2, gesture) : null),
    [index, select, raDeg, decDeg, fovDeg, gesture],
  )
}
