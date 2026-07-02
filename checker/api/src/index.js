import express from 'express'
import cors from 'cors'
import { query, waitForDb } from './db.js'
import {
  authMiddleware,
  hashPassword,
  normalizeEmail,
  signToken,
  verifyPassword,
} from './auth.js'
import {
  getAccessibleChecklist,
  getOwnedChecklist,
  getShareEmails,
} from './access.js'

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

const TASK_ORDER =
  'ORDER BY completed ASC, COALESCE(completed_at, created_at) ASC'

function mapTaskRow(row) {
  return {
    id: row.id,
    text: row.text,
    completed: row.completed,
  }
}

async function loadTasks(checklistId) {
  const result = await query(
    `SELECT id, text, completed FROM tasks WHERE checklist_id = $1 ${TASK_ORDER}`,
    [checklistId],
  )
  return result.rows.map(mapTaskRow)
}

async function mapChecklistRow(row, tasks) {
  const sharedWith = row.is_owner ? await getShareEmails(row.id) : []
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    archived: row.archived,
    archivedAt: row.archived_at,
    isOwner: row.is_owner,
    sharedWith,
    tasks,
  }
}

async function getChecklistForUser(userId, checklistId) {
  const row = await getAccessibleChecklist(userId, checklistId)
  if (!row) return null
  const tasks = await loadTasks(checklistId)
  return mapChecklistRow(row, tasks)
}

async function listChecklistsForUser(userId, archived) {
  const result = await query(
    `SELECT c.id, c.name, c.created_at, c.archived, c.archived_at, c.owner_id,
            (c.owner_id = $1) AS is_owner
     FROM checklists c
     WHERE (c.owner_id = $1 OR EXISTS (
       SELECT 1 FROM checklist_shares cs
       WHERE cs.checklist_id = c.id AND cs.user_id = $1
     )) AND c.archived = $2
     ORDER BY COALESCE(c.archived_at, c.created_at) DESC`,
    [userId, archived],
  )

  return Promise.all(
    result.rows.map(async (row) => {
      const tasks = await loadTasks(row.id)
      return mapChecklistRow(row, tasks)
    }),
  )
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/auth/register', async (req, res) => {
  const email = normalizeEmail(req.body?.email ?? '')
  const password = req.body?.password ?? ''

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  try {
    const passwordHash = await hashPassword(password)
    const result = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash],
    )
    const user = result.rows[0]
    const token = signToken(user)
    res.status(201).json({ token, user: { id: user.id, email: user.email } })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }
    console.error(err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email ?? '')
  const password = req.body?.password ?? ''

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const result = await query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email],
    )
    const user = result.rows[0]
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = signToken(user)
    res.json({ token, user: { id: user.id, email: user.email } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Sign in failed' })
  }
})

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user })
})

app.get('/api/checklists', authMiddleware, async (req, res) => {
  const archived = req.query.archived === 'true'
  try {
    const checklists = await listChecklistsForUser(req.user.id, archived)
    res.json(checklists)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch checklists' })
  }
})

app.post('/api/checklists', authMiddleware, async (req, res) => {
  const name = req.body?.name?.trim()
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    const result = await query(
      `INSERT INTO checklists (owner_id, name) VALUES ($1, $2)
       RETURNING id, name, created_at, archived, archived_at, owner_id`,
      [req.user.id, name],
    )
    const row = { ...result.rows[0], is_owner: true }
    res.status(201).json(await mapChecklistRow(row, []))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create checklist' })
  }
})

app.patch('/api/checklists/:id', authMiddleware, async (req, res) => {
  const owned = await getOwnedChecklist(req.user.id, req.params.id)
  if (!owned) {
    return res.status(404).json({ error: 'Checklist not found' })
  }

  const name = req.body?.name?.trim()
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    await query('UPDATE checklists SET name = $1 WHERE id = $2', [
      name,
      req.params.id,
    ])
    const checklist = await getChecklistForUser(req.user.id, req.params.id)
    res.json(checklist)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update checklist' })
  }
})

app.post('/api/checklists/:id/archive', authMiddleware, async (req, res) => {
  const owned = await getOwnedChecklist(req.user.id, req.params.id)
  if (!owned) {
    return res.status(404).json({ error: 'Checklist not found' })
  }
  if (owned.archived) {
    return res.status(400).json({ error: 'Checklist is already archived' })
  }

  try {
    await query(
      'UPDATE checklists SET archived = TRUE, archived_at = NOW() WHERE id = $1',
      [req.params.id],
    )
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to archive checklist' })
  }
})

app.post('/api/checklists/:id/restore', authMiddleware, async (req, res) => {
  const owned = await getOwnedChecklist(req.user.id, req.params.id)
  if (!owned) {
    return res.status(404).json({ error: 'Checklist not found' })
  }
  if (!owned.archived) {
    return res.status(400).json({ error: 'Checklist is not archived' })
  }

  try {
    await query(
      'UPDATE checklists SET archived = FALSE, archived_at = NULL WHERE id = $1',
      [req.params.id],
    )
    const checklist = await getChecklistForUser(req.user.id, req.params.id)
    res.json(checklist)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to restore checklist' })
  }
})

app.post('/api/checklists/:id/share', authMiddleware, async (req, res) => {
  const owned = await getOwnedChecklist(req.user.id, req.params.id)
  if (!owned) {
    return res.status(404).json({ error: 'Checklist not found' })
  }
  if (owned.archived) {
    return res.status(400).json({ error: 'Cannot share an archived checklist' })
  }

  const email = normalizeEmail(req.body?.email ?? '')
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' })
  }
  if (email === req.user.email) {
    return res.status(400).json({ error: 'You cannot share with yourself' })
  }

  try {
    const userResult = await query('SELECT id, email FROM users WHERE email = $1', [
      email,
    ])
    const target = userResult.rows[0]
    if (!target) {
      return res
        .status(404)
        .json({ error: 'No user found with that email. They must sign up first.' })
    }

    await query(
      `INSERT INTO checklist_shares (checklist_id, user_id, shared_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (checklist_id, user_id) DO NOTHING`,
      [req.params.id, target.id, req.user.id],
    )

    const checklist = await getChecklistForUser(req.user.id, req.params.id)
    res.json(checklist)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to share checklist' })
  }
})

app.post('/api/checklists/:id/tasks', authMiddleware, async (req, res) => {
  const checklist = await getAccessibleChecklist(req.user.id, req.params.id)
  if (!checklist) {
    return res.status(404).json({ error: 'Checklist not found' })
  }
  if (checklist.archived) {
    return res
      .status(400)
      .json({ error: 'Restore this checklist before adding tasks' })
  }

  const text = req.body?.text?.trim()
  if (!text) {
    return res.status(400).json({ error: 'Text is required' })
  }

  try {
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

app.patch(
  '/api/checklists/:checklistId/tasks/:taskId',
  authMiddleware,
  async (req, res) => {
    const checklist = await getAccessibleChecklist(
      req.user.id,
      req.params.checklistId,
    )
    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' })
    }

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
        `UPDATE tasks SET text = $1, completed = $2,
         completed_at = CASE WHEN $2 THEN NOW() ELSE NULL END
         WHERE id = $3 RETURNING id, text, completed`,
        [nextText, nextCompleted, req.params.taskId],
      )
      res.json(mapTaskRow(result.rows[0]))
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to update task' })
    }
  },
)

app.delete(
  '/api/checklists/:checklistId/tasks/:taskId',
  authMiddleware,
  async (req, res) => {
    const checklist = await getAccessibleChecklist(
      req.user.id,
      req.params.checklistId,
    )
    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' })
    }

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
  },
)

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
