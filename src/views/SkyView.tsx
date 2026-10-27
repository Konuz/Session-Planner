import { Pause, Play, RotateCcw } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { AltitudeChart } from '../components/AltitudeChart'
import { FramingPanel } from '../components/FramingPanel'
import { ObjectDetails } from '../components/ObjectDetails'
import { MoonCard, ObjectCard, OpticsCard, WeatherCard } from '../components/SkyCards'
import { SkyDome } from '../components/SkyDome'
import { fmtTime } from '../lib/format'
import { useCatalog, useNight, useTime } from '../state/data'
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

const MODES: { id: CenterMode; label: string }[] = [
  { id: 'dome', label: 'Niebo' },
  { id: 'framing', label: 'Kadr teleskopu' },
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
  const showLines = useStore((s) => s.showLines)
  const showTracks = useStore((s) => s.showTracks)
  const showArt = useStore((s) => s.showArt)
  const showOutlines = useStore((s) => s.showOutlines)
  const showAnnotations = useStore((s) => s.showAnnotations)
  const toggle = useStore((s) => s.toggle)
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
            {mode === '3d' && <span className="toolbar-group"><Switch on={showAnnotations} onClick={() => toggle('showAnnotations')} label="Opisy" /></span>}
            {mode === 'dome' && (
              <div style={{ display: 'contents' }}>
                <button className="button small icon-button" title={playing ? 'Zatrzymaj' : 'Odtwórz noc'} onClick={() => setPlaying(!playing)}>
                  {playing ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button className="button small icon-button" title="Wróć do bieżącej chwili" onClick={() => { setPlaying(false); setTime(null) }}>
                  <RotateCcw size={14} />
                </button>
                <span className="mono" style={{ fontSize: 12, minWidth: 44 }}>{fmtTime(time, tz)}</span>
                <span className="toolbar-group">
                  <Switch on={showLines} onClick={() => toggle('showLines')} label="Linie" />
                  <Switch on={showArt} onClick={() => toggle('showArt')} label="Postacie" />
                  <Switch on={showOutlines} onClick={() => toggle('showOutlines')} label="Kontury" />
                  <Switch on={showAnnotations} onClick={() => toggle('showAnnotations')} label="Opisy" />
                  <Switch on={showTracks} onClick={() => toggle('showTracks')} label="Tory" />
                </span>
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
