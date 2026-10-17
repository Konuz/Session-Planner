import { describe, expect, it } from 'vitest'
import { DEMO_HORIZON, M31, SITE, TIME_ZONE, dms, hms } from '../../test/fixtures'
import { buildNightFrame, buildObjectTrack, type NightSettings } from '../../services/nightChart'
import { CHART_MARGIN, chartGeometry } from './chartGeometry'

const SETTINGS: NightSettings = { darknessThresholdDeg: -18, autoLowerThreshold: true, detailStepMin: 1 }
const GEM = { type: 'gem', flipMinutesAfterMeridian: 10 } as const
const OCT_24 = buildNightFrame(SITE, TIME_ZONE, '2026-10-24', SETTINGS)
const OCT_16 = buildNightFrame(SITE, TIME_ZONE, '2026-10-16', SETTINGS)
const m42 = { raDeg: hms('05:35:17.3'), decDeg: dms('-05:23:28') }

describe('oś czasu wykresu nocy', () => {
  it('T5 na wąskim ekranie: godziny skrócone, a powtórzona godzina ma etykiety CEST i CET', () => {
    const { ticks } = chartGeometry(OCT_24, null, 30, { width: 360, height: 280 })
    const labels = ticks.map((tick) => `${tick.time}${tick.zone ? ` ${tick.zone}` : ''}`)
    expect(labels).toContain('02 CEST')
    expect(labels).toContain('02 CET')
    expect(labels[0]).toBe('17 CEST')
    expect(labels[1]).toBe('18')
  })

  it('na szerokim ekranie pełne godziny „HH:MM”', () => {
    const { ticks } = chartGeometry(OCT_24, null, 30, { width: 1100, height: 340 })
    expect(ticks[0]).toMatchObject({ time: '17:00', zone: 'CEST' })
    expect(ticks.filter((tick) => tick.zone !== null).map((tick) => `${tick.time} ${tick.zone}`)).toEqual([
      '17:00 CEST',
      '02:00 CEST',
      '02:00 CET',
    ])
  })

  it('oś X zajmuje obszar wykresu od zachodu − 1 h do wschodu + 1 h, oś Y 0–90°', () => {
    const { x, y, plot } = chartGeometry(OCT_16, null, 30, { width: 800, height: 300 })
    expect(x(OCT_16.axis.startMs)).toBe(CHART_MARGIN.left)
    expect(x(OCT_16.axis.endMs)).toBe(800 - CHART_MARGIN.right)
    expect(y(0)).toBe(plot.bottom)
    expect(y(90)).toBe(plot.top)
  })
})

describe('warstwy wykresu', () => {
  const size = { width: 800, height: 300 }

  it('fragmenty toru: widoczne i niewidoczne łączą się we wspólnych punktach', () => {
    const track = buildObjectTrack(OCT_16, m42, { horizon: DEMO_HORIZON, minAltitudeDeg: 20, mount: GEM })
    const runs = chartGeometry(OCT_16, track, 20, size).object?.runs ?? []
    expect(runs.map((run) => run.visible)).toContain(true)
    expect(runs.map((run) => run.visible)).toContain(false)
    for (let i = 1; i < runs.length; i++) {
      expect(runs[i].visible).not.toBe(runs[i - 1].visible)
      const previousEnd = runs[i - 1].path.split('L').at(-1)
      expect(runs[i].path.startsWith(`M${previousEnd}`)).toBe(true)
    }
  })

  it('horyzont płaski: bez obszaru „za przeszkodą”; obszar „za nisko” pod h_min', () => {
    const track = buildObjectTrack(OCT_16, M31, { horizon: [], minAltitudeDeg: 30, mount: GEM })
    const object = chartGeometry(OCT_16, track, 30, size).object
    expect(object?.obstaclePath).toBe('')
    expect(object?.lowZonePath).not.toBe('')
  })

  it('linie górowania i przerzutu w odstępie 10 min', () => {
    const track = buildObjectTrack(OCT_16, M31, { horizon: [], minAltitudeDeg: 30, mount: GEM })
    const { object, x } = chartGeometry(OCT_16, track, 30, size)
    expect(object?.transitX).toBeCloseTo(x(track.transit?.timeMs ?? NaN), 6)
    expect((object?.flipX ?? NaN) - (object?.transitX ?? NaN)).toBeCloseTo(x(600_000) - x(0), 6)
  })

  it('ikona fazy Księżyca na krzywej, gdy Księżyc jest nad horyzontem', () => {
    const { moonIcon, x, y } = chartGeometry(OCT_24, null, 30, size)
    expect(moonIcon).toEqual({ x: x(OCT_24.moon.reference.timeMs), y: y(OCT_24.moon.reference.altDeg) })
  })
})
