import { FormEvent, useState } from 'react'
import { useChecklists } from './useChecklists'
import type { Task } from './types'

function TaskItem({
  task,
  onToggle,
  onDelete,
}: {
  task: Task
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <li className={`task-item ${task.completed ? 'completed' : ''}`}>
      <label className="task-checkbox">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={onToggle}
        />
        <span className="checkmark" />
      </label>
      <span className="task-text">{task.text}</span>
      <button
        type="button"
        className="btn-ghost btn-delete"
        onClick={onDelete}
        aria-label={`Delete task: ${task.text}`}
        title="Delete task"
      >
        ×
      </button>
    </li>
  )
}

export default function App() {
  const {
    checklists,
    activeChecklist,
    loading,
    error,
    createChecklist,
    deleteChecklist,
    renameChecklist,
    selectChecklist,
    addTask,
    toggleTask,
    deleteTask,
  } = useChecklists()

  const [newChecklistName, setNewChecklistName] = useState('')
  const [newTaskText, setNewTaskText] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')

  const activeTasks =
    activeChecklist?.tasks.filter((t) => !t.completed) ?? []
  const completedTasks =
    activeChecklist?.tasks.filter((t) => t.completed) ?? []

  const completedCount = completedTasks.length
  const totalCount = activeChecklist?.tasks.length ?? 0
  const progress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  function handleCreateChecklist(e: FormEvent) {
    e.preventDefault()
    void createChecklist(newChecklistName).then((created) => {
      if (created) setNewChecklistName('')
    })
  }

  function handleAddTask(e: FormEvent) {
    e.preventDefault()
    if (!activeChecklist) return
    void addTask(activeChecklist.id, newTaskText).then((created) => {
      if (created) setNewTaskText('')
    })
  }

  function startEditingName() {
    if (!activeChecklist) return
    setEditNameValue(activeChecklist.name)
    setEditingName(true)
  }

  function saveChecklistName() {
    if (!activeChecklist) return
    void renameChecklist(activeChecklist.id, editNameValue)
    setEditingName(false)
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1>Checker</h1>
          <p className="subtitle">Create and manage your checklists</p>
        </header>

        <form className="create-form" onSubmit={handleCreateChecklist}>
          <input
            type="text"
            placeholder="New checklist name..."
            value={newChecklistName}
            onChange={(e) => setNewChecklistName(e.target.value)}
            aria-label="New checklist name"
          />
          <button type="submit" disabled={!newChecklistName.trim()}>
            Create
          </button>
        </form>

        <nav className="checklist-nav" aria-label="Your checklists">
          {checklists.length === 0 ? (
            <p className="empty-hint">No checklists yet. Create one above.</p>
          ) : (
            <ul>
              {checklists.map((checklist) => {
                const done = checklist.tasks.filter((t) => t.completed).length
                const total = checklist.tasks.length
                const isActive = activeChecklist?.id === checklist.id

                return (
                  <li key={checklist.id}>
                    <button
                      type="button"
                      className={`checklist-item ${isActive ? 'active' : ''}`}
                      onClick={() => selectChecklist(checklist.id)}
                    >
                      <span className="checklist-item-name">{checklist.name}</span>
                      <span className="checklist-item-count">
                        {done}/{total}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </nav>
      </aside>

      <main className="main">
        {error && (
          <div className="status-banner error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="status-banner loading">Loading checklists…</div>
        ) : !activeChecklist ? (
          <div className="welcome">
            <div className="welcome-icon">✓</div>
            <h2>Welcome to Checker</h2>
            <p>Create a checklist to get started, then add tasks and mark them complete.</p>
          </div>
        ) : (
          <>
            <header className="main-header">
              <div className="title-row">
                {editingName ? (
                  <form
                    className="rename-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      saveChecklistName()
                    }}
                  >
                    <input
                      type="text"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      autoFocus
                      aria-label="Checklist name"
                    />
                    <button type="submit">Save</button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setEditingName(false)}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <h2>{activeChecklist.name}</h2>
                    <button
                      type="button"
                      className="btn-ghost btn-icon"
                      onClick={startEditingName}
                      aria-label="Rename checklist"
                      title="Rename"
                    >
                      ✎
                    </button>
                  </>
                )}
              </div>

              <div className="header-actions">
                {totalCount > 0 && (
                  <div className="progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="progress-label">
                      {completedCount} of {totalCount} done ({progress}%)
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => {
                    if (
                      confirm(
                        `Delete "${activeChecklist.name}" and all its tasks?`,
                      )
                    ) {
                      void deleteChecklist(activeChecklist.id)
                    }
                  }}
                >
                  Delete checklist
                </button>
              </div>
            </header>

            <form className="add-task-form" onSubmit={handleAddTask}>
              <input
                type="text"
                placeholder="Add a task..."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                aria-label="New task"
              />
              <button type="submit" disabled={!newTaskText.trim()}>
                Add task
              </button>
            </form>

            {activeChecklist.tasks.length === 0 ? (
              <p className="empty-tasks">No tasks yet. Add one above.</p>
            ) : (
              <>
                <section className="task-section" aria-label="Active tasks">
                  {activeTasks.length === 0 ? (
                    <p className="empty-tasks section-empty">
                      All tasks completed.
                    </p>
                  ) : (
                    <ul className="task-list">
                      {activeTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onToggle={() =>
                            void toggleTask(activeChecklist.id, task.id)
                          }
                          onDelete={() =>
                            void deleteTask(activeChecklist.id, task.id)
                          }
                        />
                      ))}
                    </ul>
                  )}
                </section>

                {completedTasks.length > 0 && (
                  <section
                    className="task-section completed-section"
                    aria-label="Completed tasks"
                  >
                    <h3 className="task-section-heading">Completed</h3>
                    <ul className="task-list">
                      {completedTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onToggle={() =>
                            void toggleTask(activeChecklist.id, task.id)
                          }
                          onDelete={() =>
                            void deleteTask(activeChecklist.id, task.id)
                          }
                        />
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
