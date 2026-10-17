// „Styk z resztą”: model karty to czysta funkcja – nie zmienia danych wejściowych, a te same dane dają ten sam wynik.
import { describe, expect, it } from 'vitest'
import { objectCardModel } from '../../../src/features/catalog/objectCardModel'
import { M31, cardContext, mySetAdvice, nightSummary } from './helpers'

/** Głębokie zamrożenie: każda próba zapisu w trybie ścisłym (moduły ES) kończy się wyjątkiem. */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  }
  return value
}

function inputs() {
  const object = structuredClone(M31)
  const summary = structuredClone(nightSummary(M31))
  const advice = mySetAdvice(object, summary)
  return { object, summary, advice, context: structuredClone(cardContext()) }
}

describe('model karty jako czysta funkcja', () => {
  it('zamrożone dane wejściowe (obiekt, podsumowanie, rekomendacje, kontekst) → ten sam wynik, bez zapisu do wejścia', () => {
    const fresh = inputs()
    const expected = objectCardModel(fresh.object, fresh.summary, fresh.advice, fresh.context)
    const frozen = deepFreeze(inputs())
    expect(objectCardModel(frozen.object, frozen.summary, frozen.advice, frozen.context)).toEqual(expected)
  })

  it('dwa wywołania z tymi samymi danymi dają równe wyniki', () => {
    const { object, summary, advice, context } = inputs()
    expect(objectCardModel(object, summary, advice, context)).toEqual(objectCardModel(object, summary, advice, context))
  })
})
