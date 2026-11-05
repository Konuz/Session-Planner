// Moje zdjęcia na kopule: rekordy z IndexedDB dla wpisów z wyborem „moje” (przy włączonej warstwie) i leniwie
// ładowana warstwa WebGL w kontekście gwiazd. `glEpoch` rośnie przy każdym utworzeniu i utracie kontekstu gwiazd.
import { useEffect, useRef, useState, type RefObject } from 'react'
import type { OwnPhotoRecord } from '../lib/ownPhoto'
import type { SkyPhotoLayer } from '../lib/ownPhotoSkyGL'
import { readOwnPhoto } from '../lib/ownPhotoStorage'
import { useStore } from '../state/store'

export function useSkyPhotoLayer(glRef: RefObject<HTMLCanvasElement | null>, glEpoch: number, redraw: () => void): RefObject<SkyPhotoLayer | null> {
  const layer = useRef<SkyPhotoLayer | null>(null)
  const redrawRef = useRef(redraw)
  redrawRef.current = redraw
  // Stabilny klucz zestawu: wiersze „obiekt⇥zdjęcie”; pusty, gdy warstwa wyłączona.
  const key = useStore((s) => (s.showOwnPhotos
    ? Object.entries(s.ownPhotos).filter(([, e]) => e.shown).map(([id, e]) => `${id}\t${e.photoId}`).sort().join('\n')
    : ''))
  const [records, setRecords] = useState<OwnPhotoRecord[]>([])
  const recordsRef = useRef(records)
  recordsRef.current = records

  useEffect(() => {
    if (!key) {
      setRecords([])
      return
    }
    let cancelled = false
    const wanted = key.split('\n').map((line) => line.split('\t') as [string, string])
    void Promise.all(wanted.map(async ([objectId, photoId]) => {
      let record: OwnPhotoRecord | null
      try {
        record = await readOwnPhoto(objectId)
      } catch (e) {
        console.warn('Kopuła: odczyt mojego zdjęcia', objectId, e)
        return null
      }
      // Brak rekordu (np. wyczyszczone dane witryny): wpis indeksu znika, jak w miniaturach i kadrowaniu.
      if (!record) {
        if (!cancelled) useStore.getState().removeOwnPhoto(objectId)
        return null
      }
      // Inny photoId: zdjęcie właśnie zmieniane, indeks dogoni zapis.
      return record.photoId === photoId ? record : null
    })).then((list) => {
      if (!cancelled) setRecords(list.filter((r): r is OwnPhotoRecord => r !== null))
    })
    return () => { cancelled = true }
  }, [key])

  const has = records.length > 0
  useEffect(() => {
    if (!has || glEpoch === 0) return
    let cancelled = false
    let created: SkyPhotoLayer | null = null
    import('../lib/ownPhotoSkyGL').then((m) => {
      const gl = glRef.current?.getContext('webgl2')
      if (cancelled || !gl || gl.isContextLost()) return
      created = m.createSkyPhotoLayer(gl, () => redrawRef.current())
      created.setPhotos(recordsRef.current)
      layer.current = created
      redrawRef.current()
    }).catch((e) => console.error('Kopuła: warstwa moich zdjęć', e))
    return () => {
      cancelled = true
      created?.dispose()
      if (layer.current === created) layer.current = null
      // Ostatnie zdjęcie ukryte lub usunięte: kopuła rysuje się od nowa już bez warstwy (inaczej zostałoby do ruchu myszy).
      redrawRef.current()
    }
  }, [has, glEpoch, glRef])

  useEffect(() => {
    if (!layer.current) return
    layer.current.setPhotos(records)
    redrawRef.current()
  }, [records])

  return layer
}
