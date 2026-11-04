import { ChevronDown, Pause, Play, RotateCcw } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { AltitudeChart } from '../components/AltitudeChart'
import { FramingPanel } from '../components/FramingPanel'
import { ObjectDetails } from '../components/ObjectDetails'
import { MoonCard, ObjectCard, OpticsCard, WeatherCard } from '../components/SkyCards'
import { LayersIcon, SkyDome } from '../components/SkyDome'
import { useOutside } from '../components/TopBar'
import { fmtTime } from '../lib/format'
import { useCatalog, useNight, useTime } from '../state/data'
import type { SkyGroup } from '../lib/catalog'
import { useStore, type CenterMode } from '../state/store'

const Space3D = lazy(() => import('../components/Space3D'))

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button className={`switch${on ? ' on' : ''}`} onClick={onClick} role="switch" aria-checked={on} style={{ background: 'none', border: 0, padding: 0 }}>
      <span className="track" />
      <span>{label}</span>
    </button>
  )
}

type LayerKey = 'showLines' | 'showLabels' | 'showArt' | 'showOutlines' | 'showEllipses' | 'showAnnotations' | 'show3DAnnotations' | 'showTracks'

const THREE_D_LAYERS: { key: LayerKey; label: string }[] = [
  { key: 'show3DAnnotations', label: 'Opisy' },
]

const LAYERS: { key: LayerKey; label: string }[] = [
  { key: 'showLines', label: 'Linie' },
  { key: 'showLabels', label: 'Nazwy gwiazdozbiorów' },
  { key: 'showArt', label: 'Postacie' },
  { key: 'showOutlines', label: 'Kontury' },
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
function LayersMenu({ threeD = false }: { threeD?: boolean }) {
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
  return (
    <div className="layers-menu" ref={ref}>
      <button className={`button small${open ? ' active' : ''}`} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        <LayersIcon filled={false} /> Warstwy <ChevronDown size={12} />
      </button>
      {open && (
        <div className="popover layers-popover" role="group" aria-label={threeD ? 'Warstwy 3D' : 'Warstwy kopuły'}>
          <Section title="Warstwy" on={layers.filter(Boolean).length} total={visibleLayers.length} open={sections.layers} onToggle={() => setSections({ ...sections, layers: !sections.layers })}>
            {visibleLayers.map(({ key, label }, i) => <Switch key={key} on={layers[i]} onClick={() => toggle(key)} label={label} />)}
          </Section>
          {!threeD && <Section title="Obiekty" on={GROUPS.filter(({ id }) => groups[id]).length} total={GROUPS.length} open={sections.objects} onToggle={() => setSections({ ...sections, objects: !sections.objects })}>
            {GROUPS.map(({ id, label }) => <Switch key={id} on={groups[id]} onClick={() => toggleGroup(id)} label={label} />)}
          </Section>}
        </div>
      )}
    </div>
  )
}

const MODES: { id: CenterMode; label: string }[] = [
  { id: 'dome', label: 'Niebo' },
  { id: '3d', label: 'Pozycja 3D' },
]

/** Odtwarzanie przebiegu nocy na kopule (1 s ≈ 12 min). */
function usePlayback() {
  const [playing, setPlaying] = useState(false)
  const night = useNight()
  const time = useTime()
  const setTime = useStore((s) => s.setTime)
  const tRef = useRef(time)
  tRef.current = time
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      let t = tRef.current + dt * 720
      if (t > night.endMs) t = night.startMs
      setTime(t)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, night, setTime])
  return [playing, setPlaying] as const
}

export function SkyView() {
  const mode = useStore((s) => s.centerMode)
  const setMode = useStore((s) => s.setCenterMode)
  const setTime = useStore((s) => s.setTime)
  const selectedIndex = useStore((s) => s.selectedIndex)
  const select = useStore((s) => s.select)
  const tz = useStore((s) => s.location.timeZone)
  const time = useTime()
  const { catalog } = useCatalog()
  const [details, setDetails] = useState(false)
  const [playing, setPlaying] = usePlayback()

  // Pierwsze uruchomienie: M 51 jak w prototypie.
  useEffect(() => {
    if (catalog && selectedIndex === null) {
      const m51 = catalog.find((o) => o.id === 'M 51')
      if (m51) select(m51.i, false)
    }
  }, [catalog, selectedIndex, select])

  return (
    <>
      <div className="sky-grid">
        <div className="col">
          <ObjectCard onDetails={() => setDetails(true)} />
          <MoonCard />
        </div>
        <section className="card sky-center">
          {mode === 'dome' && <SkyDome playing={playing} />}
          {mode === 'framing' && <FramingPanel />}
          {mode === '3d' && (
            <Suspense fallback={<div className="sky-stage" style={{ display: 'grid', placeItems: 'center' }}><span className="dim mono">Ładowanie sceny 3D…</span></div>}>
              <Space3D />
            </Suspense>
          )}
          <div className="sky-toolbar">
            {MODES.map(({ id, label }) => (
              <button key={id} className={`button small${mode === id ? ' active' : ''}`} onClick={() => setMode(id)}>
                {label}
              </button>
            ))}
            {mode === '3d' && <LayersMenu threeD />}
            {mode === 'dome' && (
              <div style={{ display: 'contents' }}>
                <button className="button small icon-button" title={playing ? 'Zatrzymaj' : 'Odtwórz noc'} onClick={() => setPlaying(!playing)}>
                  {playing ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button className="button small icon-button" title="Wróć do bieżącej chwili" onClick={() => { setPlaying(false); setTime(null) }}>
                  <RotateCcw size={14} />
                </button>
                <span className="mono" style={{ fontSize: 12, minWidth: 44 }}>{fmtTime(time, tz)}</span>
                <LayersMenu />
              </div>
            )}
          </div>
        </section>
        <div className="col">
          <WeatherCard />
          <OpticsCard />
        </div>
        <AltitudeChart />
      </div>
      {details && <ObjectDetails onClose={() => setDetails(false)} />}
    </>
  )
}
