// Powłoka okna modalnego „Pozycja 3D” (wymiary i klasy dawnego okna Obserwatorium): nagłówek z kickerem i tytułem,
// podsumowanie, krzyżyk, Esc, fokus i powrót fokusu do przycisku, który okno otworzył.
import { useEffect, useRef, type CSSProperties, type ReactNode, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { lockRootInert } from '../../lib/modalInert'
import { CloseButton } from '../CloseButton'

interface Props {
  label: string
  kicker: string
  title: string
  subtitle: string
  /** Miejsce na podsumowanie w nagłówku (Obserwatorium wstawia tam liczby obiektów). */
  summaryRef?: Ref<HTMLDivElement>
  summary?: ReactNode
  className?: string
  /** Styl okna (np. czas przejść paneli w nurkowaniu jako zmienna CSS). */
  style?: CSSProperties
  onClose(): void
  children: ReactNode
}

export function SpaceWindow({ label, kicker, title, subtitle, summaryRef, summary, className = '', style, onClose, children }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const release = lockRootInert()
    const opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
    dialogRef.current?.querySelector<HTMLElement>('.obs-header .close-button')?.focus()
    // Esc zamyka całe okno (także z otwartą listą rozwijaną, którą useOutside zamyka tym samym klawiszem).
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', onKey)
    return () => {
      release()
      window.removeEventListener('keydown', onKey)
      const target = opener?.isConnected ? opener : document.querySelector<HTMLElement>('[data-space3d-opener]')
      target?.focus({ preventScroll: true })
    }
  }, [])

  return createPortal(<div ref={dialogRef} className="observatory" role="dialog" aria-modal="true" aria-label={label}>
    <div className={`obs-window card ${className}`} style={style}>
      <header className="obs-header">
        <div>
          <div className="kicker">{kicker}</div>
          <div className="obs-title" title={title}>{title}</div>
          <div className="dim">{subtitle}</div>
        </div>
        <div ref={summaryRef} className="obs-summary figures">{summary}</div>
        <div className="obs-header-actions">
          <CloseButton label="Zamknij okno Pozycja 3D" onClick={onClose} />
        </div>
      </header>
      {children}
    </div>
  </div>, document.body)
}
