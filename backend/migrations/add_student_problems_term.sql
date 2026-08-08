-- Add term column to student_problems (4, 5, 6, 7, 8, 9, 10, other)
ALTER TABLE student_problems ADD COLUMN IF NOT EXISTS term VARCHAR(10);
-- Backfill existing rows if any (optional)
UPDATE student_problems SET term = 'other' WHERE term IS NULL OR term = '';
