import { Heart } from 'lucide-react'
import { useStore } from '../state/store'

export function FavoriteButton({ objectId, showLabel = false }: { objectId: string; showLabel?: boolean }) {
  const favorite = useStore((s) => s.favoriteIds.includes(objectId))
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const label = favorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'
  return (
    <button
      type="button"
      className={showLabel ? `button favorite-action${favorite ? ' favorite-remove' : ''}` : `favorite-button${favorite ? ' active' : ''}`}
      aria-label={showLabel ? label : `${label}: ${objectId}`}
      aria-pressed={favorite}
      title={`${label}: ${objectId}`}
      onClick={(event) => { event.stopPropagation(); toggleFavorite(objectId) }}
    >
      {showLabel ? label : <Heart size={14} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />}
    </button>
  )
}
