import { describe, expect, it } from 'vitest'
import { formatCount, formatDeg, formatNightLabel, formatPercent } from './format'

describe('formaty pl-PL [Z4]', () => {
  it('stopnie z przecinkiem dziesiętnym i znakiem minus', () => {
    expect(formatDeg(79.42)).toBe('79,4°')
    expect(formatDeg(-14.57)).toBe('−14,6°')
    expect(formatDeg(193.58, 0)).toBe('194°')
    expect(formatDeg(-0.04)).toBe('0,0°')
  })

  it('procent oświetlenia', () => {
    expect(formatPercent(0.338)).toBe('34%')
    expect(formatPercent(0.98)).toBe('98%')
  })

  it('noc D jako „16/17.10.2026”, także na przełomie miesiąca i roku', () => {
    expect(formatNightLabel('2026-10-16')).toBe('16/17.10.2026')
    expect(formatNightLabel('2026-10-31')).toBe('31.10/1.11.2026')
    expect(formatNightLabel('2026-12-31')).toBe('31.12.2026/1.01.2027')
  })
})

describe('liczebniki', () => {
  const POINTS = ['punkt', 'punkty', 'punktów'] as const

  it.each([
    [0, '0 punktów'],
    [1, '1 punkt'],
    [2, '2 punkty'],
    [4, '4 punkty'],
    [5, '5 punktów'],
    [12, '12 punktów'],
    [22, '22 punkty'],
    [24, '24 punkty'],
    [25, '25 punktów'],
    [112, '112 punktów'],
  ])('%s → %s', (count, text) => {
    expect(formatCount(count, POINTS)).toBe(text)
  })
})
