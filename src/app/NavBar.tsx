// Nawigacja (sekcja 9): dolny pasek zakładek poniżej 768 px, boczny pasek od 768 px (sekcja 8).
import { FolderOpen, Frame, MoonStar, Settings, Telescope, type LucideIcon } from 'lucide-react'
import { usePlannerStore, type Tab } from '../state/plannerStore'

const TABS: readonly { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'catalog', label: 'Katalog', icon: Telescope },
  { id: 'night', label: 'Noc', icon: MoonStar },
  { id: 'framing', label: 'Kadr', icon: Frame },
  { id: 'projects', label: 'Projekty', icon: FolderOpen },
  { id: 'settings', label: 'Ustawienia', icon: Settings },
]

/** Znak aplikacji na bocznym pasku: gwiazda na orbicie, w bursztynie akcji. */
function AppMark() {
  return (
    <svg width={36} height={36} viewBox="0 0 36 36" aria-hidden className="text-accent">
      <ellipse cx={18} cy={18} rx={15} ry={6.5} transform="rotate(-28 18 18)" fill="none" stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.25} />
      <path d="M18 9.5 L19.6 16.4 L26.5 18 L19.6 19.6 L18 26.5 L16.4 19.6 L9.5 18 L16.4 16.4 Z" fill="currentColor" />
      <circle cx={30.5} cy={11.5} r={1.6} className="fill-parchment" />
    </svg>
  )
}

export function NavBar() {
  const tab = usePlannerStore((state) => state.tab)
  const setTab = usePlannerStore((state) => state.setTab)
  return (
    <nav
      aria-label="Zakładki"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:h-dvh md:w-24 md:shrink-0 md:flex-col md:gap-1 md:border-t-0 md:border-r md:bg-background/80 md:px-2 md:pt-5 md:pb-0 md:backdrop-blur"
    >
      <div className="mb-5 hidden justify-center md:flex">
        <AppMark />
      </div>
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = tab === id
        return (
          <button
            key={id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => setTab(id)}
            className={`group flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs md:flex-none md:py-2 ${
              active ? 'font-semibold text-accent' : 'text-muted hover:text-foreground'
            }`}
          >
            <span
              className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                active ? 'bg-accent/15' : 'group-hover:bg-foreground/5'
              }`}
            >
              <Icon aria-hidden size={21} strokeWidth={active ? 2 : 1.5} />
            </span>
            {label}
          </button>
        )
      })}
    </nav>
  )
}
