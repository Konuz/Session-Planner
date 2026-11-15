// Kadrowanie: zdjęcie DSS2 wokół obiektu w rzucie TAN i prostokąt matrycy z obrotem (PA od N przez E).
import { ChartColumn, Eye, EyeOff, RotateCw } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { computeOptics } from '../lib/astro'
import { parseDecCoordinate, parseRaCoordinate } from '../lib/coordinates'
import { fmtDec, fmtNum, fmtRa } from '../lib/format'
import { frameCorners, gnomonic, gnomonicInverse, mosaicOffsets, pixelToTangent, tangentToPixel, type Mosaic } from '../lib/framing'
import { SURVEYS } from '../lib/hips'
import { isDefaultLevels, normalizeLevels, tableValues } from '../lib/stretch'
import { getOwnSkyImage, OwnPhotoMissingError } from '../lib/ownPhotoImage'
import { getSkyImage, type SkyImageOptions } from '../lib/thumbs'
import { useSelected } from '../state/data'
import { useStore } from '../state/store'
import { Range } from './Range'
import { StretchDialog } from './StretchDialog'
import { useObjectUrl } from './useObjectUrl'

const SIZE = 800
const IMAGE_ERROR = 'Nie udało się złożyć zdjęcia z kafelków HiPS'
const DEFAULT_MOSAIC: Mosaic = { cols: 1, rows: 1, overlapPct: 15 }
const MAX_PANELS_PER_SIDE = 5
// Uchwyt obrotu w proporcji do kadru: promień ≈ 3,3% krótszego boku (nie mniej niż 6 jednostek, żeby dało się go chwycić).
const HANDLE_R = 0.033
const HANDLE_MIN_R = 6
// Stały identyfikator filtra (useId daje znaki psujące url(#…)); okno kadrowania jest jedno.
const STRETCH_FILTER_ID = 'framing-stretch'

type Layer = 'red' | 'color' | 'ps1' | 'nsns' | 'nsnsRgb'
// `label`: pozycja listy, `caption`: podpis na zdjęciu (przed źródłem).
const LAYERS: Record<Layer, Required<Pick<SkyImageOptions, 'survey' | 'mode'>> & { label: string; caption: string }> = {
  red: { survey: 'dss2', mode: 'red', label: 'DSS2 czarno-biała', caption: 'DSS2 czerwony' },
  color: { survey: 'dss2', mode: 'color', label: 'DSS2 kolor', caption: 'DSS2 kolor' },
  ps1: { survey: 'ps1', mode: 'color', label: 'PanSTARRS', caption: 'PanSTARRS' },
  nsns: { survey: 'nsns', mode: 'color', label: 'NSNS true-color (DR0.1)', caption: 'NSNS true-color' },
  nsnsRgb: { survey: 'nsnsRgb', mode: 'color', label: 'NSNS bez Hα (DR0.2)', caption: 'NSNS bez Hα' },
}

export function FramingPanel() {
  const o = useSelected()
  const eq = useStore((s) => s.equipment)
  const framing = useStore((s) => s.framing)
  const setFraming = useStore((s) => s.setFraming)
  const addToPlan = useStore((s) => s.addToPlan)
  const setTab = useStore((s) => s.setTab)
  const updatePlan = useStore((s) => s.updatePlan)
  const plan = useStore((s) => s.plan)
  const storedStretch = useStore((s) => s.framingStretch)
  const setFramingStretch = useStore((s) => s.setFramingStretch)
  // Własne zdjęcie wpasowane w tło kadrowania, gdy w karcie wybrano „moje”.
  const own = useStore((s) => (o ? s.ownPhotos[o.id] : undefined))
  const ownId = own?.shown ? own.photoId : ''
  const removeOwnPhoto = useStore((s) => s.removeOwnPhoto)
  const [layer, setLayer] = useState<Layer>('color')
  // Zdjęcie z miejscem, które pokazuje: po przesunięciu nieba poprzednie zostaje widoczne, przesunięte, do czasu wczytania nowego.
  const [img, setImg] = useState<{ key: string; blob: Blob; sharp: boolean; raDeg: number; decDeg: number; fovDeg: number; layer: Layer } | null>(null)
  const imageUrl = useObjectUrl(img?.blob ?? null)
  // Bieżące przeciąganie zdjęcia [jednostki SVG]; null, gdy nie przeciągamy.
  const [pan, setPan] = useState<[number, number] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [coordinateInput, setCoordinateInput] = useState({ ra: '', dec: '' })
  const [coordinateError, setCoordinateError] = useState<string | null>(null)
  const [photoCenter, setPhotoCenter] = useState<{ objectIndex: number; raDeg: number; decDeg: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const stretchButtonRef = useRef<HTMLButtonElement>(null)
  const [stretchOpen, setStretchOpen] = useState(false)
  // Ukrycie nakładki kadru (prostokąt, mozaika, uchwyt), żeby lepiej widzieć zdjęcie, np. przy pracy z histogramem.
  const [frameVisible, setFrameVisible] = useState(true)
  const drag = useRef<{ kind: 'move' | 'rotate' | 'pan'; startX: number; startY: number; startCenter: { xi: number; eta: number }; startPa: number } | null>(null)

  const optics = useMemo(
    () => computeOptics({ apertureMm: eq.apertureMm, focalLengthMm: eq.focalLengthMm, reducer: eq.reducer, widthPx: eq.widthPx, heightPx: eq.heightPx, pixelUm: eq.pixelUm, binning: eq.binning }),
    [eq],
  )
  const mosaic = framing.mosaic ?? DEFAULT_MOSAIC
  // Obrys całej mozaiki: n paneli zachodzących o zakładkę (w płaszczyźnie stycznej).
  const spanDeg = (fovDeg: number, n: number) => (2 * Math.atan(Math.tan((fovDeg / 2) * (Math.PI / 180)) * (1 + (n - 1) * (1 - mosaic.overlapPct / 100))) * 180) / Math.PI
  const mosaicW = spanDeg(optics.fovWdeg, mosaic.cols)
  const mosaicH = spanDeg(optics.fovHdeg, mosaic.rows)
  const diag = Math.hypot(mosaicW, mosaicH)
  const objDeg = o ? o.majArcmin / 60 : 0
  const baseFov = Math.min(30, Math.max(0.3, diag * 1.6, objDeg * 1.4))
  const imageFov = Math.round((baseFov / zoom) * 1000) / 1000
  const center = o ? { raDeg: framing.raDeg ?? o.raDeg, decDeg: framing.decDeg ?? o.decDeg } : null
  const imageRa = o ? (photoCenter?.objectIndex === o.i ? photoCenter.raDeg : center?.raDeg ?? o.raDeg) : null
  const imageDec = o ? (photoCenter?.objectIndex === o.i ? photoCenter.decDeg : center?.decDeg ?? o.decDeg) : null
  const imageKey = o ? `${o.i}:${imageRa}:${imageDec}:${imageFov}:${layer}:${ownId}` : ''
  const levels = normalizeLevels(storedStretch[layer])
  const stretched = !isDefaultLevels(levels)
  const pointsKey = JSON.stringify(levels.points ?? [])
  const stretchTable = useMemo(() => (stretched ? tableValues(levels) : ''), [stretched, levels.black, levels.white, levels.gamma, pointsKey])

  useEffect(() => {
    if (o && center) setPhotoCenter({ objectIndex: o.i, raDeg: center.raDeg, decDeg: center.decDeg })
  }, [o?.i])

  // Kółko myszy nad zdjęciem: powiększenie jak suwakiem (0,5–4×). Nasłuch nie jest pasywny, żeby strona się nie przewijała.
  const hasView = !!(o && center)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom((z) => Math.min(4, Math.max(0.5, z * Math.exp(-e.deltaY * 0.0015))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [hasView])

  useEffect(() => {
    if (!center) return
    setCoordinateInput({ ra: fmtRa(center.raDeg), dec: fmtDec(center.decDeg) })
    setCoordinateError(null)
  }, [center?.raDeg, center?.decDeg])

  const covered = (l: Layer) => imageDec !== null && imageDec >= SURVEYS[LAYERS[l].survey].minDecDeg
  const layerCovered = covered(layer)

  useEffect(() => {
    if (!layerCovered) setLayer('color')
  }, [layerCovered])

  useEffect(() => {
    if (!o || imageRa === null || imageDec === null) return
    const ctrl = new AbortController()
    const opts = LAYERS[layer]
    setErr(null)
    // Najpierw miękki podgląd (rząd grubszy o 2, mały transfer), ostry obraz dopiero po nim; podgląd nie zastępuje ostrego.
    let previewFailed = false
    const where = { raDeg: imageRa, decDeg: imageDec, fovDeg: imageFov, layer }
    const load = (layerOpts: SkyImageOptions) => ownId
      ? getOwnSkyImage(o.id, ownId, { raDeg: imageRa, decDeg: imageDec, fovDeg: imageFov, sizePx: SIZE }, ctrl.signal, layerOpts)
      : getSkyImage(imageRa, imageDec, imageFov, SIZE, ctrl.signal, layerOpts)
    load({ ...opts, coarser: 2 })
      .then((blob) => !ctrl.signal.aborted && setImg((prev) => (prev?.key === imageKey && prev.sharp ? prev : { key: imageKey, blob, sharp: false, ...where })))
      .catch((e: Error) => {
        if (e.name === 'AbortError') throw e
        previewFailed = true
      })
      .then(() => load(opts))
      .then((blob) => !ctrl.signal.aborted && setImg({ key: imageKey, blob, sharp: true, ...where }))
      .catch((e: Error) => {
        // Brak rekordu w IndexedDB: indeks wraca do domyślnego tła, efekt wczyta je ponownie.
        if (e instanceof OwnPhotoMissingError) removeOwnPhoto(o.id)
        else if (e.name !== 'AbortError' && previewFailed) setErr(IMAGE_ERROR)
      })
    return () => ctrl.abort()
  }, [o, imageRa, imageDec, imageFov, layer, imageKey, ownId, removeOwnPhoto])

  if (!o || !center) return <div className="sky-stage empty" style={{ display: 'grid', placeItems: 'center' }}>Wybierz obiekt, aby kadrować.</div>

  // Płaszczyzna styczna wokół środka zdjęcia (nie obiektu): po przesunięciu zdjęcia oba środki się różnią.
  const imgCenter = { raDeg: imageRa!, decDeg: imageDec! }
  const offset = gnomonic(imgCenter, center)
  // Ostatnie zdjęcie tej warstwy i pola, przesunięte o różnicę środków i bieżące przeciąganie.
  const shown = img && img.layer === layer && img.fovDeg === imageFov ? img : null
  const shownAt = shown ? tangentToPixel(gnomonic(imgCenter, shown), imageFov, SIZE) : [SIZE / 2, SIZE / 2]
  const shiftX = shownAt[0] - SIZE / 2 + (pan?.[0] ?? 0)
  const shiftY = shownAt[1] - SIZE / 2 + (pan?.[1] ?? 0)
  const corners = frameCorners(offset, mosaicW, mosaicH, framing.paDeg).map((c) => tangentToPixel(c, imageFov, SIZE))
  const panelCount = mosaic.cols * mosaic.rows
  const panels = panelCount > 1
    ? mosaicOffsets(offset, optics.fovWdeg, optics.fovHdeg, framing.paDeg, mosaic).map((t) => ({
        center: tangentToPixel(t, imageFov, SIZE),
        corners: frameCorners(t, optics.fovWdeg, optics.fovHdeg, framing.paDeg).map((c) => tangentToPixel(c, imageFov, SIZE)),
      }))
    : []
  const centerPx = tangentToPixel(offset, imageFov, SIZE)
  const topMid: [number, number] = [(corners[0][0] + corners[1][0]) / 2, (corners[0][1] + corners[1][1]) / 2]
  const upLen = Math.hypot(topMid[0] - centerPx[0], topMid[1] - centerPx[1]) || 1
  const up: [number, number] = [(topMid[0] - centerPx[0]) / upLen, (topMid[1] - centerPx[1]) / upLen]
  const shortSide = (c: [number, number][]) => Math.min(Math.hypot(c[1][0] - c[0][0], c[1][1] - c[0][1]), Math.hypot(c[3][0] - c[0][0], c[3][1] - c[0][1]))
  const handleR = Math.max(HANDLE_MIN_R, shortSide(corners) * HANDLE_R)
  const panelFont = panels.length ? Math.min(28, Math.max(10, shortSide(panels[0].corners) * 0.14)) : 0
  const ratio = objDeg / Math.max(mosaicW, mosaicH)
  const coverage = ratio > 1
    ? `większy niż ${panelCount > 1 ? 'mozaika' : 'kadr'} (potrzeba ok. ×${Math.ceil(objDeg / Math.max(optics.fovWdeg, optics.fovHdeg))})`
    : `${Math.round(ratio * 100)}% boku`
  const setMosaic = (patch: Partial<Mosaic>) => setFraming({ mosaic: { ...mosaic, ...patch } })
  const planItem = plan.find((p) => p.objectId === o.id)

  const applyCoordinates = () => {
    const raDeg = parseRaCoordinate(coordinateInput.ra)
    const decDeg = parseDecCoordinate(coordinateInput.dec)
    if (raDeg === null || decDeg === null) {
      setCoordinateError('Nieprawidłowe współrzędne. Sprawdź format i zakres RA/Dec.')
      return
    }
    setCoordinateError(null)
    setPhotoCenter({ objectIndex: o.i, raDeg, decDeg })
    setFraming({ raDeg, decDeg })
  }

  const toSvg = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * SIZE, ((e.clientY - r.top) / r.height) * SIZE] as [number, number]
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const [px, py] = toSvg(e)
    if (d.kind === 'pan') {
      setPan([px - d.startX, py - d.startY])
    } else if (d.kind === 'move') {
      const start = tangentToPixel(d.startCenter, imageFov, SIZE)
      const t = pixelToTangent(start[0] + px - d.startX, start[1] + py - d.startY, imageFov, SIZE)
      const c = gnomonicInverse(imgCenter, t)
      setFraming({ raDeg: c.raDeg, decDeg: c.decDeg })
    } else {
      // Kąt od „góry” (N) przeciwnie do ruchu wskazówek na obrazie (E po lewej): PA rośnie ku E.
      const ang = Math.atan2(-(px - centerPx[0]), -(py - centerPx[1])) * (180 / Math.PI)
      setFraming({ paDeg: Math.round(((ang % 360) + 360) % 360) })
    }
  }

  // Koniec przeciągania zdjęcia: niebo przesunięte pod nieruchomym na ekranie kadrem, więc nowe są środki zdjęcia i kadru.
  const endDrag = () => {
    const d = drag.current
    drag.current = null
    if (d?.kind !== 'pan' || !pan) return
    setPan(null)
    const [dx, dy] = pan
    if (Math.hypot(dx, dy) < 3) return
    const view = gnomonicInverse(imgCenter, pixelToTangent(SIZE / 2 - dx, SIZE / 2 - dy, imageFov, SIZE))
    const frame = gnomonicInverse(imgCenter, pixelToTangent(centerPx[0] - dx, centerPx[1] - dy, imageFov, SIZE))
    setPhotoCenter({ objectIndex: o.i, raDeg: view.raDeg, decDeg: view.decDeg })
    setFraming({ raDeg: frame.raDeg, decDeg: frame.decDeg })
  }

  return (
    <div className="sky-stage" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 230px', background: '#000' }}>
      <div style={{ position: 'relative', display: 'grid', placeItems: 'center', overflow: 'hidden', padding: 12, containerType: 'size' }}>
        {/* Kwadrat wpisany w kolumnę: krótszy z wymiarów, żeby szeroki kadr nie chował się za panelem ustawień. */}
        <div style={{ position: 'relative', width: 'min(100cqw, 100cqh)', aspectRatio: '1' }}>
          {shown && imageUrl ? (
            <img ref={imgRef} src={imageUrl} alt={`${o.id}, ${LAYERS[layer].caption}`} draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', animation: 'fade-in .5s', transform: shiftX || shiftY ? `translate(${(shiftX / SIZE) * 100}%, ${(shiftY / SIZE) * 100}%)` : undefined, filter: stretched ? `url(#${STRETCH_FILTER_ID})` : undefined }} onError={() => {
              setImg(null)
              setErr(IMAGE_ERROR)
            }} />
          ) : (
            <div className="thumb" style={{ position: 'absolute', inset: 0 }}>
              <div className="ph">{err ?? 'POBIERANIE ZDJĘCIA'}</div>
            </div>
          )}
          {/* Poziomy jako filtr SVG tylko na zdjęciu: nakładka kadru zostaje ostra, kafelki nie są przeliczane. */}
          {stretched && (
            <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
              <filter id={STRETCH_FILTER_ID} colorInterpolationFilters="sRGB">
                <feComponentTransfer>
                  <feFuncR type="table" tableValues={stretchTable} />
                  <feFuncG type="table" tableValues={stretchTable} />
                  <feFuncB type="table" tableValues={stretchTable} />
                </feComponentTransfer>
              </filter>
            </svg>
          )}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', userSelect: 'none', cursor: pan ? 'grabbing' : 'grab' }}
            onPointerDown={(e) => {
              // Kadr i uchwyt ustawiły już swoje przeciąganie; w pozostałym miejscu przeciąga się zdjęcie.
              if (drag.current) return
              e.currentTarget.setPointerCapture(e.pointerId)
              const [x, y] = toSvg(e)
              drag.current = { kind: 'pan', startX: x, startY: y, startCenter: offset, startPa: framing.paDeg }
              setPan([0, 0])
            }}
            // Przeciąganie (zdjęcia, kadru, uchwytu) nie zaczyna zaznaczania tekstu na stronie.
            onMouseDown={(e) => e.preventDefault()}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
          >
            {frameVisible && (
              <g stroke="rgba(255,255,255,0.25)" strokeWidth="1">
                <path d={`M${SIZE / 2 - 10} ${SIZE / 2}h20M${SIZE / 2} ${SIZE / 2 - 10}v20`} />
              </g>
            )}
            {frameVisible && (<>
            <polygon
              points={corners.map((c) => c.join(',')).join(' ')}
              fill="rgba(0,224,255,0.06)"
              stroke="#00e0ff"
              strokeWidth="2.5"
              style={{ cursor: 'move', filter: 'drop-shadow(0 0 6px rgba(0,224,255,0.6))' }}
              onPointerDown={(e) => {
                ;(e.target as Element).setPointerCapture(e.pointerId)
                const [x, y] = toSvg(e)
                drag.current = { kind: 'move', startX: x, startY: y, startCenter: offset, startPa: framing.paDeg }
              }}
            />
            {panels.map((p, k) => (
              <g key={k} style={{ pointerEvents: 'none' }}>
                <polygon points={p.corners.map((c) => c.join(',')).join(' ')} fill="none" stroke="#00e0ff" strokeOpacity="0.7" strokeWidth="1.2" strokeDasharray="6 4" />
                <text x={p.center[0]} y={p.center[1]} fill="#00e0ff" fillOpacity="0.85" fontSize={panelFont} textAnchor="middle" dominantBaseline="central" fontFamily="var(--mono)">{k + 1}</text>
              </g>
            ))}
            {/* Uchwyt obrotu: trójkąt na górnej krawędzi matrycy, jak znacznik kadru na kopule. */}
            <polygon
              points={[
                [topMid[0] + up[0] * handleR * 1.5, topMid[1] + up[1] * handleR * 1.5],
                [topMid[0] - up[1] * handleR, topMid[1] + up[0] * handleR],
                [topMid[0] + up[1] * handleR, topMid[1] - up[0] * handleR],
              ].map((c) => c.join(',')).join(' ')}
              fill="#00e0ff"
              // Przezroczysty obrys powiększa pole chwytania małego trójkąta.
              stroke="transparent"
              strokeWidth={handleR * 2}
              strokeLinejoin="round"
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => {
                ;(e.target as Element).setPointerCapture(e.pointerId)
                const [x, y] = toSvg(e)
                drag.current = { kind: 'rotate', startX: x, startY: y, startCenter: offset, startPa: framing.paDeg }
              }}
            />
            <circle cx={centerPx[0]} cy={centerPx[1]} r="4" fill="#00e0ff" style={{ pointerEvents: 'none' }} />
            </>)}
            <text x="18" y="34" fill="#fff" fontSize="22" fontFamily="var(--mono)">N ↑</text>
            <text x="18" y="62" fill="#fff" fontSize="22" fontFamily="var(--mono)">← E</text>
            <text x={SIZE - 18} y={SIZE - 20} fill="rgba(255,255,255,0.6)" fontSize="13" textAnchor="end" fontFamily="var(--mono)">
              pole zdjęcia {fmtNum(imageFov, 2)}° · {LAYERS[layer].caption} · {SURVEYS[LAYERS[layer].survey].credit}
              {img?.key === imageKey ? (img.sharp ? '' : ' · podgląd') : shown ? ' · wczytywanie' : ''}
              {ownId && img?.key === imageKey ? ' · moje zdjęcie' : ''}
              {stretched ? ' · rozciągnięte' : ''}
            </text>
          </svg>
          <button
            className={`button small icon-button framing-eye-button${frameVisible ? '' : ' on'}`}
            title={frameVisible ? 'Ukryj pole kadru' : 'Pokaż pole kadru'}
            aria-label={frameVisible ? 'Ukryj pole kadru' : 'Pokaż pole kadru'}
            aria-pressed={!frameVisible}
            data-keeps-stretch
            onClick={() => setFrameVisible((v) => !v)}
          >
            {frameVisible ? <Eye size={20} aria-hidden="true" /> : <EyeOff size={20} aria-hidden="true" />}
          </button>
          <button
            ref={stretchButtonRef}
            className={`button small icon-button framing-stretch-button${stretchOpen || stretched ? ' on' : ''}`}
            title="Histogram i poziomy zdjęcia"
            aria-label="Histogram i poziomy zdjęcia"
            aria-haspopup="dialog"
            onClick={() => setStretchOpen((v) => !v)}
          >
            <ChartColumn size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div style={{ borderLeft: '1px solid var(--border)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div className="label">Kadr</div>
        <div className="stat"><div className="label">Pole widzenia</div><div className="v">{fmtNum(optics.fovWdeg, 2)}° × {fmtNum(optics.fovHdeg, 2)}°</div></div>
        <div className="stat"><div className="label">Obiekt w kadrze</div><div className="v">{coverage}</div></div>
        <div className="field">
          <span className="label">Kąt pozycyjny (PA)</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Range min={0} max={359} value={framing.paDeg} onChange={(e) => setFraming({ paDeg: Number(e.target.value) })} style={{ flex: 1 }} />
            <input className="control figures" style={{ width: 64 }} type="number" min={0} max={359} value={framing.paDeg} onChange={(e) => setFraming({ paDeg: ((Number(e.target.value) % 360) + 360) % 360 })} />
          </div>
        </div>
        <div className="field">
          <span className="label">Środek kadru (J2000)</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <input
              className="control figures"
              aria-label="RA środka kadru"
              placeholder="05h 34m 32s"
              style={{ minWidth: 0, padding: '0 6px', fontSize: 11 }}
              value={coordinateInput.ra}
              onChange={(e) => { setCoordinateInput((v) => ({ ...v, ra: e.target.value })); setCoordinateError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && applyCoordinates()}
            />
            <input
              className="control figures"
              aria-label="Dec środka kadru"
              placeholder="−05° 23′ 28″"
              style={{ minWidth: 0, padding: '0 6px', fontSize: 11 }}
              value={coordinateInput.dec}
              onChange={(e) => { setCoordinateInput((v) => ({ ...v, dec: e.target.value })); setCoordinateError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && applyCoordinates()}
            />
          </div>
          <span className="dim" style={{ fontSize: 10.5 }}>RA: hh:mm:ss lub stopnie · Dec: ±dd:mm:ss lub stopnie</span>
          {coordinateError && <span role="alert" style={{ color: 'var(--warn)', fontSize: 11 }}>{coordinateError}</span>}
          <button className="button small" onClick={applyCoordinates}>Ustaw współrzędne</button>
        </div>
        <div className="framing-button-row">
          <button className="button small" onClick={() => { setPhotoCenter({ objectIndex: o.i, raDeg: o.raDeg, decDeg: o.decDeg }); setFraming({ raDeg: null, decDeg: null }) }}>Wyśrodkuj</button>
          <button className="button small" onClick={() => setFraming({ paDeg: (framing.paDeg - 90 + 360) % 360 })}><RotateCw size={13} /> +90°</button>
        </div>
        <div className="field">
          <span className="label">Mozaika (kolumny × wiersze)</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {(['cols', 'rows'] as const).map((k, i) => (
              <Fragment key={k}>
                {i > 0 && <span className="dim">×</span>}
                <input
                  className="control figures"
                  aria-label={k === 'cols' ? 'Kolumny mozaiki' : 'Wiersze mozaiki'}
                  type="number"
                  min={1}
                  max={MAX_PANELS_PER_SIDE}
                  style={{ width: 56 }}
                  value={mosaic[k]}
                  onChange={(e) => setMosaic({ [k]: Math.min(MAX_PANELS_PER_SIDE, Math.max(1, Math.round(Number(e.target.value) || 1))) })}
                />
              </Fragment>
            ))}
            <span className="dim" style={{ fontSize: 11 }}>{panelCount > 1 ? `${panelCount} paneli` : 'jeden kadr'}</span>
          </div>
          {panelCount > 1 && (
            <>
              <span className="label">Zakładka {mosaic.overlapPct}%</span>
              <Range min={0} max={50} step={5} value={mosaic.overlapPct} onChange={(e) => setMosaic({ overlapPct: Number(e.target.value) })} />
            </>
          )}
        </div>
        <div className="field">
          <span className="label">Warstwa</span>
          <select className="control" style={{ width: '100%' }} aria-label="Warstwa zdjęcia" value={layer} onChange={(e) => setLayer(e.target.value as Layer)}>
            {(Object.keys(LAYERS) as Layer[]).map((l) => {
              const survey = SURVEYS[LAYERS[l].survey]
              return (
                <option key={l} value={l} disabled={!covered(l)}>
                  {LAYERS[l].label}{covered(l) ? '' : ` — tylko na północ od ${String(survey.minDecDeg).replace('-', '−')}°`}
                </option>
              )
            })}
          </select>
        </div>
        <div className="field">
          <span className="label">Powiększenie zdjęcia</span>
          <Range min={0.5} max={4} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </div>
        <button
          className="button primary"
          onClick={() => {
            if (planItem) updatePlan(planItem.key, { framing })
            else { addToPlan(o.i, o.id); setTab('planner') }
          }}
        >
          {planItem ? 'Zapisz kadr w planie' : 'Dodaj do planu'}
        </button>
        <p className="dim" style={{ fontSize: 11.5, margin: 0 }}>Przeciągnij prostokąt, aby przesunąć kadr, albo zdjęcie, aby przesunąć niebo pod kadrem; uchwyt nad kadrem obraca go. Powiększenie zmienia suwak.</p>
      </div>
      <StretchDialog
        open={stretchOpen}
        onClose={() => setStretchOpen(false)}
        anchorRef={stretchButtonRef}
        imgRef={imgRef}
        imgUrl={img?.key === imageKey ? imageUrl : null}
        levels={levels}
        onChange={(l) => setFramingStretch(layer, l && !isDefaultLevels(l) ? l : null)}
      />
    </div>
  )
}
