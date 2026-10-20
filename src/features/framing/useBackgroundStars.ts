// Gwiazdy tła dla zakładki Kadr (tlo-mapy): katalog gwiazd wczytywany w efekcie (render w Node niczego nie pobiera),
// potem wybór `starsInField` wokół środka kadru w promieniu połowy przekątnej widoku (pole · √2 / 2).
//
// - W trakcie wczytywania i po błędzie wynik to null (widok rysuje samą siatkę, bez komunikatu).
// - W trakcie gestu (przeciąganie, szczypanie, kółko) wybór idzie z zapasem promienia i jest używany ponownie, dopóki
//   pole widoku mieści się w poprzednim zapytaniu, żeby szerokie pole (do 60°, dziesiątki tysięcy gwiazd) nie blokowało
//   przesuwania. Po geście wybór wraca do dokładnego promienia.
import { useEffect, useMemo, useState } from 'react'
import { loadStarCatalog } from '../../data/starCatalog'
import { angularSeparationDeg, type EquatorialDeg } from '../../services/astroMath'
import { starsInField, type Star, type StarIndex } from '../../services/stars'

/** Zapas promienia zapytania w trakcie gestu. */
const GESTURE_MARGIN = 1.5

interface FieldQuery {
  index: StarIndex
  center: EquatorialDeg
  radiusDeg: number
  stars: Star[]
}

/** Pamięć ostatniego zapytania; `select` liczy od nowa tylko wtedy, gdy trzeba. */
function createFieldSelector() {
  let last: FieldQuery | null = null
  return (index: StarIndex, center: EquatorialDeg, radiusDeg: number, gesture: boolean): Star[] => {
    if (gesture && last?.index === index && angularSeparationDeg(last.center, center) + radiusDeg <= last.radiusDeg) {
      return last.stars
    }
    const queryRadius = gesture ? Math.min(180, radiusDeg * GESTURE_MARGIN) : radiusDeg
    last = { index, center, radiusDeg: queryRadius, stars: starsInField(index, center, queryRadius) }
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
