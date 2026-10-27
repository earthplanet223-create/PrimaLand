CREATE TABLE IF NOT EXISTS projects (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 reference TEXT NOT NULL UNIQUE,
 client_id UUID NOT NULL REFERENCES clients(id),
 service TEXT NOT NULL,
 location TEXT NOT NULL,
 fee NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
 status TEXT NOT NULL DEFAULT 'Request received',
 public_note TEXT NOT NULL DEFAULT 'Your request has been received.',
 internal_notes TEXT NOT NULL DEFAULT '',
 due_date DATE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)