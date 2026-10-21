// Górny pasek (7.0): lokalizacja, noc D, aktywny zestaw, kursor czasu z trybem „Teraz” i przełącznik Red Mode.
// Kursor czasu to „pas nocy”: suwak leży na rysunku pasów zmierzchu nocy D, okna ciemności i obecności Księżyca.
import { Eye, LocateFixed, MapPin, MoonStar, Telescope } from 'lucide-react'
import { useMemo } from 'react'
import { BAND_FILL } from '../features/night/chartGeometry'
import { MoonPhaseIcon } from '../features/night/MoonPhaseIcon'
import { formatNightLabel } from '../services/format'
import { buildNightFrame, type NightFrame } from '../services/nightChart'
import { formatLocalTime, localTimeParts } from '../services/time'
import { nightRange, type TimeRange } from '../services/visibility'
import { useActiveLocation, useActiveProfile, usePlannerStore } from '../state/plannerStore'

const MINUTE_MS = 60_000
/** Szerokość rysunku w jednostkach viewBox; rysunek rozciąga się na całą szerokość suwaka. */
const RIBBON_UNITS = 1000

export function TopBar() {
  const locations = usePlannerStore((state) => state.locations)
  const location = useActiveLocation()
  const profile = useActiveProfile()
  const profiles = usePlannerStore((state) => state.profiles)
  const nightDate = usePlannerStore((state) => state.nightDate)
  const redMode = usePlannerStore((state) => state.redMode)
  const tab = usePlannerStore((state) => state.tab)
  const selectLocation = usePlannerStore((state) => state.selectLocation)
  const selectProfile = usePlannerStore((state) => state.selectProfile)
  const setNightDate = usePlannerStore((state) => state.setNightDate)
  const toggleRedMode = usePlannerStore((state) => state.toggleRedMode)

  const options = locations.length > 0 ? locations : [location]

  return (
    <header className="z-10 border-b border-border bg-background px-4 pt-2 pb-3 md:sticky md:top-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-2">
        {/* Telefon: siatka (lokalizacja i Red Mode w pierwszym wierszu, noc i zestaw w drugim); od 640 px jeden wiersz. */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-x-4 gap-y-1 sm:flex sm:flex-wrap sm:gap-x-6">
          <label className="col-span-2 flex min-w-0 flex-col text-xs text-muted">
            <span className="flex items-center gap-1.5 px-1">
              <MapPin aria-hidden size={13} /> Lokalizacja
            </span>
            <select className="control control-quiet text-base" value={location.id} onChange={(event) => selectLocation(event.target.value)}>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <label className="row-start-2 flex min-w-0 flex-col text-xs text-muted">
            <span className="flex items-center gap-1.5 px-1">
              <MoonStar aria-hidden size={13} /> Noc {formatNightLabel(nightDate)}
            </span>
            <input
              type="date"
              className="control control-quiet text-base"
              value={nightDate}
              onChange={(event) => setNightDate(event.target.value)}
            />
          </label>
          <label className="col-span-2 row-start-2 flex min-w-0 flex-col text-xs text-muted">
            <span className="flex items-center gap-1.5 px-1">
              <Telescope aria-hidden size={13} /> Zestaw
            </span>
            <select className="control control-quiet text-base" value={profile.id} onChange={(event) => selectProfile(event.target.value)}>
              {profiles.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="button col-start-3 row-start-1 ml-auto" aria-pressed={redMode} onClick={toggleRedMode}>
            <Eye aria-hidden size={18} /> <span className="max-sm:sr-only">Red Mode</span>
          </button>
        </div>
        {/* Kadr nie zależy od czasu, więc w zakładce Kadr nie ma wiersza kursora; tryb „Teraz” działa dalej w tle. */}
        {tab !== 'framing' && <CursorRow />}
      </div>
    </header>
  )
}

/** Wiersz kursora: zegar kursora, pas nocy z suwakiem i przycisk „Teraz”. */
function CursorRow() {
  const location = useActiveLocation()
  const nightDate = usePlannerStore((state) => state.nightDate)
  const settings = usePlannerStore((state) => state.planningSettings)
  const cursorMs = usePlannerStore((state) => state.cursorMs)
  const followNow = usePlannerStore((state) => state.followNow)
  const setCursor = usePlannerStore((state) => state.setCursor)
  const goNow = usePlannerStore((state) => state.goNow)

  // Suwak obejmuje całą noc D (od południa do południa), więc w trybie „Teraz” zegar zawsze mieści się w zakresie.
  const night = useMemo(() => nightRange(nightDate, location.timezone), [nightDate, location.timezone])
  const frame = useMemo(() => buildNightFrame(location, location.timezone, nightDate, settings), [location, nightDate, settings])
  const cursorText = formatLocalTime(cursorMs, location.timezone)
  const clock = localTimeParts(cursorMs, location.timezone)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <output className="flex items-baseline gap-1.5 sm:w-32">
        <span className="text-3xl font-light tracking-tight text-accent">{clock.time}</span>
        <span className="text-xs text-muted">{clock.zone}</span>
      </output>
      <div className="order-last min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-0">
        <div className="relative h-11">
          <NightRibbon frame={frame} night={night} />
          <input
            type="range"
            aria-label="Kursor czasu"
            aria-valuetext={cursorText}
            min={night.startMs}
            max={night.endMs}
            step={MINUTE_MS}
            value={Math.min(night.endMs, Math.max(night.startMs, cursorMs))}
            onChange={(event) => setCursor(Number(event.target.value))}
            className="ribbon-range absolute inset-0 m-0 h-11 w-full"
          />
        </div>
        <RibbonHours frame={frame} night={night} />
      </div>
      <button type="button" className="button ml-auto shrink-0 sm:ml-0" aria-pressed={followNow} onClick={() => goNow(Date.now())}>
        <LocateFixed aria-hidden size={18} /> Teraz
      </button>
    </div>
  )
}

/** Położenie chwili na pasie [0–1] względem całej nocy D, jak wartość suwaka. */
function fraction(timeMs: number, night: TimeRange): number {
  return Math.min(1, Math.max(0, (timeMs - night.startMs) / (night.endMs - night.startMs)))
}

/** Odcinki, w których Księżyc jest nad horyzontem: kolejne próbki nocy z wysokością powyżej 0°. */
function moonUpRuns(frame: NightFrame): TimeRange[] {
  const runs: TimeRange[] = []
  let previousUp = false
  for (const sample of frame.moon.samples) {
    const up = sample.altDeg > 0
    if (up && previousUp) runs[runs.length - 1].endMs = sample.timeMs
    else if (up) runs.push({ startMs: sample.timeMs, endMs: sample.timeMs })
    previousUp = up
  }
  return runs
}

/**
 * Rysunek pod suwakiem: pasy zmierzchów (poza osią wykresu jest dzień), okno ciemności jako jasna kreska u góry
 * i obecność Księżyca jako kreska u dołu. Igła suwaka ma 6 px, więc rysunek jest wcięty o 3 px z obu stron.
 */
function NightRibbon({ frame, night }: { frame: NightFrame; night: TimeRange }) {
  const x = (timeMs: number) => fraction(timeMs, night) * RIBBON_UNITS
  const span = (range: TimeRange) => ({ x: x(range.startMs), width: Math.max(0, x(range.endMs) - x(range.startMs)) })
  const dark = frame.darkness.kind === 'window' ? frame.darkness.window : null
  const moonRuns = moonUpRuns(frame)
  const time = (timeMs: number) => localTimeParts(timeMs, frame.timeZone).time
  const label = dark ? `ciemność ${time(dark.startMs)}–${time(dark.endMs)}` : 'brak okna ciemności'
  const labelAt = dark ? fraction((dark.startMs + dark.endMs) / 2, night) : 0.5
  const moon = frame.moon.reference

  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 inset-x-[3px] overflow-hidden rounded-[3px]">
      <svg viewBox={`0 0 ${RIBBON_UNITS} 44`} preserveAspectRatio="none" className="absolute inset-0 size-full">
        <rect x={0} y={0} width={RIBBON_UNITS} height={44} className={BAND_FILL.day} />
        {frame.bands.map((band) => (
          <rect key={band.band} {...span(band)} y={0} height={44} className={BAND_FILL[band.band]} />
        ))}
        {dark && <rect {...span(dark)} y={0} height={2} className="fill-accent" />}
        {moonRuns.map((run) => (
          <rect key={run.startMs} {...span(run)} y={40} height={4} className="fill-foreground" fillOpacity={0.55} />
        ))}
      </svg>
      <span
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs whitespace-nowrap text-muted max-sm:hidden"
        style={{ left: `${labelAt * 100}%` }}
      >
        {label}
      </span>
      {moonRuns.length > 0 && (
        <span className="absolute bottom-1.5 flex items-center" style={{ left: `calc(${fraction(moonRuns[0].startMs, night) * 100}% + 4px)` }}>
          <MoonPhaseIcon size={12} illuminatedFraction={moon.illuminatedFraction} waxing={moon.waxing} label="Księżyc nad horyzontem" />
        </span>
      )}
    </div>
  )
}

/** Godziny pod pasem co 3 h (na telefonie co 6 h), z siatki pełnych godzin lokalnych osi nocy. */
function RibbonHours({ frame, night }: { frame: NightFrame; night: TimeRange }) {
  const hours = frame.hourTicksMs
    .map((timeMs) => ({ timeMs, hour: localTimeParts(timeMs, frame.timeZone).time.slice(0, 2) }))
    .filter(({ hour }) => Number(hour) % 3 === 0)
  return (
    <div aria-hidden className="relative mx-[3px] mt-1 h-4 text-xs text-muted">
      {hours.map(({ timeMs, hour }) => (
        <span
          key={timeMs}
          className={`absolute -translate-x-1/2 ${Number(hour) % 6 === 0 ? '' : 'max-sm:hidden'}`}
          style={{ left: `${fraction(timeMs, night) * 100}%` }}
        >
          {hour}
        </span>
      ))}
    </div>
  )
}
