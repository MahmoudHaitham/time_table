-- Add status column to student_problems (pending, solved, not_solved)
ALTER TABLE student_problems ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
UPDATE student_problems SET status = 'pending' WHERE status IS NULL OR status = '';
