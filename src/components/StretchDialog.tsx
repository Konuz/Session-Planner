// Okno „Poziomy” kadru: histogram bieżącego zdjęcia, suwaki czerni, bieli i gammy oraz własna krzywa
// ustawiana punktami wprost na wykresie (podgląd na żywo filtrem SVG). Okno otwiera się pod przyciskiem histogramu.
import { ChartColumn } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { baseAt, baseInverse, gammaToSlider, histogram, isDefaultLevels, makeTransfer, MAX_POINTS, MIN_POINT_GAP, sliderToGamma, type CurvePoint, type Levels } from '../lib/stretch'
import { Range } from './Range'

// Wykres w jednostkach logicznych (oś X: wejście 0–255, oś Y: wyjście 0–1), rysowany w podwójnej rozdzielczości.
const CHART_W = 256
const CHART_H = 160
const DPR = 2
// Zdjęcie zmniejszone do tylu pikseli wystarcza na kształt histogramu.
const SAMPLE = 256
// Promień chwytania punktu w pikselach ekranu i odstęp okna od przycisku i brzegów okna przeglądarki.
const HIT_PX = 10
const GAP_PX = 6
const EDGE_PX = 8
// Poniżej tej wysokości miejsca pod przyciskiem okno podnosi się zamiast przewijać.
const MIN_BELOW_PX = 320

interface Props {
  open: boolean
  onClose(): void
  /** Przycisk histogramu: okno staje pod nim, wyrównane do jego prawej krawędzi. */
  anchorRef: RefObject<HTMLElement | null>
  imgRef: RefObject<HTMLImageElement | null>
  /** Adres bieżącego zdjęcia: zmiana (podgląd → ostry obraz, inna warstwa) przelicza histogram. */
  imgUrl: string | null
  levels: Levels
  onChange(levels: Levels | null): void
}

export function StretchDialog({ open, onClose, anchorRef, imgRef, imgUrl, levels, onChange }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [bins, setBins] = useState<Uint32Array | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight?: number } | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const drag = useRef<number | null>(null)
  const points = levels.points ?? []

  // Otwarcie przed pomiarem: pod przyciskiem, prawą krawędzią do niego; przy braku miejsca przesunięte tak, by mieściło się w oknie.
  useLayoutEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (!open) {
      if (dlg.open) dlg.close()
      return
    }
    if (!dlg.open) {
      // Bez trybu modalnego: przyciski nad zdjęciem (np. ukrycie kadru) działają przy otwartym oknie.
      dlg.show()
      // Fokus na samym oknie, nie na pierwszym suwaku (bez ramki fokusu przy otwarciu myszą).
      dlg.focus()
    }
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect()
      const d = dialogRef.current?.getBoundingClientRect()
      if (!a || !d) return
      const left = Math.max(EDGE_PX, Math.min(a.right - d.width, innerWidth - d.width - EDGE_PX))
      const below = innerHeight - a.bottom - GAP_PX - EDGE_PX
      // Zawsze pod przyciskiem (wysokie okno przewija się); przy bardzo małym oknie przeglądarki podniesione, by się zmieściło.
      const next = below >= MIN_BELOW_PX
        ? { top: a.bottom + GAP_PX, left, maxHeight: below }
        : { top: Math.max(EDGE_PX, innerHeight - dlg.scrollHeight - EDGE_PX), left }
      setPos((p) => (p?.top === next.top && p.left === next.left && p.maxHeight === next.maxHeight ? p : next))
    }
    place()
    addEventListener('resize', place)
    return () => removeEventListener('resize', place)
  }, [open, anchorRef, bins])

  // Zamykanie: kliknięcie poza oknem (oprócz przycisku histogramu, który sam przełącza, i elementów z `data-keeps-stretch`) albo Esc.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null
      if (!t || dialogRef.current?.contains(t) || anchorRef.current?.contains(t) || t.closest('[data-keeps-stretch]')) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  // Piksele czytane z niezmienionego obrazu (filtr SVG działa tylko przy wyświetlaniu).
  useEffect(() => {
    const el = imgRef.current
    if (!open || !el || !imgUrl) return setBins(null)
    let cancelled = false
    el.decode().then(() => {
      if (cancelled) return
      const c = document.createElement('canvas')
      c.width = c.height = SAMPLE
      const ctx = c.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.drawImage(el, 0, 0, SAMPLE, SAMPLE)
      setBins(histogram(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data))
    }).catch(() => !cancelled && setBins(null))
    return () => { cancelled = true }
  }, [open, imgUrl, imgRef])

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const css = getComputedStyle(document.documentElement)
    const color = (name: string) => css.getPropertyValue(name).trim()
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    ctx.clearRect(0, 0, CHART_W, CHART_H)
    ctx.strokeStyle = color('--border')
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let k = 1; k < 4; k++) {
      ctx.moveTo((k * CHART_W) / 4, 0)
      ctx.lineTo((k * CHART_W) / 4, CHART_H)
      ctx.moveTo(0, (k * CHART_H) / 4)
      ctx.lineTo(CHART_W, (k * CHART_H) / 4)
    }
    ctx.stroke()
    if (bins) {
      // Skala logarytmiczna: szczyt tła nie spłaszcza słabego ogona, który chcemy rozciągnąć.
      const max = Math.log1p(Math.max(...bins))
      ctx.fillStyle = color('--text-faint')
      for (let x = 0; x < 256; x++) {
        const h = max > 0 ? (Math.log1p(bins[x]) / max) * CHART_H : 0
        ctx.fillRect(x, CHART_H - h, 1, h)
      }
    }
    ctx.fillStyle = color('--accent-faint')
    ctx.fillRect(0, 0, levels.black, CHART_H)
    ctx.fillRect(levels.white + 1, 0, 255 - levels.white, CHART_H)
    const f = makeTransfer(levels)
    ctx.strokeStyle = color('--accent')
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let x = 0; x <= 255; x += 0.5) {
      const y = CHART_H - f(x) * CHART_H
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    // Punkty jak kwadratowe znaczniki strony; aktywny wypełniony cyjanem.
    points.forEach(([u, y], k) => {
      const px = baseInverse(levels, u)
      const py = CHART_H - y * CHART_H
      ctx.fillStyle = k === active ? color('--accent') : color('--bg')
      ctx.fillRect(px - 3.5, py - 3.5, 7, 7)
      ctx.strokeStyle = color('--accent')
      ctx.lineWidth = 1.2
      ctx.strokeRect(px - 3.5, py - 3.5, 7, 7)
    })
  }, [bins, levels, active])

  const set = (patch: Partial<Levels>) => onChange({ ...levels, ...patch })
  const setPoints = (next: CurvePoint[]) => onChange(next.length ? { ...levels, points: next } : { black: levels.black, white: levels.white, gamma: levels.gamma })

  // Położenie wskaźnika na wykresie: x w 0–255 (wejście), y w 0–1 (wyjście), plus skala ekranu do chwytania punktów.
  const chartAt = (e: ReactPointerEvent | React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return {
      x: Math.min(255, Math.max(0, ((e.clientX - r.left) / r.width) * 255)),
      y: Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height)),
      sx: r.width / 255,
      sy: r.height,
    }
  }
  const hit = (e: ReactPointerEvent | React.MouseEvent) => {
    const c = chartAt(e)
    let best: number | null = null
    let bestD = HIT_PX
    points.forEach(([u, y], k) => {
      const d = Math.hypot((baseInverse(levels, u) - c.x) * c.sx, (y - c.y) * c.sy)
      if (d <= bestD) { best = k; bestD = d }
    })
    return best as number | null
  }
  // Przesuwa punkt k w obrębie sąsiadów (z odstępem), żeby kolejność punktów się nie zmieniała.
  const moveTo = (k: number, x: number, y: number, list = points) => {
    const lo = (k > 0 ? list[k - 1][0] : 0) + MIN_POINT_GAP
    const hi = (k < list.length - 1 ? list[k + 1][0] : 1) - MIN_POINT_GAP
    const u = Math.min(hi, Math.max(lo, baseAt(levels, x)))
    const next = list.slice()
    next[k] = [Math.round(u * 1e4) / 1e4, Math.round(y * 1e4) / 1e4]
    setPoints(next)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    let k = hit(e)
    if (k === null) {
      const { x, y } = chartAt(e)
      const u = baseAt(levels, x)
      // Nowy punkt tylko między czernią a bielą i z odstępem od sąsiadów oraz końców krzywej.
      if (points.length >= MAX_POINTS || u < MIN_POINT_GAP || u > 1 - MIN_POINT_GAP || points.some((p) => Math.abs(p[0] - u) < MIN_POINT_GAP)) return
      const next = [...points, [u, y] as CurvePoint].sort((a, b) => a[0] - b[0])
      k = next.findIndex((p) => p[0] === u)
      moveTo(k, x, y, next)
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = k
    setActive(k)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const k = drag.current
    if (k === null) {
      e.currentTarget.style.cursor = hit(e) === null ? 'crosshair' : 'grab'
      return
    }
    const { x, y } = chartAt(e)
    moveTo(k, x, y)
  }
  const endDrag = () => {
    drag.current = null
    setActive(null)
  }
  const removeAt = (e: React.MouseEvent) => {
    const k = hit(e)
    if (k === null) return
    e.preventDefault()
    setPoints(points.filter((_, i) => i !== k))
    endDrag()
  }

  return (
    <dialog
      ref={dialogRef}
      className="stretch-dialog"
      tabIndex={-1}
      aria-labelledby="stretch-title"
      style={pos ?? { visibility: 'hidden' }}
      onClose={onClose}
    >
      <div className="stretch-head">
        <h2 id="stretch-title"><ChartColumn size={16} aria-hidden="true" /> Poziomy zdjęcia</h2>
      </div>
      <canvas
        ref={canvasRef}
        width={CHART_W * DPR}
        height={CHART_H * DPR}
        className="stretch-hist"
        role="img"
        aria-label="Histogram jasności zdjęcia z krzywą rozciągnięcia; kliknij, aby dodać punkt krzywej"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={removeAt}
        onContextMenu={removeAt}
      />
      <span className="dim" style={{ fontSize: 11 }}>
        {bins ? 'Kliknij wykres, aby dodać punkt krzywej, i przeciągnij go; dwuklik lub prawy przycisk usuwa punkt. Ustawienia warstwy zapisują się w przeglądarce.' : 'Histogram pojawi się po wczytaniu zdjęcia.'}
      </span>
      <label className="field">
        <span className="label">Punkt czerni <b className="figures">{levels.black}</b></span>
        <Range min={0} max={254} value={levels.black} onChange={(e) => set({ black: Math.min(Number(e.target.value), levels.white - 1) })} />
      </label>
      <label className="field">
        <span className="label">Punkt bieli <b className="figures">{levels.white}</b></span>
        <Range min={1} max={255} value={levels.white} onChange={(e) => set({ white: Math.max(Number(e.target.value), levels.black + 1) })} />
      </label>
      <label className="field">
        <span className="label">Środek (gamma) <b className="figures">{levels.gamma.toFixed(2)}</b></span>
        <Range min={0} max={1000} value={gammaToSlider(levels.gamma)} onChange={(e) => set({ gamma: sliderToGamma(Number(e.target.value)) })} />
      </label>
      <div className="framing-button-row">
        <button className="button small" onClick={() => setPoints([])} disabled={!points.length}>Usuń punkty</button>
        <button className="button small" onClick={() => onChange(null)} disabled={isDefaultLevels(levels)}>Przywróć domyślne</button>
      </div>
    </dialog>
  )
}
