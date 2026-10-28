ALTER TABLE survey_events ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'Survey';
CREATE INDEX IF NOT EXISTS survey_events_date_idx ON survey_events (event_date);