// Nawigacja (sekcja 9): dolny pasek zakładek poniżej 768 px, boczny pasek od 768 px (sekcja 8).
import { Frame, MoonStar, Settings, Telescope, type LucideIcon } from 'lucide-react'
import { usePlannerStore, type Tab } from '../state/plannerStore'

const TABS: readonly { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'catalog', label: 'Katalog', icon: Telescope },
  { id: 'night', label: 'Noc', icon: MoonStar },
  { id: 'framing', label: 'Kadr', icon: Frame },
  { id: 'settings', label: 'Ustawienia', icon: Settings },
]

/** Znacznik aktywnej zakładki: krótka kreska przy krawędzi paska (u góry na telefonie, z lewej od 768 px). */
const ACTIVE_MARK =
  'before:absolute before:top-0 before:left-1/2 before:h-0.5 before:w-7 before:-translate-x-1/2 before:rounded-full before:bg-accent md:before:top-1/2 md:before:left-0 md:before:h-7 md:before:w-0.5 md:before:translate-x-0 md:before:-translate-y-1/2'

export function NavBar() {
  const tab = usePlannerStore((state) => state.tab)
  const setTab = usePlannerStore((state) => state.setTab)
  return (
    <nav
      aria-label="Zakładki"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:h-dvh md:w-22 md:shrink-0 md:flex-col md:gap-2 md:border-t-0 md:border-r md:pt-6 md:pb-0"
    >
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-current={tab === id ? 'page' : undefined}
          onClick={() => setTab(id)}
          className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs md:flex-none md:py-3 ${
            tab === id ? `font-semibold text-accent ${ACTIVE_MARK}` : 'text-muted hover:text-foreground'
          }`}
        >
          <Icon aria-hidden size={22} strokeWidth={tab === id ? 2 : 1.5} />
          {label}
        </button>
      ))}
    </nav>
  )
}
