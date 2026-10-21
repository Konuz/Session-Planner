// Panel filtrów i sortowania katalogu (7A). Komponent prezentacyjny: katalog, stan filtrów i sortowanie dostaje
// przez właściwości, a zmiany zgłasza przez `onFiltersChange` i `onSortChange`.
import { useMemo, type ReactNode } from 'react'
import { DEFAULT_CATALOG_FILTERS, type CatalogFilterState, type NumberRange } from '../../services/catalogFilters'
import type { CatalogSortKey } from '../../services/catalogSort'
import type { CatalogId, DsoObject, DsoType } from '../../types'
import { DSO_TYPES } from './objectCardModel'

export interface CatalogPanelProps {
  /** Cały katalog (z `loadCatalog`), np. do listy gwiazdozbiorów. */
  catalog: readonly DsoObject[]
  /** Stan filtrów. */
  filters: CatalogFilterState
  /** Klucz sortowania. */
  sort: CatalogSortKey
  /** Nowy stan filtrów po zmianie w panelu. */
  onFiltersChange: (filters: CatalogFilterState) => void
  /** Nowy klucz sortowania po zmianie w panelu. */
  onSortChange: (sort: CatalogSortKey) => void
}

const SORT_OPTIONS: readonly { key: CatalogSortKey; label: string }[] = [
  { key: 'effectiveTime', label: 'czas efektywny' },
  { key: 'transit', label: 'godzina górowania' },
  { key: 'size', label: 'rozmiar' },
  { key: 'magnitude', label: 'jasność' },
  { key: 'frameFit', label: 'dopasowanie do kadru' },
]

const CATALOGS: readonly { value: CatalogId; label: string }[] = [
  { value: 'M', label: 'M' },
  { value: 'NGC', label: 'NGC' },
  { value: 'IC', label: 'IC' },
  { value: 'Sh2', label: 'Sh2' },
  { value: 'VdB', label: 'vdB' },
  { value: 'LDN', label: 'LDN' },
  { value: 'LBN', label: 'LBN' },
  { value: 'B', label: 'B' },
  { value: 'Simeis', label: 'Simeis' },
  { value: 'SNR-G', label: 'SNR (G…)' },
  { value: 'Other', label: 'inne' },
]

const TYPES = Object.entries(DSO_TYPES).map(([value, { label }]) => ({ value: value as DsoType, label }))

/** Zakresy po włączeniu filtra jasności [mag] i rozmiaru [′]. */
const MAGNITUDE_RANGE: NumberRange = { min: 0, max: 12 }
const SIZE_RANGE: NumberRange = { min: 5, max: 120 }

const toggled = <T,>(values: readonly T[], value: T): T[] =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value]

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="chip min-h-11">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
      {label}
    </label>
  )
}

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col">
      <legend className="mb-2 text-xs text-muted">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  )
}

function Range({ label, range, initial, step, onChange }: {
  label: string
  range: NumberRange | null
  initial: NumberRange
  step: number
  onChange: (range: NumberRange | null) => void
}) {
  const bound = (key: keyof NumberRange, text: string) =>
    range && (
      <label className="flex flex-1 items-center gap-2 text-muted">
        {text}
        <input
          type="number"
          className="control w-full min-w-0"
          step={step}
          defaultValue={range[key]}
          onChange={(event) => {
            const value = event.currentTarget.valueAsNumber
            if (Number.isFinite(value)) onChange({ ...range, [key]: value })
          }}
        />
      </label>
    )
  return (
    <>
      <Check label={label} checked={range !== null} onChange={(on) => onChange(on ? initial : null)} />
      {range && (
        <div className="flex w-full gap-3 pt-1">
          {bound('min', 'od')}
          {bound('max', 'do')}
        </div>
      )}
    </>
  )
}

export function CatalogPanel({ catalog, filters, sort, onFiltersChange, onSortChange }: CatalogPanelProps) {
  const constellations = useMemo(() => [...new Set(catalog.map((object) => object.constellation))].sort(), [catalog])
  const change = (patch: Partial<CatalogFilterState>) => onFiltersChange({ ...filters, ...patch })
  return (
    <section aria-label="Filtry i sortowanie" className="card flex flex-col gap-5 p-4 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Sortowanie</span>
        <select className="control" value={sort} onChange={(event) => onSortChange(event.currentTarget.value as CatalogSortKey)}>
          {SORT_OPTIONS.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <Group legend="Katalog">
        {CATALOGS.map(({ value, label }) => (
          <Check
            key={value}
            label={label}
            checked={filters.catalogs.includes(value)}
            onChange={() => change({ catalogs: toggled(filters.catalogs, value) })}
          />
        ))}
      </Group>
      <Group legend="Typ">
        {TYPES.map(({ value, label }) => (
          <Check
            key={value}
            label={label}
            checked={filters.types.includes(value)}
            onChange={() => change({ types: toggled(filters.types, value) })}
          />
        ))}
      </Group>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Gwiazdozbiór</span>
        <select
          className="control"
          value={filters.constellation ?? ''}
          onChange={(event) => change({ constellation: event.currentTarget.value || null })}
        >
          <option value="">wszystkie</option>
          {constellations.map((constellation) => (
            <option key={constellation} value={constellation}>
              {constellation}
            </option>
          ))}
        </select>
      </label>
      <Group legend="Jasność V [mag]">
        <Range label="ogranicz jasność" range={filters.magnitude} initial={MAGNITUDE_RANGE} step={0.1} onChange={(magnitude) => change({ magnitude })} />
        <Check
          label="pokaż obiekty bez jasności"
          checked={filters.showWithoutMagnitude}
          onChange={(showWithoutMagnitude) => change({ showWithoutMagnitude })}
        />
      </Group>
      <Group legend="Wielka oś [′]">
        <Range label="ogranicz wielkość" range={filters.size} initial={SIZE_RANGE} step={1} onChange={(size) => change({ size })} />
      </Group>
      <Group legend="Noc i zestaw">
        <Check label="Widoczne w wybraną noc" checked={filters.visibleTonight} onChange={(visibleTonight) => change({ visibleTonight })} />
        <Check label="Pasuje do kadru" checked={filters.fitsFrame} onChange={(fitsFrame) => change({ fitsFrame })} />
        <Check
          label="Polecane na miesiąc"
          checked={filters.recommendedThisMonth ?? false}
          onChange={(recommendedThisMonth) => change({ recommendedThisMonth })}
        />
      </Group>
      <button type="button" className="button" onClick={() => onFiltersChange(DEFAULT_CATALOG_FILTERS)}>
        Wyczyść filtry
      </button>
    </section>
  )
}
