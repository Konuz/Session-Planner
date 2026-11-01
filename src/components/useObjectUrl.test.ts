import { expect, it, vi } from 'vitest'
const effects = vi.hoisted(() => [] as (() => () => void)[])
vi.mock('react', () => ({ useState: () => [null, () => {}], useLayoutEffect: (effect: () => () => void) => effects.push(effect) }))
import { useObjectUrl } from './useObjectUrl'

it('dwaj odbiorcy tego samego Bloba mają niezależne URL; wymiana i odmontowanie zwalniają każdy', () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL')
  const create = vi.spyOn(URL, 'createObjectURL')
  const blob = new Blob(['image'])
  useObjectUrl(blob)
  useObjectUrl(blob)
  const a = effects.shift()!()
  const b = effects.shift()!()
  const [urlA, urlB] = create.mock.results.map((r) => r.value)
  expect(urlA).not.toBe(urlB)
  a()
  expect(revoke.mock.calls).toEqual([[urlA]])
  useObjectUrl(new Blob(['next']))
  const next = effects.shift()!()
  const urlNext = create.mock.results.at(-1)!.value
  b()
  next()
  expect(revoke.mock.calls).toEqual([[urlA], [urlB], [urlNext]])
  vi.restoreAllMocks()
})
