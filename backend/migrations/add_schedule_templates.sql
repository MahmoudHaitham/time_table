-- Migration: Add Schedule Templates Table
-- This table stores pre-computed base schedules for fast filtering
-- Run this ONLY if synchronize: false in production

-- Create schedule_templates table
CREATE TABLE IF NOT EXISTS schedule_templates (
  id SERIAL PRIMARY KEY,
  term_id INTEGER NOT NULL,
  system_type INTEGER NOT NULL,
  elective_course_ids TEXT,
  elective_combination_hash VARCHAR(255) NOT NULL,
  base_schedules JSONB NOT NULL,
  schedule_count INTEGER DEFAULT 0,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key to terms table
  CONSTRAINT fk_schedule_templates_term 
    FOREIGN KEY (term_id) 
    REFERENCES terms(id) 
    ON DELETE CASCADE
);

-- Create unique index for template lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_templates_unique 
ON schedule_templates(term_id, system_type, elective_combination_hash);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_schedule_templates_term 
ON schedule_templates(term_id);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_system 
ON schedule_templates(system_type);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_hash 
ON schedule_templates(elective_combination_hash);

-- Add comment to table
COMMENT ON TABLE schedule_templates IS 
'Pre-computed base schedules for each term/system/elective combination. Used for fast filtering instead of regenerating schedules from scratch.';

COMMENT ON COLUMN schedule_templates.base_schedules IS 
'JSONB array of pre-computed schedules with NO excluded days filter. Filtered at runtime based on student preferences.';

COMMENT ON COLUMN schedule_templates.elective_combination_hash IS 
'MD5 hash of sorted elective course IDs for quick lookup';

COMMENT ON COLUMN schedule_templates.access_count IS 
'Number of times this template has been used for schedule generation';

COMMENT ON COLUMN schedule_templates.last_accessed_at IS 
'Timestamp of last template access for cleanup purposes';
