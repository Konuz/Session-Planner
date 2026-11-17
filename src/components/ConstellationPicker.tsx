import { Select } from './Select'

export interface ConstellationOption {
  value: string
  label: string
}

/** Lista rozwijana gwiazdozbiorów oparta na wspólnym komponencie Select. */
export function ConstellationPicker({
  value,
  options,
  onChange,
  allValue = 'all',
  allLabel = 'Wszystkie gwiazdozbiory',
  ariaLabel = 'Gwiazdozbiór w przestrzeni 3D',
  buttonClassName = 'control constellation-select',
  showArrow = false,
}: {
  value: string
  options: ConstellationOption[]
  onChange(value: string): void
  allValue?: string
  allLabel?: string
  ariaLabel?: string
  buttonClassName?: string
  showArrow?: boolean
}) {
  return (
    <Select
      value={value}
      options={[{ value: allValue, label: allLabel }, ...options]}
      onChange={onChange}
      ariaLabel={ariaLabel}
      className={buttonClassName}
      showArrow={showArrow}
      listClassName="constellation-list"
    />
  )
}
