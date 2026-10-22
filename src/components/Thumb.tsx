import { useEffect, useRef, useState } from 'react'
import { getSkyImage, getThumb } from '../lib/thumbs'
import type { DSO } from '../lib/catalog'

/** Czarno-biała miniatura ładowana dopiero, gdy element pojawi się na ekranie. */
export function Thumb({ object, className = 'thumb', style, fovDeg, sizePx }: { object: DSO; className?: string; style?: React.CSSProperties; fovDeg?: number; sizePx?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [src, setSrc] = useState<{ key: string; url: string } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const key = `${object.i}:${fovDeg ?? ''}:${sizePx ?? ''}`

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctrl = new AbortController()
    let started = false
    const start = () => {
      if (started) return
      started = true
      const p = fovDeg ? getSkyImage(object.raDeg, object.decDeg, fovDeg, sizePx ?? 400, ctrl.signal) : getThumb(object, ctrl.signal)
      p.then((url) => setSrc({ key, url })).catch((e: Error) => e.name !== 'AbortError' && setFailed(key))
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && start(), { rootMargin: '200px' })
    io.observe(el)
    return () => {
      io.disconnect()
      ctrl.abort()
    }
  }, [object, key, fovDeg, sizePx])

  const current = src?.key === key ? src.url : null
  return (
    <div ref={ref} className={className} style={style}>
      {current ? (
        <img src={current} alt={`${object.id} — zdjęcie DSS2`} loading="lazy" decoding="async" />
      ) : (
        <div className="ph">{failed === key ? 'BRAK ZDJĘCIA' : 'POBIERANIE'}</div>
      )}
    </div>
  )
}
