import type { AuthResponse, Checklist, Task, User } from './types'

const API_BASE = '/api'
const TOKEN_KEY = 'checker-token'

let authToken: string | null = localStorage.getItem(TOKEN_KEY)

export function getToken() {
  return authToken
}

export function setToken(token: string | null) {
  authToken = token
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(
  path: string,
  options?: RequestInit,
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }

  if (auth && authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 204) {
    return undefined as T
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }

  return res.json()
}

export async function register(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return request<AuthResponse>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify({ email, password }) },
    false,
  )
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return request<AuthResponse>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
    false,
  )
}

export async function fetchMe(): Promise<{ user: User }> {
  return request<{ user: User }>('/auth/me')
}

export async function fetchChecklists(archived = false): Promise<Checklist[]> {
  return request<Checklist[]>(`/checklists?archived=${archived}`)
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

export async function archiveChecklist(id: string): Promise<void> {
  return request<void>(`/checklists/${id}/archive`, { method: 'POST' })
}

export async function restoreChecklist(id: string): Promise<Checklist> {
  return request<Checklist>(`/checklists/${id}/restore`, { method: 'POST' })
}

export async function shareChecklist(
  id: string,
  email: string,
): Promise<Checklist> {
  return request<Checklist>(`/checklists/${id}/share`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
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
