// Cache jest tylko przyspieszeniem. Błędy magazynu nie mogą zniszczyć poprawnego obrazu.
export function imageCache(name: string, maxEntries: number) {
  let opened: Promise<Cache | null> | undefined
  const open = () => (opened ??= Promise.resolve().then(() => 'caches' in globalThis ? caches.open(name) : null).catch(() => null))
  return {
    async get(key: string): Promise<Blob | null> {
      try { return await (await (await open())?.match(key))?.blob() ?? null } catch { return null }
    },
    async put(key: string, blob: Blob): Promise<void> {
      // Web Locks współdzieli sekcję keys/delete/put także z innymi kartami i workerami.
      // Bez tych blokad korzystamy tylko z odczytu cache, zamiast łamać limit zapisów.
      if (!globalThis.navigator?.locks) return
      try { await navigator.locks.request(`tracker-image-cache:${name}`, async () => {
        const cache = await open()
        if (!cache) return
        const keys = await cache.keys()
        for (const old of keys.slice(0, Math.max(0, keys.length - maxEntries + 1))) await cache.delete(old)
        const response = () => new Response(blob, { headers: { 'Content-Type': blob.type || 'image/jpeg' } })
        try { await cache.put(key, response()) } catch (e) {
          if (!(e instanceof Error) || e.name !== 'QuotaExceededError') return
          const remaining = await cache.keys()
          for (const old of remaining.slice(0, Math.ceil(remaining.length / 2))) await cache.delete(old)
          await cache.put(key, response())
        }
      }) } catch { /* Obraz pozostaje dostępny mimo awarii magazynu. */ }
    },
  }
}
