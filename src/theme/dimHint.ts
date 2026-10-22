// Jednorazowa podpowiedź „Obniż jasność ekranu” po pierwszym włączeniu Red Mode (sekcja 8; aplikacja nie steruje
// podświetleniem). Znacznik w osobnym kluczu localStorage, poza zapisem preferencji interfejsu w plannerStore.

export const DIM_HINT_STORAGE_KEY = 'astrophotography-planner-dim-hint'

export interface HintStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

/** Czy podpowiedź była już pokazana; niedostępny localStorage = nie była. */
export function dimHintSeen(storage: HintStorage): boolean {
  try {
    return storage.getItem(DIM_HINT_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markDimHintSeen(storage: HintStorage): void {
  try {
    storage.setItem(DIM_HINT_STORAGE_KEY, '1')
  } catch {
    // Bez localStorage podpowiedź pojawi się znowu po ponownym uruchomieniu.
  }
}

export function shouldShowDimHint(redMode: boolean, seen: boolean): boolean {
  return redMode && !seen
}
