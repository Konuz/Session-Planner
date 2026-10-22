// Widok sfery (7D): tarcza nieba w rzucie azymutalnym równoodległościowym, trajektoria obiektu w oknie ciemności i Księżyc
// z fazą w chwili globalnego kursora czasu (suwak w górnym pasku, wykres nocy). Kolory wyłącznie z tokenów, więc Red Mode
// działa bez osobnej palety.
import type { LucideIcon } from 'lucide-react'
import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { formatDesignation } from '../../services/catalog/records'
import { formatDeg, formatPercent } from '../../services/format'
import type { CursorReadout, NightFrame } from '../../services/nightChart'
import { formatLocalTime } from '../../services/time'
import { tokenVariable } from '../../theme/tokens'
import type { DsoObject, HorizonPoint } from '../../types'
import { useSvgId } from '../../ui/useSvgId'
import { DSO_TYPES } from '../catalog/objectCardModel'
import { TYPE_ICONS } from '../catalog/typeIcons'
import { BAND_FILL } from './chartGeometry'
import { MoonPhaseGlyph } from './MoonPhaseIcon'
import { DOME, DOME_VIEW_SIZE, domeCursor, domeLayers, domeTrack, markerLabel } from './skyDomeModel'

/** Opis pełnej godziny bliżej środka znacznika obiektu niż tyle jednostek widoku jest pomijany. */
const HOUR_LABEL_CLEARANCE = 18

export interface SkyDomeProps {
  frame: NightFrame
  object: DsoObject | null
  horizon: readonly HorizonPoint[]
  minAltitudeDeg: number
  cursorMs: number
  /** Odczyt kursora z zakładki (ten sam co w panelu „Kursor”). */
  readout: CursorReadout
  /** Wspólne id wzorów kreskowania wykresu nocy. */
  patternIds: { hatch: string; dots: string }
}

const round = (value: number) => Math.round(value * 10) / 10

/** Obwódka pod tekstem na tarczy (z klasą `stroke-background`), żeby opis był czytelny na liniach. */
const HALO = { strokeWidth: 3, paintOrder: 'stroke' } as const

export function SkyDome({ frame, object, horizon, minAltitudeDeg, cursorMs, readout, patternIds }: SkyDomeProps) {
  const clipId = useSvgId('sky-dome-clip')
  const glowId = useSvgId('sky-dome-glow')
  const layers = useMemo(() => domeLayers(horizon, minAltitudeDeg, DOME), [horizon, minAltitudeDeg])
  const track = useMemo(
    () => (object ? domeTrack(frame, object, horizon, minAltitudeDeg, DOME) : null),
    [frame, object, horizon, minAltitudeDeg],
  )
  const cursor = domeCursor(frame, readout.object, cursorMs, DOME)

  const time = (timeMs: number) => formatLocalTime(timeMs, frame.timeZone)

  const designation = object ? formatDesignation(object.primary) : null
  const type = object ? { ...DSO_TYPES[object.type], Icon: TYPE_ICONS[object.type] } : null
  const typeStyle: CSSProperties | undefined = type ? { color: `var(${tokenVariable(type.color)})` } : undefined
  const { moon } = cursor
  const marker =
    cursor.object && cursor.object.altDeg > 0 ? { ...cursor.object, label: markerLabel(cursor.object.point, track, DOME) } : null
  const { cx, cy, radius } = DOME

  const description = [
    `Widok sfery o ${time(cursorMs)}`,
    cursor.object && designation
      ? `${designation}: wysokość ${formatDeg(cursor.object.altDeg)}, azymut ${formatDeg(cursor.object.azDeg)}`
      : null,
    moon.aboveHorizon
      ? `Księżyc: wysokość ${formatDeg(moon.altDeg)}, azymut ${formatDeg(moon.azDeg)}`
      : 'Księżyc pod horyzontem',
  ]
    .filter((part) => part !== null)
    .join('. ')

  return (
    <section className="card @container p-4 md:p-6" aria-labelledby="sky-dome-title">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="sky-dome-title" className="font-serif text-xl font-medium text-parchment">
            Widok sfery
          </h2>
          <p className="text-xs text-muted">Zenit w środku, N u góry, E po lewej</p>
        </div>
        {type && (
          <p data-role="object-type" className="flex items-center gap-1.5 text-sm">
            <type.Icon aria-hidden size={16} style={typeStyle} />
            <span className="font-serif text-base text-parchment">{designation}</span>
            <span className="text-xs" style={typeStyle}>
              {type.label}
            </span>
          </p>
        )}
      </header>

      <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:gap-6">
        <div className="mx-auto w-full max-w-[26rem] @2xl:mx-0 @2xl:shrink-0">
          <svg
            viewBox={`0 0 ${DOME_VIEW_SIZE} ${DOME_VIEW_SIZE}`}
            role="img"
            aria-label={description}
            data-role="sky-dome"
            className="block h-auto w-full select-none"
          >
            <defs>
              <clipPath id={clipId}>
                <circle cx={cx} cy={cy} r={radius} />
              </clipPath>
              {/* Poświata ku horyzontowi: niebo jaśnieje przy brzegu tarczy (kolor dziennego pasa rampy zmierzchu). */}
              <radialGradient id={glowId}>
                <stop offset="0.55" style={{ stopColor: `var(${tokenVariable('skyDay')})`, stopOpacity: 0 }} />
                <stop offset="1" style={{ stopColor: `var(${tokenVariable('skyDay')})`, stopOpacity: 0.35 }} />
              </radialGradient>
            </defs>

            {/* Niebo w chwili kursora: pas zmierzchu z tej samej rampy co wykres nocy. */}
            <circle cx={cx} cy={cy} r={radius} className={BAND_FILL[cursor.band]} />
            <circle cx={cx} cy={cy} r={radius} fill={`url(#${glowId})`} />

            {/* Pas „za nisko” zajmuje dużą część tarczy, więc kropki są przygaszone. */}
            {layers.lowZonePath && (
              <path d={layers.lowZonePath} fillRule="evenodd" fill={`url(#${patternIds.dots})`} opacity={0.45} />
            )}
            {layers.horizonPath && (
              <g data-role="horizon">
                <path d={layers.horizonPath} fillRule="evenodd" className="fill-background" />
                <path d={layers.horizonPath} fillRule="evenodd" className="fill-muted" fillOpacity={0.18} />
                <path
                  d={layers.horizonPath}
                  fillRule="evenodd"
                  fill={`url(#${patternIds.hatch})`}
                  className="stroke-muted"
                  strokeWidth={1.25}
                  strokeLinejoin="round"
                />
              </g>
            )}

            {layers.rings.map((ring) => (
              <circle
                key={ring.altDeg}
                cx={cx}
                cy={cy}
                r={ring.r}
                fill="none"
                className={ring.altDeg === 0 ? 'stroke-muted' : 'stroke-border'}
                strokeWidth={ring.altDeg === 0 ? 1.5 : 1}
              />
            ))}
            <line
              x1={layers.meridian.from.x}
              y1={layers.meridian.from.y}
              x2={layers.meridian.to.x}
              y2={layers.meridian.to.y}
              className="stroke-border"
            />
            <path d={`M${cx - 4},${cy}h8M${cx},${cy - 4}v8`} className="stroke-muted" />
            <circle
              data-role="min-altitude"
              cx={cx}
              cy={cy}
              r={round(layers.minAltitude.r)}
              fill="none"
              className="stroke-muted"
              strokeWidth={1.25}
              strokeDasharray="3 3"
            />

            {/* Opisy na północnym odcinku południka: wysokości po prawej, h_min po lewej stronie. */}
            {layers.rings
              .filter((ring) => ring.altDeg > 0)
              .map((ring) => (
                <text key={ring.altDeg} x={cx + 4} y={cy - ring.r + 12} className="fill-muted text-[10px]">
                  {ring.altDeg}°
                </text>
              ))}
            <text
              x={cx - 4}
              y={cy - layers.minAltitude.r + 12}
              textAnchor="end"
              className="fill-muted text-[10px]"
            >
              {`h_min ${formatDeg(minAltitudeDeg, 0)}`}
            </text>

            {track && (
              <g data-role="track" clipPath={`url(#${clipId})`}>
                {track.runs.map((run, i) => (
                  <path
                    key={i}
                    d={run.path}
                    fill="none"
                    className="stroke-accent"
                    strokeWidth={run.visible ? 3 : 1.5}
                    strokeOpacity={run.visible ? 1 : 0.45}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
              </g>
            )}
            {track?.hours.map((hour) => (
              <g key={hour.timeMs} data-role="hour">
                <circle cx={hour.point.x} cy={hour.point.y} r={2.75} className="fill-background stroke-accent" strokeWidth={1.5} />
                {/* Opis godziny pod znacznikiem obiektu byłby nieczytelny; godzinę kursora pokazuje suwak. */}
                {!(marker && Math.hypot(hour.labelPoint.x - marker.point.x, hour.labelPoint.y - marker.point.y) < HOUR_LABEL_CLEARANCE) && (
                  <text
                    x={hour.labelPoint.x}
                    y={hour.labelPoint.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    {...HALO}
                    className="stroke-background fill-foreground text-[10px]"
                  >
                    {hour.label}
                  </text>
                )}
              </g>
            ))}

            {moon.aboveHorizon && (
              <g data-role="moon" aria-hidden>
                <MoonPhaseGlyph
                  cx={moon.point.x}
                  cy={moon.point.y}
                  r={9}
                  illuminatedFraction={moon.illuminatedFraction}
                  waxing={moon.waxing}
                />
                <text
                  x={moon.point.x + 13}
                  y={moon.point.y}
                  dominantBaseline="central"
                  {...HALO}
                  className="stroke-background fill-foreground text-[10px]"
                >
                  {formatPercent(moon.illuminatedFraction)}
                </text>
              </g>
            )}

            {marker && type && (
              <g data-role="object-marker" style={typeStyle}>
                <circle cx={marker.point.x} cy={marker.point.y} r={12} className="fill-background" stroke="currentColor" strokeWidth={2} />
                <type.Icon x={marker.point.x - 7} y={marker.point.y - 7} size={14} aria-hidden />
                <text
                  x={marker.label.x}
                  y={marker.label.y}
                  textAnchor={marker.label.anchor}
                  dominantBaseline="central"
                  {...HALO}
                  className="stroke-background fill-parchment text-[12px] font-semibold"
                >
                  {designation}
                </text>
              </g>
            )}

            {layers.cardinals.map((cardinal) => (
              <text
                key={cardinal.label}
                x={cardinal.x}
                y={cardinal.y}
                textAnchor="middle"
                dominantBaseline="central"
                className={`text-[13px] font-semibold ${cardinal.label === 'N' ? 'fill-accent' : 'fill-foreground'}`}
              >
                {cardinal.label}
              </text>
            ))}
          </svg>
        </div>

        <DomeLegend
          designation={designation}
          type={type ? { label: type.label, Icon: type.Icon, style: typeStyle } : null}
          objectAbove={cursor.object ? cursor.object.altDeg > 0 : null}
          minAltitudeDeg={minAltitudeDeg}
          moon={moon}
          trackNote={
            !track
              ? null
              : track.inDarkness
                ? `Trajektoria w oknie ciemności ${time(track.range.startMs)} – ${time(track.range.endMs)}.`
                : `Brak okna ciemności: trajektoria od ${time(track.range.startMs)} do ${time(track.range.endMs)}.`
          }
        />
      </div>
    </section>
  )
}

function Swatch({ children }: { children: ReactNode }) {
  return (
    <svg width={22} height={14} aria-hidden className="shrink-0">
      {children}
    </svg>
  )
}

interface DomeLegendProps {
  designation: string | null
  type: { label: string; Icon: LucideIcon; style: CSSProperties | undefined } | null
  /** Obiekt nad horyzontem w chwili kursora; null bez obiektu. */
  objectAbove: boolean | null
  minAltitudeDeg: number
  moon: { aboveHorizon: boolean; illuminatedFraction: number; waxing: boolean }
  trackNote: string | null
}

function DomeLegend({ designation, type, objectAbove, minAltitudeDeg, moon, trackNote }: DomeLegendProps) {
  return (
    <div className="flex flex-col gap-2 text-xs text-muted @2xl:flex-1">
      {trackNote && <p className="text-foreground">{trackNote}</p>}
      <ul className="grid gap-x-4 gap-y-1.5 @xs:grid-cols-2">
        {designation && type && (
          <>
            <li className="flex items-center gap-2">
              <Swatch>
                <circle cx={11} cy={7} r={6} className="fill-background" stroke="currentColor" strokeWidth={1.5} style={type.style} />
              </Swatch>
              {objectAbove ? `${designation} w chwili kursora` : `${designation} pod horyzontem w chwili kursora`}
            </li>
            <li className="flex items-center gap-2">
              <Swatch>
                <line x1={2} x2={20} y1={7} y2={7} className="stroke-accent" strokeWidth={3} strokeLinecap="round" />
              </Swatch>
              widoczny
            </li>
            <li className="flex items-center gap-2">
              <Swatch>
                <line x1={2} x2={20} y1={7} y2={7} className="stroke-accent" strokeWidth={1.5} strokeOpacity={0.45} />
              </Swatch>
              za nisko albo za przeszkodą
            </li>
            <li className="flex items-center gap-2">
              <Swatch>
                <line x1={2} x2={20} y1={7} y2={7} className="stroke-accent" strokeWidth={1.5} strokeOpacity={0.45} />
                <circle cx={11} cy={7} r={2.75} className="fill-background stroke-accent" strokeWidth={1.5} />
              </Swatch>
              pełne godziny
            </li>
          </>
        )}
        <li className="flex items-center gap-2">
          <Swatch>
            <line x1={0} x2={22} y1={7} y2={7} className="stroke-muted" strokeWidth={1.25} strokeDasharray="3 3" />
          </Swatch>
          {`h_min ${formatDeg(minAltitudeDeg, 0)}`}
        </li>
        <li className="flex items-center gap-2">
          <Swatch>
            <MoonPhaseGlyph cx={11} cy={7} r={6} illuminatedFraction={moon.illuminatedFraction} waxing={moon.waxing} />
          </Swatch>
          {moon.aboveHorizon
            ? `Księżyc, ${formatPercent(moon.illuminatedFraction)} oświetlenia`
            : `Księżyc pod horyzontem (${formatPercent(moon.illuminatedFraction)} oświetlenia)`}
        </li>
      </ul>
    </div>
  )
}
