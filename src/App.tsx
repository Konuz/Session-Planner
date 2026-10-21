import { TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'
import { NavBar } from './app/NavBar'
import { TopBar } from './app/TopBar'
import { CatalogTab } from './features/catalog/CatalogTab'
import { FramingTab } from './features/framing/FramingTab'
import { NightTab } from './features/night/NightTab'
import { SettingsTab } from './features/settings/SettingsTab'
import { usePlannerStore } from './state/plannerStore'

/** W trybie „Teraz” kursor odświeża się co 60 s (7.0). */
const NOW_REFRESH_MS = 60_000

export default function App() {
  const tab = usePlannerStore((state) => state.tab)
  const followNow = usePlannerStore((state) => state.followNow)
  const locationsReady = usePlannerStore((state) => state.locationsReady)
  const storageError = usePlannerStore((state) => state.storageError)
  const loadLocations = usePlannerStore((state) => state.loadLocations)
  const goNow = usePlannerStore((state) => state.goNow)

  useEffect(() => {
    void loadLocations()
  }, [loadLocations])

  useEffect(() => {
    if (!followNow) return
    const timer = window.setInterval(() => goNow(Date.now()), NOW_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [followNow, goNow])

  return (
    <div className="min-h-dvh md:flex">
      <NavBar />
      <div className="min-w-0 flex-1 pb-24 md:pb-0">
        <TopBar />
        <main className="mx-auto max-w-6xl px-4 py-4">
          {storageError && (
            <p role="alert" className="card mb-4 flex items-start gap-2 p-3 text-sm">
              <TriangleAlert aria-hidden size={18} className="mt-0.5 shrink-0 text-alert" />
              {storageError}
            </p>
          )}
          {!locationsReady ? (
            <p className="text-sm text-muted">Wczytywanie lokalizacji…</p>
          ) : tab === 'catalog' ? (
            <CatalogTab />
          ) : tab === 'night' ? (
            <NightTab />
          ) : tab === 'framing' ? (
            <FramingTab />
          ) : (
            <SettingsTab />
          )}
        </main>
      </div>
    </div>
  )
}
