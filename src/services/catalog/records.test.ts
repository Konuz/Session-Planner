import { describe, expect, it } from 'vitest'
import type { Designation } from '../../types'
import { formatDesignation } from './records'

describe('zapis oznaczeń (sekcja 5)', () => {
  it.each([
    [{ catalog: 'M', id: '42' }, 'M 42'],
    [{ catalog: 'NGC', id: '1976' }, 'NGC 1976'],
    [{ catalog: 'IC', id: '1396' }, 'IC 1396'],
    [{ catalog: 'Sh2', id: '240' }, 'Sh2-240'],
    [{ catalog: 'VdB', id: '141' }, 'vdB 141'],
    [{ catalog: 'LDN', id: '1235' }, 'LDN 1235'],
    [{ catalog: 'LBN', id: '437' }, 'LBN 437'],
    [{ catalog: 'B', id: '33' }, 'B 33'],
    [{ catalog: 'Simeis', id: '147' }, 'Simeis 147'],
    [{ catalog: 'SNR-G', id: 'G180.0-01.7' }, 'G180.0-01.7'],
    [{ catalog: 'Other', id: 'Mel 22' }, 'Mel 22'],
  ] satisfies [Designation, string][])('%o → %s', (designation, text) => {
    expect(formatDesignation(designation)).toBe(text)
  })
})
