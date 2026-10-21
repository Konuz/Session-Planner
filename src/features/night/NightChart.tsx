// Wykres nocy (7C): pasy zmierzchów, wysokość obiektu, horyzont wzdłuż azymutu, h_min, Księżyc, górowanie, przerzut
// i przeciągany kursor czasu. Kolory wyłącznie z tokenów, więc Red Mode działa bez osobnej palety.
import { useMemo, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { formatDeg, formatPercent } from '../../services/format'
import type { NightFrame, ObjectTrack } from '../../services/nightChart'
import { formatLocalTime } from '../../services/time'
import { useElementWidth } from '../../ui/useElementWidth'
import { useSvgId } from '../../ui/useSvgId'
import { BAND_FILL, chartGeometry } from './chartGeometry'
import { MoonPhaseGlyph } from './MoonPhaseIcon'

const MINUTE_MS = 60_000
/** Krok kursora z klawiatury; z klawiszem Shift – godzina. */
const KEY_STEP_MIN = 5
const ALTITUDE_GRID_DEG = [0, 30, 60, 90]

interface NightChartProps {
  frame: NightFrame
  track: ObjectTrack | null
  objectLabel: string | null
  minAltitudeDeg: number
  cursorMs: number
  onCursorChange: (timeMs: number) => void
  /** Wspólne id wzorów kreskowania (także w legendzie). */
  patternIds: { hatch: string; dots: string }
}

export function NightChart({ frame, track, objectLabel, minAltitudeDeg, cursorMs, onCursorChange, patternIds }: NightChartProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>()
  const height = width < 560 ? 280 : 340
  const geometry = useMemo(
    () => (width > 0 ? chartGeometry(frame, track, minAltitudeDeg, { width, height }) : null),
    [frame, track, minAltitudeDeg, width, height],
  )
  const clipId = useSvgId('night-chart-clip')
  const dragging = useRef(false)

  const { axis, timeZone } = frame
  const clampToAxis = (timeMs: number) => Math.min(axis.endMs, Math.max(axis.startMs, timeMs))

  const timeAtPointer = (event: PointerEvent<SVGSVGElement>) => {
    if (!geometry) return cursorMs
    const left = event.currentTarget.getBoundingClientRect().left
    return clampToAxis(Math.round(geometry.x.invert(event.clientX - left) / MINUTE_MS) * MINUTE_MS)
  }

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = true
    onCursorChange(timeAtPointer(event))
  }
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (dragging.current) onCursorChange(timeAtPointer(event))
  }
  const endDrag = (event: PointerEvent<SVGSVGElement>) => {
    dragging.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const onCursorKey = (event: KeyboardEvent<SVGGElement>) => {
    const step = (event.shiftKey ? 60 : KEY_STEP_MIN) * MINUTE_MS
    const base = clampToAxis(cursorMs)
    const next: Record<string, number> = {
      ArrowLeft: base - step,
      ArrowDown: base - step,
      ArrowRight: base + step,
      ArrowUp: base + step,
      Home: axis.startMs,
      End: axis.endMs,
    }
    if (!(event.key in next)) return
    event.preventDefault()
    onCursorChange(clampToAxis(next[event.key]))
  }

  const cursorInAxis = cursorMs >= axis.startMs && cursorMs <= axis.endMs
  const cursorText = formatLocalTime(cursorMs, timeZone)

  return (
    <div ref={containerRef} className="w-full">
      {geometry && (
        <svg
          width={width}
          height={height}
          role="group"
          aria-label={`Wykres nocy${objectLabel ? `: ${objectLabel}` : ''}. Kliknij albo przeciągnij, aby przesunąć kursor czasu.`}
          className="block touch-pan-y select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <defs>
            <clipPath id={clipId}>
              <rect
                x={geometry.plot.left}
                y={geometry.plot.top}
                width={geometry.plot.right - geometry.plot.left}
                height={geometry.plot.bottom - geometry.plot.top}
              />
            </clipPath>
          </defs>

          <g clipPath={`url(#${clipId})`}>
            {/* Pasy są zagnieżdżone i nieprzezroczyste: każdy kolejny (ciemniejszy) zakrywa poprzedni. */}
            {geometry.bands.map(({ band, x, width: bandWidth }) => (
              <rect
                key={band}
                x={x}
                y={geometry.plot.top}
                width={bandWidth}
                height={geometry.plot.bottom - geometry.plot.top}
                className={BAND_FILL[band]}
              />
            ))}
            {ALTITUDE_GRID_DEG.map((altDeg) => (
              <line
                key={altDeg}
                x1={geometry.plot.left}
                x2={geometry.plot.right}
                y1={geometry.y(altDeg)}
                y2={geometry.y(altDeg)}
                className="stroke-border"
              />
            ))}
            {geometry.ticks.map((tick) => (
              <line
                key={tick.timeMs}
                x1={tick.x}
                x2={tick.x}
                y1={geometry.plot.top}
                y2={geometry.plot.bottom}
                className="stroke-border"
                strokeOpacity={0.5}
              />
            ))}

            {geometry.object && (
              <>
                <path d={geometry.object.lowZonePath} fill={`url(#${patternIds.dots})`} />
                <path d={geometry.object.obstaclePath} fill={`url(#${patternIds.hatch})`} />
                <path d={geometry.object.horizonPath} fill="none" className="stroke-muted" strokeWidth={1.25} />
              </>
            )}
            <line
              x1={geometry.plot.left}
              x2={geometry.plot.right}
              y1={geometry.minAltY}
              y2={geometry.minAltY}
              className="stroke-muted"
              strokeDasharray="2 3"
            />
            <path
              d={geometry.moonPath}
              fill="none"
              className="stroke-foreground"
              strokeOpacity={0.75}
              strokeWidth={1.5}
              strokeDasharray="7 5"
            />
            {geometry.object?.runs.map((run, i) => (
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
            {geometry.object?.transitX != null && (
              <line
                x1={geometry.object.transitX}
                x2={geometry.object.transitX}
                y1={geometry.plot.top}
                y2={geometry.plot.bottom}
                className="stroke-foreground"
                strokeOpacity={0.7}
                strokeDasharray="1 3"
              />
            )}
            {geometry.object?.flipX != null && (
              <line
                x1={geometry.object.flipX}
                x2={geometry.object.flipX}
                y1={geometry.plot.top}
                y2={geometry.plot.bottom}
                className="stroke-foreground"
                strokeOpacity={0.7}
                strokeDasharray="5 3"
              />
            )}
          </g>

          {/* Etykiety pionowych linii: górowanie po lewej, przerzut po prawej stronie linii. */}
          {geometry.object?.transitX != null && (
            <text
              x={geometry.object.transitX - 4}
              y={geometry.plot.top + 14}
              textAnchor="end"
              className="fill-foreground text-[11px]"
            >
              górowanie
            </text>
          )}
          {geometry.object?.flipX != null && (
            <text x={geometry.object.flipX + 4} y={geometry.plot.top + 14} className="fill-foreground text-[11px]">
              przerzut
            </text>
          )}
          <text
            x={geometry.plot.right - 4}
            y={geometry.minAltY - 5}
            textAnchor="end"
            className="fill-muted text-[11px]"
          >
            h_min {formatDeg(minAltitudeDeg, 0)}
          </text>

          {geometry.moonIcon && (
            <g aria-hidden>
              <MoonPhaseGlyph
                cx={geometry.moonIcon.x}
                cy={Math.max(geometry.plot.top + 9, geometry.moonIcon.y - 14)}
                r={7}
                illuminatedFraction={frame.moon.reference.illuminatedFraction}
                waxing={frame.moon.reference.waxing}
              />
              <text
                x={geometry.moonIcon.x + 11}
                y={Math.max(geometry.plot.top + 9, geometry.moonIcon.y - 14) + 4}
                className="fill-foreground text-[11px]"
              >
                {formatPercent(frame.moon.reference.illuminatedFraction)}
              </text>
            </g>
          )}

          {geometry.window && (
            <line
              x1={geometry.window.x0}
              x2={geometry.window.x1}
              y1={geometry.plot.top - 6}
              y2={geometry.plot.top - 6}
              className="stroke-accent"
              strokeWidth={3}
              strokeLinecap="round"
            />
          )}

          {ALTITUDE_GRID_DEG.map((altDeg) => (
            <text
              key={altDeg}
              x={geometry.plot.left - 6}
              y={geometry.y(altDeg) + 4}
              textAnchor="end"
              className="fill-muted text-[11px]"
            >
              {altDeg}°
            </text>
          ))}
          {geometry.ticks.map((tick) => (
            <text key={tick.timeMs} x={tick.x} y={geometry.plot.bottom + 15} textAnchor="middle" className="fill-muted text-[11px]">
              {tick.time}
              {tick.zone && (
                <tspan x={tick.x} dy={12} className="text-[9px]">
                  {tick.zone}
                </tspan>
              )}
            </text>
          ))}

          <CursorMark
            x={geometry.x(clampToAxis(cursorMs))}
            plot={geometry.plot}
            text={cursorText}
            inAxis={cursorInAxis}
            ariaMin={axis.startMs}
            ariaMax={axis.endMs}
            ariaNow={clampToAxis(cursorMs)}
            onKeyDown={onCursorKey}
          />
        </svg>
      )}
    </div>
  )
}

interface CursorMarkProps {
  x: number
  plot: { left: number; right: number; top: number; bottom: number }
  text: string
  inAxis: boolean
  ariaMin: number
  ariaMax: number
  ariaNow: number
  onKeyDown: (event: KeyboardEvent<SVGGElement>) => void
}

/** Kursor czasu: linia pionowa z uchwytem i godziną; poza osią wykresu stoi przy jej brzegu, linią przerywaną. */
function CursorMark({ x, plot, text, inAxis, ariaMin, ariaMax, ariaNow, onKeyDown }: CursorMarkProps) {
  const labelWidth = 96
  const labelX = Math.min(plot.right - labelWidth / 2, Math.max(plot.left + labelWidth / 2, x))
  const label = inAxis ? text : `${text} (poza osią)`
  return (
    <g
      role="slider"
      tabIndex={0}
      aria-label="Kursor czasu na wykresie"
      aria-valuemin={ariaMin}
      aria-valuemax={ariaMax}
      aria-valuenow={ariaNow}
      aria-valuetext={label}
      onKeyDown={onKeyDown}
      className="cursor-ew-resize"
    >
      <line
        x1={x}
        x2={x}
        y1={plot.top}
        y2={plot.bottom}
        className="stroke-foreground"
        strokeWidth={1.5}
        strokeDasharray={inAxis ? undefined : '3 3'}
      />
      <circle cx={x} cy={plot.top} r={5} className="fill-foreground stroke-background" strokeWidth={2} />
      <rect x={labelX - labelWidth / 2} y={1} width={labelWidth} height={17} rx={8.5} className="fill-card stroke-border" />
      <text x={labelX} y={13} textAnchor="middle" className="fill-foreground text-[11px]">
        {text}
      </text>
    </g>
  )
}
