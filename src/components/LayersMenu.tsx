// Lista rozwijana warstw kopuły i widoku 3D (pasek karty Nieba i pasek narzędzi okna „Pozycja 3D”).
import { ChevronDown } from 'lucide-react'
import { Fragment, useCallback, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { SkyGroup } from '../lib/catalog'
import { useStore } from '../state/store'
import { Range } from './Range'
import { LayersIcon } from './SkyDome'
import { useOutside } from './TopBar'

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button className={`switch${on ? ' on' : ''}`} onClick={onClick} role="switch" aria-checked={on} style={{ background: 'none', border: 0, padding: 0 }}>
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

/** Nagłówek zwijanej sekcji listy warstw z licznikiem włączonych przełączników. */
function Section({ title, on, total, open, onToggle, children }: { title: string; on: number; total: number; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <>
      <button className="layers-section" aria-expanded={open} onClick={onToggle}>
        <span className="label">{title}</span>
        <span className="dim">{on}/{total}</span>
        <ChevronDown size={12} className={open ? 'open' : undefined} />
      </button>
      {open && children}
    </>
  )
}

/** Lista rozwijana warstw kopuły: zwijane sekcje przełączników warstw i grup katalogów. */
export function LayersMenu({ threeD = false }: { threeD?: boolean }) {
  const visibleLayers = threeD ? THREE_D_LAYERS : LAYERS
  const [open, setOpen] = useState(false)
  // Rozwinięte sekcje pamiętane, dopóki otwarty jest widok kopuły (lista obiektów domyślnie zwinięta).
  const [sections, setSections] = useState({ layers: true, objects: false })
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useOutside(ref, close)
  const layers = useStore(useShallow((s) => visibleLayers.map(({ key }) => s[key])))
  const groups = useStore((s) => s.skyGroups)
  const toggle = useStore((s) => s.toggle)
  const toggleGroup = useStore((s) => s.toggleSkyGroup)
  // Warstwy z suwakiem krycia pod przełącznikiem (widocznym, gdy warstwa jest włączona).
  const outlinesOpacity = useStore((s) => s.outlinesOpacity)
  const ownPhotosOpacity = useStore((s) => s.ownPhotosOpacity)
  const setOutlinesOpacity = useStore((s) => s.setOutlinesOpacity)
  const setOwnPhotosOpacity = useStore((s) => s.setOwnPhotosOpacity)
  const opacity: Partial<Record<LayerKey, { value: number; set: (value: number) => void }>> = {
    showOutlines: { value: outlinesOpacity, set: setOutlinesOpacity },
    showOwnPhotos: { value: ownPhotosOpacity, set: setOwnPhotosOpacity },
  }
  return (
    <div className="layers-menu" ref={ref}>
      <button className={`button small${open ? ' active' : ''}`} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        <LayersIcon filled={false} /> Warstwy <ChevronDown size={12} />
      </button>
      {open && (
        <div className="popover layers-popover" role="group" aria-label={threeD ? 'Warstwy 3D' : 'Warstwy kopuły'}>
          <Section title="Warstwy" on={layers.filter(Boolean).length} total={visibleLayers.length} open={sections.layers} onToggle={() => setSections({ ...sections, layers: !sections.layers })}>
            {visibleLayers.map(({ key, label }, i) => (
              <Fragment key={key}>
                <Switch on={layers[i]} onClick={() => toggle(key)} label={label} />
                {opacity[key] && layers[i] && <OpacityRow value={opacity[key].value} onChange={opacity[key].set} label={`Krycie: ${label}`} />}
              </Fragment>
            ))}
          </Section>
          {!threeD && <Section title="Obiekty" on={GROUPS.filter(({ id }) => groups[id]).length} total={GROUPS.length} open={sections.objects} onToggle={() => setSections({ ...sections, objects: !sections.objects })}>
            {GROUPS.map(({ id, label }) => <Switch key={id} on={groups[id]} onClick={() => toggleGroup(id)} label={label} />)}
          </Section>}
        </div>
      )}
    </div>
  )
}
