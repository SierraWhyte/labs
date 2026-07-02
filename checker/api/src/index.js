import express from 'express'
import cors from 'cors'
import { query, waitForDb } from './db.js'

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

const TASK_ORDER =
  'ORDER BY completed ASC, COALESCE(completed_at, created_at) ASC'

function mapChecklistRow(row, tasks = []) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    tasks: tasks.map(mapTaskRow),
  }
}

function mapTaskRow(row) {
  return {
    id: row.id,
    text: row.text,
    completed: row.completed,
  }
}

async function getChecklistWithTasks(id) {
  const checklistResult = await query(
    'SELECT id, name, created_at FROM checklists WHERE id = $1',
    [id],
  )
  if (checklistResult.rows.length === 0) return null

  const tasksResult = await query(
    `SELECT id, text, completed FROM tasks WHERE checklist_id = $1 ${TASK_ORDER}`,
    [id],
  )

  return mapChecklistRow(checklistResult.rows[0], tasksResult.rows)
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/checklists', async (_req, res) => {
  try {
    const checklistsResult = await query(
      'SELECT id, name, created_at FROM checklists ORDER BY created_at DESC',
    )

    const checklists = await Promise.all(
      checklistsResult.rows.map(async (row) => {
        const tasksResult = await query(
          `SELECT id, text, completed FROM tasks WHERE checklist_id = $1 ${TASK_ORDER}`,
          [row.id],
        )
        return mapChecklistRow(row, tasksResult.rows)
      }),
    )

    res.json(checklists)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch checklists' })
  }
})

app.post('/api/checklists', async (req, res) => {
  const name = req.body?.name?.trim()
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    const result = await query(
      'INSERT INTO checklists (name) VALUES ($1) RETURNING id, name, created_at',
      [name],
    )
    res.status(201).json(mapChecklistRow(result.rows[0], []))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create checklist' })
  }
})

app.patch('/api/checklists/:id', async (req, res) => {
  const name = req.body?.name?.trim()
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    const result = await query(
      'UPDATE checklists SET name = $1 WHERE id = $2 RETURNING id, name, created_at',
      [name, req.params.id],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist not found' })
    }

    const checklist = await getChecklistWithTasks(req.params.id)
    res.json(checklist)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update checklist' })
  }
})

app.delete('/api/checklists/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM checklists WHERE id = $1', [
      req.params.id,
    ])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Checklist not found' })
    }
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete checklist' })
  }
})

app.post('/api/checklists/:id/tasks', async (req, res) => {
  const text = req.body?.text?.trim()
  if (!text) {
    return res.status(400).json({ error: 'Text is required' })
  }

  try {
    const checklist = await query('SELECT id FROM checklists WHERE id = $1', [
      req.params.id,
    ])
    if (checklist.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist not found' })
    }

    const result = await query(
      'INSERT INTO tasks (checklist_id, text) VALUES ($1, $2) RETURNING id, text, completed',
      [req.params.id, text],
    )
    res.status(201).json(mapTaskRow(result.rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

app.patch('/api/checklists/:checklistId/tasks/:taskId', async (req, res) => {
  const { completed, text } = req.body ?? {}

  if (completed === undefined && text === undefined) {
    return res.status(400).json({ error: 'Nothing to update' })
  }

  try {
    const existing = await query(
      'SELECT id, text, completed FROM tasks WHERE id = $1 AND checklist_id = $2',
      [req.params.taskId, req.params.checklistId],
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const current = existing.rows[0]
    const nextText = text !== undefined ? text.trim() : current.text
    const nextCompleted =
      completed !== undefined ? Boolean(completed) : current.completed

    if (text !== undefined && !nextText) {
      return res.status(400).json({ error: 'Text cannot be empty' })
    }

    const result = await query(
      `UPDATE tasks SET text = $1, completed = $2, completed_at = CASE WHEN $2 THEN NOW() ELSE NULL END WHERE id = $3 RETURNING id, text, completed`,
      [nextText, nextCompleted, req.params.taskId],
    )
    res.json(mapTaskRow(result.rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

app.delete('/api/checklists/:checklistId/tasks/:taskId', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM tasks WHERE id = $1 AND checklist_id = $2',
      [req.params.taskId, req.params.checklistId],
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

async function start() {
  await waitForDb()
  app.listen(port, () => {
    console.log(`API listening on port ${port}`)
  })
}

start().catch((err) => {
  console.error('Failed to start API:', err)
  process.exit(1)
})
