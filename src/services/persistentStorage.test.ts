import { describe, expect, it, vi } from 'vitest'
import { formatBytes, persistenceState, requestPersistence, usageText } from './persistentStorage'

describe('pamięć trwała (navigator.storage.persist, sekcja 10)', () => {
  it('już przyznana → bez ponownej prośby', async () => {
    const persist = vi.fn(() => Promise.resolve(true))
    expect(await requestPersistence({ persisted: () => Promise.resolve(true), persist })).toBe('granted')
    expect(persist).not.toHaveBeenCalled()
  })

  it('prośba: przyznana albo nie', async () => {
    expect(await requestPersistence({ persisted: () => Promise.resolve(false), persist: () => Promise.resolve(true) })).toBe('granted')
    expect(await requestPersistence({ persisted: () => Promise.resolve(false), persist: () => Promise.resolve(false) })).toBe('not-granted')
  })

  it('brak API → „unsupported”; błąd przeglądarki → „not-granted”', async () => {
    expect(await requestPersistence(undefined)).toBe('unsupported')
    expect(await requestPersistence({})).toBe('unsupported')
    expect(await requestPersistence({ persist: () => Promise.reject(new Error('x')) })).toBe('not-granted')
  })

  it('stan bez prośby', async () => {
    expect(await persistenceState({ persisted: () => Promise.resolve(true) })).toBe('granted')
    expect(await persistenceState({ persisted: () => Promise.resolve(false) })).toBe('not-granted')
    expect(await persistenceState({})).toBe('unsupported')
  })

  it('zajętość pamięci po polsku', async () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(48_300)).toBe('48 kB')
    expect(formatBytes(12_345_678)).toBe('12,3 MB')
    expect(formatBytes(1_234_567_890)).toBe('1,2 GB')
    expect(await usageText({ estimate: () => Promise.resolve({ usage: 12_345_678, quota: 1_234_567_890 }) })).toBe('Zajęte: 12,3 MB z 1,2 GB')
    expect(await usageText({})).toBeNull()
    expect(await usageText({ estimate: () => Promise.reject(new Error('x')) })).toBeNull()
  })
})
