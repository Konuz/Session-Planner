import { useLayoutEffect, useState } from 'react'

/** URL jest własnością tego wyświetlenia; wspólny Blob może mieć wielu niezależnych odbiorców. */
export function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useLayoutEffect(() => {
    const next = blob ? URL.createObjectURL(blob) : null
    setUrl(next)
    return () => { if (next) URL.revokeObjectURL(next) }
  }, [blob])
  return url
}
