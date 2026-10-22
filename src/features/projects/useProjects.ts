// Projekty z IndexedDB (tabela `projects`) poza plannerStore: wczytanie w efekcie, zapis i usunięcie z ponownym odczytem.
import { useCallback, useEffect, useState } from 'react'
import { appDb } from '../../data/appDb'
import { projectRepository } from '../../data/repositories'
import type { Project } from '../../types'

export type ProjectsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; projects: Project[] }

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

export function useProjects() {
  const [state, setState] = useState<ProjectsState>({ status: 'loading' })

  const reload = useCallback(async () => {
    try {
      setState({ status: 'ready', projects: await projectRepository.list(appDb) })
    } catch (error) {
      setState({ status: 'error', message: errorText(error) })
    }
  }, [])

  useEffect(() => {
    let active = true
    projectRepository.list(appDb).then(
      (projects) => {
        if (active) setState({ status: 'ready', projects })
      },
      (error: unknown) => {
        if (active) setState({ status: 'error', message: errorText(error) })
      },
    )
    return () => {
      active = false
    }
  }, [])

  /** Zapis (nowy albo zmieniony projekt); błąd bazy → odrzucona obietnica, lista bez zmian. */
  const save = useCallback(
    async (project: Project) => {
      await projectRepository.save(appDb, project)
      await reload()
    },
    [reload],
  )

  /** Zmiana zapisanego projektu funkcją `Project → Project` liczoną na wersji z bazy (bez utraty wcześniejszych zmian). */
  const update = useCallback(
    async (id: string, change: (project: Project) => Project) => {
      await projectRepository.update(appDb, id, change)
      await reload()
    },
    [reload],
  )

  const remove = useCallback(
    async (id: string) => {
      await projectRepository.remove(appDb, id)
      await reload()
    },
    [reload],
  )

  return { state, save, update, remove, reload }
}
