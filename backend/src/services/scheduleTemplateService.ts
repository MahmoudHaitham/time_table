/**
 * Schedule Template Service
 * Handles pre-computation and filtering of schedule templates for fast lookups
 */

import { AppDataSource } from "../config/data-source";
import { ScheduleTemplate } from "../entities/ScheduleTemplate";
import { IsNull } from "typeorm";
import * as crypto from "crypto";

/**
 * Filter pre-computed schedules based on student preferences
 * This is MUCH faster than regenerating schedules from scratch
 */
export function filterSchedulesByPreferences(
  baseSchedules: any[],
  excludedDays: string[],
  preferredInstructors: string[] = []
): any[] {
  console.log(`[filterSchedulesByPreferences] Filtering ${baseSchedules.length} base schedules...`);
  console.log(`  - Excluded days: ${excludedDays.join(", ") || "none"}`);
  console.log(`  - Preferred instructors: ${preferredInstructors.join(", ") || "none"}`);
  
  const startTime = Date.now();
  let filteredSchedules: any[] = [];
  
  // Filter by excluded days if any
  if (excludedDays.length > 0) {
    filteredSchedules = baseSchedules.filter(schedule => {
      // Check if schedule uses any excluded days
      const scheduleDays = schedule.days || [];
      const usesExcludedDays = scheduleDays.some((day: string) => excludedDays.includes(day));
      
      // Keep schedules that DON'T use excluded days, OR keep all if we want to show them ranked
      // We'll keep all schedules but they will be ranked lower in sorting
      return true; // Keep all schedules - let scoring handle preferences
    });
  } else {
    filteredSchedules = [...baseSchedules];
  }
  
  console.log(`[filterSchedulesByPreferences] After day filter: ${filteredSchedules.length} schedules`);
  
  // Re-score schedules based on current preferences
  filteredSchedules = filteredSchedules.map(schedule => {
    // Recalculate scores based on student's specific preferences
    const scheduleDays = schedule.days || [];
    const excludedDaysUsed = scheduleDays.filter((day: string) => excludedDays.includes(day)).length;
    
    // Recalculate instructor preference bonus
    let preferredInstructorBonus = 0;
    if (preferredInstructors.length > 0) {
      const normalizedPreferred = preferredInstructors.map(name => name.trim().toLowerCase());
      const instructorCourses = new Map<string, Set<number>>();
      
      schedule.sessions.forEach((s: any) => {
        if (s.instructor && s.instructor.trim() && s.course) {
          const normalizedInstructorName = s.instructor.trim().toLowerCase();
          const preferredIndex = normalizedPreferred.indexOf(normalizedInstructorName);
          if (preferredIndex !== -1) {
            const preferredName = preferredInstructors[preferredIndex].trim();
            if (!instructorCourses.has(preferredName)) {
              instructorCourses.set(preferredName, new Set());
            }
            instructorCourses.get(preferredName)!.add(s.course.id);
          }
        }
      });
      
      let totalCourses = 0;
      instructorCourses.forEach((courseIds) => {
        totalCourses += courseIds.size;
      });
      preferredInstructorBonus = totalCourses * 50000000; // Same bonus as in original code
    }
    
    // Recalculate excluded days penalty (consistent with original scoring)
    let excludedDaysLecturePenalty = 0;
    let excludedDaysSlotsPenalty = 0;
    
    const daysSlots = new Map<string, number[]>();
    const daysComponentTypes = new Map<string, Set<string>>();
    
    schedule.sessions.forEach((s: any) => {
      const day = String(s.day);
      if (!daysSlots.has(day)) {
        daysSlots.set(day, []);
      }
      daysSlots.get(day)!.push(Number(s.slot));
      
      if (!daysComponentTypes.has(day)) {
        daysComponentTypes.set(day, new Set());
      }
      daysComponentTypes.get(day)!.add(String(s.component_type));
    });
    
    if (excludedDaysUsed > 0) {
      excludedDays.forEach(excludedDay => {
        if (scheduleDays.includes(excludedDay)) {
          const slotsOnExcludedDay = daysSlots.get(excludedDay) || [];
          const slotsCount = slotsOnExcludedDay.length;
          const componentTypesOnDay = daysComponentTypes.get(excludedDay) || new Set();
          
          if (componentTypesOnDay.has("L")) {
            excludedDaysLecturePenalty += 50000000;
          }
          
          if (slotsCount === 1) {
            excludedDaysSlotsPenalty += 0;
          } else if (slotsCount === 2) {
            excludedDaysSlotsPenalty += 200000;
          } else if (slotsCount === 3) {
            excludedDaysSlotsPenalty += 800000;
          } else if (slotsCount === 4) {
            excludedDaysSlotsPenalty += 2000000;
          } else {
            excludedDaysSlotsPenalty += slotsCount * slotsCount * 500000;
          }
        }
      });
    }
    
    const baseScore = 1000000000;
    let excludedDaysScore = 0;
    if (excludedDaysUsed === 0) {
      excludedDaysScore = 100000000;
    } else {
      excludedDaysScore = -(100000000 * excludedDaysUsed);
    }
    
    const totalDays = schedule.totalDays || schedule.days.length;
    const gaps = schedule.gaps || 0;
    const daysBonus = (7 - totalDays) * 1000000;
    const gapsPenalty = gaps * 10000;
    
    const newScore = baseScore 
      + excludedDaysScore 
      - excludedDaysLecturePenalty 
      - excludedDaysSlotsPenalty 
      + daysBonus 
      - gapsPenalty
      + preferredInstructorBonus;
    
    return {
      ...schedule,
      score: newScore,
      excludedDaysUsed,
    };
  });
  
  // Sort by multi-criteria (same as original algorithm)
  filteredSchedules.sort((a, b) => {
    // First: Compare excluded days (0 is best)
    if (a.excludedDaysUsed !== b.excludedDaysUsed) {
      return a.excludedDaysUsed - b.excludedDaysUsed;
    }
    
    // Second: If both use excluded days, prioritize those WITHOUT Lecture sessions
    if (a.excludedDaysUsed > 0 && b.excludedDaysUsed > 0) {
      const aHasLecture = hasLectureOnExcludedDays(a, excludedDays);
      const bHasLecture = hasLectureOnExcludedDays(b, excludedDays);
      if (aHasLecture !== bHasLecture) {
        return aHasLecture ? 1 : -1;
      }
    }
    
    // Third: Fewer slots on excluded days
    if (a.excludedDaysUsed > 0 && b.excludedDaysUsed > 0) {
      const aSlotsOnExcluded = getSlotsOnExcludedDays(a, excludedDays);
      const bSlotsOnExcluded = getSlotsOnExcludedDays(b, excludedDays);
      if (aSlotsOnExcluded !== bSlotsOnExcluded) {
        return aSlotsOnExcluded - bSlotsOnExcluded;
      }
    }
    
    // Fourth: Fewer total days
    const aTotalDays = a.totalDays || a.days.length;
    const bTotalDays = b.totalDays || b.days.length;
    if (aTotalDays !== bTotalDays) {
      return aTotalDays - bTotalDays;
    }
    
    // Fifth: Fewer gaps
    const aGaps = a.gaps || 0;
    const bGaps = b.gaps || 0;
    if (aGaps !== bGaps) {
      return aGaps - bGaps;
    }
    
    // Sixth: Preferred instructors (more is better)
    const aInstructorCount = countPreferredInstructorCourses(a, preferredInstructors);
    const bInstructorCount = countPreferredInstructorCourses(b, preferredInstructors);
    if (aInstructorCount !== bInstructorCount) {
      return bInstructorCount - aInstructorCount; // More preferred instructors is better
    }
    
    // Finally: Score comparison
    return b.score - a.score;
  });
  
  const filterTime = Date.now() - startTime;
  console.log(`[filterSchedulesByPreferences] ✅ Filtered in ${filterTime}ms (${baseSchedules.length} → ${filteredSchedules.length} schedules)`);
  
  // Return top 50 schedules
  return filteredSchedules.slice(0, 50);
}

/**
 * Helper: Check if schedule has Lecture on excluded days
 */
function hasLectureOnExcludedDays(schedule: any, excludedDays: string[]): boolean {
  if (!schedule.excludedDaysUsed || schedule.excludedDaysUsed === 0) return false;
  const scheduleDays = schedule.days || [];
  const excludedDaysInSchedule = scheduleDays.filter((day: string) => excludedDays.includes(day));
  
  for (const day of excludedDaysInSchedule) {
    const sessionsOnDay = schedule.sessions.filter((s: any) => s.day === day);
    if (sessionsOnDay.some((s: any) => s.component_type === "L")) {
      return true;
    }
  }
  return false;
}

/**
 * Helper: Count slots on excluded days
 */
function getSlotsOnExcludedDays(schedule: any, excludedDays: string[]): number {
  if (!schedule.excludedDaysUsed || schedule.excludedDaysUsed === 0) return 0;
  const scheduleDays = schedule.days || [];
  const excludedDaysInSchedule = scheduleDays.filter((day: string) => excludedDays.includes(day));
  
  let totalSlots = 0;
  for (const day of excludedDaysInSchedule) {
    const sessionsOnDay = schedule.sessions.filter((s: any) => s.day === day);
    totalSlots += sessionsOnDay.length;
  }
  return totalSlots;
}

/**
 * Helper: Count preferred instructor courses
 */
function countPreferredInstructorCourses(schedule: any, preferredInstructors: string[]): number {
  if (preferredInstructors.length === 0) return 0;
  const normalizedPreferred = preferredInstructors.map(name => name.trim().toLowerCase());
  const instructorCourses = new Map<string, Set<number>>();
  
  schedule.sessions.forEach((s: any) => {
    if (s.instructor && s.instructor.trim() && s.course) {
      const normalizedInstructorName = s.instructor.trim().toLowerCase();
      const preferredIndex = normalizedPreferred.indexOf(normalizedInstructorName);
      if (preferredIndex !== -1) {
        const preferredName = preferredInstructors[preferredIndex].trim();
        if (!instructorCourses.has(preferredName)) {
          instructorCourses.set(preferredName, new Set());
        }
        instructorCourses.get(preferredName)!.add(s.course.id);
      }
    }
  });
  
  let totalCourses = 0;
  instructorCourses.forEach((courseIds) => {
    totalCourses += courseIds.size;
  });
  return totalCourses;
}

/**
 * Get or create schedule template for a specific term, system, and elective combination
 */
export async function getOrCreateScheduleTemplate(
  termId: number,
  systemType: number,
  electiveCourseIds: number[] | null,
  generateFn: () => Promise<any[]>
): Promise<{ schedules: any[], fromTemplate: boolean, templateId?: number }> {
  try {
    const templateRepo = AppDataSource.getRepository(ScheduleTemplate);
    
    // Normalize elective IDs (sort and hash)
    const sortedElectiveIds = electiveCourseIds ? [...electiveCourseIds].sort((a, b) => a - b) : null;
    const electiveIdsJson = sortedElectiveIds ? JSON.stringify(sortedElectiveIds) : null;
    const electiveHash = electiveIdsJson 
      ? crypto.createHash("md5").update(electiveIdsJson).digest("hex")
      : crypto.createHash("md5").update("none").digest("hex");
    
    console.log(`[getOrCreateScheduleTemplate] Looking for template: term=${termId}, system=${systemType}, electives=${sortedElectiveIds?.join(",") || "none"}`);
    
    // Try to find existing template
    const existingTemplate = await templateRepo.findOne({
      where: {
        term_id: termId,
        system_type: systemType,
        elective_combination_hash: electiveHash,
      },
    });
    
    if (existingTemplate && existingTemplate.base_schedules) {
      console.log(`[getOrCreateScheduleTemplate] ✅ Found existing template (ID: ${existingTemplate.id}) with ${existingTemplate.schedule_count} schedules`);
      
      // Update access statistics
      existingTemplate.access_count += 1;
      existingTemplate.last_accessed_at = new Date();
      await templateRepo.save(existingTemplate);
      
      return {
        schedules: existingTemplate.base_schedules,
        fromTemplate: true,
        templateId: existingTemplate.id,
      };
    }
    
    console.log(`[getOrCreateScheduleTemplate] ⚠️  Template not found - generating new base schedules...`);
    
    // Generate new base schedules (with NO excluded days - generate all possibilities)
    const generationStartTime = Date.now();
    const baseSchedules = await generateFn();
    const generationTime = Date.now() - generationStartTime;
    
    console.log(`[getOrCreateScheduleTemplate] Generated ${baseSchedules.length} base schedules in ${generationTime}ms`);
    
    // Save to database as template (asynchronously to not block response)
    setImmediate(async () => {
      try {
        const newTemplate = templateRepo.create({
          term_id: termId,
          system_type: systemType,
          elective_course_ids: electiveIdsJson,
          elective_combination_hash: electiveHash,
          base_schedules: baseSchedules,
          schedule_count: baseSchedules.length,
          access_count: 1,
          last_accessed_at: new Date(),
        });
        
        await templateRepo.save(newTemplate);
        console.log(`[getOrCreateScheduleTemplate] 💾 Saved new template to database (ID: ${newTemplate.id})`);
      } catch (saveError: any) {
        console.warn(`[getOrCreateScheduleTemplate] Failed to save template (non-blocking):`, saveError.message?.substring(0, 100));
      }
    });
    
    return {
      schedules: baseSchedules,
      fromTemplate: false,
    };
  } catch (error: any) {
    console.error(`[getOrCreateScheduleTemplate] Error:`, error.message);
    // Fallback to direct generation
    const baseSchedules = await generateFn();
    return {
      schedules: baseSchedules,
      fromTemplate: false,
    };
  }
}

/**
 * Invalidate all templates for a specific term
 * Call this when timetable data changes (sessions, classes, etc.)
 */
export async function invalidateTemplatesForTerm(termId: number): Promise<number> {
  try {
    const templateRepo = AppDataSource.getRepository(ScheduleTemplate);
    const result = await templateRepo.delete({ term_id: termId });
    const deletedCount = result.affected || 0;
    console.log(`[invalidateTemplatesForTerm] Deleted ${deletedCount} templates for term ${termId}`);
    return deletedCount;
  } catch (error: any) {
    console.error(`[invalidateTemplatesForTerm] Error:`, error.message);
    return 0;
  }
}

/**
 * Clean up old templates that haven't been accessed in a long time
 */
export async function cleanupOldTemplates(daysOld: number = 30): Promise<number> {
  try {
    const templateRepo = AppDataSource.getRepository(ScheduleTemplate);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // Delete templates that haven't been accessed in the specified number of days
    const result = await templateRepo
      .createQueryBuilder()
      .delete()
      .where("last_accessed_at < :cutoffDate OR last_accessed_at IS NULL", { cutoffDate })
      .execute();
    
    const deletedCount = result.affected || 0;
    console.log(`[cleanupOldTemplates] Deleted ${deletedCount} templates older than ${daysOld} days`);
    return deletedCount;
  } catch (error: any) {
    console.error(`[cleanupOldTemplates] Error:`, error.message);
    return 0;
  }
}
