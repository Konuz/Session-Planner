// Edytor horyzontu (7C): wykres 0–360° z etykietami N, E, S, W. Kliknięcie dodaje punkt, przeciągnięcie go przesuwa,
// podwójne kliknięcie albo długie przytrzymanie usuwa; z klawiatury strzałki i Delete. Import i eksport pliku N.I.N.A.
import { scaleLinear } from 'd3-scale'
import { Download, Eraser, Plus, Upload } from 'lucide-react'
import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { horizonAltitudeDeg, normalizeDeg } from '../../services/astroMath'
import { parseDecimal } from '../../services/equipment'
import { formatCount, formatDeg } from '../../services/format'
import {
  exportHorizonFile,
  HORIZON_ALT_MAX_DEG,
  HORIZON_ALT_MIN_DEG,
  parseHorizonFile,
  type HorizonFileResult,
} from '../../services/horizonFile'
import type { HorizonPoint } from '../../types'
import { useElementWidth } from '../../ui/useElementWidth'
import { addHorizonPoint, moveHorizonPoint, nearestIndex, removeHorizonPoint } from './horizonEditorModel'

const MARGIN = { top: 12, right: 14, bottom: 40, left: 34 }
/** Promień trafienia w punkt: cel dotykowy 44 × 44 px (sekcja 8). */
const HIT_RADIUS_PX = 22
const DRAG_THRESHOLD_PX = 5
const LONG_PRESS_MS = 600
const COMPASS = [
  { azDeg: 0, label: 'N' },
  { azDeg: 90, label: 'E' },
  { azDeg: 180, label: 'S' },
  { azDeg: 270, label: 'W' },
  { azDeg: 360, label: 'N' },
]
const AZ_GRID_DEG = [0, 45, 90, 135, 180, 225, 270, 315, 360]
const ALT_GRID_DEG = [0, 30, 60, 90]
const POINT_FORMS = ['punkt', 'punkty', 'punktów'] as const
const LINE_FORMS = ['linię', 'linie', 'linii'] as const

type Gesture =
  | { kind: 'point'; index: number; x: number; y: number; moved: boolean; timer: number }
  | { kind: 'empty'; x: number; y: number }

interface HorizonEditorProps {
  points: HorizonPoint[]
  onChange: (points: HorizonPoint[]) => void
  locationName: string
}

/** Nazwa pliku bez znaków niedozwolonych w Windows. */
function fileName(locationName: string): string {
  return `${locationName.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'horyzont'}.hrz`
}

export function HorizonEditor({ points, onChange, locationName }: HorizonEditorProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>()
  const height = width < 560 ? 220 : 260
  const [selected, setSelected] = useState<number | null>(null)
  const [preview, setPreview] = useState<{ fileName: string; result: HorizonFileResult } | null>(null)
  const [newPoint, setNewPoint] = useState({ az: '', alt: '' })
  const [newPointError, setNewPointError] = useState<string | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const { x, y } = useMemo(
    () => ({
      x: scaleLinear().domain([0, 360]).range([MARGIN.left, Math.max(MARGIN.left + 1, width - MARGIN.right)]),
      y: scaleLinear().domain([HORIZON_ALT_MIN_DEG, HORIZON_ALT_MAX_DEG]).range([height - MARGIN.bottom, MARGIN.top]),
    }),
    [width, height],
  )
  // Profil co 1° przez horizonAltitudeDeg, więc odcinki 0 → pierwszy punkt i ostatni → 360 są takie jak w T10.
  const profile = useMemo(() => {
    const line = Array.from({ length: 361 }, (_, azDeg) => `${x(azDeg)},${y(horizonAltitudeDeg(points, azDeg))}`)
    const base = y(HORIZON_ALT_MIN_DEG)
    return { line: `M${line.join('L')}`, area: `M${x(0)},${base}L${line.join('L')}L${x(360)},${base}Z` }
  }, [points, x, y])
  const positions = points.map((point) => ({ x: x(point.azDeg), y: y(point.altDeg) }))

  const select = (index: number | null) => setSelected(index)
  const add = (point: HorizonPoint) => {
    const next = addHorizonPoint(points, point)
    const azDeg = normalizeDeg(Math.round(point.azDeg))
    onChange(next)
    select(next.findIndex((p) => p.azDeg === azDeg))
  }
  const remove = (index: number) => {
    onChange(removeHorizonPoint(points, index))
    select(null)
  }

  const localPoint = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { px: event.clientX - rect.left, py: event.clientY - rect.top }
  }
  const toHorizon = (px: number, py: number): HorizonPoint => ({ azDeg: x.invert(px), altDeg: y.invert(py) })

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    const { px, py } = localPoint(event)
    const index = nearestIndex(positions, px, py, HIT_RADIUS_PX)
    if (index < 0) {
      gesture.current = { kind: 'empty', x: px, y: py }
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    select(index)
    const timer = window.setTimeout(() => {
      gesture.current = null
      remove(index)
    }, LONG_PRESS_MS)
    gesture.current = { kind: 'point', index, x: px, y: py, moved: false, timer }
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const current = gesture.current
    if (current?.kind !== 'point') return
    const { px, py } = localPoint(event)
    if (!current.moved) {
      if (Math.hypot(px - current.x, py - current.y) < DRAG_THRESHOLD_PX) return
      window.clearTimeout(current.timer)
      gesture.current = { ...current, moved: true }
    }
    onChange(moveHorizonPoint(points, current.index, toHorizon(px, py)))
  }

  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    const current = gesture.current
    gesture.current = null
    if (current?.kind === 'point') {
      window.clearTimeout(current.timer)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    } else if (current?.kind === 'empty') {
      const { px, py } = localPoint(event)
      if (Math.hypot(px - current.x, py - current.y) < DRAG_THRESHOLD_PX) add(toHorizon(px, py))
    }
  }

  const onPointerCancel = () => {
    if (gesture.current?.kind === 'point') window.clearTimeout(gesture.current.timer)
    gesture.current = null
  }

  const onDoubleClick = (event: MouseEvent<SVGSVGElement>) => {
    const { px, py } = localPoint(event)
    const index = nearestIndex(positions, px, py, HIT_RADIUS_PX)
    if (index >= 0) remove(index)
  }

  const onPointKey = (event: KeyboardEvent<SVGCircleElement>, index: number) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      remove(index)
      return
    }
    const step = event.shiftKey ? 5 : 1
    const { azDeg, altDeg } = points[index]
    const targets: Partial<Record<string, HorizonPoint>> = {
      ArrowLeft: { azDeg: azDeg - step, altDeg },
      ArrowRight: { azDeg: azDeg + step, altDeg },
      ArrowUp: { azDeg, altDeg: altDeg + step },
      ArrowDown: { azDeg, altDeg: altDeg - step },
    }
    const target = targets[event.key]
    if (!target) return
    event.preventDefault()
    onChange(moveHorizonPoint(points, index, target))
  }

  const onAddSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const azDeg = parseDecimal(newPoint.az)
    const altDeg = parseDecimal(newPoint.alt)
    if (azDeg === null) {
      setNewPointError('Azymut: wpisz liczbę')
      return
    }
    if (altDeg === null || altDeg < HORIZON_ALT_MIN_DEG || altDeg > HORIZON_ALT_MAX_DEG) {
      setNewPointError('Wysokość: wpisz liczbę od −5 do 90°')
      return
    }
    setNewPointError(null)
    setNewPoint({ az: '', alt: '' })
    add({ azDeg, altDeg })
  }

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    setPreview({ fileName: file.name, result: parseHorizonFile(await file.text()) })
  }

  const onExport = () => {
    const url = URL.createObjectURL(new Blob([exportHorizonFile(points, locationName)], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName(locationName)
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const selectedPoint = selected === null ? null : (points[selected] ?? null)
  const plotBottom = height - MARGIN.bottom

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Kliknij wykres, aby dodać punkt; przeciągnij punkt, aby go przesunąć; podwójne kliknięcie albo przytrzymanie
        usuwa punkt. Z klawiatury: Tab do punktu, strzałki przesuwają o 1° (z Shift o 5°), Delete usuwa.
      </p>
      <div ref={containerRef} className="w-full">
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="group"
            aria-label="Edytor horyzontu: azymut 0–360°, wysokość −5–90°"
            className="block touch-none select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onDoubleClick={onDoubleClick}
            onContextMenu={(event) => event.preventDefault()}
          >
            <rect x={x(0)} y={MARGIN.top} width={x(360) - x(0)} height={plotBottom - MARGIN.top} className="fill-background" />
            {AZ_GRID_DEG.map((azDeg) => (
              <line key={azDeg} x1={x(azDeg)} x2={x(azDeg)} y1={MARGIN.top} y2={plotBottom} className="stroke-border" />
            ))}
            {ALT_GRID_DEG.map((altDeg) => (
              <g key={altDeg}>
                <line
                  x1={x(0)}
                  x2={x(360)}
                  y1={y(altDeg)}
                  y2={y(altDeg)}
                  className={altDeg === 0 ? 'stroke-muted' : 'stroke-border'}
                />
                <text x={MARGIN.left - 6} y={y(altDeg) + 4} textAnchor="end" className="fill-muted text-[11px]">
                  {altDeg}°
                </text>
              </g>
            ))}
            <path d={profile.area} className="fill-muted" fillOpacity={0.2} />
            <path d={profile.line} fill="none" className="stroke-foreground" strokeWidth={1.5} strokeLinejoin="round" />
            {positions.map((position, i) => (
              <circle
                key={i}
                cx={position.x}
                cy={position.y}
                r={selected === i ? 7 : 5}
                className={`${selected === i ? 'fill-accent' : 'fill-foreground'} stroke-background`}
                strokeWidth={2}
                tabIndex={0}
                role="button"
                aria-label={`Punkt horyzontu: azymut ${formatDeg(points[i].azDeg, 0)}, wysokość ${formatDeg(points[i].altDeg, 0)}`}
                onFocus={() => select(i)}
                onKeyDown={(event) => onPointKey(event, i)}
              />
            ))}
            {COMPASS.map(({ azDeg, label }) => (
              <text key={azDeg} x={x(azDeg)} y={plotBottom + 16} textAnchor="middle" className="fill-foreground text-[12px] font-semibold">
                {label}
                <tspan x={x(azDeg)} dy={13} className="fill-muted text-[10px] font-normal">
                  {azDeg}°
                </tspan>
              </text>
            ))}
          </svg>
        )}
      </div>

      <p className="text-sm" aria-live="polite">
        {points.length === 0 ? 'Horyzont płaski 0° (bez punktów).' : `${formatCount(points.length, POINT_FORMS)}.`}{' '}
        {selectedPoint && (
          <span className="text-muted">
            Wybrany: azymut {formatDeg(selectedPoint.azDeg, 0)}, wysokość {formatDeg(selectedPoint.altDeg, 0)}.
          </span>
        )}
      </p>

      <form onSubmit={onAddSubmit} className="flex flex-wrap items-end gap-2" noValidate>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Azymut [°]
          <input
            className="control w-24 text-sm"
            inputMode="decimal"
            value={newPoint.az}
            onChange={(event) => setNewPoint({ ...newPoint, az: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Wysokość [°]
          <input
            className="control w-24 text-sm"
            inputMode="decimal"
            value={newPoint.alt}
            onChange={(event) => setNewPoint({ ...newPoint, alt: event.target.value })}
          />
        </label>
        <button type="submit" className="button">
          <Plus aria-hidden size={18} /> Dodaj punkt
        </button>
        {newPointError && (
          <p role="alert" className="basis-full text-sm text-accent">
            {newPointError}
          </p>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInput}
          type="file"
          accept=".hrz,.txt,text/plain"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => void onFile(event)}
        />
        <button type="button" className="button" onClick={() => fileInput.current?.click()}>
          <Upload aria-hidden size={18} /> Wczytaj plik horyzontu
        </button>
        <button type="button" className="button" disabled={points.length < 2} onClick={onExport}>
          <Download aria-hidden size={18} /> Eksportuj plik .hrz
        </button>
        <button
          type="button"
          className="button"
          disabled={points.length === 0}
          onClick={() => {
            onChange([])
            select(null)
          }}
        >
          <Eraser aria-hidden size={18} /> Wyczyść (płaski 0°)
        </button>
      </div>

      {preview && (
        <div role="status" className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm">
          <p>
            Plik „{preview.fileName}”: {formatCount(preview.result.points.length, POINT_FORMS)}
            {preview.result.rejected.length > 0 && `, odrzucono ${formatCount(preview.result.rejected.length, LINE_FORMS)}`}.
          </p>
          {preview.result.error && <p className="text-accent">{preview.result.error}.</p>}
          {preview.result.rejected.length > 0 && (
            <ul className="list-disc pl-5 text-muted">
              {preview.result.rejected.slice(0, 8).map((line) => (
                <li key={line.line}>
                  Linia {line.line} („{line.text}”): {line.reason}
                </li>
              ))}
              {preview.result.rejected.length > 8 && <li>oraz {preview.result.rejected.length - 8} kolejnych</li>}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="button button-primary"
              disabled={preview.result.error !== null}
              onClick={() => {
                onChange(preview.result.points)
                setPreview(null)
                select(null)
              }}
            >
              Zastąp horyzont
            </button>
            <button type="button" className="button" onClick={() => setPreview(null)}>
              Anuluj
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
