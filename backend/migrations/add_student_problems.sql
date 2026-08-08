-- Migration: Add student_problems table for student problem reports
CREATE TABLE IF NOT EXISTS student_problems (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  registration_number VARCHAR(100) NOT NULL,
  northampton VARCHAR(10) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_problems_created_at ON student_problems(created_at ASC);
COMMENT ON TABLE student_problems IS 'Student problem reports; sorted by created_at ASC for first-come-first-served.';
