CREATE TABLE IF NOT EXISTS financial_entries (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id UUID REFERENCES projects(id),
 kind TEXT NOT NULL CHECK (kind IN ('income','expense')),
 amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
 entry_date DATE NOT NULL,
 category TEXT NOT NULL,
 description TEXT NOT NULL,
 payment_reference TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)