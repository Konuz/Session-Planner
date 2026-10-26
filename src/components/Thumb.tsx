import { useEffect, useRef, useState } from 'react'
import { getAstroBinPhoto } from '../lib/astrobin'
import { getSkyImage, getThumb } from '../lib/thumbs'
import type { DSO } from '../lib/catalog'

/** Czarno-biała miniatura ładowana dopiero, gdy element pojawi się na ekranie. */
export function Thumb({ object, className = 'thumb', style, fovDeg, sizePx, preferAstroBin = false }: { object: DSO; className?: string; style?: React.CSSProperties; fovDeg?: number; sizePx?: number; preferAstroBin?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [src, setSrc] = useState<{ key: string; url: string; astroBin?: { galleryUrl: string; title: string } } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const key = `${object.i}:${fovDeg ?? ''}:${sizePx ?? ''}:${preferAstroBin}`

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctrl = new AbortController()
    let started = false
    const start = () => {
      if (started) return
      started = true
      const load = async () => {
        if (preferAstroBin) {
          try {
            const photo = await getAstroBinPhoto(object.id, ctrl.signal)
            if (photo) {
              setSrc({ key, url: photo.imageUrl, astroBin: { galleryUrl: photo.galleryUrl, title: photo.title } })
              return
            }
          } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') return
          }
        }
        const url = fovDeg ? await getSkyImage(object.raDeg, object.decDeg, fovDeg, sizePx ?? 400, ctrl.signal) : await getThumb(object, ctrl.signal)
        setSrc({ key, url })
      }
      load().catch((e: Error) => e.name !== 'AbortError' && setFailed(key))
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && start(), { rootMargin: '200px' })
    io.observe(el)
    return () => {
      io.disconnect()
      ctrl.abort()
    }
  }, [object, key, fovDeg, sizePx, preferAstroBin])

  const current = src?.key === key ? src.url : null
  return (
    <div ref={ref} className={className} style={style}>
      {current ? (
        <>
          <img src={current} alt={`${object.id}, ${src?.astroBin ? 'zdjęcie użytkownika Konuz z AstroBin' : 'zdjęcie DSS2'}`} style={src?.astroBin ? { filter: 'none', objectFit: 'contain' } : undefined} loading="lazy" decoding="async" />
          {src?.key === key && src.astroBin && (
            <a className="button" href={src.astroBin.galleryUrl} target="_blank" rel="noreferrer" title={src.astroBin.title} style={{ position: 'absolute', left: 8, bottom: 8, zIndex: 2, fontSize: 10, padding: '5px 7px' }}>
              AstroBin · Konuz
            </a>
          )}
        </>
      ) : (
        <div className="ph">{failed === key ? 'BRAK ZDJĘCIA' : 'POBIERANIE'}</div>
      )}
    </div>
  )
}
