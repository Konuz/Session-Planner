// Górny pasek (7.0): lokalizacja, noc D, aktywny zestaw, kursor czasu z trybem „Teraz” i przełącznik Red Mode.
import { Eye, LocateFixed, MapPin, MoonStar, Telescope } from 'lucide-react'
import { useMemo } from 'react'
import { formatNightLabel } from '../services/format'
import { formatLocalTime } from '../services/time'
import { nightRange } from '../services/visibility'
import { useActiveLocation, useActiveProfile, usePlannerStore } from '../state/plannerStore'

const MINUTE_MS = 60_000

export function TopBar() {
  const locations = usePlannerStore((state) => state.locations)
  const location = useActiveLocation()
  const profile = useActiveProfile()
  const profiles = usePlannerStore((state) => state.profiles)
  const nightDate = usePlannerStore((state) => state.nightDate)
  const cursorMs = usePlannerStore((state) => state.cursorMs)
  const followNow = usePlannerStore((state) => state.followNow)
  const redMode = usePlannerStore((state) => state.redMode)
  const selectLocation = usePlannerStore((state) => state.selectLocation)
  const selectProfile = usePlannerStore((state) => state.selectProfile)
  const setNightDate = usePlannerStore((state) => state.setNightDate)
  const setCursor = usePlannerStore((state) => state.setCursor)
  const goNow = usePlannerStore((state) => state.goNow)
  const toggleRedMode = usePlannerStore((state) => state.toggleRedMode)

  // Suwak obejmuje całą noc D (od południa do południa), więc w trybie „Teraz” zegar zawsze mieści się w zakresie.
  const night = useMemo(() => nightRange(nightDate, location.timezone), [nightDate, location.timezone])
  const cursorText = formatLocalTime(cursorMs, location.timezone)
  const options = locations.length > 0 ? locations : [location]

  return (
    <header className="z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm md:sticky md:top-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <label className="flex min-w-44 flex-[2_1_11rem] flex-col gap-1 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <MapPin aria-hidden size={14} /> Lokalizacja
            </span>
            <select className="control text-sm" value={location.id} onChange={(event) => selectLocation(event.target.value)}>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-40 flex-[1_1_10rem] flex-col gap-1 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <MoonStar aria-hidden size={14} /> Noc {formatNightLabel(nightDate)}
            </span>
            <input
              type="date"
              className="control text-sm"
              value={nightDate}
              onChange={(event) => setNightDate(event.target.value)}
            />
          </label>
          <label className="flex min-w-44 flex-[2_1_11rem] flex-col gap-1 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Telescope aria-hidden size={14} /> Zestaw
            </span>
            <select className="control text-sm" value={profile.id} onChange={(event) => selectProfile(event.target.value)}>
              {profiles.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="button" aria-pressed={redMode} onClick={toggleRedMode}>
            <Eye aria-hidden size={18} /> Red Mode
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <input
            type="range"
            aria-label="Kursor czasu"
            aria-valuetext={cursorText}
            min={night.startMs}
            max={night.endMs}
            step={MINUTE_MS}
            value={Math.min(night.endMs, Math.max(night.startMs, cursorMs))}
            onChange={(event) => setCursor(Number(event.target.value))}
            className="h-11 min-w-0 basis-full sm:basis-0 sm:flex-1"
          />
          <output className="ml-auto w-24 shrink-0 text-right text-sm sm:ml-0">{cursorText}</output>
          <button type="button" className="button shrink-0" aria-pressed={followNow} onClick={() => goNow(Date.now())}>
            <LocateFixed aria-hidden size={18} /> Teraz
          </button>
        </div>
      </div>
    </header>
  )
}
