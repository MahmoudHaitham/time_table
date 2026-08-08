-- Migration: Add closed column to class_courses
-- When an assigned course (class_course) is closed by admin:
-- - It is excluded from timetable generation (calculations)
-- - Template hash includes closed state so a new template is built with new hash
-- - Students with same preferences but including closed get from the new template

ALTER TABLE class_courses
ADD COLUMN IF NOT EXISTS closed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN class_courses.closed IS 'When true, this class-course is excluded from generation; admin must explicitly close it.';
