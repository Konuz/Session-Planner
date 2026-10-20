// Nawigacja (sekcja 9): dolny pasek zakładek poniżej 768 px, boczny pasek od 768 px (sekcja 8).
import { Frame, MoonStar, Settings, Telescope, type LucideIcon } from 'lucide-react'
import { usePlannerStore, type Tab } from '../state/plannerStore'

const TABS: readonly { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'catalog', label: 'Katalog', icon: Telescope },
  { id: 'night', label: 'Noc', icon: MoonStar },
  { id: 'framing', label: 'Kadr', icon: Frame },
  { id: 'settings', label: 'Ustawienia', icon: Settings },
]

export function NavBar() {
  const tab = usePlannerStore((state) => state.tab)
  const setTab = usePlannerStore((state) => state.setTab)
  return (
    <nav
      aria-label="Zakładki"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:h-dvh md:w-24 md:shrink-0 md:flex-col md:gap-1 md:border-t-0 md:border-r md:pt-4 md:pb-0"
    >
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-current={tab === id ? 'page' : undefined}
          onClick={() => setTab(id)}
          className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs md:flex-none md:py-3 ${
            tab === id ? 'text-accent' : 'text-muted hover:text-foreground'
          }`}
        >
          <Icon aria-hidden size={22} strokeWidth={tab === id ? 2.25 : 1.75} />
          {label}
        </button>
      ))}
    </nav>
  )
}
