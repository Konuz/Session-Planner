import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { buildNightFrame, cursorReadout } from '../../services/nightChart'
import { DEFAULT_PLANNING_SETTINGS } from '../../services/planningSettings'
import { usePlannerStore } from '../../state/plannerStore'
import { DEMO_HORIZON, M31, SITE, TIME_ZONE, at, dms, hms } from '../../test/fixtures'
import type { DsoObject } from '../../types'
import { NightTab } from './NightTab'
import { SkyDome, type SkyDomeProps } from './SkyDome'
import { DOME, domeRadius } from './skyDomeModel'

const featured = vi.hoisted(() => ({ objects: [] as DsoObject[] }))

vi.mock('./useFeaturedObjects', () => ({
  useFeaturedObjects: () => ({
    featured: { status: 'ready', objects: featured.objects, catalog: featured.objects },
    retry: () => undefined,
  }),
}))

function dso(uid: string, primary: DsoObject['primary'], type: DsoObject['type'], position: { raDeg: number; decDeg: number }): DsoObject {
  return {
    uid,
    primary,
    designations: [primary],
    commonNames: [],
    type,
    ...position,
    sizeMajorArcmin: null,
    sizeMinorArcmin: null,
    positionAngleDeg: null,
    magV: null,
    surfaceBrightness: null,
    ldnOpacity: null,
    sh2Brightness: null,
    lbnBrightness: null,
    vdbStarMagV: null,
    constellation: '',
    sources: [],
  }
}

const M31_OBJECT = dso('NGC224', { catalog: 'M', id: '31' }, 'galaxy', M31)
const M42_OBJECT = dso('NGC1976', { catalog: 'M', id: '42' }, 'emission_nebula', { raDeg: hms('05:35:17.3'), decDeg: dms('-05:23:28') })
featured.objects = [M31_OBJECT, M42_OBJECT]

const SETTINGS = { darknessThresholdDeg: -18 as const, autoLowerThreshold: true, detailStepMin: 1 }
const OCT_16 = buildNightFrame(SITE, TIME_ZONE, '2026-10-16', SETTINGS)
const MIDNIGHT = at('2026-10-17 00:00', 'CEST')

function render(overrides: Partial<SkyDomeProps> = {}): string {
  const frame = overrides.frame ?? OCT_16
  const object = overrides.object === undefined ? M31_OBJECT : overrides.object
  const horizon = overrides.horizon ?? []
  const minAltitudeDeg = overrides.minAltitudeDeg ?? 30
  const cursorMs = overrides.cursorMs ?? MIDNIGHT
  const props: SkyDomeProps = {
    frame,
    object,
    horizon,
    minAltitudeDeg,
    cursorMs,
    readout: cursorReadout(frame, object, horizon, minAltitudeDeg, cursorMs),
    patternIds: { hatch: 'wzor-kreski', dots: 'wzor-kropki' },
    ...overrides,
  }
  return renderToStaticMarkup(createElement(SkyDome, props))
}

/** Promień okręgu h_min z atrybutu `r` elementu `data-role="min-altitude"`. */
function minAltitudeR(markup: string): number {
  const match = /<circle[^>]*data-role="min-altitude"[^>]*>/.exec(markup)
  if (!match) throw new Error('brak okręgu h_min')
  return Number(/\sr="([^"]+)"/.exec(match[0])?.[1])
}

const rounded = (value: number) => Math.round(value * 10) / 10

describe('SkyDome: render widoku sfery', () => {
  it('kolory tylko z tokenów (Red Mode): bez hex, rgb(), hsl() i nazw kolorów', () => {
    for (const markup of [render({ horizon: DEMO_HORIZON, cursorMs: at('2026-10-16 19:30', 'CEST') }), render({ object: null })]) {
      expect(markup).not.toMatch(/(?<!url\()#[0-9a-f]{3,8}\b/i)
      expect(markup).not.toMatch(/\b(rgba?|hsla?)\(/i)
      expect(markup).not.toMatch(/["\s:](white|black|red|blue|gray|grey)\b/i)
    }
  })

  it('typ obiektu ikoną i tekstem: „M 31”, ikona i „galaktyka” w nagłówku, znacznik z oznaczeniem na tarczy', () => {
    const markup = render()
    const typeBadge = /<p[^>]*data-role="object-type"[^>]*>(.*?)<\/p>/.exec(markup)?.[1] ?? ''
    expect(typeBadge).toContain('<svg')
    expect(typeBadge).toContain('M 31')
    expect(typeBadge).toContain('galaktyka')
    const marker = /<g[^>]*data-role="object-marker"[^>]*>(.*?)<\/g>/.exec(markup)?.[1] ?? ''
    expect(marker).toContain('<svg')
    expect(marker).toContain('M 31')
    expect(render({ object: M42_OBJECT, cursorMs: at('2026-10-17 03:00', 'CEST') })).toContain('mgławica emisyjna')
  })

  it('bez własnego suwaka: czas ustawia globalny kursor (górny pasek, wykres nocy), opis tarczy podaje godzinę', () => {
    const markup = render()
    expect(markup).not.toContain('type="range"')
    expect(markup).toContain('aria-label="Widok sfery o 00:00 CEST. M 31: wysokość')
    expect(render({ cursorMs: at('2026-10-16 21:00', 'CEST') })).toContain('aria-label="Widok sfery o 21:00 CEST.')
  })

  it('okrąg h_min z parametru: 20° i 35° → promienie z rzutu, opis „h_min 20°”', () => {
    const at20 = render({ minAltitudeDeg: 20 })
    expect(minAltitudeR(at20)).toBe(rounded(domeRadius(20, DOME)))
    expect(at20).toContain('h_min 20°')
    expect(minAltitudeR(render({ minAltitudeDeg: 35 }))).toBe(rounded(domeRadius(35, DOME)))
  })

  it('trajektoria i znaczniki pełnych godzin w oknie ciemności; bez okna – podpis o całej osi', () => {
    const markup = render()
    expect(markup).toContain('data-role="track"')
    expect(markup.match(/data-role="hour"/g)).toHaveLength(10)
    expect(markup).toContain('Trajektoria w oknie ciemności')
    const june = buildNightFrame(SITE, TIME_ZONE, '2026-06-21', { ...SETTINGS, autoLowerThreshold: false })
    expect(render({ frame: june, cursorMs: at('2026-06-22 00:00', 'CEST') })).toContain('Brak okna ciemności')
  })

  it('bez obiektu: tarcza z kierunkami świata i okręgami, bez trajektorii, znacznika i typu', () => {
    const markup = render({ object: null })
    for (const label of ['N', 'E', 'S', 'W']) expect(markup).toContain(`>${label}</text>`)
    expect(markup).toContain('data-role="min-altitude"')
    expect(markup).not.toContain('data-role="track"')
    expect(markup).not.toContain('data-role="object-marker"')
    expect(markup).not.toContain('data-role="object-type"')
  })

  it('obiekt pod horyzontem w kursorze (M 42 o 19:30 CEST): bez znacznika na tarczy, z informacją', () => {
    const markup = render({ object: M42_OBJECT, cursorMs: at('2026-10-16 19:30', 'CEST') })
    expect(markup).not.toContain('data-role="object-marker"')
    expect(markup).toContain('M 42 pod horyzontem')
  })

  it('Księżyc: o 00:00 CEST 17.10 pod horyzontem (tylko tekst), o 19:30 CEST 16.10 na tarczy z fazą', () => {
    const below = render()
    expect(below).not.toContain('data-role="moon"')
    expect(below).toContain('Księżyc pod horyzontem')
    const above = render({ cursorMs: at('2026-10-16 19:30', 'CEST') })
    expect(above).toContain('data-role="moon"')
    expect(above).not.toContain('Księżyc pod horyzontem')
  })

  it('własny horyzont: wielokąt przeszkód tylko przy horyzoncie wyższym niż 0°', () => {
    expect(render({ horizon: DEMO_HORIZON })).toContain('data-role="horizon"')
    expect(render()).not.toContain('data-role="horizon"')
  })
})

describe('NightTab: widok sfery w zakładce Noc', () => {
  function nightTabMarkup(minAltitudeDeg: number): string {
    usePlannerStore.setState({
      planningSettings: { ...DEFAULT_PLANNING_SETTINGS, minAltitudeDeg },
      nightDate: '2026-10-16',
      cursorMs: MIDNIGHT,
      objectUid: M31_OBJECT.uid,
    })
    // renderToStaticMarkup czyta stan Zustand przez getInitialState().
    Object.assign(usePlannerStore.getInitialState(), usePlannerStore.getState())
    return renderToStaticMarkup(createElement(NightTab))
  }

  it('h_min, kursor i obiekt pochodzą ze stanu aplikacji', () => {
    const at20 = nightTabMarkup(20)
    expect(at20).toContain('data-role="sky-dome"')
    expect(minAltitudeR(at20)).toBe(rounded(domeRadius(20, DOME)))
    expect(at20).toContain('aria-label="Widok sfery o 00:00 CEST.')
    expect(at20).toContain('data-role="object-marker"')
    expect(minAltitudeR(nightTabMarkup(35))).toBe(rounded(domeRadius(35, DOME)))
  })
})
