import { FormEvent, useState } from 'react'
import { useAuth } from './useAuth'
import AuthPage from './AuthPage'
import { useChecklists } from './useChecklists'
import type { Checklist, Task } from './types'

function ChecklistNavItem({
  checklist,
  isActive,
  onSelect,
}: {
  checklist: Checklist
  isActive: boolean
  onSelect: () => void
}) {
  const done = checklist.tasks.filter((t) => t.completed).length
  const total = checklist.tasks.length

  return (
    <li>
      <button
        type="button"
        className={`checklist-item ${isActive ? 'active' : ''}`}
        onClick={onSelect}
      >
        <span className="checklist-item-name">{checklist.name}</span>
        <span className="checklist-item-count">
          {done}/{total}
        </span>
      </button>
    </li>
  )
}

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
        <input type="checkbox" checked={task.completed} onChange={onToggle} />
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

function AppContent() {
  const { user, logout } = useAuth()
  const {
    checklists,
    archivedChecklists,
    activeChecklist,
    loading,
    error,
    createChecklist,
    archiveChecklist,
    restoreChecklist,
    shareChecklist,
    renameChecklist,
    selectChecklist,
    addTask,
    toggleTask,
    deleteTask,
  } = useChecklists(true)

  const [newChecklistName, setNewChecklistName] = useState('')
  const [newTaskText, setNewTaskText] = useState('')
  const [shareEmail, setShareEmail] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')

  const isArchived = activeChecklist?.archived ?? false
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
    if (!activeChecklist || isArchived) return
    void addTask(activeChecklist.id, newTaskText).then((created) => {
      if (created) setNewTaskText('')
    })
  }

  function handleShare(e: FormEvent) {
    e.preventDefault()
    if (!activeChecklist) return
    void shareChecklist(activeChecklist.id, shareEmail).then(() => {
      setShareEmail('')
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
          <div className="sidebar-title-row">
            <h1>Checker</h1>
            <button type="button" className="btn-ghost btn-sm" onClick={logout}>
              Sign out
            </button>
          </div>
          <p className="subtitle user-email">{user?.email}</p>
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
          <h2 className="sidebar-section-heading">Checklists</h2>
          {checklists.length === 0 ? (
            <p className="empty-hint">No checklists yet. Create one above.</p>
          ) : (
            <ul>
              {checklists.map((checklist) => (
                <ChecklistNavItem
                  key={checklist.id}
                  checklist={checklist}
                  isActive={activeChecklist?.id === checklist.id}
                  onSelect={() => selectChecklist(checklist.id)}
                />
              ))}
            </ul>
          )}

          <h2 className="sidebar-section-heading archived-heading">
            Archived
          </h2>
          {archivedChecklists.length === 0 ? (
            <p className="empty-hint">No archived checklists.</p>
          ) : (
            <ul>
              {archivedChecklists.map((checklist) => (
                <ChecklistNavItem
                  key={checklist.id}
                  checklist={checklist}
                  isActive={activeChecklist?.id === checklist.id}
                  onSelect={() => selectChecklist(checklist.id)}
                />
              ))}
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
                {editingName && activeChecklist.isOwner && !isArchived ? (
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
                    {isArchived && (
                      <span className="badge badge-archived">Archived</span>
                    )}
                    {!activeChecklist.isOwner && (
                      <span className="badge badge-shared">Shared with you</span>
                    )}
                    {activeChecklist.isOwner && !isArchived && (
                      <button
                        type="button"
                        className="btn-ghost btn-icon"
                        onClick={startEditingName}
                        aria-label="Rename checklist"
                        title="Rename"
                      >
                        ✎
                      </button>
                    )}
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
                {activeChecklist.isOwner &&
                  (isArchived ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => void restoreChecklist(activeChecklist.id)}
                    >
                      Restore checklist
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => {
                        if (
                          confirm(
                            `Archive "${activeChecklist.name}"? You can restore it later from the sidebar.`,
                          )
                        ) {
                          void archiveChecklist(activeChecklist.id)
                        }
                      }}
                    >
                      Archive checklist
                    </button>
                  ))}
              </div>

              {activeChecklist.isOwner &&
                !isArchived &&
                activeChecklist.sharedWith.length > 0 && (
                  <p className="shared-with">
                    Shared with: {activeChecklist.sharedWith.join(', ')}
                  </p>
                )}

              {activeChecklist.isOwner && !isArchived && (
                <form className="share-form" onSubmit={handleShare}>
                  <input
                    type="email"
                    placeholder="Share with email..."
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    aria-label="Share with email"
                  />
                  <button type="submit" disabled={!shareEmail.trim()}>
                    Share
                  </button>
                </form>
              )}
            </header>

            {isArchived ? (
              <p className="status-banner archived-notice">
                This checklist is archived. Restore it to add new tasks.
              </p>
            ) : (
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
            )}

            {activeChecklist.tasks.length === 0 ? (
              <p className="empty-tasks">
                {isArchived
                  ? 'No tasks in this archived checklist.'
                  : 'No tasks yet. Add one above.'}
              </p>
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

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="auth-page">
        <div className="status-banner loading">Loading…</div>
      </div>
    )
  }

  if (!user) return <AuthPage />

  return <AppContent />
}
