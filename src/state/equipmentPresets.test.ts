import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_EQUIPMENT, useStore } from './store'

beforeEach(() => {
  useStore.setState({ equipment: { ...DEFAULT_EQUIPMENT }, savedTelescopes: [], savedCameras: [] })
})

describe('własne teleskopy i kamery', () => {
  it('zapisuje i modyfikuje teleskop bez zmiany kamery', () => {
    useStore.getState().addTelescope()
    const id = useStore.getState().equipment.telescopeId
    useStore.getState().setEquipment({ telescopeName: 'Newton 150', focalLengthMm: 750, reducer: 0.8 })

    expect(useStore.getState().savedTelescopes[0]).toMatchObject({ id, name: 'Newton 150', focalLengthMm: 750, reducer: 0.8 })
    expect(useStore.getState().equipment.cameraId).toBe(DEFAULT_EQUIPMENT.cameraId)

    useStore.getState().removeTelescope()
    expect(useStore.getState().savedTelescopes).toEqual([])
    expect(useStore.getState().equipment).toMatchObject({ telescopeId: 'custom', telescopeName: 'Newton 150', focalLengthMm: 750 })
  })

  it('zapisuje i modyfikuje kamerę bez zmiany teleskopu', () => {
    useStore.getState().addCamera()
    const id = useStore.getState().equipment.cameraId
    useStore.getState().setEquipment({ cameraName: 'Ares-C', pixelUm: 4.2, mono: false, binning: 2 })

    expect(useStore.getState().savedCameras[0]).toMatchObject({ id, name: 'Ares-C', pixelUm: 4.2, mono: false, binning: 2 })
    expect(useStore.getState().equipment.telescopeId).toBe(DEFAULT_EQUIPMENT.telescopeId)

    useStore.getState().removeCamera()
    expect(useStore.getState().savedCameras).toEqual([])
    expect(useStore.getState().equipment).toMatchObject({ cameraId: 'custom', cameraName: 'Ares-C', pixelUm: 4.2 })
  })

  it('przełącza zapisane modele bez nadpisywania ich parametrów', () => {
    useStore.getState().addTelescope()
    const first = useStore.getState().savedTelescopes[0]
    useStore.getState().setEquipment({ telescopeName: 'Pierwszy', focalLengthMm: 750 })
    useStore.getState().addTelescope()
    useStore.getState().setEquipment({ telescopeName: 'Drugi', focalLengthMm: 300 })

    useStore.getState().setEquipment({ telescopeId: first.id, telescopeName: 'Pierwszy', focalLengthMm: 750 })
    expect(useStore.getState().equipment.focalLengthMm).toBe(750)
    expect(useStore.getState().savedTelescopes.map((item) => item.name)).toEqual(['Pierwszy', 'Drugi'])
  })
})
