// Pasek narzędzi okna „Pozycja 3D”: przełącznik skal, wybór gwiazdozbioru 3D i warstwy.
import { Camera } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { TYPE_INFO, type ObjectType } from '../../lib/catalog'
import { CONSTELLATION_PL } from '../../lib/constellations'
import { GALACTIC_LIMIT_LY, type SpaceScale } from '../../lib/space3d'
import { useCatalog } from '../../state/data'
import { ConstellationPicker } from '../ConstellationPicker'
import { LayersMenu } from '../LayersMenu'
import type { SpaceSettingsState } from './spaceSettings'

const SCALES: { id: SpaceScale; label: string }[] = [{ id: 'galaxy', label: 'Droga Mleczna' }, { id: 'universe', label: 'Wszechświat lokalny' }]

interface Props {
  settings: SpaceSettingsState
  /** Wybór skali z paska (w stanie zdjęcia „Droga Mleczna” wraca nurkowaniem). */
  onScale(scale: SpaceScale): void
  onConstellationView?(abbr: string): void
  /** Ścieżka „Droga Mleczna › nazwa zdjęcia” w stanie zdjęcia; wtedy pasek nie pokazuje filtrów sceny. */
  crumb?: string
  children?: ReactNode
}

export function SpaceToolbar({ settings, onScale, onConstellationView, crumb, children }: Props) {
  const { scale, showConstellations, constellations } = settings
  const { catalog } = useCatalog()
  const withDistance = useMemo(() => (catalog ? catalog.filter((c) => c.distLy !== null) : []), [catalog])
  // Liczba obiektów tła skali Drogi Mlecznej według rodzaju (tylko rodzaje obecne w tej skali).
  const typeCounts = useMemo(() => {
    const counts = new Map<ObjectType, number>()
    for (const c of withDistance) if (c.distLy! < GALACTIC_LIMIT_LY) counts.set(c.type, (counts.get(c.type) ?? 0) + 1)
    return (Object.keys(TYPE_INFO) as ObjectType[]).filter((t) => counts.has(t)).map((t) => ({ type: t, count: counts.get(t)! }))
  }, [withDistance])

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
      {!crumb && <LayersMenu threeD settings={settings} typeCounts={typeCounts} />}
    </div>
  )
}
