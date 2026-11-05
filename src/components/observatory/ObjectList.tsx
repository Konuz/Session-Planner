import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef } from 'react'
import { TYPE_INFO } from '../../lib/catalog'
import { fmtDistance } from '../../lib/format'
import type { ObservatoryItem } from '../../lib/observatory'

interface Props {
  items: ObservatoryItem[]
  selected: string | null
  onSelect(id: string): void
  descending: boolean
  onSort(): void
}

export const itemKind = (item: ObservatoryItem) => item.kind === 'star' ? 'Gwiazda' : item.type ? TYPE_INFO[item.type].label : 'Obiekt'

/** Lista obiektów posortowana po odległości; wirtualizowana (do ~1000 gwiazd). */
export function ObjectList({ items, selected, onSelect, descending, onSort }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({ count: items.length, getScrollElement: () => scrollRef.current, estimateSize: () => 36, overscan: 8 })
  const index = items.findIndex((item) => item.id === selected)
  useEffect(() => { if (index >= 0) virtualizer.scrollToIndex(index, { align: 'auto' }) }, [index, virtualizer])

  return <div className="obs-list">
    <div className="obs-list-head label"><span>Obiekt</span><button type="button" onClick={onSort} aria-label={`Sortuj według odległości ${descending ? 'rosnąco' : 'malejąco'}`}>Od Ziemi {descending ? '↓' : '↑'}</button></div>
    <div ref={scrollRef} className="obs-list-scroll" role="listbox" aria-label="Obiekty zdjęcia według odległości" aria-activedescendant={index >= 0 ? `obs-row-${index}` : undefined} tabIndex={0}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
        e.preventDefault()
        const next = Math.max(0, Math.min(items.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1)))
        if (items[next]) onSelect(items[next].id)
      }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => {
          const item = items[row.index]
          return <div key={item.id} id={`obs-row-${row.index}`} role="option" aria-selected={item.id === selected} className={`obs-row${item.id === selected ? ' on' : ''}`}
            style={{ transform: `translateY(${row.start}px)`, height: row.size }} onClick={() => onSelect(item.id)}>
            <span className={`obs-marker ${item.category}`} aria-hidden="true" />
            <span className="obs-row-name"><span>{item.kind === 'star' ? item.id.replace('Gaia DR3 ', 'Gaia ') : item.id}</span><small>{itemKind(item)}</small></span>
            <span className="obs-row-dist figures">{item.distLy ? fmtDistance(item.distLy) : '—'}</span>
          </div>
        })}
      </div>
    </div>
  </div>
}
