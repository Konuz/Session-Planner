// Zakładka Noc (sekcja 9): wykres nocy (7C) dla obiektu z katalogu i podsumowanie nocy. Kursorem czasu jest tu sam
// wykres (górny pasek nie ma w tej zakładce wiersza kursora), a „Teraz” stoi w nagłówku obok czasu efektywnego.
import { LocateFixed, RotateCcw, TriangleAlert } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { nightObjectOptions, selectFeatured } from '../../data/featuredObjects'
import { formatDesignation } from '../../services/catalog/records'
import { formatDeg, formatPercent } from '../../services/format'
import {
  buildNightFrame,
  buildObjectTrack,
  cursorReadout,
  darknessNote,
  type CursorReadout,
  type NightFrame,
  type ObjectTrack,
  type TwilightBand,
} from '../../services/nightChart'
import { formatDuration, formatLocalTime } from '../../services/time'
import { useActiveLocation, useActiveProfile, usePlannerStore } from '../../state/plannerStore'
import { tokenVariable } from '../../theme/tokens'
import type { DsoObject, Mount } from '../../types'
import { useSvgId } from '../../ui/useSvgId'
import { DSO_TYPES } from '../catalog/objectCardModel'
import { ObjectThumbnail } from '../catalog/ObjectThumbnail'
import { TYPE_ICONS } from '../catalog/typeIcons'
import { BAND_FILL } from './chartGeometry'
import { MoonPhaseIcon } from './MoonPhaseIcon'
import { NightChart } from './NightChart'
import { objectName } from './objectName'
import { useFeaturedObjects } from './useFeaturedObjects'

const BAND_LABELS: Record<TwilightBand, string> = {
  day: 'dzień',
  civil: 'zmierzch cywilny',
  nautical: 'zmierzch żeglarski',
  astronomical: 'zmierzch astronomiczny',
  night: 'noc astronomiczna',
}

const STATE_LABELS: Record<NonNullable<CursorReadout['object']>['state'], string> = {
  visible: 'widoczny',
  obstructed: 'za przeszkodą',
  low: 'za nisko',
}

export function NightTab() {
  const location = useActiveLocation()
  const profile = useActiveProfile()
  const nightDate = usePlannerStore((state) => state.nightDate)
  const cursorMs = usePlannerStore((state) => state.cursorMs)
  const objectUid = usePlannerStore((state) => state.objectUid)
  const settings = usePlannerStore((state) => state.planningSettings)
  const setCursor = usePlannerStore((state) => state.setCursor)
  const selectObject = usePlannerStore((state) => state.selectObject)
  const followNow = usePlannerStore((state) => state.followNow)
  const goNow = usePlannerStore((state) => state.goNow)
  const { featured, retry } = useFeaturedObjects()
  const patternPrefix = useSvgId('night-pattern')
  const patternIds = { hatch: `${patternPrefix}-hatch`, dots: `${patternPrefix}-dots` }

  const object = selectFeatured(featured.status === 'ready' ? featured.catalog : [], objectUid)
  const { minAltitudeDeg } = settings
  const frame = useMemo(
    () => buildNightFrame(location, location.timezone, nightDate, settings),
    [location, nightDate, settings],
  )
  const track = useMemo(
    () => (object ? buildObjectTrack(frame, object, { horizon: location.horizon, minAltitudeDeg, mount: profile.mount }) : null),
    [frame, object, location.horizon, minAltitudeDeg, profile.mount],
  )
  const readout = cursorReadout(frame, object, location.horizon, minAltitudeDeg, cursorMs)
  const label = object ? objectName(object) : null

  return (
    <div className="flex flex-col gap-4">
      <ChartPatterns ids={patternIds} />
      <section className="card p-4 md:p-6" aria-labelledby="night-chart-title">
        <div className="mb-5 flex flex-wrap items-start gap-5">
          {featured.status === 'ready' && object && <ObjectThumbnail key={object.uid} object={object} sizePx={136} />}
          <div className="flex min-w-60 flex-1 flex-col gap-1">
            <h2 id="night-chart-title" className="text-xs text-muted">
              Obiekt
            </h2>
            {featured.status === 'ready' && object ? (
              <select
                aria-labelledby="night-chart-title"
                className="control control-quiet title-select -ml-1 max-w-full self-start font-serif text-3xl font-medium max-sm:text-xl"
                value={object.uid}
                onChange={(event) => selectObject(event.target.value)}
              >
                {nightObjectOptions(featured.objects, object).map((option) => (
                  <option key={option.uid} value={option.uid}>
                    {objectName(option)}
                  </option>
                ))}
              </select>
            ) : featured.status === 'error' ? (
              <p role="alert" className="flex flex-wrap items-center gap-2 text-sm">
                Nie udało się wczytać katalogu: {featured.message}
                <button type="button" className="button" onClick={retry}>
                  <RotateCcw aria-hidden size={16} /> Spróbuj ponownie
                </button>
              </p>
            ) : (
              <p className="flex min-h-11 items-center text-sm text-muted">Wczytywanie katalogu…</p>
            )}
            {featured.status === 'ready' && object && <ObjectFacts object={object} />}
          </div>
          <div className="flex flex-col items-end gap-3">
            <EffectiveTime frame={frame} track={track} minAltitudeDeg={minAltitudeDeg} />
            <button type="button" className="button" aria-pressed={followNow} onClick={() => goNow(Date.now())}>
              <LocateFixed aria-hidden size={18} /> Teraz
            </button>
          </div>
        </div>

        <NightChart
          frame={frame}
          track={track}
          objectLabel={label}
          minAltitudeDeg={minAltitudeDeg}
          cursorMs={cursorMs}
          onCursorChange={setCursor}
          patternIds={patternIds}
        />
        <Legend
          objectLabel={object ? formatDesignation(object.primary) : null}
          patternIds={patternIds}
          thresholdDeg={frame.darkness.thresholdDeg}
        />
        {featured.status === 'ready' && object && (
          <p className="mt-3 text-xs text-muted">Zdjęcie: DSS2 kolor przez CDS hips2fits (Strasbourg), DSS © STScI/AURA.</p>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <NightSummary frame={frame} track={track} mount={profile.mount} />
        <CursorPanel frame={frame} readout={readout} objectLabel={object ? formatDesignation(object.primary) : null} cursorMs={cursorMs} />
      </div>
    </div>
  )
}

/** Wzory kreskowania wspólne dla wykresu i legendy („za przeszkodą” i „za nisko” różnią się nie tylko kolorem). */
function ChartPatterns({ ids }: { ids: { hatch: string; dots: string } }) {
  return (
    <svg width={0} height={0} aria-hidden className="absolute">
      <defs>
        <pattern id={ids.hatch} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={6} className="stroke-muted" strokeWidth={1.5} />
        </pattern>
        <pattern id={ids.dots} width={5} height={5} patternUnits="userSpaceOnUse">
          <circle cx={1.5} cy={1.5} r={0.9} className="fill-muted" />
        </pattern>
      </defs>
    </svg>
  )
}

const SIZE_FORMAT = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 })

/** Typ (ikona i etykieta w kolorze typu), pozostałe oznaczenia, gwiazdozbiór, rozmiar i jasność obiektu. */
function ObjectFacts({ object }: { object: DsoObject }) {
  const type = DSO_TYPES[object.type]
  const TypeIcon = TYPE_ICONS[object.type]
  const primary = formatDesignation(object.primary)
  const others = object.designations.map(formatDesignation).filter((text) => text !== primary)
  const size =
    object.sizeMajorArcmin === null
      ? null
      : `${SIZE_FORMAT.format(object.sizeMajorArcmin)}′${object.sizeMinorArcmin === null ? '' : ` × ${SIZE_FORMAT.format(object.sizeMinorArcmin)}′`}`
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span className="flex items-center gap-1.5 font-semibold" style={{ color: `var(${tokenVariable(type.color)})` }}>
        <TypeIcon aria-hidden size={16} />
        {type.label}
      </span>
      {others.length > 0 && <span className="text-muted">{others.slice(0, 4).join(', ')}</span>}
      <span className="text-muted">gwiazdozbiór {object.constellation}</span>
      {size && <span className="text-muted">rozmiar {size}</span>}
      {object.magV !== null && <span className="text-muted">jasność {SIZE_FORMAT.format(object.magV)} mag</span>}
    </p>
  )
}

function EffectiveTime({ frame, track, minAltitudeDeg }: { frame: NightFrame; track: ObjectTrack | null; minAltitudeDeg: number }) {
  const minutes = track?.effectiveMinutes ?? null
  return (
    <div className="text-right">
      <p className="text-xs text-muted">Czas efektywny</p>
      <p className="figures text-5xl text-accent">{minutes === null ? '—' : formatDuration(minutes)}</p>
      <p className="text-xs text-muted">
        próg {formatDeg(frame.darkness.thresholdDeg, 0)}, h_min {formatDeg(minAltitudeDeg, 0)}
      </p>
    </div>
  )
}

function Swatch({ children }: { children: ReactNode }) {
  return (
    <svg width={22} height={12} aria-hidden className="shrink-0">
      {children}
    </svg>
  )
}

function Legend({
  objectLabel,
  patternIds,
  thresholdDeg,
}: {
  objectLabel: string | null
  patternIds: { hatch: string; dots: string }
  thresholdDeg: number
}) {
  return (
    <div className="mt-3 flex flex-col gap-2 text-xs text-muted">
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        <li className="flex items-center gap-1.5">
          <Swatch>
            <line x1={2} x2={20} y1={6} y2={6} className="stroke-accent" strokeWidth={3} strokeLinecap="round" />
          </Swatch>
          okno ciemności (próg {formatDeg(thresholdDeg, 0)}, nad wykresem)
        </li>
        {objectLabel && (
          <>
            <li className="flex items-center gap-1.5">
              <Swatch>
                <line x1={2} x2={20} y1={6} y2={6} className="stroke-accent" strokeWidth={3} strokeLinecap="round" />
              </Swatch>
              {objectLabel} widoczny
            </li>
            <li className="flex items-center gap-1.5">
              <Swatch>
                <line x1={2} x2={20} y1={6} y2={6} className="stroke-accent" strokeWidth={1.5} strokeOpacity={0.45} />
              </Swatch>
              poza widocznością
            </li>
          </>
        )}
        <li className="flex items-center gap-1.5">
          <Swatch>
            <rect x={0.5} y={0.5} width={21} height={11} fill={`url(#${patternIds.hatch})`} className="stroke-muted" />
          </Swatch>
          za przeszkodą (poniżej horyzontu)
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch>
            <rect x={0.5} y={0.5} width={21} height={11} fill={`url(#${patternIds.dots})`} className="stroke-muted" />
          </Swatch>
          za nisko (poniżej h_min)
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch>
            <line x1={0} x2={22} y1={6} y2={6} className="stroke-foreground" strokeWidth={1.5} strokeDasharray="7 5" />
          </Swatch>
          Księżyc
        </li>
      </ul>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {(Object.keys(BAND_LABELS) as TwilightBand[]).map((band) => (
          <li key={band} className="flex items-center gap-1.5">
            <Swatch>
              <rect x={0.5} y={0.5} width={21} height={11} rx={2} className={`${BAND_FILL[band]} stroke-border`} />
            </Swatch>
            {BAND_LABELS[band]}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-2">
      <dt className="text-muted">{term}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function moonEvents(frame: NightFrame): string {
  const { riseMs, setMs, reference } = frame.moon
  const events = [
    ...(riseMs === null ? [] : [{ timeMs: riseMs, text: `wschód ${formatLocalTime(riseMs, frame.timeZone)}` }]),
    ...(setMs === null ? [] : [{ timeMs: setMs, text: `zachód ${formatLocalTime(setMs, frame.timeZone)}` }]),
  ].sort((a, b) => a.timeMs - b.timeMs)
  if (events.length > 0) return events.map((event) => event.text).join(', ')
  return reference.altDeg > 0 ? 'nad horyzontem przez cały wykres' : 'pod horyzontem przez cały wykres'
}

function NightSummary({ frame, track, mount }: { frame: NightFrame; track: ObjectTrack | null; mount: Mount }) {
  const { timeZone, darkness, moon } = frame
  const time = (timeMs: number) => formatLocalTime(timeMs, timeZone)
  const note = darknessNote(frame)
  return (
    <section className="card p-4" aria-labelledby="night-summary-title">
      <h2 id="night-summary-title" className="font-serif text-xl font-medium text-parchment">
        Podsumowanie nocy
      </h2>
      {note && (
        <p role="status" className="mt-3 flex items-start gap-2 text-sm text-alert">
          <TriangleAlert aria-hidden size={18} className="mt-0.5 shrink-0" />
          {note}
        </p>
      )}
      <dl className="mt-2 divide-y divide-border text-sm">
        <Row term="Okno ciemności">
          {darkness.kind === 'window'
            ? `${time(darkness.window.startMs)} – ${time(darkness.window.endMs)}, próg ${formatDeg(darkness.thresholdDeg, 0)}`
            : `brak przy progu ${formatDeg(darkness.thresholdDeg, 0)}`}
        </Row>
        <Row term="Słońce">
          {[
            frame.sunsetMs === null ? null : `zachód ${time(frame.sunsetMs)}`,
            frame.sunriseMs === null ? null : `wschód ${time(frame.sunriseMs)}`,
            `najniżej ${formatDeg(frame.sunLowest.altDeg)} o ${time(frame.sunLowest.timeMs)}`,
          ]
            .filter((part) => part !== null)
            .join(', ')}
        </Row>
        {track && (
          <Row term="Górowanie">
            {track.transit
              ? `${time(track.transit.timeMs)}, wysokość ${formatDeg(track.transit.altDeg)}`
              : 'w dzień, poza osią wykresu'}
          </Row>
        )}
        {track && mount.type === 'gem' && (
          <Row term="Przerzut (GEM)">
            {track.flipMs === null
              ? 'poza osią wykresu'
              : `${time(track.flipMs)}, ${mount.flipMinutesAfterMeridian} min po górowaniu`}
          </Row>
        )}
        <Row term="Księżyc">
          <span className="flex items-center gap-2">
            <MoonPhaseIcon
              size={18}
              illuminatedFraction={moon.reference.illuminatedFraction}
              waxing={moon.reference.waxing}
              label={moon.reference.waxing ? 'Księżyc przybywa' : 'Księżyc ubywa'}
            />
            {formatPercent(moon.reference.illuminatedFraction)} oświetlenia, {moonEvents(frame)}
          </span>
        </Row>
      </dl>
    </section>
  )
}

function CursorPanel({
  frame,
  readout,
  objectLabel,
  cursorMs,
}: {
  frame: NightFrame
  readout: CursorReadout
  objectLabel: string | null
  cursorMs: number
}) {
  const inAxis = cursorMs >= frame.axis.startMs && cursorMs <= frame.axis.endMs
  const { object, moon } = readout
  return (
    <section className="card p-4" aria-labelledby="night-cursor-title">
      <h2 id="night-cursor-title" className="font-serif text-xl font-medium text-parchment">
        Kursor {formatLocalTime(cursorMs, frame.timeZone)}
      </h2>
      {!inAxis && <p className="mt-1 text-sm text-muted">Kursor jest poza osią wykresu (dzień).</p>}
      <dl className="mt-2 divide-y divide-border text-sm">
        {object && objectLabel && (
          <Row term={objectLabel}>
            wysokość {formatDeg(object.altDeg)}, azymut {formatDeg(object.azDeg)}; {STATE_LABELS[object.state]}
          </Row>
        )}
        {object && <Row term="Horyzont">{formatDeg(object.horizonDeg)} w kierunku obiektu</Row>}
        <Row term="Księżyc">
          wysokość {formatDeg(moon.altDeg)}, {formatPercent(moon.illuminatedFraction)} oświetlenia
        </Row>
      </dl>
    </section>
  )
}
