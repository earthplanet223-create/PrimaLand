CREATE TABLE IF NOT EXISTS project_status_history (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id UUID NOT NULL REFERENCES projects(id),
 status TEXT NOT NULL,
 public_note TEXT NOT NULL DEFAULT '',
 changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)