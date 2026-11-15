// Lista rozwijana warstw kopuły i widoku 3D (pasek karty Nieba i pasek narzędzi okna „Pozycja 3D”).
import { ChevronDown } from 'lucide-react'
import { Fragment, useCallback, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ObjectType, SkyGroup } from '../lib/catalog'
import { DEFAULT_ANNOTATION_COLORS, TYPE_INFO } from '../lib/catalog'
import { SURVEYS } from '../lib/hips'
import { SKY_LOOKS, skyLookSurvey, type SkyLook } from '../lib/hipsSky'
import { DOME_STYLES } from '../lib/space3d'
import { useStore } from '../state/store'
import { Range } from './Range'
import { LayersIcon } from './SkyDome'
import { useOutside } from './TopBar'
import { glyphCanvas } from './space3d/markerGlyphs'
import { GALAXY_LEVELS, type SpaceSettingsState } from './space3d/spaceSettings'

export type LayerTypeCount = { type: ObjectType; count: number }

function Switch({ on, onClick, label, disabled, title }: { on: boolean; onClick: () => void; label: string; disabled?: boolean; title?: string }) {
  return (
    <button type="button" className={`switch${on ? ' on' : ''}`} disabled={disabled} title={title} onClick={onClick} role="switch" aria-checked={on} style={{ background: 'none', border: 0, padding: 0 }}>
      <span className="track" />
      <span>{label}</span>
    </button>
  )
}

type LayerKey = 'showLines' | 'showLabels' | 'showArt' | 'showOutlines' | 'showOwnPhotos' | 'showEllipses' | 'showAnnotations' | 'show3DAnnotations' | 'showTracks'

const THREE_D_LAYERS: { key: LayerKey; label: string }[] = [
  { key: 'show3DAnnotations', label: 'Opisy' },
]

const LAYERS: { key: LayerKey; label: string }[] = [
  { key: 'showLines', label: 'Linie' },
  { key: 'showLabels', label: 'Nazwy gwiazdozbiorów' },
  { key: 'showArt', label: 'Postacie' },
  { key: 'showOutlines', label: 'Kontury' },
  { key: 'showOwnPhotos', label: 'Moje zdjęcia' },
  { key: 'showEllipses', label: 'Okręgi obiektów' },
  { key: 'showAnnotations', label: 'Opisy' },
  { key: 'showTracks', label: 'Tory' },
]

// Kolejność jak w SKY_GROUPS: od najpopularniejszego katalogu.
const GROUPS: { id: SkyGroup; label: string }[] = [
  { id: 'M', label: 'Messier' },
  { id: 'NGC', label: 'NGC' },
  { id: 'IC', label: 'IC' },
  { id: 'Sh2', label: 'Sharpless (Sh2)' },
  { id: 'B', label: 'Barnard (B)' },
  { id: 'vdB', label: 'van den Bergh (vdB)' },
  { id: 'LBN', label: 'LBN' },
  { id: 'LDN', label: 'LDN' },
  { id: 'SNR', label: 'Pozostałości SN (SNR)' },
  { id: 'other', label: 'Inne' },
]

/** Suwak krycia warstwy wcięty pod jej przełącznikiem (10–100%). */
function OpacityRow({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  const pct = Math.round(value * 100)
  return (
    <label className="layers-range">
      <span>Krycie</span>
      <Range min={10} max={100} step={5} value={pct} onChange={(e) => onChange(Number(e.target.value) / 100)} aria-label={label} />
      <span>{pct}%</span>
    </label>
  )
}

/** Nagłówek zwijanej sekcji listy warstw; sekcje nadrzędne otaczają opcje w `.layers-body`, a podrzędny filtr w `.layers-subgroup`. */
function Section({ title, on, total, open, onToggle, sub = false, children }: {
  title: string; on?: number; total?: number; open: boolean; onToggle: () => void; sub?: boolean; children: React.ReactNode
}) {
  return (
    <div className={sub ? 'layers-subgroup' : 'layers-group'}>
      <button type="button" className={sub ? 'layers-section layers-subsection' : 'layers-section'} aria-expanded={open} onClick={onToggle}>
        <span className="label">{title}</span>
        {on !== undefined && total !== undefined && <span className="dim">{on}/{total}</span>}
        <ChevronDown size={12} className={open ? 'open' : undefined} />
      </button>
      {open && (sub ? children : <div className="layers-body">{children}</div>)}
    </div>
  )
}

/** Lista rozwijana warstw kopuły i widoku 3D: zwijane sekcje przełączników, suwaków i filtrów obiektów. */
export function LayersMenu({ threeD = false, settings, typeCounts = [], defaultOpen = false }: {
  threeD?: boolean
  settings?: SpaceSettingsState
  typeCounts?: LayerTypeCount[]
  defaultOpen?: boolean
}) {
  const visibleLayers = threeD ? THREE_D_LAYERS : LAYERS
  const [open, setOpen] = useState(defaultOpen)
  // Rozwinięte sekcje pamiętane w ramach sesji widoku (listy katalogów i rodzajów obiektów domyślnie zwinięte).
  const [sections, setSections] = useState({ layers: true, objects: false, common: true, galaxy: true, galaxyTypes: false, universe: true })
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useOutside(ref, close)
  const layers = useStore(useShallow((s) => visibleLayers.map(({ key }) => s[key])))
  const groups = useStore((s) => s.skyGroups)
  const annotationColors = useStore((s) => s.annotationColors)
  const toggle = useStore((s) => s.toggle)
  const toggleGroup = useStore((s) => s.toggleSkyGroup)
  const domeStyle = useStore((s) => s.domeStyle)
  const setDomeStyle = useStore((s) => s.setDomeStyle)
  const domeOpacity = useStore((s) => s.domeOpacity)
  const skyLook = useStore((s) => s.skyLook)
  const setSkyLook = useStore((s) => s.setSkyLook)
  const setDomeOpacity = useStore((s) => s.setDomeOpacity)
  const domeStyleIndex = Math.max(0, DOME_STYLES.findIndex((s) => s.id === domeStyle))
  const domeStyleInfo = DOME_STYLES[domeStyleIndex]
  // Warstwy z suwakiem krycia pod przełącznikiem (widocznym, gdy warstwa jest włączona).
  const outlinesOpacity = useStore((s) => s.outlinesOpacity)
  const ownPhotosOpacity = useStore((s) => s.ownPhotosOpacity)
  const setOutlinesOpacity = useStore((s) => s.setOutlinesOpacity)
  const setOwnPhotosOpacity = useStore((s) => s.setOwnPhotosOpacity)
  const opacity: Partial<Record<LayerKey, { value: number; set: (value: number) => void }>> = {
    showOutlines: { value: outlinesOpacity, set: setOutlinesOpacity },
    showOwnPhotos: { value: ownPhotosOpacity, set: setOwnPhotosOpacity },
  }
  const typeColor = (type: ObjectType) => annotationColors[type] ?? DEFAULT_ANNOTATION_COLORS[type]
  const shownTypeCount = settings ? typeCounts.filter((t) => !settings.hiddenTypes.includes(t.type)).length : 0

  return (
    <div className="layers-menu" ref={ref}>
      <button type="button" className={`button small${open ? ' active' : ''}`} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        <LayersIcon filled={false} /> Warstwy <ChevronDown size={12} />
      </button>
      {open && (
        <div className="popover layers-popover" role="group" aria-label={threeD ? 'Warstwy 3D' : 'Warstwy kopuły'}>
          {threeD ? (
            <>
              <Section title="Wspólne" on={layers.filter(Boolean).length} total={visibleLayers.length} open={sections.common} onToggle={() => setSections({ ...sections, common: !sections.common })}>
                {visibleLayers.map(({ key, label }, i) => (
                  <Switch key={key} on={layers[i]} onClick={() => toggle(key)} label={label} />
                ))}
              </Section>
              {settings && (
                <Section title="Droga Mleczna" open={sections.galaxy} onToggle={() => setSections({ ...sections, galaxy: !sections.galaxy })}>
                  <Switch
                    on={settings.showConstellations}
                    disabled={!settings.constellations}
                    title={settings.constellationError ? 'Nie udało się wczytać gwiazdozbiorów' : !settings.constellations ? 'Ładowanie gwiazdozbiorów…' : 'Pokaż gwiazdy i cyjanowe linie w przestrzeni Drogi Mlecznej'}
                    onClick={() => settings.setShowConstellations(!settings.showConstellations)}
                    label={`Gwiazdozbiory 3D${settings.constellationError ? ' — błąd danych' : ''}`}
                  />
                  {settings.showConstellations && (
                    <div className="layers-sub">
                      <Switch
                        on={settings.showStarNames}
                        onClick={() => settings.setShowStarNames(!settings.showStarNames)}
                        label="Nazwy gwiazd"
                      />
                    </div>
                  )}
                  <Section title="Filtr obiektów" sub on={shownTypeCount} total={typeCounts.length} open={sections.galaxyTypes} onToggle={() => setSections({ ...sections, galaxyTypes: !sections.galaxyTypes })}>
                    <div className="type-filter layers-types">
                      <label>
                        <input
                          type="checkbox"
                          checked={shownTypeCount === typeCounts.length && typeCounts.length > 0}
                          onChange={() => settings.setHiddenTypes(() => (shownTypeCount === typeCounts.length ? (Object.keys(TYPE_INFO) as ObjectType[]) : []))}
                        />
                        Wszystkie
                      </label>
                      {typeCounts.map(({ type, count }) => (
                        <label key={type}>
                          <input
                            type="checkbox"
                            checked={!settings.hiddenTypes.includes(type)}
                            onChange={() => settings.setHiddenTypes((h) => (h.includes(type) ? h.filter((t) => t !== type) : [...h, type]))}
                          />
                          <span className="dot" style={{ background: typeColor(type) }} />
                          {TYPE_INFO[type].plural}
                          <span className="faint">{count}</span>
                          <canvas aria-hidden="true" ref={(canvas) => { if (canvas) glyphCanvas(type, typeColor(type), canvas) }} />
                        </label>
                      ))}
                    </div>
                  </Section>
                </Section>
              )}
              <Section title="Wszechświat lokalny" open={sections.universe} onToggle={() => setSections({ ...sections, universe: !sections.universe })}>
                {settings && (
                  <div className="layers-choice">
                    <span className="label">Liczba galaktyk</span>
                    <label className="layers-range layers-galaxy-range" title={GALAXY_LEVELS[settings.galaxyLevel].title}>
                      <LayersIcon filled={false} />
                      <Range min={0} max={GALAXY_LEVELS.length - 1} step={1} value={settings.galaxyLevel} onChange={(e) => settings.setGalaxyLevel(Number(e.target.value))}
                        aria-label="Liczba galaktyk" aria-valuetext={GALAXY_LEVELS[settings.galaxyLevel].title} />
                      <LayersIcon filled />
                    </label>
                    <span className="layers-note">{GALAXY_LEVELS[settings.galaxyLevel].title.replace(/^Galaktyki \d+:\s*/, '')}</span>
                  </div>
                )}
                <div className="layers-choice">
                  <span className="label">Kopuły</span>
                  {/* Jeden przycisk: każde kliknięcie przechodzi do następnego stylu (po ostatnim wraca do pierwszego). */}
                  <button type="button" className="toggle-chip layers-cycle" title={`${domeStyleInfo.title}. Kliknij, aby zmienić wygląd.`}
                    aria-label={`Wygląd kopuł: ${domeStyleInfo.label}. Kliknij, aby przełączyć na następny.`}
                    onClick={() => setDomeStyle(DOME_STYLES[(domeStyleIndex + 1) % DOME_STYLES.length].id)}>
                    {domeStyleInfo.label} <span className="dim">{domeStyleIndex + 1}/{DOME_STYLES.length}</span>
                  </button>
                  <OpacityRow value={domeOpacity} onChange={setDomeOpacity} label="Krycie kopuł" />
                </div>
              </Section>
            </>
          ) : (
            <>
              <div className="layers-choice">
                <span className="label">Wygląd nieba</span>
                <select className="control" value={skyLook} onChange={(e) => setSkyLook(e.target.value as SkyLook)} aria-label="Wygląd nieba">
                  {SKY_LOOKS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
                {skyLookSurvey(skyLook) && <span className="layers-note">{SURVEYS[skyLookSurvey(skyLook)!].credit}. Na południe od −16° gwiazdy katalogu.</span>}
              </div>
              <Section title="Warstwy" on={layers.filter(Boolean).length} total={visibleLayers.length} open={sections.layers} onToggle={() => setSections({ ...sections, layers: !sections.layers })}>
                {visibleLayers.map(({ key, label }, i) => (
                  <Fragment key={key}>
                    <Switch on={layers[i]} onClick={() => toggle(key)} label={label} />
                    {opacity[key] && layers[i] && <OpacityRow value={opacity[key].value} onChange={opacity[key].set} label={`Krycie: ${label}`} />}
                  </Fragment>
                ))}
              </Section>
              <Section title="Obiekty" on={GROUPS.filter(({ id }) => groups[id]).length} total={GROUPS.length} open={sections.objects} onToggle={() => setSections({ ...sections, objects: !sections.objects })}>
                {GROUPS.map(({ id, label }) => <Switch key={id} on={groups[id]} onClick={() => toggleGroup(id)} label={label} />)}
              </Section>
            </>
          )}
        </div>
      )}
    </div>
  )
}
