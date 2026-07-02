-- For databases created before auth/sharing/archive (safe to re-run on fresh schema)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE checklists ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS checklist_shares (
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (checklist_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_checklists_owner ON checklists(owner_id);
CREATE INDEX IF NOT EXISTS idx_checklists_archived ON checklists(owner_id, archived);
CREATE INDEX IF NOT EXISTS idx_checklist_shares_user ON checklist_shares(user_id);
