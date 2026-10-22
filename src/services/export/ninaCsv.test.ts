import { describe, expect, it } from 'vitest'
import { DEFAULT_PROFILE_ID, DEMO_PROFILES } from '../../data/demo'
import type { EquipmentProfile, Framing } from '../../types'
import { angularSeparationDeg, type EquatorialDeg } from '../astroMath'
import { mosaicPanels } from '../framing'
import { formatDecNina, formatPaNina, formatRaNina, MOSAIC_NEEDS_PROFILE, NINA_CSV_HEADER, ninaCsv, ninaPanes } from './ninaCsv'

const MY_SET = DEMO_PROFILES.find((profile) => profile.id === DEFAULT_PROFILE_ID) as EquipmentProfile
const REDCAT = DEMO_PROFILES.find((profile) => profile.id === 'demo-redcat51-asi2600mc') as EquipmentProfile

/** M 31 z T7: RA 00:42:44.3, Dec +41:16:09 (J2000). */
const M31: EquatorialDeg = { raDeg: (42 / 60 + 44.3 / 3600) * 15, decDeg: 41 + 16 / 60 + 9 / 3600 }

const framing = (center: EquatorialDeg, paDeg: number, cols = 1, rows = 1): Framing => ({
  centerRaDeg: center.raDeg,
  centerDecDeg: center.decDeg,
  paDeg,
  mosaic: { cols, rows, overlapPct: 20 },
})

// Parser z regułami N.I.N.A. (T14, SimpleSequenceVM.ImportTargets + AstroUtil.HMSToDegrees / DMSToDegrees), niezależny
// od eksportu: nagłówki małymi literami i bez spacji na brzegach, liczby wyrażeniem [0-9.]+, minus w dowolnym miejscu
// pola = znak ujemny, kąt modulo 360, kropka dziesiętna (InvariantCulture).
function sexagesimalField(field: string): number {
  const [whole, minutes = 0, seconds = 0] = (field.match(/[0-9.]+/g) ?? []).map(Number)
  const value = whole + minutes / 60 + seconds / 3600
  return field.includes('-') ? -value : value
}

function parseNinaCsv(text: string) {
  const [header, ...lines] = text.split(/\r\n|\n/).filter((line) => line !== '')
  const columns = header.split(',').map((name) => name.trim().toLowerCase())
  return lines.map((line) => {
    const cells = line.split(',')
    const field = (name: string) => {
      const index = columns.indexOf(name)
      if (index < 0) throw new Error(`brak kolumny ${name}`)
      return cells[index]
    }
    const angle = Number(field('position angle (east)'))
    if (field('position angle (east)').trim() === '' || !Number.isFinite(angle)) throw new Error('kąt nie jest liczbą')
    return {
      pane: field('pane'),
      raDeg: sexagesimalField(field('ra')) * 15,
      decDeg: sexagesimalField(field('dec')),
      paDeg: ((angle % 360) + 360) % 360,
    }
  })
}

const arcsec = (a: EquatorialDeg, b: EquatorialDeg) => angularSeparationDeg(a, b) * 3600

describe('T14 eksport CSV dla N.I.N.A.', () => {
  it('M 31, kadr 1×1, PA 30° → nagłówek planu mozaiki Telescopius i jeden wiersz', () => {
    const csv = ninaCsv(ninaPanes('M 31', MY_SET, framing(M31, 30)))
    expect(csv).toBe(`${NINA_CSV_HEADER}\r\nM 31,00:42:44.30,+41:16:09.0,30.0\r\n`)
    expect(NINA_CSV_HEADER).toBe('Pane,RA,DEC,Position Angle (East)')
  })

  it('plik zaczyna się od nagłówka bez BOM', () => {
    expect(ninaCsv(ninaPanes('M 31', MY_SET, framing(M31, 30))).startsWith('Pane,')).toBe(true)
  })

  it('Dec −0°30′ zapisuje się jako -00:30:00.0 i odczytuje jako −0,5°', () => {
    expect(formatDecNina(-0.5)).toBe('-00:30:00.0')
    const [row] = parseNinaCsv(ninaCsv(ninaPanes('Test', MY_SET, framing({ raDeg: 83.8221, decDeg: -0.5 }, 0))))
    expect(row.decDeg).toBe(-0.5)
  })

  it.each([
    ['M 31', M31, 30],
    ['M 42', { raDeg: 83.8221, decDeg: -5.3911 }, 0],
    ['IC 1396', { raDeg: 324.775, decDeg: 57.5 }, 147.25],
    ['blisko bieguna', { raDeg: 201.3, decDeg: 89.9 }, 359.5],
    ['RA tuż przed 360°', { raDeg: 359.99, decDeg: -23.45 }, 12.5],
    ['RA tuż po 0°', { raDeg: 0.004, decDeg: 12.3456 }, 271],
    ['południe nieba', { raDeg: 120.5, decDeg: -71.234567 }, 90],
  ])('%s: odczyt parserem N.I.N.A. daje środek co do 0,2″ i ten sam kąt', (name, center, paDeg) => {
    const rows = parseNinaCsv(ninaCsv(ninaPanes(name, MY_SET, framing(center, paDeg))))
    expect(rows).toHaveLength(1)
    expect(rows[0].pane).toBe(name)
    expect(arcsec(rows[0], center)).toBeLessThanOrEqual(0.2)
    expect(rows[0].paDeg).toBe(paDeg)
  })

  it('mozaika 2×2 (RedCat, Dec 60°, PA 30°): jeden wiersz na panel, środki i lokalne PA paneli z mosaicPanels', () => {
    const frame = framing({ raDeg: 30, decDeg: 60 }, 30, 2, 2)
    const panels = mosaicPanels(REDCAT, frame)
    const rows = parseNinaCsv(ninaCsv(ninaPanes('NGC 7000', REDCAT, frame)))
    expect(rows.map((row) => row.pane)).toEqual(['NGC 7000 Panel 1', 'NGC 7000 Panel 2', 'NGC 7000 Panel 3', 'NGC 7000 Panel 4'])
    rows.forEach((row, i) => {
      expect(arcsec(row, panels[i].center), `panel ${i + 1}`).toBeLessThanOrEqual(0.2)
      expect(Math.abs(row.paDeg - panels[i].paDeg), `PA panelu ${i + 1}`).toBeLessThanOrEqual(0.005)
    })
    // Lokalne PA paneli różnią się przy Dec 60° (T12), więc to nie jest kąt całego kadru.
    expect(new Set(rows.map((row) => row.paDeg)).size).toBeGreaterThan(1)
  })

  it('mozaika 3×1 zestawu użytkownika: 3 wiersze w kolejności paneli', () => {
    const frame = framing(M31, 0, 3, 1)
    const rows = parseNinaCsv(ninaCsv(ninaPanes('M 31', MY_SET, frame)))
    const panels = mosaicPanels(MY_SET, frame)
    expect(rows).toHaveLength(3)
    rows.forEach((row, i) => expect(arcsec(row, panels[i].center)).toBeLessThanOrEqual(0.2))
  })

  it('nazwa panelu bez przecinków i cudzysłowów (inaczej zepsułyby kolumny)', () => {
    const csv = ninaCsv(ninaPanes('NGC 7000, „Ameryka” "Północna"', MY_SET, framing(M31, 0)))
    const line = csv.split('\r\n')[1]
    expect(line.split(',')).toHaveLength(4)
    expect(line.startsWith('NGC 7000 „Ameryka” Północna,')).toBe(true)
  })

  it('kadr 1×1 bez zestawu: środek i PA kadru; mozaika bez zestawu → wyjątek', () => {
    expect(ninaPanes('M 31', null, framing(M31, 390))).toEqual([{ name: 'M 31', center: M31, paDeg: 30 }])
    expect(() => ninaPanes('M 31', null, framing(M31, 0, 2, 1))).toThrow(MOSAIC_NEEDS_PROFILE)
  })

  it('pusta nazwa → „Cel”', () => {
    expect(ninaPanes('  ', MY_SET, framing(M31, 0))[0].name).toBe('Cel')
  })
})

describe('pola RA, DEC i kąta', () => {
  it('RA HH:MM:SS.ss z przeniesieniem sekund i bez 24:', () => {
    expect(formatRaNina(0)).toBe('00:00:00.00')
    expect(formatRaNina(359.99999)).toBe('00:00:00.00')
    expect(formatRaNina(360)).toBe('00:00:00.00')
    expect(formatRaNina(-15)).toBe('23:00:00.00')
    // 1h 59m 59,996s → 02:00:00.00
    expect(formatRaNina((1 + 59 / 60 + 59.996 / 3600) * 15)).toBe('02:00:00.00')
    expect(formatRaNina(83.8221)).toBe('05:35:17.30')
  })

  it('DEC +DD:MM:SS.s ze znakiem zawsze, także dla zera i biegunów', () => {
    expect(formatDecNina(0)).toBe('+00:00:00.0')
    expect(formatDecNina(-0.00000001)).toBe('+00:00:00.0')
    expect(formatDecNina(90)).toBe('+90:00:00.0')
    expect(formatDecNina(-90)).toBe('-90:00:00.0')
    expect(formatDecNina(-5.3911)).toBe('-05:23:28.0')
    // 59,96″ → przeniesienie do minut
    expect(formatDecNina(10 + 59 / 60 + 59.96 / 3600)).toBe('+11:00:00.0')
  })

  it('kąt z kropką, co najmniej jedno miejsce po przecinku, najwyżej dwa; 360 → 0', () => {
    expect(formatPaNina(30)).toBe('30.0')
    expect(formatPaNina(3.7213)).toBe('3.72')
    expect(formatPaNina(3.7)).toBe('3.7')
    expect(formatPaNina(359.996)).toBe('0.0')
    expect(formatPaNina(-30)).toBe('330.0')
  })
})
