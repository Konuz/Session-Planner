/** Każde lustro ma własny limit. Przerwanie żądania przerywa cały łańcuch. */
export async function firstCatalogResponse<T, Endpoint extends { timeoutMs: number }>(
  endpoints: readonly Endpoint[], signal: AbortSignal, query: (endpoint: Endpoint, signal: AbortSignal) => Promise<T>,
): Promise<T> {
  let lastError: unknown
  for (const endpoint of endpoints) {
    signal.throwIfAborted()
    const attempt = AbortSignal.any([signal, AbortSignal.timeout(endpoint.timeoutMs)])
    try {
      const result = await query(endpoint, attempt)
      attempt.throwIfAborted()
      return result
    } catch (error) {
      lastError = error
    }
  }
  signal.throwIfAborted()
  throw lastError
}
