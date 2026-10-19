// Pole sekcji „Sprzęt”: etykieta, pole i pod nim wszystkie napisy pola naraz (błąd, ostrzeżenie, „zmienione względem
// katalogu”), każdy z własnym tekstem.
import type { ReactNode } from 'react'

export interface FieldNote {
  severity: 'error' | 'warning' | 'note'
  message: string
}

export function MessageField({ label, issues, children }: { label: string; issues: readonly FieldNote[]; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      {children}
      {issues.map((issue) => (
        <span key={issue.message} className={issue.severity === 'error' ? 'text-accent' : undefined}>
          {issue.message}
        </span>
      ))}
    </label>
  )
}
