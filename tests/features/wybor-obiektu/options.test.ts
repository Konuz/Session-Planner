// „Styk z resztą”: lista opcji pola wyboru w zakładce Noc to „Klasyki” plus bieżący obiekt spoza tej listy, liczona
// czystą funkcją (`nightObjectOptions(featured, current)` w src/data/featuredObjects.ts; nazwy spec nie podaje).
// „Pytania”: obiekt spoza „Klasyki” jest dodatkową, pierwszą pozycją listy i znika po wybraniu innego obiektu.
// „Styk z resztą”: `selectFeatured` działa także na całym katalogu (obiekt o danym uid albo M 31), sygnatura bez zmian.
import { describe, expect, it } from 'vitest'
import { nightObjectOptions, selectFeatured } from '../../../src/data/featuredObjects'
import { CATALOG, KLASYKI, M13, M31, M42, M45, M57, uids } from './helpers'

describe('opcje pola wyboru obiektu (nightObjectOptions)', () => {
  it('P2: „Klasyki” i bieżący M 13 → 27 pozycji: M 13 na górze, potem 26 obiektów z „Klasyki” w dotychczasowej kolejności', () => {
    const options = nightObjectOptions(KLASYKI, M13)
    expect(options).toHaveLength(27)
    expect(uids(options)).toEqual(['NGC6205', ...uids(KLASYKI)])
  })

  it('P3: „Klasyki” i bieżący M 42 → znowu 26 pozycji „Klasyki” w dotychczasowej kolejności, bez M 13', () => {
    const options = nightObjectOptions(KLASYKI, M42)
    expect(options).toHaveLength(26)
    expect(uids(options)).toEqual(uids(KLASYKI))
    expect(uids(options)).not.toContain(M13.uid)
  })

  it('P4: „Klasyki” i bieżący M 31 (w środku listy) → 26 pozycji w dotychczasowej kolejności, M 31 nie trafia na górę', () => {
    const options = nightObjectOptions(KLASYKI, M31)
    expect(options).toHaveLength(26)
    expect(uids(options)).toEqual(uids(KLASYKI))
    expect(uids(options)[0]).not.toBe(M31.uid)
  })

  // Granice listy „Klasyki” po obu stronach: pierwsza (vdB 141) i ostatnia (NGC 2237) pozycja to obiekty z listy.
  it('P3: bieżący obiekt to pierwsza pozycja „Klasyki” (vdB 141) → 26 pozycji bez zmian, bez powtórzenia', () => {
    expect(uids(nightObjectOptions(KLASYKI, KLASYKI[0]))).toEqual(uids(KLASYKI))
  })

  it('P3: bieżący obiekt to ostatnia pozycja „Klasyki” (NGC 2237) → 26 pozycji bez zmian, bez powtórzenia', () => {
    expect(uids(nightObjectOptions(KLASYKI, KLASYKI[KLASYKI.length - 1]))).toEqual(uids(KLASYKI))
  })

  it('Pytania: po M 13 wybór M 57 (też spoza „Klasyki”) → 27 pozycji: M 57 na górze, M 13 znika', () => {
    const options = nightObjectOptions(KLASYKI, M57)
    expect(uids(options)).toEqual(['NGC6720', ...uids(KLASYKI)])
    expect(uids(options)).not.toContain(M13.uid)
  })

  it('bez bieżącego obiektu (null) → sama lista „Klasyki”, 26 pozycji', () => {
    expect(uids(nightObjectOptions(KLASYKI, null))).toEqual(uids(KLASYKI))
  })

  it('inna lista wejściowa (M 42, M 45, M 31) i bieżący M 13 → M 13, M 42, M 45, M 31', () => {
    expect(uids(nightObjectOptions([M42, M45, M31], M13))).toEqual([M13.uid, M42.uid, M45.uid, M31.uid])
  })

  it('inna kolejność listy wejściowej (M 45, M 31, M 42) i bieżący M 31 z tej listy → ta sama kolejność, 3 pozycje', () => {
    expect(uids(nightObjectOptions([M45, M31, M42], M31))).toEqual([M45.uid, M31.uid, M42.uid])
  })

  it('obiekt z „Klasyki” w krótszej liście, której go brak (M 42 przy liście M 45, M 31) → M 42 na górze', () => {
    expect(uids(nightObjectOptions([M45, M31], M42))).toEqual([M42.uid, M45.uid, M31.uid])
  })

  it('czysta funkcja: lista „Klasyki” podana na wejściu zostaje bez zmian', () => {
    const featured = [...KLASYKI]
    nightObjectOptions(featured, M13)
    nightObjectOptions(featured, M42)
    expect(uids(featured)).toEqual(uids(KLASYKI))
  })
})

describe('selectFeatured na całym katalogu', () => {
  it('P2: zapamiętany uid M 13 (NGC6205, spoza „Klasyki”) → M 13', () => {
    expect(selectFeatured(CATALOG, 'NGC6205')?.uid).toBe('NGC6205')
  })

  it('P6: zapamiętany obiekt, którego nie ma w katalogu („NGC9999”) → M 31', () => {
    expect(selectFeatured(CATALOG, 'NGC9999')?.uid).toBe('NGC224')
  })

  it('P6: bez zapamiętanego obiektu (null) → M 31', () => {
    expect(selectFeatured(CATALOG, null)?.uid).toBe('NGC224')
  })

  it('zapamiętany uid M 57 (NGC6720) → M 57', () => {
    expect(selectFeatured(CATALOG, 'NGC6720')?.uid).toBe('NGC6720')
  })
})
