import { Image as ImageIcon } from 'lucide-react'
import { useStore } from '../state/store'

/** Przełącznik moje/domyślne zdjęcie w lewym górnym rogu zdjęcia karty, naprzeciw serca. */
export function OwnPhotoButton({ objectId }: { objectId: string }) {
  const own = useStore((s) => s.ownPhotos[objectId])
  const toggle = useStore((s) => s.toggleOwnPhotoShown)
  if (!own) return null
  const label = own.shown ? 'Pokaż zdjęcie domyślne' : 'Pokaż moje zdjęcie'
  return (
    <button
      type="button"
      className={`own-photo-button${own.shown ? ' active' : ''}`}
      aria-label={`${label}: ${objectId}`}
      aria-pressed={own.shown}
      title={label}
      onClick={(event) => { event.stopPropagation(); toggle(objectId) }}
    >
      <ImageIcon size={14} aria-hidden="true" />
    </button>
  )
}
