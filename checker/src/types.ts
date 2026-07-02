export interface User {
  id: string
  email: string
}

export interface Task {
  id: string
  text: string
  completed: boolean
}

export interface Checklist {
  id: string
  name: string
  tasks: Task[]
  createdAt: string
  archived: boolean
  archivedAt: string | null
  isOwner: boolean
  sharedWith: string[]
}

export interface AuthResponse {
  token: string
  user: User
}
