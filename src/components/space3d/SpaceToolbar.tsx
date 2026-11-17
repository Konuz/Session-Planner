// Pasek narzędzi okna „Pozycja 3D”: przełącznik skal, wybór gwiazdozbioru 3D, opis skali i warstwy.
import { Camera } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { TYPE_INFO, type DSO, type ObjectType } from '../../lib/catalog'
import { CONSTELLATION_PL } from '../../lib/constellations'
import { fmtDistance } from '../../lib/format'
import { GALACTIC_LIMIT_LY, type SpaceScale } from '../../lib/space3d'
import { useCatalog } from '../../state/data'
import { ConstellationPicker } from '../ConstellationPicker'
import { LayersMenu } from '../LayersMenu'
import type { SpaceSettingsState } from './spaceSettings'

const SCALES: { id: SpaceScale; label: string }[] = [{ id: 'galaxy', label: 'Droga Mleczna' }, { id: 'universe', label: 'Wszechświat lokalny' }]

interface Props {
  o: DSO | null
  settings: SpaceSettingsState
  /** Wybór skali z paska (w stanie zdjęcia „Droga Mleczna” wraca nurkowaniem). */
  onScale(scale: SpaceScale): void
  onConstellationView?(abbr: string): void
  /** Ścieżka „Droga Mleczna › nazwa zdjęcia” w stanie zdjęcia; wtedy pasek nie pokazuje filtrów sceny. */
  crumb?: string
  children?: ReactNode
}

export function SpaceToolbar({ o, settings, onScale, onConstellationView, crumb, children }: Props) {
  const { scale, showConstellations, constellations } = settings
  const { catalog } = useCatalog()
  const [infoOpen, setInfoOpen] = useState(false)
  useEffect(() => {
    if (!infoOpen) return
    const timeout = window.setTimeout(() => setInfoOpen(false), 10_000)
    return () => window.clearTimeout(timeout)
  }, [infoOpen])
  const withDistance = useMemo(() => (catalog ? catalog.filter((c) => c.distLy !== null) : []), [catalog])
  // Liczba obiektów tła skali Drogi Mlecznej według rodzaju (tylko rodzaje obecne w tej skali).
  const typeCounts = useMemo(() => {
    const counts = new Map<ObjectType, number>()
    for (const c of withDistance) if (c.distLy! < GALACTIC_LIMIT_LY) counts.set(c.type, (counts.get(c.type) ?? 0) + 1)
    return (Object.keys(TYPE_INFO) as ObjectType[]).filter((t) => counts.has(t)).map((t) => ({ type: t, count: counts.get(t)! }))
  }, [withDistance])
  const dist = o?.distLy ?? null
  const outOfScale = scale === 'galaxy' && dist !== null && dist > GALACTIC_LIMIT_LY

  return (
    <div className="obs-toolbar space-toolbar">
      <div className="obs-tabs" role="tablist" aria-label="Skala widoku 3D">
        {SCALES.map((s) => <button key={s.id} type="button" role="tab" aria-selected={scale === s.id} className={`toggle-chip${scale === s.id ? ' on' : ''}`} onClick={() => onScale(s.id)}>{s.label}</button>)}
      </div>
      {crumb && <span className="space-crumb figures" title={crumb}>{scale === 'galaxy' ? 'Droga Mleczna' : 'Wszechświat lokalny'} › {crumb}</span>}
      {!crumb && scale === 'galaxy' && showConstellations && <div className="space-filters">
        <ConstellationPicker value={settings.constellationChoice} onChange={settings.setConstellationChoice}
          options={(constellations?.constellations ?? []).map((c) => ({ value: c.abbr, label: CONSTELLATION_PL[c.abbr] ?? c.abbr })).sort((a, b) => a.label.localeCompare(b.label, 'pl'))} />
        <button type="button" className="toggle-chip" aria-label="Pokaż gwiazdozbiór z Ziemi"
          title={settings.constellationChoice === 'all' ? 'Wybierz jeden gwiazdozbiór' : 'Pokaż gwiazdozbiór z Ziemi. Kliknij ponownie, aby wrócić.'}
          disabled={!onConstellationView || settings.constellationChoice === 'all'}
          onClick={() => onConstellationView?.(settings.constellationChoice)}><Camera size={14} /></button>
      </div>}
      {children}
      <span className="obs-spacer" />
      {!crumb && <div className="space-toolbar-end">
      <div className="scale-info-control">
        <button className="scale-info-button" title="Informacje o skali" aria-label="Informacje o skali" aria-expanded={infoOpen} aria-controls="scale-info-popover" onClick={() => setInfoOpen((open) => !open)}>i</button>
        {infoOpen && (
          <div id="scale-info-popover" className="scale-info-popover" role="note" aria-label="Opis skali i źródła danych">
            <p>{dist === null
              ? 'Wikidata nie podaje odległości tego obiektu - pokazany jest tylko kierunek ze Słońca.'
              : outOfScale
                ? `Obiekt (${fmtDistance(dist)}) leży poza zasięgiem tej skali - pokazany jest tylko kierunek ze Słońca. Jego położenie: Wszechświat lokalny.`
                : scale === 'galaxy'
                  ? `Skala liniowa, 1 j. = 1000 lś. Punkty: ${withDistance.filter((c) => c.distLy! < GALACTIC_LIMIT_LY).length} obiektów katalogu z odległością.`
                  : 'Skala odległości logarytmiczna. Modele Grupy Lokalnej zachowują proporcje rozmiarów względem Drogi Mlecznej; pozostałe galaktyki to punkty w kolorach typów obiektów.'}</p>
            <p>Odległości: Wikidata (mediana wartości). Morfologia: NED, NASA, NAOJ. Modele poglądowe.{scale === 'galaxy' && ' Ziemia poza skalą; orientacja osi J2000, obrót poglądowy.'}</p>
            {scale === 'galaxy' && showConstellations && <p>Cyjanowe linie: gwiazdozbiory (Stellarium). Odległości gwiazd: szacunki z paralaks Hipparcosa (CDS I/239); brak dodatniej paralaksy przerywa linię.</p>}
          </div>
        )}
      </div>
      <LayersMenu threeD settings={settings} typeCounts={typeCounts} />
      </div>}
    </div>
  )
}
