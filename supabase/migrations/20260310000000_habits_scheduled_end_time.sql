-- Add scheduled_end_time column to habits and habit_versions tables.
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS scheduled_end_time time;

ALTER TABLE habit_versions
  ADD COLUMN IF NOT EXISTS scheduled_end_time time;

-- Backfill habit_versions where scheduled_end_time is missing.
UPDATE habit_versions hv
SET scheduled_end_time = h.scheduled_end_time
FROM habits h
WHERE hv.habit_id = h.id
  AND h.scheduled_end_time IS NOT NULL
  AND hv.scheduled_end_time IS NULL;
