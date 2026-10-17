import { useId } from 'react'

/** Unikalne id elementu SVG bez znaków specjalnych z useId(), bezpieczne w odwołaniach url(#…). */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^\w-]/g, '')}`
}
