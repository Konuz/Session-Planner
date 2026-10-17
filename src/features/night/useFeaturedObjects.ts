import { useEffect, useState } from 'react'
import { featuredObjects, loadCatalog } from '../../data/featuredObjects'
import type { DsoObject } from '../../types'

export type FeaturedObjects =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; objects: DsoObject[] }

/** Obiekty z listy „Klasyki” po wczytaniu katalogu; `retry` ponawia pobranie po błędzie. */
export function useFeaturedObjects(): { featured: FeaturedObjects; retry: () => void } {
  const [attempt, setAttempt] = useState(0)
  const [featured, setFeatured] = useState<FeaturedObjects>({ status: 'loading' })

  useEffect(() => {
    let active = true
    loadCatalog().then(
      (catalog) => {
        if (active) setFeatured({ status: 'ready', objects: featuredObjects(catalog) })
      },
      (error: unknown) => {
        if (active) setFeatured({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      },
    )
    return () => {
      active = false
    }
  }, [attempt])

  const retry = () => {
    setFeatured({ status: 'loading' })
    setAttempt((value) => value + 1)
  }
  return { featured, retry }
}
