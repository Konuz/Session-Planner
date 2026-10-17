// P15: model wykresu nocy zbudowany z zapisanych parametrów planowania.
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { openPlannerDb } from '../../../src/data/db'
import { planningSettingsRepository } from '../../../src/data/repositories'
import { buildNightFrame, buildObjectTrack, type ObjectTrack } from '../../../src/services/nightChart'
import { MINUTE_MS, SITE, TIME_ZONE, defined, dms, expectWithin, hms } from '../../../src/test/fixtures'
import type { Mount, PlanningSettings } from '../../../src/types'
import { settingsWith } from './helpers'

const M42 = { raDeg: hms('05:35:17.3'), decDeg: dms('-05:23:28') }
const GEM: Mount = { type: 'gem', flipMinutesAfterMeridian: 10 }

let databases = 0
const freshDb = () => openPlannerDb(`planning-model-test-${++databases}`)

/** Parametry po zapisie i ponownym wczytaniu z bazy; bez `patch` – wczytane z pustej bazy (domyślne). */
async function savedSettings(patch?: Partial<PlanningSettings>): Promise<PlanningSettings> {
  const db = freshDb()
  if (patch) await planningSettingsRepository.save(db, settingsWith(patch))
  return planningSettingsRepository.load(db)
}

/** Tor M 42 w nocy 16/17.10.2026 na wektorowej lokalizacji z horyzontem płaskim, wprost z parametrów. */
function m42Track(settings: PlanningSettings): ObjectTrack {
  const frame = buildNightFrame(SITE, TIME_ZONE, '2026-10-16', settings)
  return buildObjectTrack(frame, M42, { horizon: [], minAltitudeDeg: settings.minAltitudeDeg, mount: GEM })
}

function stepsMin(track: ObjectTrack): number[] {
  return track.samples.slice(1).map((sample, index) => (sample.timeMs - track.samples[index].timeMs) / MINUTE_MS)
}

describe('P15 model wykresu nocy z zapisanych parametrów', () => {
  it('P15: przy zapisanym h_min 20° M 42 ma 3 h 49 min (±1 min) [T11]', async () => {
    const settings = await savedSettings({ minAltitudeDeg: 20 })
    expect(settings.minAltitudeDeg).toBe(20)
    expectWithin(defined(m42Track(settings).effectiveMinutes), 3 * 60 + 49, 1)
  })

  it('P15: przy zapisanym kroku wykresu 10 min punkty toru obiektu są co 10 min', async () => {
    const steps = stepsMin(m42Track(await savedSettings({ detailStepMin: 10 })))
    expect(steps[0]).toBe(10)
    expect(steps.slice(0, -1).every((step) => step === 10)).toBe(true)
    expect(steps.at(-1)).toBeLessThanOrEqual(10)
  })

  it('P15: przy domyślnym kroku wykresu punkty toru obiektu są co 1 min', async () => {
    const steps = stepsMin(m42Track(await savedSettings()))
    expect(steps[0]).toBe(1)
    expect(steps.slice(0, -1).every((step) => step === 1)).toBe(true)
  })

  it('domyślne h_min 30°: M 42 ma 2 h 03 min (±1 min) [T9]', async () => {
    const settings = await savedSettings()
    expect(settings.minAltitudeDeg).toBe(30)
    expectWithin(defined(m42Track(settings).effectiveMinutes), 2 * 60 + 3, 1)
  })

  it('zapisany krok wykresu 5 min: punkty toru co 5 min', async () => {
    const steps = stepsMin(m42Track(await savedSettings({ detailStepMin: 5 })))
    expect(steps[0]).toBe(5)
    expect(steps.slice(0, -1).every((step) => step === 5)).toBe(true)
  })
})
