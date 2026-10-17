// Filtry atrybutów: jasność z „pokaż obiekty bez jasności”, katalog, typ, gwiazdozbiór, rozmiar (P4–P11) [AC3].
import { describe, expect, it } from 'vitest'
import {
  CATALOG,
  IC1805,
  IC1848,
  KLASYKI,
  LDN1235,
  LDN1251,
  M1,
  M101,
  M31,
  M33,
  M42,
  M45,
  M81,
  NGC1499,
  NGC6960,
  NGC7000,
  SIMEIS147,
  inInputOrder,
  names,
  run,
  syntheticObject,
} from './helpers'

/** Obiekty „Klasyki” z jasnością `magV` w kolejności listy. */
const WITH_MAGNITUDE = ['M 31', 'M 42', 'M 45', 'M 33', 'M 101', 'M 81', 'M 1', 'IC 1805', 'IC 1848']
/** 17 obiektów „Klasyki” bez `magV` w kolejności listy. */
const WITHOUT_MAGNITUDE = names(KLASYKI.filter((object) => object.magV === null))

describe('P4 jasność 0–10 mag i obiekty bez jasności [AC3]', () => {
  it('P4: 0–10 mag z włączoną opcją „pokaż obiekty bez jasności” → LDN 1235 (bez jasności) zostaje, przechodzą wszystkie 26', () => {
    const result = names(run(KLASYKI, { magnitude: { min: 0, max: 10 }, showWithoutMagnitude: true }))
    expect(result).toContain('LDN 1235')
    expect(result).toEqual(names(KLASYKI))
  })

  it('P4: 0–10 mag po wyłączeniu opcji → LDN 1235 znika; zostaje 9 obiektów z jasnością', () => {
    const result = names(run(KLASYKI, { magnitude: { min: 0, max: 10 }, showWithoutMagnitude: false }))
    expect(result).not.toContain('LDN 1235')
    expect(result).toEqual(WITH_MAGNITUDE)
  })

  // Reguła P4–P5: opcja dotyczy tylko obiektów bez jasności; jasność spoza zakresu nadal odpada.
  it('P4: opcja nie przepuszcza obiektów z jasnością spoza zakresu: 5–7 mag z opcją → M 33, M 81, IC 1805, IC 1848 i 17 obiektów bez jasności', () => {
    const result = run(KLASYKI, { magnitude: { min: 5, max: 7 }, showWithoutMagnitude: true })
    expect(WITHOUT_MAGNITUDE).toHaveLength(17)
    expect(names(result)).toEqual(
      names(KLASYKI.filter((object) => object.magV === null || [M33, M81, IC1805, IC1848].includes(object))),
    )
  })

  // Reguła: tylko `magV` („Styk z resztą”; „Poza zakresem”: decyzja z 17.10, bez innych pól jasności).
  it('P4: liczy się tylko magV: obiekt bez magV, ale z jasnością powierzchniową i jasnością gwiazdy vdB, jest „bez jasności”', () => {
    const other = syntheticObject('test-other-magnitudes', { surfaceBrightness: 6, vdbStarMagV: 6, lbnBrightness: 3 })
    const lit = syntheticObject('test-magv-6', { magV: 6 })
    expect(names(run([other, lit], { magnitude: { min: 0, max: 10 }, showWithoutMagnitude: false }))).toEqual([lit.uid])
    expect(names(run([other, lit], { magnitude: { min: 0, max: 10 }, showWithoutMagnitude: true }))).toEqual([
      other.uid,
      lit.uid,
    ])
  })
})

describe('P5 zakres jasności, granice włącznie', () => {
  it('P5: 5–7 mag, opcja wyłączona → dokładnie M 33 (5,79), M 81 (6,92), IC 1805 i IC 1848 (6,5)', () => {
    const result = run(KLASYKI, { magnitude: { min: 5, max: 7 }, showWithoutMagnitude: false })
    expect(names(result)).toEqual(['M 33', 'M 81', 'IC 1805', 'IC 1848'])
  })

  it('P5: 4–6 mag, opcja wyłączona → M 42 (dokładnie 4) przechodzi, M 31 (3,44) nie; wynik M 42, M 33', () => {
    const result = names(run(KLASYKI, { magnitude: { min: 4, max: 6 }, showWithoutMagnitude: false }))
    expect(result).toContain('M 42')
    expect(result).not.toContain('M 31')
    expect(result).toEqual(['M 42', 'M 33'])
  })

  // Reguła z „Pytania”: granice jasności włącznie, po obu stronach obu granic.
  it('P5: górna granica włącznie: 0–4 mag → M 31, M 42 (dokładnie 4), M 45; 3,44–3,99 mag → tylko M 31', () => {
    expect(names(run(KLASYKI, { magnitude: { min: 0, max: 4 }, showWithoutMagnitude: false }))).toEqual(['M 31', 'M 42', 'M 45'])
    expect(names(run(KLASYKI, { magnitude: { min: 3.44, max: 3.99 }, showWithoutMagnitude: false }))).toEqual(['M 31'])
  })

  it('P5: obie granice włącznie: 6,5–6,5 mag → IC 1805 i IC 1848', () => {
    expect(names(run(KLASYKI, { magnitude: { min: 6.5, max: 6.5 }, showWithoutMagnitude: false }))).toEqual([
      'IC 1805',
      'IC 1848',
    ])
  })

  it('P5: tuż za granicami: 4,01–6,49 mag → tylko M 33', () => {
    expect(names(run(KLASYKI, { magnitude: { min: 4.01, max: 6.49 }, showWithoutMagnitude: false }))).toEqual(['M 33'])
  })
})

describe('P6 cały katalog, jasność 0–10 mag', () => {
  const withoutMagnitude = CATALOG.filter((object) => object.magV === null).length
  const inRange = CATALOG.filter((object) => object.magV !== null && object.magV >= 0 && object.magV <= 10).length

  it('P6: z włączoną opcją zostają wszystkie 12 319 obiektów bez jasności (oraz obiekty 0–10 mag)', () => {
    const result = run(CATALOG, { magnitude: { min: 0, max: 10 }, showWithoutMagnitude: true })
    expect(withoutMagnitude).toBe(12_319)
    expect(result.filter((object) => object.magV === null)).toHaveLength(12_319)
    expect(result.filter((object) => object.magV !== null && (object.magV < 0 || object.magV > 10))).toEqual([])
    expect(result).toHaveLength(12_319 + inRange)
  })

  it('P6: po wyłączeniu opcji nie zostaje żaden obiekt bez jasności', () => {
    const result = run(CATALOG, { magnitude: { min: 0, max: 10 }, showWithoutMagnitude: false })
    expect(result.filter((object) => object.magV === null)).toHaveLength(0)
    expect(result).toHaveLength(inRange)
  })
})

describe('P7, P8 katalog: każde oznaczenie, kilka katalogów przez „lub”', () => {
  it('P7: katalog Sh2 → 10 obiektów, także po oznaczeniach innych niż główne; NGC 7000 i M 42 nie przechodzą', () => {
    const result = names(run(KLASYKI, { catalogs: ['Sh2'] }))
    expect(result).toEqual([
      'vdB 141', // Sh2-136
      'Sh2-155',
      'Sh2-129',
      'Simeis 147', // Sh2-240
      'IC 1396', // Sh2-131
      'IC 1805',
      'IC 1848',
      'NGC 7635',
      'NGC 281',
      'NGC 6888',
    ])
    expect(result).not.toContain('NGC 7000')
    expect(result).not.toContain('M 42')
  })

  // Reguła z „Pytania”: filtr katalogu bierze pod uwagę wszystkie oznaczenia, nie tylko główne.
  it('P7: cały katalog, katalog Sh2 → każdy obiekt z oznaczeniem Sh2 (313), a nie tylko z głównym Sh2 (305)', () => {
    const result = run(CATALOG, { catalogs: ['Sh2'] })
    const anySh2 = CATALOG.filter((object) => object.designations.some((designation) => designation.catalog === 'Sh2'))
    expect(anySh2).toHaveLength(313)
    expect(CATALOG.filter((object) => object.primary.catalog === 'Sh2')).toHaveLength(305)
    expect(result.map((object) => object.uid)).toEqual(anySh2.map((object) => object.uid))
  })

  it('P7: katalog SNR-G → Simeis 147 (G180.0-01.7) i M 1 (G184.6-05.8); katalog Other → Sh2-155 (C 9) i M 45 (Mel 22)', () => {
    expect(names(run(KLASYKI, { catalogs: ['SNR-G'] }))).toEqual(['Simeis 147', 'M 1'])
    expect(names(run(KLASYKI, { catalogs: ['Other'] }))).toEqual(['Sh2-155', 'M 45'])
  })

  it('P8: katalogi M i LDN naraz (lub) → 9 obiektów: M 31, M 42, M 45, M 33, M 101, M 81, M 1, LDN 1251, LDN 1235', () => {
    const result = names(run(KLASYKI, { catalogs: ['M', 'LDN'] }))
    expect(result).toHaveLength(9)
    expect(result).toEqual(inInputOrder(KLASYKI, [M31, M42, M45, M33, M101, M81, M1, LDN1251, LDN1235]))
    expect(result).toEqual(['LDN 1251', 'LDN 1235', 'M 31', 'M 42', 'M 45', 'M 33', 'M 101', 'M 81', 'M 1'])
  })

  // Reguła P8: w obrębie jednego filtra obowiązuje „lub”.
  it('P8: kolejność wyboru katalogów nie ma znaczenia: LDN i M → te same 9 obiektów', () => {
    expect(names(run(KLASYKI, { catalogs: ['LDN', 'M'] }))).toEqual(names(run(KLASYKI, { catalogs: ['M', 'LDN'] })))
  })

  it('P8: inne katalogi naraz: B i Simeis → Simeis 147, B 33', () => {
    expect(names(run(KLASYKI, { catalogs: ['B', 'Simeis'] }))).toEqual(['Simeis 147', 'B 33'])
  })
})

describe('P9, P10 typ i gwiazdozbiór', () => {
  it('P9: typ „mgławica ciemna” → LDN 1251, LDN 1235, B 33', () => {
    expect(names(run(KLASYKI, { types: ['dark_nebula'] }))).toEqual(['LDN 1251', 'LDN 1235', 'B 33'])
  })

  it('P9: cały katalog, typ „mgławica ciemna” → 2137 obiektów', () => {
    const result = run(CATALOG, { types: ['dark_nebula'] })
    expect(result).toHaveLength(2137)
    expect(result.every((object) => object.type === 'dark_nebula')).toBe(true)
  })

  it('P9: typ „mgławica ciemna” i gwiazdozbiór Cep (różne filtry przez „i”) → LDN 1251, LDN 1235', () => {
    expect(names(run(KLASYKI, { types: ['dark_nebula'], constellation: 'Cep' }))).toEqual(['LDN 1251', 'LDN 1235'])
  })

  // Reguła P8: w obrębie jednego filtra „lub”; P9: różne filtry przez „i”.
  it('P9: dwa typy naraz (lub): mgławica ciemna i refleksyjna → vdB 141, vdB 152, LDN 1251, LDN 1235, B 33', () => {
    expect(names(run(KLASYKI, { types: ['dark_nebula', 'reflection_nebula'] }))).toEqual([
      'vdB 141',
      'vdB 152',
      'LDN 1251',
      'LDN 1235',
      'B 33',
    ])
  })

  it('P9: różne filtry przez „i”: katalog M i rozmiar 100–180′ → M 31, M 45; katalog LDN i 0–10 mag bez opcji → nic', () => {
    expect(names(run(KLASYKI, { catalogs: ['M'], size: { min: 100, max: 180 } }))).toEqual(['M 31', 'M 45'])
    expect(names(run(KLASYKI, { catalogs: ['LDN'], magnitude: { min: 0, max: 10 }, showWithoutMagnitude: false }))).toEqual([])
  })

  it('P10: gwiazdozbiór Cep → 7 obiektów: vdB 141, vdB 152, Sh2-155, Sh2-129, LDN 1251, LDN 1235, IC 1396', () => {
    expect(names(run(KLASYKI, { constellation: 'Cep' }))).toEqual([
      'vdB 141',
      'vdB 152',
      'Sh2-155',
      'Sh2-129',
      'LDN 1251',
      'LDN 1235',
      'IC 1396',
    ])
  })

  // Reguła: gwiazdozbiór to pole `constellation` („Styk z resztą”), wybiera się jeden („Pytania”).
  it('P10: gwiazdozbiór Cas → IC 1805, IC 1848, NGC 7635, NGC 281; Tau → Simeis 147, M 45, M 1', () => {
    expect(names(run(KLASYKI, { constellation: 'Cas' }))).toEqual(['IC 1805', 'IC 1848', 'NGC 7635', 'NGC 281'])
    expect(names(run(KLASYKI, { constellation: 'Tau' }))).toEqual(['Simeis 147', 'M 45', 'M 1'])
  })

  it('P10: cały katalog, gwiazdozbiór Cep → tylko obiekty z Cep, wszystkie', () => {
    const result = run(CATALOG, { constellation: 'Cep' })
    expect(result.map((object) => object.uid)).toEqual(
      CATALOG.filter((object) => object.constellation === 'Cep').map((object) => object.uid),
    )
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('P11 rozmiar (wielka oś), granice włącznie', () => {
  const FIVE = [M31, M42, NGC7000, NGC6960, SIMEIS147]

  it('P11: 100–180′ wśród M 31, M 42, NGC 7000, NGC 6960, Simeis 147 → M 31 (177,83′), NGC 7000 (120′), Simeis 147 (180′)', () => {
    const result = names(run(FIVE, { size: { min: 100, max: 180 } }))
    expect(result).toEqual(['M 31', 'NGC 7000', 'Simeis 147'])
    expect(result).not.toContain('NGC 6960') // 210 × 160′: liczy się wielka oś
    expect(result).not.toContain('M 42') // 90′
  })

  // Reguła z „Pytania”: rozmiar to wielka oś, granice włącznie, obiekty bez rozmiaru odpadają.
  it('P11: dolna granica włącznie: 120–180′ → NGC 7000 (120′) przechodzi; 120,01–180′ → już nie', () => {
    expect(names(run(FIVE, { size: { min: 120, max: 180 } }))).toEqual(['M 31', 'NGC 7000', 'Simeis 147'])
    expect(names(run(FIVE, { size: { min: 120.01, max: 180 } }))).toEqual(['M 31', 'Simeis 147'])
  })

  it('P11: górna granica: 100–179,99′ → Simeis 147 (180′) odpada', () => {
    expect(names(run(FIVE, { size: { min: 100, max: 179.99 } }))).toEqual(['M 31', 'NGC 7000'])
  })

  it('P11: wielka oś, nie mała: 150–200′ → NGC 1499 (160 × 40′) i Simeis 147 przechodzą, NGC 6960 (210 × 160′) nie', () => {
    expect(names(run([NGC6960, NGC1499, SIMEIS147], { size: { min: 150, max: 200 } }))).toEqual(['NGC 1499', 'Simeis 147'])
  })

  it('P11: cały katalog, rozmiar 0–10 000′ → odpadają dokładnie 573 obiekty bez rozmiaru', () => {
    const result = run(CATALOG, { size: { min: 0, max: 10_000 } })
    expect(CATALOG.filter((object) => object.sizeMajorArcmin === null)).toHaveLength(573)
    expect(result).toHaveLength(16_516 - 573)
    expect(result.filter((object) => object.sizeMajorArcmin === null)).toEqual([])
  })

  it('P11: obiekt bez wielkiej osi (znana tylko mała oś 20′) odpada nawet przy zakresie 0–100 000′', () => {
    const unknown = syntheticObject('test-no-size', { sizeMinorArcmin: 20 })
    const sized = syntheticObject('test-size-20', { sizeMajorArcmin: 20 })
    expect(names(run([unknown, sized], { size: { min: 0, max: 100_000 } }))).toEqual([sized.uid])
  })
})
