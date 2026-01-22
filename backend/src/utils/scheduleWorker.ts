/**
 * Worker thread for parallel schedule generation
 * This file runs in a separate thread to process combinations in parallel
 */

import { parentPort, workerData } from "worker_threads";
import { buildSchedule } from "../controllers/timetableViewController";

// Import buildSchedule function - we'll need to make it available to workers
// For now, we'll duplicate the logic here since we can't easily import from controllers

/**
 * Build conflict matrix helper (same as in main thread)
 */
function buildConflictMatrixWorker(allCourses: any[]): Map<string, boolean> {
  const conflictMatrix = new Map<string, boolean>();
  const courseClassPairs: Array<{ courseId: number; classId: number; sessions: any[] }> = [];
  
  for (const courseData of allCourses) {
    const sessions: any[] = [];
    for (const component of courseData.components || []) {
      if (component.sessions && component.sessions.length > 0) {
        sessions.push(...component.sessions.map((s: any) => ({
          day: String(s.day),
          slot: Number(s.slot),
        })));
      }
    }
    if (sessions.length > 0) {
      courseClassPairs.push({
        courseId: courseData.course.id,
        classId: courseData.class.id,
        sessions,
      });
    }
  }
  
  for (let i = 0; i < courseClassPairs.length; i++) {
    for (let j = i + 1; j < courseClassPairs.length; j++) {
      const pair1 = courseClassPairs[i];
      const pair2 = courseClassPairs[j];
      
      if (pair1.courseId === pair2.courseId) continue;
      
      const hasConflict = pair1.sessions.some(s1 => 
        pair2.sessions.some(s2 => s1.day === s2.day && s1.slot === s2.slot)
      );
      
      if (hasConflict) {
        const key1 = `${pair1.courseId}_${pair1.classId}-${pair2.courseId}_${pair2.classId}`;
        const key2 = `${pair2.courseId}_${pair2.classId}-${pair1.courseId}_${pair1.classId}`;
        conflictMatrix.set(key1, true);
        conflictMatrix.set(key2, true);
      }
    }
  }
  
  return conflictMatrix;
}

/**
 * Check conflicts helper (same as in main thread)
 */
function hasConflictsWorker(combination: any[], conflictMatrix: Map<string, boolean>): boolean {
  for (let i = 0; i < combination.length; i++) {
    for (let j = i + 1; j < combination.length; j++) {
      const courseData1 = combination[i];
      const courseData2 = combination[j];
      
      if (courseData1.course.id === courseData2.course.id) continue;
      
      const key = `${courseData1.course.id}_${courseData1.class.id}-${courseData2.course.id}_${courseData2.class.id}`;
      if (conflictMatrix.get(key)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Build schedule function (duplicated from timetableViewController for worker thread)
 * This is the same logic as buildSchedule but needs to be in the worker
 */
function buildScheduleWorker(combination: any[], excludedDays: string[]): any | null {
  // We need to import or duplicate the buildSchedule logic here
  // For now, we'll receive it as part of workerData or duplicate it
  // This is a simplified version - the full version should be imported or duplicated
  
  const schedule: any = {
    courses: [],
    sessions: [],
    days: new Set<string>(),
    score: 0,
  };

  const slotMap = new Map<string, any>();
  
  for (const courseData of combination) {
    const courseSessions: any[] = [];
    const componentTypes = courseData.course.component_types ? 
      courseData.course.component_types.split(",").map((t: string) => t.trim()) : [];
    const componentMap = new Map<string, any[]>();
    
    for (const component of courseData.components) {
      if (component.sessions && component.sessions.length > 0) {
        const sessions = component.sessions.map((session: any) => ({
          ...session,
          component_type: component.component_type,
          course: courseData.course,
          class: courseData.class,
        }));
        
        if (!componentMap.has(component.component_type)) {
          componentMap.set(component.component_type, []);
        }
        componentMap.get(component.component_type)!.push(...sessions);
      }
    }
    
    const hasL = componentMap.has("L") && componentMap.get("L")!.length > 0;
    const hasS = componentMap.has("S") && componentMap.get("S")!.length > 0;
    const hasLB = componentMap.has("LB") && componentMap.get("LB")!.length > 0;
    
    const requiresL = componentTypes.includes("L");
    const requiresS = componentTypes.includes("S");
    const requiresLB = componentTypes.includes("LB");
    
    if (requiresL && !hasL) return null;
    if (requiresS && !requiresLB && !hasS) return null;
    if (requiresLB && !requiresS && !hasLB) return null;
    if (requiresS && requiresLB && !hasS && !hasLB) return null;
    
    componentMap.forEach((sessions) => {
      courseSessions.push(...sessions);
    });
    
    for (const session of courseSessions) {
      const key = `${session.day}_${session.slot}`;
      if (slotMap.has(key)) {
        return null;
      }
    }
    
    for (const session of courseSessions) {
      const key = `${session.day}_${session.slot}`;
      slotMap.set(key, session);
      schedule.days.add(session.day);
    }

    schedule.courses.push({
      course: courseData.course,
      class: courseData.class,
      sessions: courseSessions,
    });

    schedule.sessions.push(...courseSessions);
  }

  // Calculate score (simplified - full version in main file)
  const daysArray = Array.from(schedule.days) as string[];
  const excludedDaysUsed = daysArray.filter((day: string) => excludedDays.includes(day)).length;
  const totalDays = schedule.days.size;
  
  let gaps = 0;
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

  daysSlots.forEach((slots) => {
    slots.sort((a, b) => a - b);
    for (let i = 1; i < slots.length; i++) {
      gaps += slots[i] - slots[i - 1] - 1;
    }
  });

  let excludedDaysLecturePenalty = 0;
  let excludedDaysSlotsPenalty = 0;
  
  if (excludedDaysUsed > 0) {
    excludedDays.forEach(excludedDay => {
      if (daysArray.includes(excludedDay)) {
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
  
  const daysBonus = (7 - totalDays) * 1000000;
  const gapsPenalty = gaps * 10000;
  
  schedule.score = baseScore 
    + excludedDaysScore 
    - excludedDaysLecturePenalty 
    - excludedDaysSlotsPenalty 
    + daysBonus 
    - gapsPenalty;
  
  schedule.excludedDaysUsed = excludedDaysUsed;
  schedule.totalDays = totalDays;
  schedule.gaps = gaps;
  schedule.days = daysArray;

  return schedule;
}

// Worker thread main logic
if (parentPort && workerData) {
  const { 
    allCourses, 
    courseOptions, 
    startIndices, 
    endIndices, 
    excludedDays,
    conflictMatrixData 
  } = workerData;
  
  // Reconstruct conflict matrix from serialized data
  const conflictMatrix = new Map<string, boolean>();
  if (conflictMatrixData) {
    for (const [key, value] of Object.entries(conflictMatrixData)) {
      conflictMatrix.set(key, value as boolean);
    }
  } else {
    // Build conflict matrix if not provided
    const builtMatrix = buildConflictMatrixWorker(allCourses);
    builtMatrix.forEach((value, key) => conflictMatrix.set(key, value));
  }
  
  const topSchedules: any[] = [];
  const MAX_KEEP = 200;
  const seenCombinations = new Set<string>();
  let processedCount = 0;
  let validSchedulesFound = 0;
  
  // Generate combinations from startIndices to endIndices
  const indices = [...startIndices];
  
  function generateNextCombination(indices: number[]): boolean {
    for (let i = indices.length - 1; i >= 0; i--) {
      indices[i]++;
      if (indices[i] >= courseOptions[i].length) {
        indices[i] = 0;
      } else {
        return true;
      }
    }
    return false;
  }
  
  function insertSorted(schedules: any[], schedule: any, maxKeep: number): void {
    let left = 0;
    let right = schedules.length;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (schedules[mid].score >= schedule.score) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    schedules.splice(left, 0, schedule);
    
    if (schedules.length > maxKeep) {
      schedules.pop();
    }
  }
  
  // Check if we've reached the end
  const endKey = endIndices.join(",");
  let currentKey = indices.join(",");
  
  do {
    const combinationKey = indices.join(",");
    if (seenCombinations.has(combinationKey)) {
      if (!generateNextCombination(indices)) break;
      currentKey = indices.join(",");
      continue;
    }
    seenCombinations.add(combinationKey);
    
    // Build combination
    const combination: any[] = [];
    for (let i = 0; i < courseOptions.length; i++) {
      combination.push(courseOptions[i][indices[i]]);
    }
    
    // Check conflicts before building schedule
    if (hasConflictsWorker(combination, conflictMatrix)) {
      processedCount++;
      if (!generateNextCombination(indices)) break;
      currentKey = indices.join(",");
      continue;
    }
    
    // Build schedule
    const schedule = buildScheduleWorker(combination, excludedDays);
    if (schedule) {
      validSchedulesFound++;
      insertSorted(topSchedules, schedule, MAX_KEEP);
    }
    
    processedCount++;
    
    // Check if we've reached the end
    if (currentKey === endKey) break;
    
    if (!generateNextCombination(indices)) break;
    currentKey = indices.join(",");
  } while (true);
  
  // Send results back to main thread
  parentPort.postMessage({
    success: true,
    topSchedules,
    processedCount,
    validSchedulesFound,
  });
}
