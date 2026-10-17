import { useCallback, useState, type RefCallback } from 'react'

/** Szerokość elementu w pikselach (ResizeObserver), do wykresów rysowanych w rzeczywistym rozmiarze. */
export function useElementWidth<T extends HTMLElement>(): [RefCallback<T>, number] {
  const [width, setWidth] = useState(0)
  const ref = useCallback((element: T | null) => {
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}
