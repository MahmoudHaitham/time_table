-- Migration: Add campus_track column to schedule_templates table
-- Purpose: Support NORTHAMPTON class separation for Term 4 System 140
-- Values: 'northampton' or 'normal' (NULL for other terms)

-- Add the campus_track column
ALTER TABLE schedule_templates
ADD COLUMN IF NOT EXISTS campus_track VARCHAR(20) DEFAULT NULL;

-- Add a comment explaining the column purpose
COMMENT ON COLUMN schedule_templates.campus_track IS 'Campus track for Term 4 System 140: northampton or normal. NULL for other terms.';

-- Create an index for faster lookups by campus_track
CREATE INDEX IF NOT EXISTS idx_schedule_templates_campus_track 
ON schedule_templates (campus_track) 
WHERE campus_track IS NOT NULL;

-- Create a composite index for term 4 system 140 queries
CREATE INDEX IF NOT EXISTS idx_schedule_templates_term_system_track 
ON schedule_templates (term_id, system_type, campus_track) 
WHERE system_type = 140;
