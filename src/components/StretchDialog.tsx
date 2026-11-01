// Okno „Poziomy” kadru: histogram bieżącego zdjęcia i suwaki czerni, bieli i gammy (podgląd na żywo filtrem SVG).
import { ChartColumn, X } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { gammaToSlider, histogram, isDefaultLevels, levelsAt, sliderToGamma, type Levels } from '../lib/stretch'
import { Range } from './Range'

const HIST_W = 256
const HIST_H = 110
// Zdjęcie zmniejszone do tylu pikseli wystarcza na kształt histogramu.
const SAMPLE = 256

interface Props {
  open: boolean
  onClose(): void
  imgRef: RefObject<HTMLImageElement | null>
  /** Adres bieżącego zdjęcia: zmiana (podgląd → ostry obraz, inna warstwa) przelicza histogram. */
  imgUrl: string | null
  levels: Levels
  onChange(levels: Levels | null): void
}

export function StretchDialog({ open, onClose, imgRef, imgUrl, levels, onChange }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [bins, setBins] = useState<Uint32Array | null>(null)

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

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
    ctx.clearRect(0, 0, HIST_W, HIST_H)
    if (bins) {
      // Skala logarytmiczna: szczyt tła nie spłaszcza słabego ogona, który chcemy rozciągnąć.
      const max = Math.log1p(Math.max(...bins))
      ctx.fillStyle = color('--text-faint')
      for (let x = 0; x < 256; x++) {
        const h = max > 0 ? (Math.log1p(bins[x]) / max) * HIST_H : 0
        ctx.fillRect(x, HIST_H - h, 1, h)
      }
    }
    ctx.fillStyle = color('--accent-faint')
    ctx.fillRect(0, 0, levels.black, HIST_H)
    ctx.fillRect(levels.white + 1, 0, 255 - levels.white, HIST_H)
    ctx.strokeStyle = color('--accent')
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let x = 0; x < 256; x++) {
      const y = HIST_H - levelsAt(levels, x) * HIST_H
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }, [bins, levels])

  const set = (patch: Partial<Levels>) => onChange({ ...levels, ...patch })

  return (
    <dialog ref={dialogRef} className="stretch-dialog" aria-labelledby="stretch-title" onClose={onClose} onClick={(e) => {
      // Kliknięcie w tło poza oknem zamyka je (cel to sam <dialog>, a punkt leży poza jego prostokątem).
      const r = e.currentTarget.getBoundingClientRect()
      if (e.target === e.currentTarget && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) onClose()
    }}>
      <div className="stretch-head">
        <h2 id="stretch-title"><ChartColumn size={16} aria-hidden="true" /> Poziomy zdjęcia</h2>
        <button className="button ghost small icon-button" aria-label="Zamknij" onClick={onClose}><X size={16} /></button>
      </div>
      <canvas ref={canvasRef} width={HIST_W} height={HIST_H} className="stretch-hist" role="img" aria-label="Histogram jasności zdjęcia z krzywą rozciągnięcia" />
      {!bins && <span className="dim" style={{ fontSize: 11 }}>Histogram pojawi się po wczytaniu zdjęcia.</span>}
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
      <p className="dim" style={{ fontSize: 11, margin: 0 }}>Przesuń czerń w prawo do szczytu tła, a gammę powyżej 1, żeby wydobyć słabe mgławice i pył. Ustawienia każdej warstwy zapisują się w przeglądarce.</p>
      <div className="framing-button-row">
        <button className="button small" onClick={() => onChange(null)} disabled={isDefaultLevels(levels)}>Przywróć domyślne</button>
        <button className="button small" onClick={onClose}>Gotowe</button>
      </div>
    </dialog>
  )
}
