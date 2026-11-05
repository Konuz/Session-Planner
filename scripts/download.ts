export function fetchBuildData(url: string, init?: RequestInit): Promise<Response> {
  const deadline = AbortSignal.timeout(120_000)
  const signal = init?.signal ? AbortSignal.any([init.signal, deadline]) : deadline
  return fetch(url, { ...init, signal })
}
