import { useEffect, useRef, useState } from 'react'
import { getAstroBinPhoto } from '../lib/astrobin'
import { getSkyImage, getThumb, thumbFovDeg, thumbImageOptions, thumbSourceInfo, type ThumbSource } from '../lib/thumbs'
import { getOwnSkyImage, OwnPhotoMissingError } from '../lib/ownPhotoImage'
import { useOwnPhotoKey } from '../state/data'
import { useStore } from '../state/store'
import type { DSO } from '../lib/catalog'
import { useObjectUrl } from './useObjectUrl'

/** Miniatura ładowana po pojawieniu się na ekranie. Własne zdjęcie jest wpasowywane w tło przeglądu. */
export function Thumb({ object, className = 'thumb', style, fovDeg, sizePx, preferAstroBin = false, followSkySurvey = false }: { object: DSO; className?: string; style?: React.CSSProperties; fovDeg?: number; sizePx?: number; preferAstroBin?: boolean; followSkySurvey?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [src, setSrc] = useState<{ key: string; url?: string; blob?: Blob; own?: boolean; nsns?: ThumbSource; astroBin?: { galleryUrl: string; title: string } } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const photoKey = useOwnPhotoKey(object)
  const own = useStore((s) => s.ownPhotos[photoKey])
  const ownId = own?.shown ? own.photoId : ''
  const source = useStore((s) => followSkySurvey ? (s.skyLook === 'default' ? 'dss2' : s.skyLook) : s.thumbSource)
  const astroBinFirst = preferAstroBin && (!followSkySurvey || source === 'dss2')
  // Po oznaczeniu, nie indeksie: wszystkie swobodne pola mają indeks −1.
  const key = `${object.id}:${fovDeg ?? ''}:${sizePx ?? ''}:${astroBinFirst}:${ownId}:${source}:${followSkySurvey}`
  const blobUrl = useObjectUrl(src?.key === key && failed !== key ? src.blob ?? null : null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctrl = new AbortController()
    let started = false
    const start = () => {
      if (started) return
      started = true
      setFailed(null)
      const load = async () => {
        // Ten sam środek, pole i rozmiar dla przeglądu i wpasowanego własnego zdjęcia.
        const view = fovDeg
          ? { raDeg: object.raDeg, decDeg: object.decDeg, fovDeg, sizePx: sizePx ?? 400 }
          : { raDeg: object.raDeg, decDeg: object.decDeg, fovDeg: thumbFovDeg(object), sizePx: 224 }
        const opts = thumbImageOptions(source, object.decDeg, view.fovDeg, followSkySurvey ? undefined : view.sizePx, fovDeg ? 0 : 1)
        if (ownId) {
          try {
            const blob = await getOwnSkyImage(photoKey, ownId, view, ctrl.signal, opts)
            if (!ctrl.signal.aborted) setSrc({ key, blob, own: true, nsns: opts.survey === 'dss2' ? undefined : source })
          } catch (e) {
            // Brak rekordu w IndexedDB: indeks wraca do domyślnego zdjęcia, efekt wczyta DSS2.
            if (e instanceof OwnPhotoMissingError) useStore.getState().removeOwnPhoto(photoKey)
            else throw e
          }
          return
        }
        if (astroBinFirst) {
          try {
            const photo = await getAstroBinPhoto(object.id, ctrl.signal)
            if (ctrl.signal.aborted) return
            if (photo) {
              setSrc({ key, url: photo.imageUrl, astroBin: { galleryUrl: photo.galleryUrl, title: photo.title } })
              return
            }
          } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') return
          }
        }
        const blob = fovDeg || followSkySurvey
          ? await getSkyImage(view.raDeg, view.decDeg, view.fovDeg, view.sizePx, ctrl.signal, opts)
          : await getThumb(object, ctrl.signal, source)
        if (!ctrl.signal.aborted) setSrc({ key, blob, nsns: opts.survey === 'dss2' ? undefined : source })
      }
      load().catch((e: Error) => {
        if (!ctrl.signal.aborted && e.name !== 'AbortError') setFailed(key)
      })
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && start(), { rootMargin: '200px' })
    io.observe(el)
    return () => {
      io.disconnect()
      ctrl.abort()
    }
  }, [object, key, fovDeg, sizePx, astroBinFirst, followSkySurvey, ownId, photoKey, source])

  const current = src?.key === key && failed !== key ? src.url ?? blobUrl : null
  const nsnsSurvey = src?.nsns ? thumbSourceInfo(src.nsns) : null
  const background = nsnsSurvey ? `${nsnsSurvey.label} (${nsnsSurvey.credit})` : 'DSS2'
  return (
    <div ref={ref} className={className} style={style}>
      {current ? (
        <>
          <img src={current} alt={`${object.id}, ${src?.astroBin ? 'zdjęcie użytkownika Konuz z AstroBin' : src?.own ? `zdjęcie użytkownika wpasowane w ${background}` : `zdjęcie ${background}`}`} title={nsnsSurvey ? `${nsnsSurvey.label} · ${nsnsSurvey.credit}` : undefined} style={src?.astroBin ? { filter: 'none', objectFit: 'contain' } : undefined} loading="lazy" decoding="async" onError={() => setFailed(key)} />
          {src?.key === key && src.astroBin && (
            <a className="button" href={src.astroBin.galleryUrl} target="_blank" rel="noopener noreferrer" title={src.astroBin.title} style={{ position: 'absolute', left: 8, bottom: 8, zIndex: 2, fontSize: 10, padding: '5px 7px' }}>
              AstroBin · Konuz
            </a>
          )}
          {/* Licencja NSNS wymaga podpisu przy obrazie; karty katalogu (bez `fovDeg`) mają go w nagłówku listy. */}
          {src?.key === key && nsnsSurvey && fovDeg && <span className="thumb-credit">{nsnsSurvey.label} · {nsnsSurvey.credit}</span>}
        </>
      ) : (
        <div className="ph">{failed === key ? 'BRAK ZDJĘCIA' : 'POBIERANIE'}</div>
      )}
    </div>
  )
}
