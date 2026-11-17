import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_EQUIPMENT, useStore } from './store'

beforeEach(() => {
  useStore.setState(useStore.getInitialState())
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

  it('zachowuje parametry zestawu po zmianie i usunięciu jego modelu w innym zestawie', () => {
    useStore.getState().addTelescope()
    const firstId = useStore.getState().activeEquipmentSetId
    useStore.getState().addEquipmentSet()
    const secondId = useStore.getState().activeEquipmentSetId
    useStore.getState().setEquipment({ focalLengthMm: 750 })

    useStore.getState().selectEquipmentSet(firstId)
    useStore.getState().setEquipment({ seeingArcsec: 3 })
    expect(useStore.getState().equipment.focalLengthMm).toBe(250)
    expect(useStore.getState().savedTelescopes[0].focalLengthMm).toBe(750)
    useStore.getState().removeTelescope()

    useStore.getState().selectEquipmentSet(secondId)
    expect(useStore.getState().equipment).toMatchObject({ telescopeId: 'custom', focalLengthMm: 750 })
  })
})

describe('usuwanie zestawów', () => {
  it('przełącza sprzęt po usunięciu aktywnego zestawu i zachowuje unikalne ID przy dodawaniu', () => {
    const firstId = useStore.getState().activeEquipmentSetId
    useStore.getState().addEquipmentSet()
    const removedId = useStore.getState().activeEquipmentSetId
    useStore.getState().setEquipment({ focalLengthMm: 750 })
    useStore.getState().addEquipmentSet()
    const thirdId = useStore.getState().activeEquipmentSetId

    useStore.getState().selectEquipmentSet(removedId)
    useStore.getState().removeEquipmentSet()

    expect(useStore.getState().equipmentSets.map((item) => item.id)).toEqual([firstId, thirdId])
    expect(useStore.getState().activeEquipmentSetId).toBe(firstId)
    expect(useStore.getState().equipment.focalLengthMm).toBe(DEFAULT_EQUIPMENT.focalLengthMm)
    useStore.getState().addEquipmentSet()
    const ids = useStore.getState().equipmentSets.map((item) => item.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('zachowuje ostatni zestaw', () => {
    const firstId = useStore.getState().activeEquipmentSetId
    useStore.getState().removeEquipmentSet()
    expect(useStore.getState().equipmentSets.map((item) => item.id)).toEqual([firstId])
    expect(useStore.getState().activeEquipmentSetId).toBe(firstId)
  })
})
