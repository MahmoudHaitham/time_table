/**
 * Unified Preferences Hash Utility
 * 
 * NEW APPROACH (Option B): 
 * - Base hash uses ONLY: term_id, system_type, elective_course_ids
 * - Excluded days, excluded core, and preferred instructors are FILTERS applied at runtime
 * - This reduces the number of unique templates needed
 * 
 * Same (term, system, electives) = Same base template = Fast filtering
 */

import * as crypto from "crypto";

export interface SchedulePreferences {
  termId: number;
  systemType: number;
  electiveCourseIds?: number[] | null;
  excludedDays?: string[] | null;
  excludedCoreCourseIds?: number[] | null;
  preferredInstructors?: string[] | null;
}

/**
 * Generate a BASE hash for schedule templates (NEW APPROACH)
 * Includes: term_id, system_type, elective_course_ids, excluded_core_course_ids
 * 
 * NOTE: Excluded CORE courses are in hash because they change which courses are generated
 *       Excluded DAYS are NOT in hash because they're scoring penalties, not hard filters
 *       Preferred INSTRUCTORS are NOT in hash because they're scoring bonuses only
 * 
 * @param preferences - The schedule preferences object
 * @returns MD5 hash string (32 characters)
 */
export function generateBaseTemplateHash(preferences: SchedulePreferences): string {
  // Normalize and sort elective IDs for consistent hashing
  const sortedElectiveIds = preferences.electiveCourseIds 
    ? [...preferences.electiveCourseIds].sort((a, b) => a - b)
    : [];
  
  // Normalize and sort excluded core course IDs
  const sortedExcludedCoreIds = preferences.excludedCoreCourseIds 
    ? [...preferences.excludedCoreCourseIds].sort((a, b) => a - b)
    : [];
  
  // Create a deterministic string representation
  // Format: termId|systemType|electiveIds|excludedCoreIds
  // NOTE: excludedDays and preferredInstructors are NOT in hash (runtime scoring only)
  const hashParts = [
    String(preferences.termId),
    String(preferences.systemType),
    sortedElectiveIds.length > 0 ? JSON.stringify(sortedElectiveIds) : "[]",
    sortedExcludedCoreIds.length > 0 ? JSON.stringify(sortedExcludedCoreIds) : "[]",
  ];
  
  const hashString = hashParts.join("|");
  
  // Generate MD5 hash
  const hash = crypto.createHash("md5").update(hashString).digest("hex");
  
  return hash;
}

/**
 * Generate a unified hash for schedule preferences (LEGACY - kept for backward compatibility)
 * This hash includes ALL preferences - used for old templates
 * 
 * @param preferences - The schedule preferences object
 * @returns MD5 hash string (32 characters)
 */
export function generatePreferencesHash(preferences: SchedulePreferences): string {
  // Normalize and sort all arrays for consistent hashing
  const sortedElectiveIds = preferences.electiveCourseIds 
    ? [...preferences.electiveCourseIds].sort((a, b) => a - b)
    : [];
  
  const sortedExcludedDays = preferences.excludedDays 
    ? [...preferences.excludedDays].sort()
    : [];
  
  const sortedExcludedCoreIds = preferences.excludedCoreCourseIds 
    ? [...preferences.excludedCoreCourseIds].sort((a, b) => a - b)
    : [];
  
  // Normalize instructors: trim, lowercase, then sort
  const normalizedInstructors = preferences.preferredInstructors
    ? preferences.preferredInstructors
        .map(inst => inst.trim().toLowerCase())
        .filter(inst => inst.length > 0)
        .sort()
    : [];
  
  // Create a deterministic string representation
  // Format: termId|systemType|electiveIds|excludedDays|excludedCoreIds|instructors
  const hashParts = [
    String(preferences.termId),
    String(preferences.systemType),
    sortedElectiveIds.length > 0 ? JSON.stringify(sortedElectiveIds) : "[]",
    sortedExcludedDays.length > 0 ? JSON.stringify(sortedExcludedDays) : "[]",
    sortedExcludedCoreIds.length > 0 ? JSON.stringify(sortedExcludedCoreIds) : "[]",
    normalizedInstructors.length > 0 ? JSON.stringify(normalizedInstructors) : "[]",
  ];
  
  const hashString = hashParts.join("|");
  
  // Generate MD5 hash
  const hash = crypto.createHash("md5").update(hashString).digest("hex");
  
  return hash;
}

/**
 * Parse preferences from request body (for student requests)
 */
export function parsePreferencesFromRequest(body: any): SchedulePreferences {
  return {
    termId: body.termId,
    systemType: body.systemType || body.scheduleSystemType,
    electiveCourseIds: body.electiveCourseIds || null,
    excludedDays: body.excludedDays || [],
    excludedCoreCourseIds: body.excludedCoreCourseIds || null,
    preferredInstructors: body.preferredInstructors || [],
  };
}

/**
 * Schedule with full metadata for filtering
 */
export interface ScheduleWithMetadata {
  days: string[];
  totalDays: number;
  gaps: number;
  instructors: { [courseCode: string]: string };
  courseIds: number[];
  score: number;
  excludedDaysUsed?: number;
  preferredCoursesCount?: number;
  sessions: any[];
  [key: string]: any; // Allow other properties
}

/**
 * Calculate excluded days count for a schedule
 * Does NOT filter - just calculates how many excluded days are used
 * This matches the original behavior which scored penalties, not filtered
 * 
 * @param schedule - Schedule with metadata
 * @param excludedDays - Array of day names to exclude
 * @returns Number of excluded days used in this schedule
 */
export function calculateExcludedDaysUsed(
  schedule: ScheduleWithMetadata,
  excludedDays: string[] | null | undefined
): number {
  if (!excludedDays || excludedDays.length === 0) {
    return 0;
  }
  
  const excludedSet = new Set(excludedDays.map(d => d.toLowerCase()));
  const scheduleDays = schedule.days || [];
  
  let count = 0;
  for (const day of scheduleDays) {
    if (excludedSet.has(day.toLowerCase())) {
      count++;
    }
  }
  return count;
}

/**
 * Filter schedules by excluded core courses
 * Removes schedules that contain any excluded core course
 * 
 * @param schedules - Array of schedules with metadata
 * @param excludedCoreCourseIds - Array of course IDs to exclude
 * @returns Filtered array of schedules
 */
export function filterByExcludedCoreCourses(
  schedules: ScheduleWithMetadata[],
  excludedCoreCourseIds: number[] | null | undefined
): ScheduleWithMetadata[] {
  if (!excludedCoreCourseIds || excludedCoreCourseIds.length === 0) {
    return schedules;
  }
  
  const excludedSet = new Set(excludedCoreCourseIds);
  
  return schedules.filter(schedule => {
    // Check if any of the schedule's courses are in the excluded set
    const scheduleCourseIds = schedule.courseIds || [];
    for (const courseId of scheduleCourseIds) {
      if (excludedSet.has(courseId)) {
        return false; // Exclude this schedule
      }
    }
    return true; // Keep this schedule
  });
}

/**
 * Re-score schedules with SAME scoring formula as generation time
 * This recalculates excludedDaysUsed and applies identical penalties/bonuses
 * 
 * CRITICAL: This must match the scoring in buildSchedule() exactly!
 * - baseScore = 1,000,000,000
 * - excludedDaysScore = 500,000,000 if 0, else -(500,000,000 * count)
 * - daysBonus = (7 - totalDays) * 1,000,000
 * - gapsPenalty = gaps * 10,000
 * - preferredInstructorsBonus = 50,000,000 per course
 * 
 * @param schedules - Array of schedules with metadata
 * @param preferredInstructors - Array of preferred instructor names
 * @param excludedDays - Array of excluded days (for scoring penalty)
 * @returns Schedules with updated scores (identical to original algorithm)
 */
export function rescoreWithPreferences(
  schedules: ScheduleWithMetadata[],
  preferredInstructors: string[] | null | undefined,
  excludedDays: string[] | null | undefined
): ScheduleWithMetadata[] {
  // Normalize preferred instructors
  const normalizedPreferred = preferredInstructors
    ? preferredInstructors.map(name => name.trim().toLowerCase())
    : [];
  
  return schedules.map(schedule => {
    // Base score (SAME as buildSchedule)
    const baseScore = 1000000000;
    
    // RECALCULATE excludedDaysUsed at request time (not using stored value!)
    // This is critical because base schedules were generated without excluded days
    const excludedDaysUsed = calculateExcludedDaysUsed(schedule, excludedDays);
    
    // Excluded days score (SAME formula as buildSchedule)
    // +500M if zero excluded days, -500M per excluded day otherwise
    const excludedDaysScore = excludedDaysUsed === 0 ? 500000000 : -(500000000 * excludedDaysUsed);
    
    // Days bonus (SAME as buildSchedule) - fewer days = better
    const totalDays = schedule.totalDays || schedule.days?.length || 5;
    const daysBonus = (7 - totalDays) * 1000000;
    
    // Gaps penalty (SAME as buildSchedule)
    const gaps = schedule.gaps || 0;
    const gapsPenalty = gaps * 10000;
    
    // Preferred instructors bonus (SAME as buildSchedule - 50M per course)
    let preferredInstructorsBonus = 0;
    let preferredCoursesCount = 0;
    
    if (normalizedPreferred.length > 0 && schedule.instructors) {
      for (const [courseCode, instructorName] of Object.entries(schedule.instructors)) {
        if (instructorName && normalizedPreferred.includes(instructorName.toLowerCase().trim())) {
          preferredInstructorsBonus += 100000000; // 100 MILLION per course - HIGHEST priority
          preferredCoursesCount++;
        }
      }
    }
    
    // Calculate final score (IDENTICAL formula to buildSchedule)
    const newScore = baseScore + excludedDaysScore + daysBonus - gapsPenalty + preferredInstructorsBonus;
    
    return {
      ...schedule,
      score: newScore,
      excludedDaysUsed: excludedDaysUsed,
      preferredCoursesCount: preferredCoursesCount,
    };
  });
}

/**
 * Sort schedules by score (descending) and return top N
 * Uses same sorting criteria as generation
 * 
 * @param schedules - Array of schedules with scores
 * @param limit - Maximum number of schedules to return
 * @returns Top N schedules sorted by score
 */
export function sortAndLimitSchedules(
  schedules: ScheduleWithMetadata[],
  limit: number = 100
): ScheduleWithMetadata[] {
  // Sort by score descending, then by preferred courses count descending
  const sorted = [...schedules].sort((a, b) => {
    // Primary: score (higher is better)
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Secondary: preferred courses count (higher is better)
    const aPreferred = a.preferredCoursesCount || 0;
    const bPreferred = b.preferredCoursesCount || 0;
    if (bPreferred !== aPreferred) {
      return bPreferred - aPreferred;
    }
    // Tertiary: fewer days is better
    const aDays = a.totalDays || a.days?.length || 5;
    const bDays = b.totalDays || b.days?.length || 5;
    if (aDays !== bDays) {
      return aDays - bDays;
    }
    // Quaternary: fewer gaps is better
    return (a.gaps || 0) - (b.gaps || 0);
  });
  
  return sorted.slice(0, limit);
}

/**
 * Apply re-scoring to schedules (no hard filters needed!)
 * This is the main function called at request time
 * 
 * IMPORTANT: 
 * - Excluded CORE COURSES are handled at GENERATION time (in the hash)
 * - Excluded DAYS receive scoring penalties (not filtered out)
 * - Preferred INSTRUCTORS receive scoring bonuses
 * 
 * This matches the original behavior exactly!
 * 
 * @param schedules - Pre-generated schedules with metadata
 * @param excludedDays - Days to penalize (NOT filter)
 * @param excludedCoreCourseIds - UNUSED (now in hash, handled at generation)
 * @param preferredInstructors - Preferred instructors for bonus
 * @param limit - Max schedules to return
 * @returns Re-scored, sorted, and limited schedules
 */
export function applyFiltersAndRescore(
  schedules: ScheduleWithMetadata[],
  excludedDays: string[] | null | undefined,
  excludedCoreCourseIds: number[] | null | undefined, // Kept for API compatibility but unused
  preferredInstructors: string[] | null | undefined,
  limit: number = 100
): ScheduleWithMetadata[] {
  console.log(`[applyFiltersAndRescore] Starting with ${schedules.length} schedules`);
  
  // NOTE: excludedCoreCourseIds is now handled at GENERATION time (in the hash)
  // So all schedules in the template already exclude those core courses
  // No filtering needed here!
  
  // Re-score with excluded days penalties and preferred instructors bonus
  // This recalculates excludedDaysUsed and applies SAME penalties as original algorithm
  const rescored = rescoreWithPreferences(schedules, preferredInstructors, excludedDays);
  console.log(`[applyFiltersAndRescore] Re-scored ${rescored.length} schedules with excluded days penalty + instructor bonus`);
  
  // Sort and limit
  const result = sortAndLimitSchedules(rescored, limit);
  console.log(`[applyFiltersAndRescore] Returning ${result.length} schedules`);
  
  return result;
}
