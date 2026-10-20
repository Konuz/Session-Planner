// Hak warstwy zdjęcia dla zakładki Kadr (zdjecie-w-kadrze): tworzy pobieranie (`createSkyImageLoader` z
// zależnościami przeglądarki) i `createPhotoLayer`, przekazuje mu kadr i oddaje stan widoku.
// ZAŚLEPKA: hak rzuca NotImplementedError; implementację dopisuje implementer.
//
// Nazwy, których spec nie podaje (wybrane przez test-author):
// - `useSkyImage({ center, size, dragging })` – `center` to środek kadru pokazywanego w zakładce, `size` to
//   `mosaicSizeDeg(profil, kadr)`, `dragging` = true w trakcie przeciągania tła (po puszczeniu false).
// - Wynik: `view` (stan `PhotoLayerView`), `photoHref` (adres obrazu dla `<image href>`, np. adres obiektu Blob;
//   null bez zdjęcia) i `layer` (obiekt `PhotoLayer`: akcje `chooseSource`, `chooseLayer`, `retry`, `saveOffline`).
// - Zakładka rysuje zdjęcie w widoku (`FramingView`, props `photo = { href: photoHref, rect: photoRect(view.photo,
//   środek kadru, pole widoku) }`) i panel `PhotoPanel` z `view` i akcjami `layer`.
// - Uwaga: zamrożone testy `zakladka-kadr` renderują `FramingTab` w Node bez atrapy tego haka. Sam render nie może
//   więc wymagać `caches`, `URL.createObjectURL`, `document`, `Image` ani prawdziwego `fetch` – pobieranie, adresy
//   obiektów Blob i `setFrame` należą do efektów (`useEffect`), które w renderze statycznym się nie wykonują.
import type { EquatorialDeg } from '../../services/astroMath'
import type { MosaicSize } from '../../services/framing'
import type { PhotoLayer, PhotoLayerView } from './photoModel'

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

export function useSkyImage(input: SkyImageHookInput): SkyImageHookResult {
  const error = new Error(`useSkyImage: not implemented (${Object.keys(input).length})`)
  error.name = 'NotImplementedError'
  throw error
}
