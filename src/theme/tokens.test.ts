import { describe, expect, it } from 'vitest'
import { redMode, themeVariables } from './tokens'

/** Składowe [R, G, B, A] koloru zapisanego jako #RRGGBB albo rgb()/rgba(). */
function channels(color: string): [number, number, number, number] {
  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color)
  if (hex) return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16), 1]
  const fn = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(color)
  if (fn) return [Number(fn[1]), Number(fn[2]), Number(fn[3]), fn[4] === undefined ? 1 : Number(fn[4])]
  throw new Error(`Nieobsługiwany zapis koloru: ${color}`)
}

describe('T15 Red Mode', () => {
  it.each(Object.entries(redMode))('token %s (%s) ma G = 0, B = 0 i pełne krycie', (_, color) => {
    const [, g, b, a] = channels(color)
    expect([g, b, a]).toEqual([0, 0, 1])
  })
})

describe('zmienne CSS generowane z tokenów', () => {
  const vars = themeVariables()

  it('klasa red-mode na <html> nadpisuje każdą zmienną z :root', () => {
    expect(Object.keys(vars['html.red-mode']).sort()).toEqual(Object.keys(vars[':root']).sort())
  })

  it('mgławica refleksyjna: błękit w Dark Cosmos, czerwień w Red Mode', () => {
    expect(vars[':root']['--token-reflection-nebula']).toBe('#60A5FA')
    expect(vars['html.red-mode']['--token-reflection-nebula']).toBe('#FF0000')
  })

  it('karta: rozmycie tła 12 px, w Red Mode bez rozmycia', () => {
    expect(vars[':root']['--token-card-blur']).toBe('12px')
    expect(vars['html.red-mode']['--token-card-blur']).toBe('0px')
  })
})
