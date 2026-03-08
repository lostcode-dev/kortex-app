-- ============================================================================
-- Habits Module — Log status, scheduled time, user settings, sharing
-- ============================================================================

-- 1. Log status enum (done / done_later / skipped)
CREATE TYPE habit_log_status AS ENUM ('done', 'done_later', 'skipped');

ALTER TABLE habit_logs
  ADD COLUMN status habit_log_status NOT NULL DEFAULT 'done';

UPDATE habit_logs
SET status = CASE WHEN completed THEN 'done' ELSE 'skipped' END;

-- 2. Scheduled time per habit
ALTER TABLE habits
  ADD COLUMN scheduled_time time;

-- 3. Scheduled time in habit_versions (for historical accuracy)
ALTER TABLE habit_versions
  ADD COLUMN scheduled_time time;

UPDATE habit_versions hv
SET scheduled_time = h.scheduled_time
FROM habits h
WHERE hv.habit_id = h.id;

-- 4. Habit user settings (review day, reminders, sharing)
CREATE TABLE habit_user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  review_day smallint NOT NULL DEFAULT 0 CHECK (review_day BETWEEN 0 AND 6), -- 0=Sun..6=Sat
  review_reminder_enabled boolean NOT NULL DEFAULT false,
  review_reminder_time time NOT NULL DEFAULT '09:00',
  share_token text UNIQUE,
  share_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE habit_user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY habit_user_settings_select ON habit_user_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY habit_user_settings_insert ON habit_user_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY habit_user_settings_update ON habit_user_settings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY habit_user_settings_delete ON habit_user_settings FOR DELETE USING (user_id = auth.uid());
