import { describe, expect, it } from 'vitest'
import { parseDecCoordinate, parseRaCoordinate } from './coordinates'
import { readResponseText } from '../../server/readResponseText.ts'

describe('wpisywanie współrzędnych kadru (B21)', () => {
  it('RA: godziny, stopnie dziesiętne i sześćdziesiątkowe, prefiks i przecinek', () => {
    expect(parseRaCoordinate('00h 42m 44.3s')).toBeCloseTo(10.6846, 3)
    expect(parseRaCoordinate('RA: 12:30:00')).toBe(187.5)
    expect(parseRaCoordinate('0,7123h')).toBeCloseTo(10.6845, 3)
    expect(parseRaCoordinate('10.6846')).toBeCloseTo(10.6846, 4)
    expect(parseRaCoordinate('10°41′04″')).toBeCloseTo(10.6844, 3)
    expect(parseRaCoordinate('24h')).toBe(0)
  })

  it('RA: odrzuca wartości ujemne, poza zakresem i błędne minuty', () => {
    for (const bad of ['', 'abc', '-1', '361', '25h', '12 60 00', '12.5 30', '1 2 3 4']) expect(parseRaCoordinate(bad), bad).toBeNull()
  })

  it('Dec: znak także dla −0°, minus typograficzny i przecinek', () => {
    expect(parseDecCoordinate('+41° 16′ 09″')).toBeCloseTo(41.2692, 3)
    expect(parseDecCoordinate('−00 30 00')).toBe(-0.5)
    expect(parseDecCoordinate('Dec = -5,39')).toBeCloseTo(-5.39, 6)
    expect(parseDecCoordinate('-90')).toBe(-90)
  })

  it('Dec: odrzuca wartości poza ±90° i błędne minuty', () => {
    for (const bad of ['', '91', '-90 00 01', '45 61', 'x']) expect(parseDecCoordinate(bad), bad).toBeNull()
  })
})

it('readResponseText składa znak UTF-8 rozcięty między fragmenty strumienia (B21)', async () => {
  const bytes = new TextEncoder().encode('Mgławica Ślimak')
  const cut = bytes.indexOf(0xc5) + 1 // w środku dwubajtowego „ł”
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.slice(0, cut))
      controller.enqueue(bytes.slice(cut))
      controller.close()
    },
  })
  expect(await readResponseText(new Response(body), 1024)).toBe('Mgławica Ślimak')
})
