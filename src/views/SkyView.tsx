import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import { AltitudeChart } from '../components/AltitudeChart'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { FramingPanel } from '../components/FramingPanel'
import { LayersMenu } from '../components/LayersMenu'
import { ObjectDetails } from '../components/ObjectDetails'
import { MoonCard, ObjectCard, OpticsCard, WeatherCard } from '../components/SkyCards'
import { SkyDome } from '../components/SkyDome'
import { fmtTime } from '../lib/format'
import { useCatalog, useNight, useTime } from '../state/data'
import { useStore, type CenterMode } from '../state/store'

// Okno „Pozycja 3D” ładowane leniwie, ale bez Suspense: React 19 odsłania treść po pokazanym fallbacku najwcześniej
// 300 ms po nim, więc okno czekało tyle mimo pobranego modułu. Moduł zaczyna się ładować już przy wskazaniu przycisku.
let Space3DModal: ComponentType | null = null
let space3DLoading: Promise<void> | null = null
const loadSpace3D = () => space3DLoading ??= import('../components/space3d/Space3DModal').then((m) => { Space3DModal = m.default }, (error: unknown) => {
  // Jak odrzucony lazy(): okno rzuca błąd przy renderze, a pokazuje go ErrorBoundary.
  Space3DModal = () => { throw error }
})

const MODES: { id: CenterMode; label: string }[] = [
  { id: 'dome', label: 'Niebo' },
]

/** Odtwarzanie przebiegu nocy na kopule (1 s ≈ 12 min). */
function PlaybackControls({ visible, playing, setPlaying }: { visible: boolean; playing: boolean; setPlaying: (playing: boolean) => void }) {
  const night = useNight()
  const time = useTime()
  const setTime = useStore((s) => s.setTime)
  const tz = useStore((s) => s.location.timeZone)
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
  if (!visible) return null
  return (
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
  )
}

export function SkyView() {
  const mode = useStore((s) => s.centerMode)
  const setMode = useStore((s) => s.setCenterMode)
  const selectedIndex = useStore((s) => s.selectedIndex)
  const select = useStore((s) => s.select)
  const { catalog } = useCatalog()
  const [details, setDetails] = useState(false)
  const [playing, setPlaying] = useState(false)
  const space3DOpen = useStore((s) => s.space3DOpen)
  const setSpace3DOpen = useStore((s) => s.setSpace3DOpen)

  // Okno „Pozycja 3D” zasłania kopułę: odtwarzanie nocy nie powinno jej przerysowywać w tle.
  useEffect(() => { if (space3DOpen) setPlaying(false) }, [space3DOpen])
  const [space3DReady, setSpace3DReady] = useState(() => Space3DModal !== null)
  useEffect(() => {
    if (!space3DOpen || space3DReady) return
    let live = true
    void loadSpace3D().then(() => { if (live) setSpace3DReady(true) })
    return () => { live = false }
  }, [space3DOpen, space3DReady])

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
          <div className="sky-toolbar">
            {MODES.map(({ id, label }) => (
              <button key={id} className={`button small${mode === id ? ' active' : ''}`} onClick={() => setMode(id)}>
                {label}
              </button>
            ))}
            <button className={`button small${space3DOpen ? ' active' : ''}`} data-space3d-opener onPointerEnter={() => void loadSpace3D()} onFocus={() => void loadSpace3D()} onClick={() => setSpace3DOpen(true)}>Pozycja 3D</button>
            <PlaybackControls visible={mode === 'dome'} playing={playing} setPlaying={setPlaying} />
          </div>
        </section>
        <div className="col">
          <WeatherCard />
          <OpticsCard />
        </div>
        <AltitudeChart />
      </div>
      {details && <ObjectDetails onClose={() => setDetails(false)} />}
      {space3DOpen && (
        <ErrorBoundary fallback={() => (
          <div className="observatory" role="alertdialog" aria-label="Pozycja 3D niedostępna">
            <div className="empty">
              Widok 3D nie działa w tej przeglądarce (wymaga WebGL).{' '}
              <button className="button small" onClick={() => setSpace3DOpen(false)}>Zamknij</button>
            </div>
          </div>
        )}>
          {space3DReady && Space3DModal && <Space3DModal />}
        </ErrorBoundary>
      )}
    </>
  )
}
