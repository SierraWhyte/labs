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
}

export type AppState = {
  checklists: Checklist[]
  activeChecklistId: string | null
}
