import { X } from 'lucide-react'
import type { CSSProperties } from 'react'

/** Krzyżyk zamykania okna jak na konuzastro.pl: cyjanowa ramka i X, po najechaniu pełny cyjan (klasa .close-button). */
export function CloseButton({ onClick, label = 'Zamknij', style }: { onClick(): void; label?: string; style?: CSSProperties }) {
  return (
    <button type="button" className="close-button" style={style} onClick={onClick} aria-label={label} title={label}>
      <X size={17} aria-hidden="true" />
    </button>
  )
}
