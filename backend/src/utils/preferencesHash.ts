/**
 * Unified Preferences Hash Utility
 * 
 * This utility generates a consistent hash for schedule preferences that is used
 * by both admin template creation and student schedule requests.
 * 
 * Hash includes:
 * - term_id
 * - system_type
 * - elective_course_ids (sorted)
 * - excluded_days (sorted)
 * - excluded_core_course_ids (sorted)
 * - preferred_instructors (sorted, normalized)
 * 
 * Same preferences = Same hash = Instant lookup (no filtering needed)
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
 * Generate a unified hash for schedule preferences
 * This hash is used as the primary lookup key for templates
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
