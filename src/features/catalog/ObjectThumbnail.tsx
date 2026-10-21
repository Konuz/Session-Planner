// Miniatura obiektu: zdjęcie DSS2 z CDS hips2fits, a do czasu jego wczytania, bez sieci albo po błędzie ikona typu
// na tle nocnego nieba. Adres trafia do <img> dopiero, gdy miniatura jest widoczna na ekranie (nie tylko zamontowana
// przez zapas wirtualizacji listy) przez LOAD_DELAY_MS, więc szybkie przewijanie nie wysyła zapytań do CDS.
// Render nie dotyka sieci (testy renderują w Node).
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { thumbnailUrl } from '../../services/skyImage/thumbnail'
import { tokenVariable } from '../../theme/tokens'
import type { DsoObject } from '../../types'
import { DSO_TYPES } from './objectCardModel'
import { TYPE_ICONS } from './typeIcons'

const LOAD_DELAY_MS = 400

export interface ObjectThumbnailProps {
  object: DsoObject
  /** Bok miniatury na ekranie [px] (na telefonie 72 px); zdjęcie pobiera się w podwójnej rozdzielczości. */
  sizePx: number
}

/** Rodzic podaje `key={object.uid}`, więc stan zdjęcia zaczyna się od nowa przy każdym obiekcie. */
export function ObjectThumbnail({ object, sizePx }: ObjectThumbnailProps) {
  const url = thumbnailUrl(object, sizePx * 2)
  const boxRef = useRef<HTMLDivElement>(null)
  const [requested, setRequested] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const box = boxRef.current
    if (!box || !navigator.onLine) return
    let timer: number | undefined
    const stop = () => window.clearTimeout(timer)
    const observer = new IntersectionObserver(([entry]) => {
      stop()
      if (entry.isIntersecting) timer = window.setTimeout(() => setRequested(url), LOAD_DELAY_MS)
    })
    observer.observe(box)
    return () => {
      stop()
      observer.disconnect()
    }
  }, [url])

  const TypeIcon = TYPE_ICONS[object.type]
  const showPhoto = requested === url && !failed
  return (
    <div
      ref={boxRef}
      className="relative size-(--thumb-size) shrink-0 overflow-hidden rounded-xl border border-border bg-sky-astronomical max-sm:size-18"
      style={{ '--thumb-size': `${sizePx}px` } as CSSProperties}
    >
      <TypeIcon
        aria-hidden
        size={Math.round(sizePx / 3)}
        strokeWidth={1.25}
        className="absolute inset-0 m-auto opacity-60"
        style={{ color: `var(${tokenVariable(DSO_TYPES[object.type].color)})` }}
      />
      {showPhoto && (
        <img
          src={url}
          alt=""
          width={sizePx}
          height={sizePx}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`sky-photo absolute inset-0 size-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  )
}

/** Filtr Red Mode dla zdjęć poza Kadrem (luminancja → kanał R, sekcja 8); Kadr ma własny filtr `red-only`. */
export function RedOnlyPhotoFilter() {
  return (
    <svg width={0} height={0} aria-hidden className="absolute">
      <filter id="red-only-photo" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
      </filter>
    </svg>
  )
}
