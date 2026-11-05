import { Search } from 'lucide-react'
import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { displayName, quickSearch, TYPE_INFO, type DSO } from '../lib/catalog'
import { useCatalog } from '../state/data'
import { useStore } from '../state/store'

/** Szybkie wyszukiwanie obiektu (oznaczenie lub nazwa) z klawiaturą. */
export function ObjectSearch({ onPick, placeholder = 'Szukaj obiektu: M 51, NGC 7000, Wir…' }: { onPick?: (o: DSO) => void; placeholder?: string }) {
  const { catalog } = useCatalog()
  const select = useStore((s) => s.select)
  const [q, setQ] = useState('')
  const deferredQ = useDeferredValue(q)
  const [open, setOpen] = useState(false)
  const [hl, setHl] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => catalog ? quickSearch(catalog, deferredQ) : [], [catalog, deferredQ])

  const pick = (o: DSO) => {
    select(o.i, true)
    onPick?.(o)
    setQ('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className="search-box">
      <Search size={15} />
      <input
        ref={inputRef}
        className="control"
        placeholder={catalog ? placeholder : 'Wczytywanie katalogu…'}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setHl(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setHl((h) => Math.min(results.length - 1, h + 1))
          else if (e.key === 'ArrowUp') setHl((h) => Math.max(0, h - 1))
          else if (e.key === 'Enter' && results[hl]) pick(results[hl])
          else if (e.key === 'Escape') setOpen(false)
        }}
        aria-label="Szukaj obiektu"
      />
      {open && results.length > 0 && (
        <div className="search-results" role="listbox">
          {results.map((o, i) => (
            <button key={o.i} className={i === hl ? 'hl' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o)} role="option" aria-selected={i === hl}>
              <span style={{ width: 8, height: 8, background: TYPE_INFO[o.type].color, flex: 'none' }} />
              <b className="mono" style={{ minWidth: 86 }}>{o.id}</b>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{displayName(o) || <span className="dim">{TYPE_INFO[o.type].label}</span>}</span>
              <span className="dim mono" style={{ fontSize: 11 }}>{o.con}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
