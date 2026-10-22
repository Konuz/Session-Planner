import { describe, expect, it } from 'vitest'
import { DIM_HINT_STORAGE_KEY, dimHintSeen, markDimHintSeen, shouldShowDimHint } from './dimHint'

class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

const broken = {
  getItem: (): string | null => {
    throw new Error('brak dostępu')
  },
  setItem: () => {
    throw new Error('brak dostępu')
  },
}

describe('jednorazowa podpowiedź „Obniż jasność ekranu” (sekcja 8)', () => {
  it('pokazywana tylko w Red Mode i tylko raz', () => {
    const storage = new MemoryStorage()
    expect(shouldShowDimHint(false, dimHintSeen(storage))).toBe(false)
    expect(shouldShowDimHint(true, dimHintSeen(storage))).toBe(true)
    markDimHintSeen(storage)
    expect(storage.values.get(DIM_HINT_STORAGE_KEY)).toBe('1')
    expect(shouldShowDimHint(true, dimHintSeen(storage))).toBe(false)
  })

  it('klucz poza zapisem preferencji interfejsu (zustand)', () => {
    expect(DIM_HINT_STORAGE_KEY).not.toBe('astrophotography-planner-ui')
  })

  it('niedostępny localStorage: podpowiedź pokazana, zapis bez wyjątku', () => {
    expect(dimHintSeen(broken)).toBe(false)
    expect(() => markDimHintSeen(broken)).not.toThrow()
  })
})
