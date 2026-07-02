import { useCallback, useEffect, useState } from 'react'
import * as api from './api'
import type { Checklist } from './types'

export function useChecklists() {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activeChecklist = checklists.find((c) => c.id === activeChecklistId)

  const refresh = useCallback(async () => {
    const data = await api.fetchChecklists()
    setChecklists(data)
    setActiveChecklistId((current) => {
      if (current && data.some((c) => c.id === current)) return current
      return data[0]?.id ?? null
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await api.fetchChecklists()
        if (cancelled) return
        setChecklists(data)
        setActiveChecklistId(data[0]?.id ?? null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const run = useCallback(
    async (action: () => Promise<void>) => {
      try {
        setError(null)
        await action()
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    },
    [refresh],
  )

  const createChecklist = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return null

      let created: Checklist | null = null
      await run(async () => {
        created = await api.createChecklist(trimmed)
        setActiveChecklistId(created.id)
      })
      return created
    },
    [run],
  )

  const deleteChecklist = useCallback(
    async (id: string) => {
      await run(async () => {
        await api.deleteChecklist(id)
        setActiveChecklistId((current) => (current === id ? null : current))
      })
    },
    [run],
  )

  const renameChecklist = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      await run(async () => {
        await api.renameChecklist(id, trimmed)
      })
    },
    [run],
  )

  const selectChecklist = useCallback((id: string) => {
    setActiveChecklistId(id)
  }, [])

  const addTask = useCallback(
    async (checklistId: string, text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return null

      let created = null
      await run(async () => {
        created = await api.createTask(checklistId, trimmed)
      })
      return created
    },
    [run],
  )

  const toggleTask = useCallback(
    async (checklistId: string, taskId: string) => {
      const checklist = checklists.find((c) => c.id === checklistId)
      const task = checklist?.tasks.find((t) => t.id === taskId)
      if (!task) return

      await run(async () => {
        await api.updateTask(checklistId, taskId, {
          completed: !task.completed,
        })
      })
    },
    [checklists, run],
  )

  const deleteTask = useCallback(
    async (checklistId: string, taskId: string) => {
      await run(async () => {
        await api.deleteTask(checklistId, taskId)
      })
    },
    [run],
  )

  return {
    checklists,
    activeChecklist,
    activeChecklistId,
    loading,
    error,
    createChecklist,
    deleteChecklist,
    renameChecklist,
    selectChecklist,
    addTask,
    toggleTask,
    deleteTask,
  }
}
