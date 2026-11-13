import { lazy, Suspense, useEffect, useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TopBar } from './components/TopBar'
import { useCatalog } from './state/data'
import { useStore } from './state/store'
import { SkyView } from './views/SkyView'

const CatalogView = lazy(() => import('./views/CatalogView'))
const PlannerView = lazy(() => import('./views/PlannerView'))
const EquipmentView = lazy(() => import('./views/EquipmentView'))
const HorizonView = lazy(() => import('./views/HorizonView'))

const BOOT = ['Inicjalizacja układu współrzędnych', 'Wczytywanie katalogu obiektów', 'Kalibracja kopuły nieba', 'Synchronizacja z zegarem gwiazdowym']

function Boot() {
  const { catalog, error } = useCatalog()
  const [step, setStep] = useState(0)
  const [hidden, setHidden] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  // Interfejs nie czeka na katalog dłużej niż 1,5 s (wolne łącze) ani przy błędzie wczytania.
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 1500)
    return () => clearTimeout(id)
  }, [])
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(() => {
    if (step >= BOOT.length) return
    const id = setTimeout(() => setStep((s) => s + 1), reduced ? 0 : 140)
    return () => clearTimeout(id)
  }, [step, reduced])
  const done = step >= BOOT.length && (catalog !== null || error !== null || timedOut)
  useEffect(() => {
    if (!done) return
    const id = setTimeout(() => setHidden(true), 700)
    return () => clearTimeout(id)
  }, [done])
  if (hidden) return null
  return (
    <div className={`boot${done ? ' done' : ''}`} aria-hidden>
      <div className="boot-lines">
        <div className="kicker" style={{ marginBottom: 14 }}>Konuzastro · tracker</div>
        {BOOT.slice(0, step).map((line, i) => (
          <div key={line}>
            <span>{line}</span>
            <span className="ok">{i === 1 && !catalog ? '…' : '[OK]'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function App() {
  const tab = useStore((s) => s.tab)
  return (
    <>
      <Boot />
      <TopBar />
      <main className="page" key={tab}>
        <div className="view-enter">
          <ErrorBoundary>
            <Suspense fallback={<div className="empty">Wczytywanie…</div>}>
              {tab === 'sky' && <SkyView />}
              {tab === 'catalog' && <CatalogView />}
              {tab === 'planner' && <PlannerView />}
              {tab === 'equipment' && <EquipmentView />}
              {tab === 'horizon' && <HorizonView />}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </>
  )
}
