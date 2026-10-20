// Hak warstwy zdjęcia dla zakładki Kadr (zdjecie-w-kadrze): tworzy pobieranie (`createSkyImageLoader` z
// zależnościami przeglądarki) i `createPhotoLayer`, przekazuje mu kadr i oddaje stan widoku.
//
// Nazwy, których spec nie podaje (wybrane przez test-author):
// - `useSkyImage({ center, size, dragging })` – `center` to środek kadru pokazywanego w zakładce, `size` to
//   `mosaicSizeDeg(profil, kadr)`, `dragging` = true w trakcie przeciągania tła (po puszczeniu false).
// - Wynik: `view` (stan `PhotoLayerView`), `photoHref` (adres obrazu dla `<image href>`, np. adres obiektu Blob;
//   null bez zdjęcia) i `layer` (obiekt `PhotoLayer`: akcje `chooseSource`, `chooseLayer`, `retry`, `saveOffline`).
// - Zakładka rysuje zdjęcie w widoku (`FramingView`, props `photo = { href: photoHref, rect: photoRect(view.photo,
//   środek kadru, pole widoku) }`) i panel `PhotoPanel` z `view` i akcjami `layer`.
// - Render nie dotyka `caches`, `URL.createObjectURL`, `document`, `Image` ani `fetch` (zamrożone testy `zakladka-kadr`
//   renderują zakładkę w Node): zależności przeglądarki są czytane dopiero przy wywołaniu, a pobieranie, adresy obiektów
//   Blob i `setFrame` należą do efektów.
import { useEffect, useState, useSyncExternalStore } from 'react'
import type { EquatorialDeg } from '../../services/astroMath'
import type { MosaicSize } from '../../services/framing'
import { createSkyImageLoader, type SkyImageLoaderDeps } from '../../services/skyImage/loader'
import { createPhotoLayer, type PhotoLayer, type PhotoLayerView } from './photoModel'

export interface SkyImageHookInput {
  center: EquatorialDeg
  size: MosaicSize
  dragging: boolean
}

export interface SkyImageHookResult {
  view: PhotoLayerView
  photoHref: string | null
  layer: PhotoLayer
}

/** Obraz `<img>` (SkyView): spełnia się adresem obrazu po `load`, odrzuca po `error` albo przerwaniu. */
function loadImage(url: string, signal: AbortSignal): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const stop = () => {
      img.onload = null
      img.onerror = null
      img.src = ''
      reject(new Error('aborted'))
    }
    img.onload = () => {
      signal.removeEventListener('abort', stop)
      resolve(url)
    }
    img.onerror = () => {
      signal.removeEventListener('abort', stop)
      reject(new Error('error'))
    }
    signal.addEventListener('abort', stop, { once: true })
    img.src = url
  })
}

/** Zależności przeglądarki dla `createSkyImageLoader`; każda czytana dopiero przy użyciu. */
function browserDeps(): SkyImageLoaderDeps {
  return {
    fetch: (url, init) => fetch(url, init),
    loadImage,
    get caches() {
      return typeof caches === 'undefined' ? null : caches
    },
    storage: {
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
    },
    clock: {
      setTimeout: (callback, ms) => setTimeout(callback, ms),
      clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    },
  }
}

/**
 * Adres dla `<image href>` pokazanego zdjęcia: Blob → adres obiektu (poprzedni zwalniany przy zmianie zdjęcia),
 * tekst (adres SkyView z `loadImage`) → bez zmian. Liczony przy powiadomieniu warstwy, nie w renderze.
 */
function photoHrefStore(layer: PhotoLayer) {
  let data: unknown = undefined
  let href: string | null = null
  const sync = () => {
    const next = layer.view().photo?.image.data
    if (next === data) return
    if (data instanceof Blob && href) URL.revokeObjectURL(href)
    data = next
    href = next instanceof Blob ? URL.createObjectURL(next) : typeof next === 'string' ? next : null
  }
  return {
    subscribe: (listener: () => void) =>
      layer.subscribe(() => {
        sync()
        listener()
      }),
    snapshot: () => href,
  }
}

function createState() {
  const layer = createPhotoLayer(createSkyImageLoader(browserDeps()))
  return { layer, href: photoHrefStore(layer) }
}

export function useSkyImage(input: SkyImageHookInput): SkyImageHookResult {
  const [{ layer, href }] = useState(createState)
  const view = useSyncExternalStore(
    (listener) => layer.subscribe(listener),
    () => layer.view(),
    () => layer.view(),
  )
  const photoHref = useSyncExternalStore(href.subscribe, href.snapshot, href.snapshot)
  const { raDeg, decDeg } = input.center
  const { widthDeg, heightDeg } = input.size
  const { dragging } = input

  useEffect(() => {
    layer.setFrame({ center: { raDeg, decDeg }, size: { widthDeg, heightDeg } }, dragging)
  }, [layer, raDeg, decDeg, widthDeg, heightDeg, dragging])

  return { view, photoHref, layer }
}
