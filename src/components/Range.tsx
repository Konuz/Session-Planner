import type { CSSProperties, InputHTMLAttributes } from 'react'

/** Suwak z wypełnieniem toru po lewej stronie uchwytu (zmienna --fill czytana w app.css). */
export function Range({ min = 0, max = 100, value, style, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const lo = Number(min)
  const hi = Number(max)
  const pct = hi > lo ? ((Number(value) - lo) / (hi - lo)) * 100 : 0
  const fill = { '--fill': `${Math.max(0, Math.min(100, pct))}%` } as CSSProperties
  return <input type="range" min={min} max={max} value={value} style={{ ...style, ...fill }} {...rest} />
}
