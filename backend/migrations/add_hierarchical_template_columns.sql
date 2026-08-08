-- Migration: Add hierarchical template columns to schedule_templates
-- Date: 2026-01-28
-- Description: Adds parent_hash, parent_template_id, and is_parent columns to support hierarchical template system

-- HIERARCHICAL TEMPLATE SYSTEM:
-- - PARENT TEMPLATE: Contains ALL combinations for (term, system, electives) - NO excluded core courses
--   - parent_hash = hash(term, system, electives)
--   - parent_template_id = NULL
--   - is_parent = TRUE
--
-- - CHILD TEMPLATE: Derived from parent by filtering out excluded core courses
--   - preferences_hash = hash(term, system, electives, excludedCore)
--   - parent_hash = parent's hash (for reference)
--   - parent_template_id = parent's ID
--   - is_parent = FALSE

-- Step 1: Add new columns (if they don't exist)
ALTER TABLE schedule_templates 
ADD COLUMN IF NOT EXISTS parent_hash VARCHAR(255);

ALTER TABLE schedule_templates 
ADD COLUMN IF NOT EXISTS parent_template_id INTEGER;

ALTER TABLE schedule_templates 
ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT FALSE;

-- Step 2: Create indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_schedule_templates_parent_hash 
ON schedule_templates(parent_hash);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_parent_template_id 
ON schedule_templates(parent_template_id);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_is_parent 
ON schedule_templates(is_parent);

-- Step 3: Update existing templates to be parent templates
-- (Existing templates without excluded core courses should be marked as parents)
UPDATE schedule_templates 
SET 
  parent_hash = preferences_hash,
  parent_template_id = NULL,
  is_parent = TRUE
WHERE parent_hash IS NULL 
  AND (excluded_core_course_ids IS NULL OR excluded_core_course_ids = '[]' OR excluded_core_course_ids = 'null');

-- Step 4: Mark templates WITH excluded core courses as child templates
UPDATE schedule_templates 
SET 
  is_parent = FALSE
WHERE excluded_core_course_ids IS NOT NULL 
  AND excluded_core_course_ids != '[]' 
  AND excluded_core_course_ids != 'null';

-- Verification query (optional - run after migration to verify)
-- SELECT 
--   id, 
--   preferences_hash, 
--   parent_hash, 
--   parent_template_id, 
--   is_parent,
--   excluded_core_course_ids
-- FROM schedule_templates 
-- ORDER BY is_parent DESC, id;
