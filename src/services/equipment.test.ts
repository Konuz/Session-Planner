import { describe, expect, it } from 'vitest'
import { BUILTIN_CAMERAS, BUILTIN_TELESCOPES, REDUCER_PRESETS } from '../data/equipmentCatalog'
import { defined } from '../test/fixtures'
import {
  changedCameraFields,
  changedTelescopeFields,
  findSpec,
  hasErrors,
  parseDecimal,
  validateEquipment,
  type FieldIssue,
} from './equipment'

const fieldsWith = (issues: FieldIssue[], severity: FieldIssue['severity']) =>
  issues.filter((issue) => issue.severity === severity).map((issue) => issue.field)

describe('T19 walidacja pól (7F)', () => {
  it('apertura 0 → błąd', () => {
    expect(fieldsWith(validateEquipment({ apertureMm: 0 }), 'error')).toEqual(['apertureMm'])
  })

  it('rozmiar piksela 0,5 µm → błąd', () => {
    expect(fieldsWith(validateEquipment({ pixelSizeUm: parseDecimal('0,5') }), 'error')).toEqual(['pixelSizeUm'])
  })

  it('mnożnik 4 → błąd', () => {
    expect(fieldsWith(validateEquipment({ reducerFactor: 4 }), 'error')).toEqual(['reducerFactor'])
  })

  it('rozdzielczość 1000,5 px → błąd', () => {
    expect(fieldsWith(validateEquipment({ resolutionXPx: parseDecimal('1000,5') }), 'error')).toEqual(['resolutionXPx'])
  })

  it('ogniskowa 400 mm przy aperturze 500 mm (f/0,8) → ostrzeżenie, zapis możliwy', () => {
    const issues = validateEquipment({ apertureMm: 500, focalLengthMm: 400 })
    expect(fieldsWith(issues, 'warning')).toEqual(['focalLengthMm'])
    expect(hasErrors(issues)).toBe(false)
  })

  it('„3,76” i „3.76” dają 3,76 µm', () => {
    expect(parseDecimal('3,76')).toBe(3.76)
    expect(parseDecimal('3.76')).toBe(3.76)
  })
})

describe('walidacja pól: granice i wpisy, które nie są liczbą', () => {
  it('wartości na granicach zakresów są dozwolone', () => {
    expect(validateEquipment({ apertureMm: 1500, reducerFactor: 0.3, resolutionXPx: 20_000, resolutionYPx: 100, pixelSizeUm: 1 })).toEqual([])
    expect(validateEquipment({ focalLengthMm: 10_000, reducerFactor: 3, pixelSizeUm: 1 })).toEqual([])
  })

  it('tekst, który nie jest liczbą, daje błąd pola', () => {
    expect(parseDecimal('3,7,6')).toBeNull()
    expect(parseDecimal('')).toBeNull()
    expect(fieldsWith(validateEquipment({ focalLengthMm: parseDecimal('abc') }), 'error')).toEqual(['focalLengthMm'])
  })

  it('f/ powyżej 30 → ostrzeżenie', () => {
    expect(fieldsWith(validateEquipment({ apertureMm: 50, focalLengthMm: 1600 }), 'warning')).toEqual(['focalLengthMm'])
  })

  it('dłuższy bok matrycy > 60 mm → ostrzeżenie przy rozmiarze piksela', () => {
    const issues = validateEquipment({ resolutionXPx: 10_000, resolutionYPx: 7000, pixelSizeUm: 6.1 })
    expect(fieldsWith(issues, 'warning')).toEqual(['pixelSizeUm'])
    expect(hasErrors(issues)).toBe(false)
  })

  it('bez ostrzeżeń wyliczanych z pól, które mają błąd', () => {
    expect(validateEquipment({ apertureMm: 0, focalLengthMm: 400 })).toMatchObject([{ field: 'apertureMm', severity: 'error' }])
  })
})

describe('porównanie z wpisem katalogu (7F, Z26)', () => {
  const esprit = defined(findSpec(BUILTIN_TELESCOPES, 'skywatcher-esprit-100ed'))
  const asi6200 = defined(findSpec(BUILTIN_CAMERAS, 'zwo-asi6200mm-pro'))

  it('profil z wartościami z katalogu nie ma zmian', () => {
    expect(changedTelescopeFields({ specId: esprit.id, label: 'Esprit', apertureMm: 100, focalLengthMm: 550 }, esprit)).toEqual([])
  })

  it('zmiana ogniskowej w profilu oznacza pole jako zmienione względem katalogu i nie zmienia wpisu', () => {
    const profileTelescope = { specId: esprit.id, label: 'Esprit', apertureMm: 100, focalLengthMm: 530 }
    expect(changedTelescopeFields(profileTelescope, esprit)).toEqual(['focalLengthMm'])
    expect(esprit.focalLengthMm).toBe(550)
  })

  it('kamera: zmieniony rozmiar piksela', () => {
    const camera = { specId: asi6200.id, label: 'ASI6200', sensor: 'mono' as const, resolutionXPx: 9576, resolutionYPx: 6388, pixelSizeUm: 3.8, binning: 1 as const }
    expect(changedCameraFields(camera, asi6200)).toEqual(['pixelSizeUm'])
  })

  it('specId bez odpowiadającego wpisu jest traktowany jak wpis ręczny', () => {
    expect(findSpec(BUILTIN_TELESCOPES, 'usuniety-wpis')).toBeNull()
    expect(findSpec(BUILTIN_TELESCOPES, null)).toBeNull()
  })
})

// Kolumna „f/” z załącznika B.
const FOCAL_RATIO: Record<string, number> = {
  'william-optics-redcat-51': 4.9,
  'william-optics-redcat-61': 4.92,
  'william-optics-redcat-71': 4.93,
  'william-optics-zenithstar-61-ii': 5.9,
  'william-optics-zenithstar-73-iii': 5.89,
  'william-optics-gt81-iv': 5.9,
  'william-optics-flt-91': 5.93,
  'skywatcher-evostar-72ed': 5.83,
  'skywatcher-evostar-80ed': 7.5,
  'skywatcher-evostar-100ed': 9,
  'skywatcher-esprit-80ed': 5,
  'skywatcher-esprit-100ed': 5.5,
  'skywatcher-esprit-120ed': 7,
  'skywatcher-esprit-150ed': 7,
  'skywatcher-explorer-130pds': 5,
  'skywatcher-explorer-150pds': 5,
  'skywatcher-explorer-200pds': 5,
  'skywatcher-quattro-200p': 4,
  'askar-fra400': 5.56,
  'askar-fra500': 5.56,
  'askar-fra600': 5.56,
  'celestron-rasa-8': 1.97,
  'celestron-rasa-11': 2.22,
  'celestron-c8': 10.01,
  'celestron-edgehd-8': 10.01,
  'celestron-edgehd-11': 10.04,
  'takahashi-fsq-85ed': 5.29,
  'takahashi-fsq-106edx4': 5,
  'takahashi-epsilon-130d': 3.31,
  'gso-rc-6': 9.01,
  'gso-rc-8': 8,
  'samyang-135mm-f2': 2,
}

// Kolumna „Wymiary matrycy [mm]” z załącznika B.
const SENSOR_MM: Record<string, [number, number]> = {
  'zwo-asi2600mc-pro': [23.49, 15.7],
  'zwo-asi2600mm-pro': [23.49, 15.7],
  'zwo-asi533mc-pro': [11.31, 11.31],
  'zwo-asi533mm-pro': [11.31, 11.31],
  'zwo-asi294mc-pro': [19.19, 13.07],
  'zwo-asi183mc-pro': [13.19, 8.81],
  'zwo-asi183mm-pro': [13.19, 8.81],
  'zwo-asi1600mm-pro': [17.69, 13.38],
  'zwo-asi6200mc-pro': [36.01, 24.02],
  'zwo-asi6200mm-pro': [36.01, 24.02],
  'zwo-asi071mc-pro': [23.63, 15.7],
  'zwo-asi585mc-pro': [11.14, 6.26],
  'zwo-asi2400mc-pro': [36.07, 24.01],
  'player-one-ares-c-pro': [11.31, 11.31],
  'player-one-ares-m-pro': [11.31, 11.31],
  'player-one-poseidon-c-pro': [23.51, 15.7],
  'player-one-poseidon-m-pro': [23.51, 15.7],
  'player-one-uranus-c-pro': [11.18, 6.32],
  'qhyccd-qhy268c': [23.51, 15.7],
  'qhyccd-qhy268m': [23.51, 15.7],
  'qhyccd-qhy533c': [11.31, 11.31],
  'qhyccd-qhy533m': [11.31, 11.31],
  'qhyccd-qhy600m': [36.01, 24.02],
  'canon-eos-6d': [35.79, 23.86],
  'canon-eos-r': [36.02, 24.01],
  'nikon-z6-ii': [35.93, 23.9],
  'sony-a7-iii': [35.58, 23.72],
}

describe('T20 katalog sprzętu (6.5)', () => {
  it('zawiera wszystkie wpisy z załącznika B i tylko je', () => {
    expect(BUILTIN_TELESCOPES.map((spec) => spec.id).sort()).toEqual(Object.keys(FOCAL_RATIO).sort())
    expect(BUILTIN_CAMERAS.map((spec) => spec.id).sort()).toEqual(Object.keys(SENSOR_MM).sort())
  })

  it('identyfikatory są unikalne', () => {
    const ids = [...BUILTIN_TELESCOPES, ...BUILTIN_CAMERAS].map((spec) => spec.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('wszystkie wartości mieszczą się w zakresach z 7F', () => {
    for (const { apertureMm, focalLengthMm } of BUILTIN_TELESCOPES) {
      expect(validateEquipment({ apertureMm, focalLengthMm })).toEqual([])
    }
    for (const { resolutionXPx, resolutionYPx, pixelSizeUm } of BUILTIN_CAMERAS) {
      expect(validateEquipment({ resolutionXPx, resolutionYPx, pixelSizeUm })).toEqual([])
    }
    for (const { factor } of REDUCER_PRESETS) {
      expect(validateEquipment({ reducerFactor: factor })).toEqual([])
    }
  })

  it('pola wyliczeniowe mają dozwolone wartości, a wpisy są wbudowane', () => {
    const designs = ['refractor', 'newtonian', 'sct', 'rasa', 'ritchey_chretien', 'camera_lens', 'other']
    for (const spec of BUILTIN_TELESCOPES) {
      expect(designs).toContain(spec.design)
      expect(spec.origin).toBe('builtin')
    }
    for (const spec of BUILTIN_CAMERAS) {
      expect(['mono', 'osc']).toContain(spec.sensor)
      expect(spec.origin).toBe('builtin')
    }
  })

  it.each(BUILTIN_TELESCOPES.map((spec) => [spec.id, spec] as const))('%s: f/ zgodne z załącznikiem B', (id, spec) => {
    expect(spec.focalLengthMm / spec.apertureMm).toBeCloseTo(FOCAL_RATIO[id], 2)
  })

  it.each(BUILTIN_CAMERAS.map((spec) => [spec.id, spec] as const))('%s: wymiary matrycy zgodne z załącznikiem B', (id, spec) => {
    const [widthMm, heightMm] = SENSOR_MM[id]
    expect((spec.resolutionXPx * spec.pixelSizeUm) / 1000).toBeCloseTo(widthMm, 2)
    expect((spec.resolutionYPx * spec.pixelSizeUm) / 1000).toBeCloseTo(heightMm, 2)
  })
})
