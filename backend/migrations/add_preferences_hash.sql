-- Migration: Add preferences_hash column to schedule_templates
-- This enables instant lookup by unified hash (includes all preferences)
-- Run this ONLY if synchronize: false in production

-- Add new columns for preferences_hash system
ALTER TABLE schedule_templates 
ADD COLUMN IF NOT EXISTS preferences_hash VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS excluded_days TEXT,
ADD COLUMN IF NOT EXISTS excluded_core_course_ids TEXT,
ADD COLUMN IF NOT EXISTS preferred_instructors TEXT,
ADD COLUMN IF NOT EXISTS is_generating BOOLEAN DEFAULT FALSE;

-- Create index on preferences_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_schedule_templates_preferences_hash 
ON schedule_templates(preferences_hash);

-- Make elective_combination_hash nullable (for backward compatibility)
-- Old templates will have this, new templates may not
ALTER TABLE schedule_templates 
ALTER COLUMN elective_combination_hash DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN schedule_templates.preferences_hash IS 
'Unified MD5 hash of ALL preferences (term_id|system_type|electives|excluded_days|excluded_core|instructors). Used as primary lookup key for instant schedule retrieval.';

COMMENT ON COLUMN schedule_templates.excluded_days IS 
'JSON array of excluded days stored for reference (part of preferences_hash calculation)';

COMMENT ON COLUMN schedule_templates.excluded_core_course_ids IS 
'JSON array of excluded core course IDs stored for reference (part of preferences_hash calculation)';

COMMENT ON COLUMN schedule_templates.preferred_instructors IS 
'JSON array of preferred instructors stored for reference (part of preferences_hash calculation)';
