-- View for listing schedule templates WITHOUT base_schedules (avoids 64MB response limit).
-- Use this view for any client that only needs metadata (admin list, Neon table browser, etc.).
-- The app list endpoint uses raw SQL; this view protects against SELECT * from schedule_templates elsewhere.

CREATE OR REPLACE VIEW schedule_templates_list AS
SELECT
  id,
  term_id,
  system_type,
  elective_course_ids,
  elective_combination_hash,
  schedule_count,
  access_count,
  last_accessed_at,
  "createdAt",
  "updatedAt",
  preferences_hash,
  excluded_days,
  excluded_core_course_ids,
  preferred_instructors,
  is_generating,
  parent_hash,
  parent_template_id,
  is_parent,
  campus_track
FROM schedule_templates;

COMMENT ON VIEW schedule_templates_list IS 'List view without base_schedules (large jsonb). Use for admin list; never SELECT * FROM schedule_templates.';
