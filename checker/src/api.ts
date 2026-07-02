import type { Checklist, Task } from './types'

const API_BASE = '/api'

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (res.status === 204) {
    return undefined as T
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }

  return res.json()
}

export async function fetchChecklists(): Promise<Checklist[]> {
  return request<Checklist[]>('/checklists')
}

export async function createChecklist(name: string): Promise<Checklist> {
  return request<Checklist>('/checklists', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function renameChecklist(
  id: string,
  name: string,
): Promise<Checklist> {
  return request<Checklist>(`/checklists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

export async function deleteChecklist(id: string): Promise<void> {
  return request<void>(`/checklists/${id}`, { method: 'DELETE' })
}

export async function createTask(
  checklistId: string,
  text: string,
): Promise<Task> {
  return request<Task>(`/checklists/${checklistId}/tasks`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

export async function updateTask(
  checklistId: string,
  taskId: string,
  updates: Partial<Pick<Task, 'text' | 'completed'>>,
): Promise<Task> {
  return request<Task>(`/checklists/${checklistId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export async function deleteTask(
  checklistId: string,
  taskId: string,
): Promise<void> {
  return request<void>(`/checklists/${checklistId}/tasks/${taskId}`, {
    method: 'DELETE',
  })
}
