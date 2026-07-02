import { query } from './db.js'

export async function getAccessibleChecklist(userId, checklistId) {
  const result = await query(
    `SELECT c.id, c.name, c.created_at, c.archived, c.archived_at, c.owner_id,
            (c.owner_id = $2) AS is_owner
     FROM checklists c
     LEFT JOIN checklist_shares cs ON cs.checklist_id = c.id AND cs.user_id = $2
     WHERE c.id = $1 AND (c.owner_id = $2 OR cs.user_id IS NOT NULL)`,
    [checklistId, userId],
  )
  return result.rows[0] ?? null
}

export async function getOwnedChecklist(userId, checklistId) {
  const result = await query(
    `SELECT id, name, created_at, archived, archived_at, owner_id
     FROM checklists WHERE id = $1 AND owner_id = $2`,
    [checklistId, userId],
  )
  return result.rows[0] ?? null
}

export async function getShareEmails(checklistId) {
  const result = await query(
    `SELECT u.email FROM checklist_shares cs
     JOIN users u ON u.id = cs.user_id
     WHERE cs.checklist_id = $1
     ORDER BY u.email`,
    [checklistId],
  )
  return result.rows.map((r) => r.email)
}
