import { describe, expect, it } from 'vitest'
import { fieldId, fieldObject, fieldOf, isField, isFieldName, sanitizeField } from './fieldTarget'
import { exposureCsv, ninaCsv, schedulerCsv } from './nina'
import { readSavedPlan } from './planImport'

describe('swobodne pole', () => {
  const field = { raDeg: 83.8221, decDeg: -5.3911 }

  it('udaje obiekt z indeksem −1, gwiazdozbiorem z pozycji i oznaczeniem ze współrzędnych', () => {
    const o = fieldObject(field)
    expect(o.i).toBe(-1)
    expect(isField(o)).toBe(true)
    expect(o.con).toBe('Ori')
    expect(o.id).toBe(fieldId(field))
    expect(o.id).toBe('Pole 5h 35m 17s −5° 23′ 28″')
    expect(isFieldName(o.id)).toBe(true)
    expect(isFieldName('M 42')).toBe(false)
    expect(fieldOf(o)).toEqual(field)
    expect(fieldOf({ ...o, i: 7 })).toBeUndefined()
  })

  it('odrzuca uszkodzone współrzędne z zapisu, RA sprowadza do 0–360°', () => {
    expect(sanitizeField({ raDeg: 370, decDeg: 10 })).toEqual({ raDeg: 10, decDeg: 10 })
    expect(sanitizeField({ raDeg: 10, decDeg: 91 })).toBeNull()
    expect(sanitizeField({ raDeg: Number.NaN, decDeg: 0 })).toBeNull()
    expect(sanitizeField('x')).toBeNull()
    expect(sanitizeField(null)).toBeNull()
  })

  it('wraca z eksportu planu jako pole, nie jako brakujący obiekt katalogu', () => {
    const target = { name: fieldId(field), raDeg: field.raDeg, decDeg: field.decDeg, paDeg: 30 }
    const expected = {
      objectId: fieldId(field), objectIndex: -1, field: { raDeg: expect.closeTo(field.raDeg, 3), decDeg: expect.closeTo(field.decDeg, 3) },
      framing: { raDeg: null, decDeg: null, paDeg: 30 },
    }
    for (const csv of [ninaCsv([target]), schedulerCsv([{ ...target, type: 'Swobodne pole' }])]) {
      const [item] = readSavedPlan(csv, [], 'OSC')
      expect(item).toMatchObject(expected)
      // Współrzędne z pliku są zaokrąglone do 1″, oznaczenie pochodzi z odczytanego pola.
      expect(item.objectId).toBe(fieldId(item.field!))
    }
    const exposures = [{ filter: 'Ha', count: 10, seconds: 300 }]
    const [item] = readSavedPlan(exposureCsv([{ ...target, exposures, startMs: null, endMs: null, note: '' }], 'Europe/Warsaw'), [], 'OSC')
    expect(item).toMatchObject({ ...expected, exposures, filters: 'Ha' })
  })
})
