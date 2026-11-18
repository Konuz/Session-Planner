import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronRight } from 'lucide-react'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { DEFAULT_ANNOTATION_COLORS, TYPE_INFO } from '../../lib/catalog'
import { SCOPE_LABELS } from '../../lib/distance'
import { fmtDistance, fmtNum } from '../../lib/format'
import { CATEGORY_LABELS, type ObservatoryCategory, type ObservatoryItem } from '../../lib/observatory'
import { useStore } from '../../state/store'

interface Props {
  items: ObservatoryItem[]
  revealStars: boolean
  selected: string | null
  onSelect(id: string): void
  descending: boolean
  onSort(): void
}

const GROUPS: ObservatoryCategory[] = ['stars', 'nebulae', 'galaxies']
type ObjectRow = { category: ObservatoryCategory; count: number; expanded: boolean } | { item: ObservatoryItem }

export const itemKind = (item: ObservatoryItem) => {
  if (item.kind === 'star') return 'Gwiazda'
  if (item.catalogKind === 'QSO') return 'Kwazar'
  if (item.catalogKind === 'ACO') return 'Gromada galaktyk'
  return item.type ? TYPE_INFO[item.type].label : 'Obiekt'
}

/** Podpowiedź wiersza: wartość z niepewnością, zakres, metoda i źródło odległości w jednej linii. */
export function distanceTooltip(item: ObservatoryItem): string {
  const sigma = item.distLoLy !== null && item.distHiLy !== null && item.distLy !== null ? (item.distHiLy - item.distLoLy) / 2 : null
  const value = `≈ ${fmtDistance(item.distLy)}${sigma ? ` ± ${fmtDistance(sigma)}` : ''}`
  if (item.kind === 'star') return [value, item.parallaxOverError !== null ? `ϖ/σ = ${fmtNum(item.parallaxOverError, 1)}` : '', item.source].filter(Boolean).join(' · ')
  return [value, `zakres: ${SCOPE_LABELS[item.scope]}`, item.method, item.source].filter(Boolean).join(' · ')
}

/** Zwijane grupy ze wspólnym przewijaniem i sortowaniem po odległości w każdej grupie. */
export function ObjectList({ items, revealStars, selected, onSelect, descending, onSort }: Props) {
  const colors = useStore((s) => s.annotationColors)
  const [collapsedGroups, setCollapsedGroups] = useState<ObservatoryCategory[]>(['stars'])
  const [collapsedResults, setCollapsedResults] = useState<ObservatoryCategory[]>([])
  const collapsed = revealStars ? collapsedResults : collapsedGroups
  const setCollapsed = revealStars ? setCollapsedResults : setCollapsedGroups
  const rows = useMemo(() => GROUPS.flatMap<ObjectRow>((category) => {
    const group = items.filter((item) => item.category === category)
    if (group.length === 0) return []
    const expanded = !collapsed.includes(category)
    return [{ category, count: group.length, expanded }, ...(expanded ? group.map((item) => ({ item })) : [])]
  }), [items, collapsed])
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => 36, overscan: 8 })
  const virtualRows = virtualizer.getVirtualItems()
  const index = rows.findIndex((row) => 'item' in row && row.item.id === selected)
  const scrollToSelected = useEffectEvent(() => {
    if (index >= 0) virtualizer.scrollToIndex(index, { align: 'auto' })
  })
  useEffect(() => { scrollToSelected() }, [items, selected])

  return <div className="obs-list">
    <div className="obs-list-head label"><span>Obiekt</span><button type="button" onClick={onSort} aria-label={`Sortuj według odległości ${descending ? 'rosnąco' : 'malejąco'}`}>Od Ziemi · {descending ? 'malejąco' : 'rosnąco'}</button></div>
    <div ref={scrollRef} className="obs-list-scroll" role="grid" aria-label="Obiekty zdjęcia według grup i odległości" aria-rowcount={rows.length} aria-colcount={2}
      aria-activedescendant={virtualRows.some((row) => row.index === index) ? `obs-row-${index}` : undefined} tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
        e.preventDefault()
        const step = index < 0 || e.key === 'ArrowDown' ? 1 : -1
        let next = index + step
        while (rows[next] && 'category' in rows[next]) next += step
        const entry = rows[next]
        if (entry && 'item' in entry) onSelect(entry.item.id)
      }}>
      <div role="presentation" style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualRows.map((row) => {
          const entry = rows[row.index]
          const style = { transform: `translateY(${row.start}px)`, height: row.size }
          if ('category' in entry) {
            const { category, count, expanded } = entry
            return <div key={category} role="row" aria-rowindex={row.index + 1} className="obs-row obs-list-group" style={style}>
              <div role="gridcell" aria-colspan={2}>
                <button type="button" aria-expanded={expanded} onClick={() => setCollapsed((closed) =>
                  closed.includes(category) ? closed.filter((group) => group !== category) : [...closed, category])}>
                  <ChevronRight aria-hidden="true" size={14} />
                  {CATEGORY_LABELS[category]}
                  <span className="figures dim">{count}</span>
                </button>
              </div>
            </div>
          }
          const { item } = entry
          return <div key={item.id} id={`obs-row-${row.index}`} role="row" aria-rowindex={row.index + 1} aria-selected={item.id === selected} className={`obs-row${item.id === selected ? ' on' : ''}`}
            style={style} title={distanceTooltip(item)} onClick={() => onSelect(item.id)}>
            <span className={`obs-marker ${item.category}`} style={item.type ? { color: colors[item.type] ?? DEFAULT_ANNOTATION_COLORS[item.type] } : undefined} aria-hidden="true" />
            <span className="obs-row-name" role="gridcell"><span>{item.kind === 'star' ? item.id.replace('Gaia DR3 ', 'Gaia ') : item.id}</span><small>{itemKind(item)}</small></span>
            <span className="obs-row-dist figures" role="gridcell">{fmtDistance(item.distLy)}</span>
          </div>
        })}
      </div>
    </div>
  </div>
}
