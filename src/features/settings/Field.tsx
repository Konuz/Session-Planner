// Pole formularza w Ustawieniach: etykieta, pole i pod nim błąd albo podpowiedź.
import type { ReactNode } from 'react'

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      {children}
      {error ? <span className="text-alert">{error}</span> : hint && <span>{hint}</span>}
    </label>
  )
}
