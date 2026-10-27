CREATE TABLE IF NOT EXISTS survey_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id UUID NOT NULL REFERENCES projects(id),
 title TEXT NOT NULL,
 event_date DATE NOT NULL,
 start_time TIME,
 end_time TIME,
 location TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'Scheduled',
 notes TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)