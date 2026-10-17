import { describe, expect, it } from 'vitest'
import { moonPhasePath } from './moonPhase'

// Oświetlona część tarczy: brzeg (półokrąg po stronie oświetlonej) i terminator (półelipsa o półosi r·|1 − 2f|).
describe('ikona fazy Księżyca', () => {
  it('przybywa, sierp 25%: oświetlona prawa strona, terminator wygięty w prawo', () => {
    expect(moonPhasePath(10, 10, 10, 0.25, true)).toBe('M 10 0 A 10 10 0 0 1 10 20 A 5 10 0 0 0 10 0 Z')
  })

  it('przybywa, garb 75%: terminator wygięty w lewo', () => {
    expect(moonPhasePath(10, 10, 10, 0.75, true)).toBe('M 10 0 A 10 10 0 0 1 10 20 A 5 10 0 0 1 10 0 Z')
  })

  it('ubywa, sierp 25%: oświetlona lewa strona', () => {
    expect(moonPhasePath(10, 10, 10, 0.25, false)).toBe('M 10 0 A 10 10 0 0 0 10 20 A 5 10 0 0 1 10 0 Z')
  })

  it('ubywa, garb 75%', () => {
    expect(moonPhasePath(10, 10, 10, 0.75, false)).toBe('M 10 0 A 10 10 0 0 0 10 20 A 5 10 0 0 0 10 0 Z')
  })

  it('kwadra: terminator prosty; pełnia: cała tarcza', () => {
    expect(moonPhasePath(10, 10, 10, 0.5, true)).toBe('M 10 0 A 10 10 0 0 1 10 20 A 0 10 0 0 1 10 0 Z')
    expect(moonPhasePath(10, 10, 10, 1, true)).toBe('M 10 0 A 10 10 0 0 1 10 20 A 10 10 0 0 1 10 0 Z')
  })
})
