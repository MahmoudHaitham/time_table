/**
 * Cache invalidation utilities
 * Call these functions when data is updated to ensure cache consistency
 */

import { cache, cacheKeys } from "./cache";
import { AppDataSource } from "../config/data-source";
import { ScheduleCache } from "../entities/ScheduleCache";

/**
 * Invalidate cache for a specific term
 */
export const invalidateTermCache = (termId: number) => {
  cache.delete(cacheKeys.termTimetable(termId));
  cache.delete(cacheKeys.coreCourses(termId));
  cache.delete(cacheKeys.electiveCourses(termId));
  console.log(`[Cache] Invalidated cache for term ${termId}`);
};

/**
 * Invalidate all published terms cache
 */
export const invalidatePublishedTermsCache = () => {
  cache.delete(cacheKeys.publishedTerms());
  console.log(`[Cache] Invalidated published terms cache`);
};

/**
 * Invalidate all schedule caches for a term (both in-memory and database)
 */
export const invalidateTermSchedulesCache = async (termId: number) => {
  // Clear in-memory cache
  invalidateTermCache(termId);
  
  // Clear database cache for this term
  try {
    const scheduleCacheRepo = AppDataSource.getRepository(ScheduleCache);
    await scheduleCacheRepo.delete({ term_id: termId });
    console.log(`[Cache] Invalidated database schedule caches for term ${termId}`);
  } catch (error: any) {
    console.error(`[Cache] Failed to invalidate database cache for term ${termId}:`, error.message);
  }
};

/**
 * Invalidate all caches (use sparingly)
 */
export const invalidateAllCaches = async () => {
  cache.clear();
  
  // Optionally clear database cache (commented out by default to preserve data)
  // try {
  //   const scheduleCacheRepo = AppDataSource.getRepository(ScheduleCache);
  //   await scheduleCacheRepo.clear();
  //   console.log(`[Cache] Cleared all database caches`);
  // } catch (error: any) {
  //   console.error(`[Cache] Failed to clear database cache:`, error.message);
  // }
  
  console.log(`[Cache] Cleared all in-memory caches`);
};
