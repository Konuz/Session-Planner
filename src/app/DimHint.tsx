// Jednorazowa podpowiedź „Obniż jasność ekranu” po włączeniu Red Mode (sekcja 8). Komponent słucha przełączenia
// w plannerStore (subskrypcja w efekcie), więc render statyczny (testy w Node) niczego nie pokazuje i nie dotyka
// localStorage. Red Mode włączony w poprzedniej sesji podpowiedź pokazał już wtedy.
import { SunDim, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePlannerStore } from '../state/plannerStore'
import { dimHintSeen, markDimHintSeen, shouldShowDimHint } from '../theme/dimHint'

export function DimHint() {
  const [visible, setVisible] = useState(false)

  useEffect(
    () =>
      usePlannerStore.subscribe((state, previous) => {
        if (state.redMode === previous.redMode) return
        if (!shouldShowDimHint(state.redMode, dimHintSeen(localStorage))) {
          setVisible(false)
          return
        }
        markDimHintSeen(localStorage)
        setVisible(true)
      }),
    [],
  )

  if (!visible) return null
  return (
    <div
      role="status"
      className="card fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-md items-center gap-3 p-3 text-sm md:bottom-6"
    >
      <SunDim aria-hidden size={22} className="shrink-0 text-accent" />
      <p className="flex-1">
        <strong className="font-semibold">Obniż jasność ekranu.</strong> Aplikacja nie steruje podświetleniem; zmniejsz je w
        ustawieniach systemu.
      </p>
      <button type="button" className="button min-w-11 justify-center" aria-label="Zamknij podpowiedź" onClick={() => setVisible(false)}>
        <X aria-hidden size={18} />
      </button>
    </div>
  )
}
