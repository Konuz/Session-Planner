import { ChevronDown } from 'lucide-react'
import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useOutside } from './TopBar'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
}

/** Własna lista rozwijana (zamiast systemowego <select>, bez skakania i z paskiem przewijania aplikacji). */
export function Select({
  id,
  value,
  options,
  onChange,
  disabled = false,
  title,
  ariaLabel,
  className = 'control',
  style,
  align = 'left',
  direction = 'down',
  showArrow = true,
  listClassName = '',
}: {
  id?: string
  value: string
  options: SelectOption[]
  onChange(value: string): void
  disabled?: boolean
  title?: string
  ariaLabel?: string
  className?: string
  style?: CSSProperties
  align?: 'left' | 'right'
  direction?: 'down' | 'up'
  showArrow?: boolean
  listClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, () => setOpen(false), open)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const selected = options.find((o) => o.value === value)
  let lastGroup: string | undefined

  return (
    <div ref={ref} className="custom-select">
      <button
        type="button"
        id={id}
        className={`custom-select-btn ${className}`}
        style={style}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{selected?.label ?? value}</span>
        {showArrow && <ChevronDown size={12} className="select-arrow" aria-hidden="true" />}
      </button>
      {open && (
        <div
          className={`popover custom-select-list${align === 'right' ? ' right' : ''}${direction === 'up' ? ' up' : ''}${listClassName ? ` ${listClassName}` : ''}`}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((o) => {
            const groupHeader = o.group && o.group !== lastGroup ? o.group : null
            lastGroup = o.group
            return (
              <Fragment key={`${o.group ?? ''}:${o.value}`}>
                {groupHeader && <div className="custom-select-group">{groupHeader}</div>}
                <button
                  type="button"
                  role="option"
                  disabled={o.disabled}
                  aria-selected={o.value === value}
                  className={o.value === value ? 'on' : ''}
                  ref={o.value === value ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                  onClick={() => { onChange(o.value); setOpen(false) }}
                >
                  {o.label}
                </button>
              </Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}
